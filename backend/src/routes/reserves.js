const express = require('express');
const db = require('../../database');
const { optionalAuth } = require('../middleware/auth');
const { getPhotosForReserveId } = require('../services/photos');
const { trackEvent } = require('../services/analytics');
const {
  reserveNameDescriptionSearchSql,
  reserveSearchBindParams,
} = require('../lib/caseInsensitiveLike');

const router = express.Router();
const RESERVE_VIEW_DEDUP_MINUTES = 30;

function getReserveOrderBy(sortBy, sortDir) {
  const safeSortDir = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const orderMap = {
    name: `reserves.name COLLATE NOCASE ${safeSortDir}`,
    has_review: `CASE WHEN reviews_count > 0 THEN 0 ELSE 1 END ASC, reviews_count DESC, reserves.name COLLATE NOCASE ASC`,
    popularity: `views_count DESC, reserves.name COLLATE NOCASE ASC`,
  };
  return orderMap[String(sortBy || 'name')] || orderMap.name;
}

function getGuestSessionKey(req, reserveId) {
  const explicit = String(req.headers['x-session-id'] || '').trim();
  if (explicit) return explicit;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || 'unknown_ip';
  const ua = String(req.headers['user-agent'] || 'unknown_ua').slice(0, 160);
  return `guest:${ip}:${ua}:reserve:${reserveId}`;
}

