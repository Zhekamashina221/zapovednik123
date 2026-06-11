const express = require('express');
const db = require('../../database');
const { getPhotosForReserveId } = require('../services/photos');

const router = express.Router();

function getCoverPhotoUrl(reserveIds) {
  for (const id of reserveIds) {
    const urls = getPhotosForReserveId(id);
    if (urls.length) return urls[0];
  }
  return null;
}

function mapRow(row) {
  let reserveIds = [];
  let description = [];
  try {
    reserveIds = JSON.parse(row.reserve_ids);
    if (!Array.isArray(reserveIds)) reserveIds = [];
  } catch {
    reserveIds = [];
  }
  try {
    description = JSON.parse(row.description);
    if (!Array.isArray(description)) description = [String(row.description || '')];
  } catch {
    description = [String(row.description || '')];
  }
  const distanceM =
    row.distance_m != null && Number.isFinite(Number(row.distance_m))
      ? Number(row.distance_m)
      : null;
  const durationS =
    row.duration_s != null && Number.isFinite(Number(row.duration_s))
      ? Number(row.duration_s)
      : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    teaser: row.teaser || '',
    profile: row.profile,
    reserveIds,
    regionLabel: row.region_label,
    description,
    listDistance: row.list_distance || null,
    listDuration: row.list_duration || null,
    distanceM,
    durationS,
    coverPhotoUrl: getCoverPhotoUrl(reserveIds),
  };
}

const LIST_SELECT = `SELECT id, slug, title, teaser, profile, reserve_ids, region_label, description,
  list_distance, list_duration, distance_m, duration_s`;

router.get('/', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `${LIST_SELECT}
         FROM curated_routes
         WHERE is_published = 1
         ORDER BY sort_order ASC, id ASC`,
      )
      .all();
    return res.json({ success: true, data: rows.map(mapRow) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/slug/:slug', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Invalid slug' });
  }
  try {
    const row = db
      .prepare(
        `${LIST_SELECT}
         FROM curated_routes
         WHERE slug = ? AND is_published = 1`,
      )
      .get(slug);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Маршрут не найден' });
    }
    return res.json({ success: true, data: mapRow(row) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
