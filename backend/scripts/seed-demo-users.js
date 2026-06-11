/**
 * Создаёт демо-админа и тестового пользователя без регистрации и подтверждения email.
 * Запуск: node scripts/seed-demo-users.js (из каталога backend)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const sqlite = require('better-sqlite3');
const runSchemaMigrate = require('../schemaMigrate');
const { seedDemoUsers, DEFAULTS } = require('../src/services/seedDemoUsers');

const dbPath = path.join(__dirname, '..', 'reserves.db');
const db = new sqlite(dbPath);
db.pragma('foreign_keys = ON');
runSchemaMigrate(db);

const results = seedDemoUsers(db);
db.close();

console.log('Демо-пользователи готовы:');
for (const row of results) {
  console.log(`  ${row.created ? 'создан' : 'обновлён'}: ${row.email} (${row.role})`);
}
console.log('');
console.log('По умолчанию:');
console.log(`  admin: ${DEFAULTS.admin.email} / ${DEFAULTS.admin.password}`);
console.log(`  user:  ${DEFAULTS.user.email} / ${DEFAULTS.user.password}`);
