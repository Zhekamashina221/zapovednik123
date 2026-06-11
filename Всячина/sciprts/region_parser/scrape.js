/**
 * Скрапинг списка ООПТ с minpriroda.gov.by (ajax-лента по области/району).
 *
 * Формат вывода: JSON (удобно смотреть diff и мержить в БД).
 *   - out/bindings.json — по одному объекту на id: коды сайта + русские подписи как в фильтрах
 *   - out/conflicts.json — один id встретился в разных парах область/район
 *
 * Запуск из каталога backend:
 *   node src/sciprts/region_parser/scrape.js
 *   node src/sciprts/region_parser/scrape.js --region-only --delay 400
 *
 * Опции:
 *   --out <dir>       каталог для JSON (по умолчанию: рядом со скриптом ./out)
 *   --delay <ms>      пауза между HTTP-запросами (по умолчанию 350)
 *   --region-only     только по областям (district пустой), быстрее, район в bindings будет null
 *   --max-pages <n>   страховка пагинации (по умолчанию 80)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const TYPE_FILTERS = [
    'zapovednik',
    'nac_park',
    'zakaznik',
    'zakaznik_republic_role',
    'zakaznik_local_role',
    'pamiatnik_prirodi',
    'pamiatnik_prirodi_republic_role',
    'pamiatnik_prirodi_local_role',
    'botanical',
    'geological',
    'hydrological',
];

const BASE = 'https://minpriroda.gov.by/ru/svg_map-ru/ajax';

const REGIONS_ONLY = [
    {region: 'brest_obl', regionLabel: 'Брестская область'},
    {region: 'vitebsk_obl', regionLabel: 'Витебская область'},
    {region: 'gomel_obl', regionLabel: 'Гомельская область'},
    {region: 'grodno_obl', regionLabel: 'Гродненская область'},
    {region: 'minsk_obl', regionLabel: 'Минская область'},
    {region: 'mogilev_obl', regionLabel: 'Могилевская область'},
];

function parseArgs(argv) {
    const opts = {
        outDir: path.join(__dirname, 'out'),
        delayMs: 600,
        regionOnly: false,
        maxPages: 70,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--region-only') opts.regionOnly = true;
        else if (a === '--out') opts.outDir = path.resolve(argv[++i] || '');
        else if (a === '--delay') opts.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0);
        else if (a === '--max-pages') opts.maxPages = Math.max(1, parseInt(argv[++i], 10) || 80);
    }
    return opts;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(
            url,
            {
                headers: {
                    'User-Agent': 'ZapovednikRegionParser/1.0 (+https://github.com/)',
                    Accept: 'text/html,application/xhtml+xml',
                    'Accept-Language': 'ru-RU,ru;q=0.9',
                },
            },
            (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode} ${url}`));
                    res.resume();
                    return;
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            }
        );
        req.on('error', reject);
        req.setTimeout(60000, () => {
            req.destroy(new Error('timeout'));
        });
    });
}

function buildUrl({region, district, page}) {
    const q = new URLSearchParams();
    q.set('selected_region', region);
    q.set('selected_district', district || '');
    for (const t of TYPE_FILTERS) q.append('selectedInputs[]', t);
    q.set('currPage', String(page));
    q.set('xhr', '1');
    return `${BASE}?${q.toString()}`;
}

function extractReserveIds(html) {
    const ids = new Set();
    const re = /getElement\/(\d+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        ids.add(parseInt(m[1], 10));
    }
    return [...ids].sort((a, b) => a - b);
}

async function fetchAllPagesForSlice({region, district, regionLabel, districtLabel, delayMs, maxPages}) {
    const seenPages = [];
    let page = 0;
    const allIds = new Set();

    while (page < maxPages) {
        const url = buildUrl({region, district, page});
        const html = await fetchText(url);
        const ids = extractReserveIds(html);
        seenPages.push({page, count: ids.length});

        if (ids.length === 0) break;

        let newCount = 0;
        for (const id of ids) {
            if (!allIds.has(id)) newCount++;
            allIds.add(id);
        }

        // Нет новых id — либо конец, либо зацикливание одной страницы
        if (newCount === 0) break;

        page += 1;
        await sleep(delayMs);
    }

    return {
        ids: [...allIds].sort((a, b) => a - b),
        pages: seenPages,
        meta: {region, district: district || null, regionLabel, districtLabel: districtLabel || null},
    };
}

function main() {
    const opts = parseArgs(process.argv);
    const districtsPath = path.join(__dirname, 'districts.json');
    const districts = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));

    const slices = opts.regionOnly
        ? REGIONS_ONLY.map((r) => ({
            region: r.region,
            district: '',
            regionLabel: r.regionLabel,
            districtLabel: null,
        }))
        : districts.map((d) => ({
            region: d.region,
            district: d.district,
            regionLabel: d.regionLabel,
            districtLabel: d.districtLabel,
        }));

    const byId = new Map();
    const conflicts = [];

    (async () => {
        fs.mkdirSync(opts.outDir, {recursive: true});
        console.log(`Slices: ${slices.length}, delay ${opts.delayMs}ms, out: ${opts.outDir}`);

        let sliceIndex = 0;
        for (const slice of slices) {
            sliceIndex += 1;
            const label = slice.district ? `${slice.region} / ${slice.district}` : `${slice.region} (вся область)`;
            process.stdout.write(`[${sliceIndex}/${slices.length}] ${label} ... `);

            const result = await fetchAllPagesForSlice({
                region: slice.region,
                district: slice.district,
                regionLabel: slice.regionLabel,
                districtLabel: slice.districtLabel,
                delayMs: opts.delayMs,
                maxPages: opts.maxPages,
            });

            console.log(`${result.ids.length} id, ${result.pages.length} стр.`);

            for (const id of result.ids) {
                const row = {
                    id,
                    region_code: slice.region,
                    district_code: slice.district || null,
                    region_label: slice.regionLabel,
                    district_label: slice.districtLabel,
                };
                const prev = byId.get(id);
                if (!prev) {
                    byId.set(id, row);
                } else if (prev.region_code === row.region_code && prev.district_code === row.district_code) {
                    // дубликат внутри той же выборки — ок
                } else {
                    conflicts.push({
                        id,
                        a: {region_code: prev.region_code, district_code: prev.district_code},
                        b: {region_code: row.region_code, district_code: row.district_code},
                    });
                    // оставляем первое встреченное (детерминировано порядком slices)
                }
            }

            await sleep(opts.delayMs);
        }

        const bindings = [...byId.values()].sort((a, b) => a.id - b.id);

        fs.writeFileSync(path.join(opts.outDir, 'bindings.json'), JSON.stringify({generatedAt: new Date().toISOString(), count: bindings.length, bindings}, null, 2), 'utf8');
        fs.writeFileSync(path.join(opts.outDir, 'conflicts.json'), JSON.stringify({count: conflicts.length, conflicts}, null, 2), 'utf8');

        console.log(`Готово: ${bindings.length} уникальных id, конфликтов: ${conflicts.length}`);
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

main();
