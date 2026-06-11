/**
 * Копирует reserves.db в reserves.db.backup.<timestamp> рядом с файлом.
 * Запуск: node scripts/backup-reserves-db.js (из каталога backend)
 */
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'reserves.db')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dest = `${DB_PATH}.backup.${stamp}`

if (!fs.existsSync(DB_PATH)) {
  console.error('Файл не найден:', DB_PATH)
  process.exit(1)
}
fs.copyFileSync(DB_PATH, dest)
console.log('Бэкап создан:', dest)
