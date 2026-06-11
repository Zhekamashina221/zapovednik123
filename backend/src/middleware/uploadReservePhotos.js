const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 20;

const uploadReservePhotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype || '');
    cb(null, ok);
  },
});

module.exports = { uploadReservePhotos, MAX_FILE_SIZE, MAX_FILES };
