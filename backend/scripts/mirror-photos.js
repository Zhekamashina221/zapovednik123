/**
 * Скачивает фото из внешних URL в backend/uploads/photos и обновляет photos.url.
 * Перед работой создаёт бэкап reserves.db.
 *
 * Запуск из backend:
 *   node scripts/mirror-photos.js
 *   node scripts/mirror-photos.js --dry-run
 *   node scripts/mirror-photos.js --limit 10
 *
 * Переменные окружения:
 *   MIRROR_CONCURRENCY — параллельных загрузок (по умолчанию 4)
 *   MIRROR_DELAY_MS    — пауза между батчами (по умолчанию 150)
 *   MIRROR_TIMEOUT_MS  — таймаут одного запроса (по умолчанию 30000)
 */
const fs = require('fs')
const path = require('path')
const sqlite = require('better-sqlite3')

const BACKEND_ROOT = path.join(__dirname, '..')
const DB_PATH = path.join(BACKEND_ROOT, 'reserves.db')
const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads', 'photos')
const LOGS_DIR = path.join(BACKEND_ROOT, 'logs')

const CONCURRENCY = Math.max(1, parseInt(process.env.MIRROR_CONCURRENCY || '4', 10))
const DELAY_MS = Math.max(0, parseInt(process.env.MIRROR_DELAY_MS || '150', 10))
const TIMEOUT_MS = Math.max(5000, parseInt(process.env.MIRROR_TIMEOUT_MS || '30000', 10))
const USER_AGENT = 'Zapovednik-photo-mirror/1.0'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  if (i === -1 || !args[i + 1]) return null
  const n = parseInt(args[i + 1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
})()

const LOCAL_PREFIX = '/uploads/photos/'
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`БД не найдена: ${DB_PATH}`)
  }
  const dest = `${DB_PATH}.backup.${stamp()}`
  fs.copyFileSync(DB_PATH, dest)
  return dest
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extFromUrl(urlString) {
  try {
    const ext = path.extname(new URL(urlString).pathname).toLowerCase()
    if (ALLOWED_EXT.has(ext)) return ext
  } catch {
    /* ignore */
  }
  return '.jpg'
}

function extFromContentType(contentType) {
  const ct = String(contentType || '').split(';')[0].trim().toLowerCase()
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[ct] || null
}

function isImageBuffer(buf) {
  if (!buf || buf.length < 12) return false
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return true
  }
  return false
}

function localPathFor(row, ext) {
  return path.join(UPLOADS_ROOT, String(row.reserve_id), `${row.id}${ext}`)
}

function localUrlFor(row, ext) {
  return `${LOCAL_PREFIX}${row.reserve_id}/${row.id}${ext}`
}

class MirrorLogger {
  constructor(logFilePath) {
    this.logFilePath = logFilePath
    this.stats = {
      total: 0,
      ok: 0,
      skipped: 0,
      failed: 0,
    }
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
    this._writeLine('INFO', 'mirror-photos started', {
      dryRun: DRY_RUN,
      limit: LIMIT,
      concurrency: CONCURRENCY,
      delayMs: DELAY_MS,
      timeoutMs: TIMEOUT_MS,
    })
  }

  _format(level, message, meta) {
    const base = { ts: new Date().toISOString(), level, message }
    return meta && Object.keys(meta).length ? { ...base, ...meta } : base
  }

  _writeLine(level, message, meta = {}) {
    const line = JSON.stringify(this._format(level, message, meta))
    fs.appendFileSync(this.logFilePath, `${line}\n`, 'utf8')
    const short = meta.photoId != null ? ` photoId=${meta.photoId}` : ''
    console.log(`[${level}] ${message}${short}`)
  }

  info(message, meta) {
    this._writeLine('INFO', message, meta)
  }

  success(message, meta) {
    this.stats.ok += 1
    this._writeLine('SUCCESS', message, meta)
  }

  skip(message, meta) {
    this.stats.skipped += 1
    this._writeLine('SKIP', message, meta)
  }

  error(code, message, meta = {}) {
    this.stats.failed += 1
    this._writeLine('ERROR', message, { errorCode: code, ...meta })
  }

  summary(extra = {}) {
    const payload = { ...this.stats, ...extra }
    this._writeLine('INFO', 'mirror-photos finished', payload)
    console.log('\n--- Итог ---')
    console.log(JSON.stringify(payload, null, 2))
    console.log('Лог:', this.logFilePath)
  }
}

async function fetchPhoto(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    const contentType = res.headers.get('content-type')
    const buf = Buffer.from(await res.arrayBuffer())
    return { res, contentType, buf }
  } finally {
    clearTimeout(timer)
  }
}

function isAlreadyLocal(url) {
  return typeof url === 'string' && (url.startsWith(LOCAL_PREFIX) || url.startsWith('/uploads/'))
}

