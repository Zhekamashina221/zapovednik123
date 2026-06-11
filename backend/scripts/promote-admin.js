/**
 * Назначает роль admin существующему пользователю.
 * Задайте в .env ADMIN_EMAIL или ADMIN_USER_ID, затем: npm run db:promote-admin
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const sqlite = require('better-sqlite3');
const runSchemaMigrate = require('../schemaMigrate');

const email = process.env.ADMIN_EMAIL && String(process.env.ADMIN_EMAIL).trim();
const userIdRaw = process.env.ADMIN_USER_ID && String(process.env.ADMIN_USER_ID).trim();

if (!email && !userIdRaw) {
  console.error('Укажите в .env ADMIN_EMAIL или ADMIN_USER_ID (существующий пользователь).');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'reserves.db');
const db = new sqlite(dbPath);
db.pragma('foreign_keys = ON');
runSchemaMigrate(db);

let user;
if (userIdRaw) {
  const id = Number.parseInt(userIdRaw, 10);
  if (Number.isNaN(id)) {
    console.error('ADMIN_USER_ID должен быть числом.');
    process.exit(1);
  }
  user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id);
} else {
  user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);
}

if (!user) {
  console.error('Пользователь не найден в reserves.db.');
  process.exit(1);
}

const prev = user.role;
db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user.id);

console.log(`OK: пользователь id=${user.id} (${user.email}) → role=admin (было: ${prev || 'null'})`);
db.close();
