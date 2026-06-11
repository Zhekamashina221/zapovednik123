const fs = require('fs');
const path = require('path');
const db = require('../../database');
const { clearPhotoCacheForReserve } = require('./photos');
const { processImageForStorage } = require('./imageProcessing');

const BACKEND_ROOT = path.join(__dirname, '../..');
const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads', 'photos');
const LOCAL_PREFIX = '/uploads/photos/';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function isImageBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return true;
  }
  return false;
}

function diskPathFromUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith(LOCAL_PREFIX)) return null;
  return path.join(BACKEND_ROOT, url.replace(/^\//, ''));
}

function deletePhotoFile(url) {
  const diskPath = diskPathFromUrl(url);
  if (diskPath && fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }
}

function listPhotosForReserve(reserveId) {
  return db
    .prepare('SELECT id, reserve_id, url FROM photos WHERE reserve_id = ? ORDER BY id ASC')
    .all(reserveId);
}

function reserveExists(reserveId) {
  return !!db.prepare('SELECT 1 FROM reserves WHERE id = ?').get(reserveId);
}

async function saveUploadedPhoto(reserveId, buffer, mime) {
  if (!buffer?.length) {
    throw new Error('EMPTY_FILE');
  }
  if (!ALLOWED_MIME.has(String(mime || '').toLowerCase())) {
    throw new Error('INVALID_MIME');
  }
  if (!isImageBuffer(buffer)) {
    throw new Error('INVALID_IMAGE');
  }

  const processed = await processImageForStorage(buffer, mime);
  const { buffer: outBuffer, ext } = processed;

  const insert = db.prepare('INSERT INTO photos (reserve_id, url) VALUES (?, ?)');
  const info = insert.run(reserveId, '');
  const photoId = Number(info.lastInsertRowid);

  const dir = path.join(UPLOADS_ROOT, String(reserveId));
  fs.mkdirSync(dir, { recursive: true });
  const diskPath = path.join(dir, `${photoId}${ext}`);
  const publicUrl = `${LOCAL_PREFIX}${reserveId}/${photoId}${ext}`;

  try {
    fs.writeFileSync(diskPath, outBuffer);
    db.prepare('UPDATE photos SET url = ? WHERE id = ?').run(publicUrl, photoId);
  } catch (err) {
    db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    throw err;
  }

  clearPhotoCacheForReserve(reserveId);
  return { id: photoId, reserve_id: reserveId, url: publicUrl };
}

function deletePhoto(reserveId, photoId) {
  const row = db
    .prepare('SELECT id, reserve_id, url FROM photos WHERE id = ? AND reserve_id = ?')
    .get(photoId, reserveId);
  if (!row) return false;

  deletePhotoFile(row.url);
  db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
  clearPhotoCacheForReserve(reserveId);
  return true;
}

function deleteAllPhotosForReserve(reserveId) {
  const rows = listPhotosForReserve(reserveId);
  for (const row of rows) {
    deletePhotoFile(row.url);
  }
  db.prepare('DELETE FROM photos WHERE reserve_id = ?').run(reserveId);
  clearPhotoCacheForReserve(reserveId);
}

module.exports = {
  UPLOADS_ROOT,
  LOCAL_PREFIX,
  ALLOWED_MIME,
  listPhotosForReserve,
  reserveExists,
  saveUploadedPhoto,
  deletePhoto,
  deleteAllPhotosForReserve,
  deletePhotoFile,
  diskPathFromUrl,
};
