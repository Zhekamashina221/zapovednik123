const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;
const OUTPUT_EXT = '.webp';
const OUTPUT_MIME = 'image/webp';

/**
 * Сжимает изображение для хранения на диске: поворот по EXIF, ресайз, WebP.
 * Анимированные GIF сохраняются как GIF (с ресайзом кадров).
 */
async function processImageForStorage(buffer, mime) {
  let meta;
  try {
    meta = await sharp(buffer, { animated: true }).metadata();
  } catch {
    throw new Error('INVALID_IMAGE');
  }

  const isAnimatedGif = meta.format === 'gif' && (meta.pages ?? 1) > 1;

  if (isAnimatedGif) {
    const out = await sharp(buffer, { animated: true })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .gif()
      .toBuffer();
    return { buffer: out, mime: 'image/gif', ext: '.gif' };
  }

  const out = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: out, mime: OUTPUT_MIME, ext: OUTPUT_EXT };
}

/**
 * Обработка файла с диска (для batch-скрипта).
 */
async function processImageFile(diskPath) {
  const ext = path.extname(diskPath).toLowerCase();
  const mimeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mime = mimeByExt[ext] || 'image/jpeg';
  const buffer = fs.readFileSync(diskPath);
  return processImageForStorage(buffer, mime);
}

module.exports = {
  MAX_DIMENSION,
  WEBP_QUALITY,
  OUTPUT_EXT,
  OUTPUT_MIME,
  processImageForStorage,
  processImageFile,
};
