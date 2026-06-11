const sqlite = require('better-sqlite3');
const path = require('path');
const runSchemaMigrate = require('./schemaMigrate');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'reserves.db');

let db = null;

function getDb() {
    if (!db) {
        db = new sqlite(DB_PATH, { readonly: false });
        db.pragma('foreign_keys = ON');
        runSchemaMigrate(db);

        const seedFlag = String(process.env.SEED_DEMO_USERS || '').toLowerCase();
        if (seedFlag === '1' || seedFlag === 'true') {
            const { seedDemoUsers } = require('./src/services/seedDemoUsers');
            seedDemoUsers(db);
        }

        // SQLite LIKE is case-insensitive only for ASCII; use JS Unicode lowercasing for Cyrillic etc.
        db.function('unicode_lower', { deterministic: true }, (text) => {
            if (text == null) return null;
            return String(text).toLowerCase();
        });
    }
    return db;
}

module.exports = getDb();
