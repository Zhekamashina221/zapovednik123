const express = require('express');
const db = require('../../database');
const { protectRoute, requireVerifiedEmail } = require('../middleware/auth');
const { trackEvent } = require('../services/analytics');

const router = express.Router();
const MAX_SAVED_ROUTE_GEOJSON_CHARS = 512000;
const ALLOWED_ROUTE_PROFILES = new Set(['driving-car', 'foot-walking']);

function isValidRouteGeojson(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.type !== 'FeatureCollection' || !Array.isArray(value.features)) return false;
  return value.features.length > 0;
}

router.get('/', protectRoute, requireVerifiedEmail, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT
          sr.id,
          sr.reserve_id,
          sr.profile,
          sr.title,
          sr.distance_m,
          sr.duration_s,
          sr.created_at,
          r.name AS reserve_name
         FROM user_saved_routes sr
         JOIN reserves r ON r.id = sr.reserve_id
         WHERE sr.user_id = ?
         ORDER BY sr.created_at DESC, sr.id DESC`
      )
      .all(req.user.userId);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/', protectRoute, requireVerifiedEmail, (req, res) => {
  const { reserve_id: reserveIdRaw, profile, title, geojson, distance_m: distanceM, duration_s: durationS } =
    req.body || {};
  const reserveId = Number.parseInt(String(reserveIdRaw), 10);
  const profileNorm = typeof profile === 'string' ? profile.trim() : '';

  if (Number.isNaN(reserveId) || !ALLOWED_ROUTE_PROFILES.has(profileNorm)) {
    return res.status(400).json({ success: false, error: 'Укажите reserve_id и допустимый profile.' });
  }
  if (!isValidRouteGeojson(geojson)) {
    return res.status(400).json({ success: false, error: 'Передайте geojson в формате FeatureCollection.' });
  }

  const geojsonStr = JSON.stringify(geojson);
  if (geojsonStr.length > MAX_SAVED_ROUTE_GEOJSON_CHARS) {
    return res.status(413).json({ success: false, error: 'Маршрут слишком большой для сохранения.' });
  }

  const titleTrim = title != null ? String(title).trim().slice(0, 200) : '';
  const dm = distanceM != null && distanceM !== '' ? Number(distanceM) : null;
  const ds = durationS != null && durationS !== '' ? Number(durationS) : null;
  const safeDm = Number.isFinite(dm) ? dm : null;
  const safeDs = Number.isFinite(ds) ? ds : null;

  try {
    const reserve = db.prepare('SELECT id FROM reserves WHERE id = ?').get(reserveId);
    if (!reserve) {
      return res.status(404).json({ success: false, error: 'Заповедник не найден.' });
    }

    const info = db
      .prepare(
        `INSERT INTO user_saved_routes (user_id, reserve_id, profile, title, geojson, distance_m, duration_s)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.userId, reserveId, profileNorm, titleTrim || null, geojsonStr, safeDm, safeDs);

    trackEvent({
      userId: req.user.userId,
      reserveId,
      eventType: 'saved_route_create',
      payload: { saved_route_id: info.lastInsertRowid, profile: profileNorm },
    });

    return res.status(201).json({
      success: true,
      data: { id: info.lastInsertRowid },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:id', protectRoute, requireVerifiedEmail, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid route ID' });
  }
  try {
    const row = db
      .prepare(
        `SELECT
          sr.id,
          sr.reserve_id,
          sr.profile,
          sr.title,
          sr.geojson,
          sr.distance_m,
          sr.duration_s,
          sr.created_at,
          r.name AS reserve_name
         FROM user_saved_routes sr
         JOIN reserves r ON r.id = sr.reserve_id
         WHERE sr.id = ? AND sr.user_id = ?`
      )
      .get(id, req.user.userId);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Маршрут не найден.' });
    }
    let parsedGeojson;
    try {
      parsedGeojson = JSON.parse(row.geojson);
    } catch {
      return res.status(500).json({ success: false, error: 'Некорректные данные маршрута.' });
    }
    return res.json({
      success: true,
      data: {
        id: row.id,
        reserve_id: row.reserve_id,
        reserve_name: row.reserve_name,
        profile: row.profile,
        title: row.title,
        distance_m: row.distance_m,
        duration_s: row.duration_s,
        created_at: row.created_at,
        geojson: parsedGeojson,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/:id', protectRoute, requireVerifiedEmail, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid route ID' });
  }
  try {
    const row = db.prepare('SELECT id, reserve_id FROM user_saved_routes WHERE id = ? AND user_id = ?').get(
      id,
      req.user.userId,
    );
    if (!row) {
      return res.status(404).json({ success: false, error: 'Маршрут не найден.' });
    }
    db.prepare('DELETE FROM user_saved_routes WHERE id = ?').run(id);
    trackEvent({
      userId: req.user.userId,
      reserveId: row.reserve_id,
      eventType: 'saved_route_delete',
      payload: { saved_route_id: id },
    });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