function escapeLike(value) {
  return String(value).replace(/[%_\\"]/g, (char) => `\\${char}`);
}

function shouldTrackReserveView({ userId, reserveId, sessionKey }) {
  if (userId) {
    const recentByUser = db
      .prepare(
        `SELECT id
         FROM analytics_events
         WHERE event_type = 'reserve_view'
           AND reserve_id = ?
           AND user_id = ?
           AND created_at >= datetime('now', ?)
         LIMIT 1`
      )
      .get(reserveId, userId, `-${RESERVE_VIEW_DEDUP_MINUTES} minutes`);
    return !recentByUser;
  }

  const recentBySession = db
    .prepare(
      `SELECT id
       FROM analytics_events
       WHERE event_type = 'reserve_view'
         AND reserve_id = ?
         AND user_id IS NULL
           AND payload LIKE ? ESCAPE '\\'
         AND created_at >= datetime('now', ?)
       LIMIT 1`
    )
    .get(
      reserveId,
      `%"session_key":"${escapeLike(sessionKey)}"%`,
      `-${RESERVE_VIEW_DEDUP_MINUTES} minutes`,
    );
  return !recentBySession;
}

router.get('/', optionalAuth, (req, res) => {
  const {
    search = '',
    type = '',
    region = '',
    district = '',
    status_text: statusTextFilter = '',
    limit = 12,
    offset = 0,
    include_unpublished: includeUnpublished = '0',
    sort_by: sortBy = 'name',
    sort_dir: sortDir = 'asc',
  } = req.query;

  const shouldPaginate = Number(limit) > 0;
  const finalLimit = shouldPaginate ? Number(limit) : null;
  const finalOffset = shouldPaginate ? Number(offset) : 0;
  const canSeeUnpublished = req.user?.role === 'admin' && String(includeUnpublished) === '1';

  const conditions = [];
  const paramsData = [];
  const paramsCount = [];

  function parseTypeFilter(rawType) {
    if (Array.isArray(rawType)) {
      return rawType.map((value) => String(value).trim()).filter(Boolean);
    }
    const text = String(rawType || '').trim();
    if (!text) return [];
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((value) => String(value).trim()).filter(Boolean);
        }
      } catch (_error) {
        // Fallback to comma-separated parsing.
      }
    }
    return text
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (!canSeeUnpublished) {
    conditions.push('reserves.is_published = 1');
  }
  const searchBind = reserveSearchBindParams(search);
  if (searchBind) {
    conditions.push(reserveNameDescriptionSearchSql('reserves.name', 'reserves.description'));
    paramsData.push(searchBind.like, searchBind.like);
    paramsCount.push(searchBind.like, searchBind.like);
  }
  const parsedTypes = parseTypeFilter(type);

  if (parsedTypes.length) {
    const normalizedTypes = parsedTypes
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean);

    if (normalizedTypes.length) {
      const placeholders = normalizedTypes.map(() => '?').join(', ');
      conditions.push(`LOWER(TRIM(reserves.type)) IN (${placeholders})`);
      paramsData.push(...normalizedTypes);
      paramsCount.push(...normalizedTypes);
    }
  }
  if (region) {
    conditions.push('reserves.region = ?');
    paramsData.push(region);
    paramsCount.push(region);
  }
  if (district) {
    conditions.push('reserves.district LIKE ?');
    paramsData.push(`%${district}%`);
    paramsCount.push(`%${district}%`);
  }

  const statusNorm = String(statusTextFilter || '').trim().toLowerCase();
  if (statusNorm === 'местный') {
    conditions.push(`LOWER(COALESCE(reserves.status_text, '')) LIKE 'местный%'`);
  } else if (statusNorm === 'республиканский') {
    conditions.push(`LOWER(COALESCE(reserves.status_text, '')) LIKE 'республиканский%'`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let sqlData = `
    SELECT
      reserves.*,
      (
        SELECT COUNT(*)
        FROM analytics_events ae
        WHERE ae.reserve_id = reserves.id
          AND ae.event_type = 'reserve_view'
      ) AS views_count,
      (
        SELECT COUNT(*)
        FROM reviews rv
        WHERE rv.reserve_id = reserves.id
      ) AS reviews_count,
      (
        SELECT ROUND(AVG(rv.rating), 1)
        FROM reviews rv
        WHERE rv.reserve_id = reserves.id
      ) AS avg_rating
    FROM reserves
    ${whereClause}
  `;
  const orderBy = `ORDER BY ${getReserveOrderBy(sortBy, sortDir)}`;

  sqlData += ` ${orderBy}`;
  const sqlCount = `SELECT COUNT(*) AS count FROM reserves ${whereClause}`;

  if (shouldPaginate) {
    sqlData += ' LIMIT ? OFFSET ?';
    paramsData.push(finalLimit, finalOffset);
  }

  try {
    const rows = db.prepare(sqlData).all(...paramsData);
    const data = rows.map((reserve) => {
      const entity = {
        ...reserve,
        photos: getPhotosForReserveId(reserve.id),
        is_favorite: false,
      };

      if (req.user?.userId) {
        const favorite = db
          .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND reserve_id = ?')
          .get(req.user.userId, reserve.id);
        entity.is_favorite = !!favorite;
      }
      return entity;
    });

    const total = db.prepare(sqlCount).get(...paramsCount).count;
    return res.json({ success: true, data, total });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  try {
    const reserve = db
      .prepare(
        `SELECT
          reserves.*,
          (
            SELECT COUNT(*)
            FROM analytics_events ae
            WHERE ae.reserve_id = reserves.id
              AND ae.event_type = 'reserve_view'
          ) AS views_count,
          (
            SELECT COUNT(*)
            FROM reviews rv
            WHERE rv.reserve_id = reserves.id
          ) AS reviews_count,
          (
            SELECT ROUND(AVG(rv.rating), 1)
            FROM reviews rv
            WHERE rv.reserve_id = reserves.id
          ) AS avg_rating
         FROM reserves
         WHERE reserves.id = ?`
      )
      .get(id);
    if (!reserve) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }
    if (!reserve.is_published && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    reserve.photos = getPhotosForReserveId(id);
    reserve.is_favorite = false;
    if (req.user?.userId) {
      const favorite = db
        .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND reserve_id = ?')
        .get(req.user.userId, id);
      reserve.is_favorite = !!favorite;
    }

    const userId = req.user?.userId || null;
    const sessionKey = getGuestSessionKey(req, id);
    if (shouldTrackReserveView({ userId, reserveId: id, sessionKey })) {
      trackEvent({
        userId,
        reserveId: id,
        eventType: 'reserve_view',
        payload: userId ? null : { session_key: sessionKey },
      });
      reserve.views_count = Number(reserve.views_count || 0) + 1;
    }

    return res.json({ success: true, data: reserve });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
