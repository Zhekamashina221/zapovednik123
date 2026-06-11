/**
 * Применяет region/district из region_parser/out/bindings.json к таблице reserves.
 *
 * Перед изменениями копирует БД в файл reserves.db.bak.<timestamp> рядом с целевой БД.
 *
 * Пропуск: если у строки уже заполнены И region, И district (непустые после trim) — не трогаем, пишем в лог.
 *
 * Запуск из каталога backend:
 *   node src/sciprts/region_parser/apply_bindings.js
 *   node src/sciprts/region_parser/apply_bindings.js --dry-run
 *   node src/sciprts/region_parser/apply_bindings.js --db path/to/reserves.db --bindings path/to/bindings.json
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArgs(argv) {
  const opts = {
    dbPath: path.join(__dirname, '..', '..', '..', 'reserves.db'),
    bindingsPath: path.join(__dirname, 'out', 'bindings.json'),
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--db') opts.dbPath = path.resolve(argv[++i] || '');
    else if (a === '--bindings') opts.bindingsPath = path.resolve(argv[++i] || '');
  }
  return opts;
}

function nonEmpty(s) {
  return s != null && String(s).trim() !== '';
}

function main() {
  const opts = parseArgs(process.argv);

  if (!fs.existsSync(opts.bindingsPath)) {
    console.error(`Файл bindings не найден: ${opts.bindingsPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(opts.dbPath)) {
    console.error(`БД не найдена: ${opts.dbPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(opts.bindingsPath, 'utf8'));
  const bindings = Array.isArray(raw.bindings) ? raw.bindings : [];
  if (!bindings.length) {
    console.error('В JSON нет массива bindings или он пуст.');
    process.exit(1);
  }

  const backupPath = `${opts.dbPath}.bak.${Date.now()}`;
  if (!opts.dryRun) {
    fs.copyFileSync(opts.dbPath, backupPath);
    console.log(`Бэкап создан: ${backupPath}`);
  } else {
    console.log('Режим --dry-run: бэкап и UPDATE не выполняются.');
  }

  const db = new Database(opts.dbPath, { readonly: opts.dryRun });
  const selectRow = db.prepare('SELECT id, region, district FROM reserves WHERE id = ?');
  const updateBoth = db.prepare('UPDATE reserves SET region = ?, district = ? WHERE id = ?');
  const updateRegionOnly = db.prepare('UPDATE reserves SET region = ? WHERE id = ?');

  let updated = 0;
  let skippedBothFilled = 0;
  let missingInDb = 0;
  const skippedIds = [];

  const applyBatch = () => {
    for (const row of bindings) {
      const id = row.id;
      const regionLabel = row.region_label != null ? String(row.region_label).trim() : '';
      const districtLabel =
        row.district_label != null && String(row.district_label).trim() !== ''
          ? String(row.district_label).trim()
          : null;

      const cur = selectRow.get(id);
      if (!cur) {
        missingInDb += 1;
        console.log(`[нет в БД] id=${id}`);
        continue;
      }

      if (nonEmpty(cur.region) && nonEmpty(cur.district)) {
        skippedBothFilled += 1;
        skippedIds.push({
          id,
          region: cur.region,
          district: cur.district,
        });
        console.log(
          `[пропуск, уже заполнено] id=${id} region="${cur.region}" district="${cur.district}"`
        );
        continue;
      }

      if (opts.dryRun) {
        const dNote = districtLabel ?? '(только region — district в JSON пуст)';
        console.log(`[dry-run UPDATE] id=${id} region="${regionLabel}" district="${dNote}"`);
        updated += 1;
        continue;
      }

      if (districtLabel) {
        updateBoth.run(regionLabel, districtLabel, id);
      } else {
        updateRegionOnly.run(regionLabel, id);
      }
      updated += 1;
      console.log(`[обновлено] id=${id} region="${regionLabel}" district="${districtLabel ?? '—'}"`);
    }
  };

  if (opts.dryRun) {
    applyBatch();
  } else {
    db.transaction(applyBatch)();
  }

  db.close();

  console.log('---');
  console.log(`Итого bindings: ${bindings.length}`);
  if (opts.dryRun) {
    console.log(`Было бы обновлено строк: ${updated}`);
  } else {
    console.log(`Обновлено строк: ${updated}`);
  }
  console.log(`Пропущено (region и district уже были): ${skippedBothFilled}`);
  console.log(`Нет в БД: ${missingInDb}`);

  if (skippedIds.length) {
    const reportPath = path.join(path.dirname(opts.bindingsPath), 'apply_skipped.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: opts.dryRun, skipped: skippedIds }, null, 2),
      'utf8'
    );
    console.log(`Список пропущенных id сохранён: ${reportPath}`);
  }
}

main();
