/**
 * Очищает пользовательские данные, оставляя каталог ООПТ.
 * Запуск: node scripts/sanitize-db.js (из каталога backend)
 * Перед запуском: npm run db:backup
 */
const sqlite = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'reserves.db');

const KEEP_TABLES = ['reserves', 'photos', 'curated_routes'];

const CLEAR_TABLES = [
  'analytics_events',
  'admin_audit_logs',
  'user_saved_routes',
  'favorites',
  'reviews',
  'refresh_tokens',
  'users',
];

function countRows(db, table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

function main() {
  const db = new sqlite(DB_PATH);
  db.pragma('foreign_keys = ON');

  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);

  console.log('Таблицы:', tables.join(', '));
  console.log('--- До очистки ---');
  for (const table of [...KEEP_TABLES, ...CLEAR_TABLES]) {
    if (tables.includes(table)) {
      console.log(`${table}: ${countRows(db, table)}`);
    }
  }

  const clearExisting = CLEAR_TABLES.filter((table) => tables.includes(table));
  const wipe = db.transaction(() => {
    for (const table of clearExisting) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of clearExisting) {
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(table);
    }
  });
  wipe();

  console.log('--- После очистки ---');
  for (const table of [...KEEP_TABLES, ...CLEAR_TABLES]) {
    if (tables.includes(table)) {
      console.log(`${table}: ${countRows(db, table)}`);
    }
  }

  db.close();
  console.log('Готово. Каталог (reserves, photos, curated_routes) сохранён.');
}

main();
