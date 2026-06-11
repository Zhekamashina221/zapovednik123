const fs = require('fs');
const path = require('path');
const sqlite = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'reserves.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const JSON_FILE = path.join(__dirname, 'oopt.json');

if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Old DB removed');
}

const db = new sqlite(DB_PATH);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
console.log('Schema applied');

if (!fs.existsSync(JSON_FILE)) {
    console.error(`JSON not found: ${JSON_FILE}`);
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const unique = [...new Map(raw.map(item => [item.id, item])).values()];
console.log(`Loaded ${unique.length} unique records`);

function parseGeo(geoRaw) {
    if (!geoRaw) return { lat: null, lng: null };
    let s = String(geoRaw).replace(/Построить маршрут/gi, ' ').trim();
    const m = s.match(/(-?\d+[.,]\d+)\s*[,;\s]\s*(-?\d+[.,]\d+)/);
    if (m) {
        return {
            lat: parseFloat(m[1].replace(',', '.')),
            lng: parseFloat(m[2].replace(',', '.'))
        };
    }
    const nums = s.replace(/[^\d\.\,\-\s]/g, ' ').replace(/,/g, '.').split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
    return nums.length >= 2 ? { lat: nums[0], lng: nums[1] } : { lat: null, lng: null };
}

function parseArea(areaRaw) {
    if (!areaRaw) return null;
    const m = String(areaRaw).match(/[\d\s.,]+/);
    if (!m) return null;
    const num = m[0].replace(/\s/g, '').replace(',', '.');
    return parseFloat(num) || null;
}

function cleanDescription(desc) {
    return desc ? String(desc).replace(/\s*Поделиться\s*\([\s\S]*$/i, '').trim() : null;
}

function cleanPhone(phone) {
    if (!phone) return null;
    const p = String(phone).replace(/\/факс:\s*/i, '').trim();
    return /ул\.|улица|д\./i.test(p) ? null : p;
}

function extractRegionAndDistrict(name, postal_address) {
    let region = null, district = null;
    const full = `${name || ''} ${postal_address || ''}`.toLowerCase();

    const regions = ['витебская', 'минская', 'гродненская', 'брестская', 'гомельская', 'могилёвская'];
    for (const r of regions) {
        if (full.includes(r)) {
            region = r[0].toUpperCase() + r.slice(1) + ' область';
            break;
        }
    }

    const districtMatch = full.match(/([а-яё]+ский район)/i);
    if (districtMatch) {
        district = districtMatch[1][0].toUpperCase() + districtMatch[1].slice(1);
    }

    return { region, district };
}

const insertReserve = db.prepare(`
    INSERT INTO reserves (
        id, name, type, created, status_text, status_date, phone, email,
        latitude, longitude, area, website, postal_address, description,
        region, district
    ) VALUES (
        @id, @name, @type, @created, @status_text, @status_date, @phone, @email,
        @latitude, @longitude, @area, @website, @postal_address, @description,
        @region, @district
    )
    ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, created=excluded.created,
        status_text=excluded.status_text, status_date=excluded.status_date,
        phone=excluded.phone, email=excluded.email, latitude=excluded.latitude,
        longitude=excluded.longitude, area=excluded.area, website=excluded.website,
        postal_address=excluded.postal_address, description=excluded.description,
        region=excluded.region, district=excluded.district
`);

const insertPhoto = db.prepare(`INSERT INTO photos (reserve_id, url) VALUES (?, ?)`);

const insertMany = db.transaction((rows) => {
    let photoCount = 0;
    for (const r of rows) {
        const { lat, lng } = parseGeo(r.geo);
        const area = parseArea(r.area);
        const desc = cleanDescription(r.description);
        const phone = cleanPhone(r.phone);
        const { region, district } = extractRegionAndDistrict(r.name, r.postal_address);

        const statusParts = r.status ? String(r.status).split(',').map(x => x.trim()) : [];
        const reserveData = {
            id: r.id,
            name: r.name || null,
            type: r.type || null,
            created: r.created || null,
            status_text: statusParts[0] || null,
            status_date: statusParts[1] || null,
            phone, email: r.email || null,
            latitude: lat, longitude: lng, area,
            website: (r.website && r.website !== 'https://t.me/minpriroda_belarus') ? r.website : null,
            postal_address: r.postal_address || null,
            description: desc,
            region, district
        };

        insertReserve.run(reserveData);

        const photos = Array.isArray(r.photos) ? r.photos : [];
        for (const url of photos) {
            if (url) {
                insertPhoto.run(r.id, url);
                photoCount++;
            }
        }
    }
    return photoCount;
});

const photosInserted = insertMany(unique);
console.log(`Inserted ${unique.length} reserves, ${photosInserted} photos.`);
db.close();
console.log('Migration completed.');