/**
 * Сжимает локальные фото в uploads/photos (sharp → WebP, max 1920px).
 * Перед работой создаёт бэкап reserves.db.
 *
 * Запуск из backend:
 *   npm run photos:optimize
 *   npm run photos:optimize:dry
 *   node scripts/optimize-photos.js --limit 50
 */
require('./ensure-sqlite-native');

const fs = require('fs');
const path = require('path');
const db = require('../database');
const { processImageForStorage } = require('../src/services/imageProcessing');
const { clearPhotoCacheForReserve } = require('../src/services/photos');

const BACKEND_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(BACKEND_ROOT, 'reserves.db');
const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads', 'photos');
const LOCAL_PREFIX = '/uploads/photos/';
const IMAGE_NAME_RE = /^(\d+)\.(jpe?g|png|webp|gif)$/i;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  if (i === -1 || !args[i + 1]) return null;
  const n = parseInt(args[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`БД не найдена: ${DB_PATH}`);
  }
  const dest = `${DB_PATH}.backup.${stamp()}`;
  fs.copyFileSync(DB_PATH, dest);
  return dest;
}

function localUrlFor(reserveId, photoId, ext) {
  return `${LOCAL_PREFIX}${reserveId}/${photoId}${ext}`;
}

function listLocalPhotoFiles() {
  const items = [];
  if (!fs.existsSync(UPLOADS_ROOT)) return items;

  for (const reserveDir of fs.readdirSync(UPLOADS_ROOT)) {
    const dir = path.join(UPLOADS_ROOT, reserveDir);
    if (!fs.statSync(dir).isDirectory()) continue;

    for (const name of fs.readdirSync(dir)) {
      const match = IMAGE_NAME_RE.exec(name);
      if (!match) continue;
      items.push({
        reserveId: reserveDir,
        photoId: Number(match[1]),
        diskPath: path.join(dir, name),
        url: `${LOCAL_PREFIX}${reserveDir}/${name}`,
      });
    }
  }

  items.sort((a, b) => a.photoId - b.photoId || String(a.reserveId).localeCompare(String(b.reserveId)));
  return items;
}

async function optimizeFile(entry) {
  const { diskPath, reserveId, photoId, url } = entry;
  if (!fs.existsSync(diskPath)) {
    return { status: 'missing', before: 0, after: 0 };
  }

  const before = fs.statSync(diskPath).size;
  const buffer = fs.readFileSync(diskPath);
  const extOld = path.extname(diskPath).toLowerCase();

  let processed;
  try {
    processed = await processImageForStorage(buffer, null);
  } catch (err) {
    return { status: 'error', before, after: 0, detail: err?.message || String(err) };
  }

  const { buffer: outBuffer, ext: extNew } = processed;
  const after = outBuffer.length;
  const newDiskPath = path.join(path.dirname(diskPath), `${photoId}${extNew}`);
  const newUrl = localUrlFor(reserveId, photoId, extNew);

  if (DRY_RUN) {
    return { status: 'dry-run', before, after, newUrl, extOld, extNew, url };
  }

  fs.mkdirSync(path.dirname(newDiskPath), { recursive: true });
  fs.writeFileSync(newDiskPath, outBuffer);

  if (path.resolve(newDiskPath) !== path.resolve(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  if (newUrl !== url) {
    db.prepare('UPDATE photos SET url = ? WHERE id = ? AND reserve_id = ?').run(newUrl, photoId, reserveId);
    clearPhotoCacheForReserve(reserveId);
  }

  return { status: 'ok', before, after, newUrl, extOld, extNew, url };
}

async function main() {
  console.log('optimize-photos', { dryRun: DRY_RUN, limit: LIMIT });

  const backupPath = backupDatabase();
  console.log('Бэкап БД:', backupPath);

  let rows = listLocalPhotoFiles();
  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`К обработке: ${rows.length} файлов в uploads/photos`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const row of rows) {
    const result = await optimizeFile(row);
    if (result.status === 'ok' || result.status === 'dry-run') {
      ok += 1;
      bytesBefore += result.before;
      bytesAfter += result.after;
      const saved = result.before - result.after;
      const pct = result.before ? Math.round((saved / result.before) * 100) : 0;
      console.log(
        `[${result.status}] id=${row.photoId} reserve=${row.reserveId} ${result.before} → ${result.after} B (−${pct}%) ${row.url}${result.newUrl && result.newUrl !== row.url ? ` → ${result.newUrl}` : ''}`,
      );
    } else if (result.status === 'missing') {
      skipped += 1;
      console.warn(`[skip] id=${row.photoId} файл не найден: ${row.url}`);
    } else {
      failed += 1;
      console.error(`[fail] id=${row.photoId} ${result.detail}`);
    }
  }

  const savedTotal = bytesBefore - bytesAfter;
  const pctTotal = bytesBefore ? Math.round((savedTotal / bytesBefore) * 100) : 0;
  console.log('---');
  console.log({
    ok,
    skipped,
    failed,
    bytesBefore,
    bytesAfter,
    savedBytes: savedTotal,
    savedPercent: pctTotal,
    dryRun: DRY_RUN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