async function processRow(db, row, logger, updateStmt) {
  const baseMeta = { photoId: row.id, reserveId: row.reserve_id, sourceUrl: row.url }

  if (!row.url || typeof row.url !== 'string') {
    logger.error('INVALID_URL', 'Пустой или неверный URL', baseMeta)
    return
  }

  if (isAlreadyLocal(row.url)) {
    const relative = row.url.startsWith('/') ? row.url.slice(1) : row.url
    const diskPath = path.join(BACKEND_ROOT, relative)
    if (fs.existsSync(diskPath)) {
      logger.skip('Уже локально, файл на диске', { ...baseMeta, localUrl: row.url })
      return
    }
    logger.error('MISSING_FILE', 'Локальный URL в БД, но файл отсутствует на диске', {
      ...baseMeta,
      diskPath,
    })
    return
  }

  const remoteUrl = row.url

  if (!/^https?:\/\//i.test(remoteUrl)) {
    logger.error('INVALID_URL', 'URL не http(s)', { ...baseMeta, url: remoteUrl })
    return
  }

  if (DRY_RUN) {
    logger.info('dry-run: загрузка пропущена', { ...baseMeta, wouldFetch: remoteUrl })
    return
  }

  let fetchResult
  try {
    fetchResult = await fetchPhoto(remoteUrl)
  } catch (err) {
    const name = err?.name || 'Error'
    if (name === 'AbortError') {
      logger.error('TIMEOUT', `Таймаут ${TIMEOUT_MS} ms`, { ...baseMeta, url: remoteUrl, detail: String(err) })
    } else {
      logger.error('NETWORK', 'Сетевая ошибка при загрузке', {
        ...baseMeta,
        url: remoteUrl,
        detail: err?.message || String(err),
        stack: err?.stack,
      })
    }
    return
  }

  const { res, contentType, buf } = fetchResult

  if (!res.ok) {
    logger.error('HTTP', `HTTP ${res.status} ${res.statusText}`, {
      ...baseMeta,
      url: remoteUrl,
      status: res.status,
      statusText: res.statusText,
    })
    return
  }

  if (!buf.length) {
    logger.error('EMPTY_BODY', 'Пустое тело ответа', { ...baseMeta, url: remoteUrl, contentType })
    return
  }

  const ctExt = extFromContentType(contentType)
  if (contentType && !String(contentType).toLowerCase().startsWith('image/') && !ctExt) {
    logger.error('INVALID_CONTENT_TYPE', 'Ответ не image/*', {
      ...baseMeta,
      url: remoteUrl,
      contentType,
      size: buf.length,
    })
    return
  }

  if (!isImageBuffer(buf)) {
    logger.error('INVALID_MAGIC', 'Буфер не похож на изображение', {
      ...baseMeta,
      url: remoteUrl,
      contentType,
      size: buf.length,
    })
    return
  }

  const { processImageForStorage } = require('../src/services/imageProcessing')
  let processed
  try {
    const mime = contentType?.split(';')[0]?.trim() || null
    processed = await processImageForStorage(buf, mime)
  } catch (err) {
    logger.error('IMAGE_PROCESS', 'Не удалось обработать изображение', {
      ...baseMeta,
      url: remoteUrl,
      detail: err?.message || String(err),
    })
    return
  }

  const ext = processed.ext
  const diskPath = localPathFor(row, ext)
  const publicUrl = localUrlFor(row, ext)

  try {
    fs.mkdirSync(path.dirname(diskPath), { recursive: true })
    fs.writeFileSync(diskPath, processed.buffer)
  } catch (err) {
    logger.error('FS_WRITE', 'Не удалось записать файл', {
      ...baseMeta,
      diskPath,
      detail: err?.message || String(err),
    })
    return
  }

  try {
    updateStmt.run(publicUrl, row.id)
  } catch (err) {
    try {
      fs.unlinkSync(diskPath)
    } catch {
      /* ignore cleanup */
    }
    logger.error('DB_UPDATE', 'Не удалось обновить photos.url', {
      ...baseMeta,
      localUrl: publicUrl,
      detail: err?.message || String(err),
    })
    return
  }

  logger.success('Фото сохранено', {
    ...baseMeta,
    localUrl: publicUrl,
    diskPath,
    bytes: processed.buffer.length,
    contentType: contentType || null,
  })
}

async function runPool(items, worker, concurrency) {
  let index = 0
  async function runner() {
    while (index < items.length) {
      const i = index
      index += 1
      await worker(items[i])
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runner())
  await Promise.all(runners)
}

async function main() {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true })
  fs.mkdirSync(LOGS_DIR, { recursive: true })

  const logPath = path.join(LOGS_DIR, `mirror-photos-${stamp()}.log`)
  const logger = new MirrorLogger(logPath)

  let backupPath
  try {
    backupPath = backupDatabase()
    logger.info('Бэкап БД создан', { backupPath })
  } catch (err) {
    logger.error('BACKUP_FAILED', 'Не удалось создать бэкап', { detail: err?.message || String(err) })
    logger.summary({ aborted: true })
    process.exit(1)
  }

  const db = new sqlite(DB_PATH)
  db.pragma('foreign_keys = ON')

  let query = 'SELECT id, reserve_id, url FROM photos ORDER BY id'
  if (LIMIT) query += ` LIMIT ${LIMIT}`

  const rows = db.prepare(query).all()
  logger.stats.total = rows.length
  logger.info(`К обработке: ${rows.length} записей`)

  const updateStmt = db.prepare('UPDATE photos SET url = ? WHERE id = ?')

  const batchSize = CONCURRENCY
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    await runPool(
      batch,
      (row) => processRow(db, row, logger, updateStmt),
      CONCURRENCY
    )
    if (offset + batchSize < rows.length && DELAY_MS > 0) {
      await sleep(DELAY_MS)
    }
  }

  db.close()
  logger.summary({ backupPath, dryRun: DRY_RUN })
  process.exit(logger.stats.failed > 0 ? 2 : 0)
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
