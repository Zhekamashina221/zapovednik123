const Database = require('better-sqlite3');
const express = require('express');

const app = express();
const db = new Database('reserves.db');

// Функция: таблицы + пример строки
function getTablesWithSample() {
    const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();

    const result = {};

    for (const {name} of tables) {
        try {
            const row = db
                .prepare(`SELECT *
                          FROM ${name} LIMIT 1`)
                .get();

            result[name] = row || null;
        } catch (e) {
            result[name] = {error: e.message};
        }
    }

    return result;
}

// endpoint
app.get('/db-preview', (req, res) => {
    const data = getTablesWithSample();
    res.json(data);
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});