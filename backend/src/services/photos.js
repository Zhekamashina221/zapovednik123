const db = require('../../database');

const photoCache = new Map();

function getPhotosForReserveId(reserveId) {
  if (photoCache.has(reserveId)) {
    return photoCache.get(reserveId);
  }
  const urls = db
    .prepare('SELECT url FROM photos WHERE reserve_id = ?')
    .all(reserveId)
    .map((row) => row.url);
  photoCache.set(reserveId, urls);
  return urls;
}

function clearPhotoCacheForReserve(reserveId) {
  photoCache.delete(reserveId);
}

module.exports = {
  getPhotosForReserveId,
  clearPhotoCacheForReserve,
};
