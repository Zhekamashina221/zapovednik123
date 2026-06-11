const fs = require('fs');
const path = require('path');
const sqlite = require('better-sqlite3');
const runSchemaMigrate = require('../schemaMigrate');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'reserves.db');

if (fs.existsSync(dbPath)) {
  return;
}

const schemaPath = path.join(__dirname, '..', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.warn('[init-db] schema.sql not found, skipping empty database creation');
  return;
}

console.log(`[init-db] Creating database at ${dbPath}`);
const db = new sqlite(dbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf8'));
runSchemaMigrate(db);
db.close();
console.log('[init-db] Database initialized');
