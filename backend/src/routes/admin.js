const express = require('express');
const db = require('../../database');
const { protectRoute, requireAdmin } = require('../middleware/auth');
const {
  reserveNameDescriptionSearchSql,
  reserveSearchBindParams,
} = require('../lib/caseInsensitiveLike');
const { computeCuratedRouteMetrics } = require('../services/curatedRouteOrs');
const {
  listPhotosForReserve,
  reserveExists,
  saveUploadedPhoto,
  deletePhoto,
  deleteAllPhotosForReserve,
} = require('../services/reservePhotos');
const { uploadReservePhotos } = require('../middleware/uploadReservePhotos');

const router = express.Router();

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CURATED_POINTS = 10;
const MIN_CURATED_POINTS = 2;

function parseReserveIds(body) {
  if (Array.isArray(body.reserveIds) && body.reserveIds.length) {
    return body.reserveIds
      .map((x) => parseInt(String(x), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  if (typeof body.reserveIds === 'string' && body.reserveIds.trim()) {
    return body.reserveIds
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
}

function validateReserveIds(ids) {
  if (ids.length < MIN_CURATED_POINTS) {
    return `Укажите минимум ${MIN_CURATED_POINTS} id объектов в порядке маршрута`;
  }
  if (ids.length > MAX_CURATED_POINTS) {
    return `Не более ${MAX_CURATED_POINTS} точек (лимит OpenRouteService)`;
  }
  const stmt = db.prepare('SELECT id FROM reserves WHERE id = ?');
  for (const id of ids) {
    if (!stmt.get(id)) return `Объект с id ${id} не найден в базе`;
  }
  return null;
}

function parseDescriptionArray(body) {
  if (Array.isArray(body.description)) {
    return body.description.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof body.description === 'string') {
    const parts = body.description.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : [];
  }
  return [];
}

router.use(protectRoute, requireAdmin);

function writeAuditLog({ adminUserId, action, targetType, targetId = null, payload = null }) {
  db.prepare(
    `INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, payload)
     VALUES (?, ?, ?, ?, ?)`
  ).run(adminUserId, action, targetType, targetId, payload ? JSON.stringify(payload) : null);
}

router.get('/reserves', (req, res) => {
  const {
    search = '',
    region = '',
    district = '',
    type = '',
    include_unpublished: includeUnpublished = '1',
  } = req.query;
  const conditions = [];
  const params = [];

  const pubFilter = String(req.query.is_published ?? '').trim();
  if (pubFilter === '0') {
    conditions.push('is_published = 0');
  } else if (pubFilter === '1') {
    conditions.push('is_published = 1');
  } else if (String(includeUnpublished) !== '1') {
    conditions.push('is_published = 1');
  }
  const searchBind = reserveSearchBindParams(search);
  if (searchBind) {
    conditions.push(reserveNameDescriptionSearchSql('name', 'description'));
    params.push(searchBind.like, searchBind.like);
  }
  if (region) {
    conditions.push('region = ?');
    params.push(region);
  }
  if (district) {
    conditions.push('district = ?');
    params.push(district);
  }
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const data = db
      .prepare(
        `SELECT *
         FROM reserves
         ${whereClause}
         ORDER BY name COLLATE NOCASE ASC`
      )
      .all(...params);
    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/reserves', (req, res) => {
  const {
    name,
    type = null,
    created = null,
    status_text = null,
    status_date = null,
    phone = null,
    email = null,
    latitude = null,
    longitude = null,
    area = null,
    website = null,
    postal_address = null,
    description = null,
    region = null,
    district = null,
    is_published: isPublished = 1,
  } = req.body || {};

  const parsedLatitude = latitude !== null && latitude !== '' ? Number(latitude) : null;
  const parsedLongitude = longitude !== null && longitude !== '' ? Number(longitude) : null;
  const parsedArea = area !== null && area !== '' ? Number(area) : null;

  if (!name || !type || !description || parsedLatitude === null || parsedLongitude === null || parsedArea === null) {
    return res.status(400).json({
      success: false,
      error: 'name, type, description, latitude, longitude and area are required',
    });
  }
  if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude) || Number.isNaN(parsedArea)) {
    return res.status(400).json({ success: false, error: 'latitude, longitude and area must be valid numbers' });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO reserves (
          name, type, created, status_text, status_date, phone, email, latitude, longitude,
          area, website, postal_address, description, region, district, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        type,
        created,
        status_text,
        status_date,
        phone,
        email,
        parsedLatitude,
        parsedLongitude,
        parsedArea,
        website,
        postal_address,
        description,
        region,
        district,
        isPublished ? 1 : 0
      );

    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'reserve_create',
      targetType: 'reserve',
      targetId: info.lastInsertRowid,
      payload: { name, region, district, is_published: isPublished ? 1 : 0 },
    });

    return res.status(201).json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/reserves/:id', (req, res) => {
  const reserveId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(reserveId)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  const allowedFields = [
    'name',
    'type',
    'created',
    'status_text',
    'status_date',
    'phone',
    'email',
    'latitude',
    'longitude',
    'area',
    'website',
    'postal_address',
    'description',
    'region',
    'district',
    'is_published',
  ];

  const updates = [];
  const params = [];
  const requiredFields = ['name', 'type', 'description', 'latitude', 'longitude', 'area'];
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (requiredFields.includes(field) && (req.body[field] === null || req.body[field] === '')) {
        return res.status(400).json({ success: false, error: `${field} cannot be empty` });
      }
      if (['latitude', 'longitude', 'area'].includes(field)) {
        const parsed = Number(req.body[field]);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ success: false, error: `${field} must be a valid number` });
        }
        updates.push(`${field} = ?`);
        params.push(parsed);
        continue;
      }
      updates.push(`${field} = ?`);
      params.push(field === 'is_published' ? (req.body[field] ? 1 : 0) : req.body[field]);
    }
  }
  if (!updates.length) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  params.push(reserveId);
  try {
    const info = db.prepare(`UPDATE reserves SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    if (!info.changes) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'reserve_update',
      targetType: 'reserve',
      targetId: reserveId,
      payload: req.body,
    });

    return res.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/reserves/:id', (req, res) => {
  const reserveId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(reserveId)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  try {
    if (!reserveExists(reserveId)) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    deleteAllPhotosForReserve(reserveId);

    const info = db.prepare('DELETE FROM reserves WHERE id = ?').run(reserveId);
    if (!info.changes) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'reserve_delete',
      targetType: 'reserve',
      targetId: reserveId,
    });

    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

function parseReserveIdParam(req, res) {
  const reserveId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(reserveId)) {
    res.status(400).json({ success: false, error: 'Invalid reserve ID' });
    return null;
  }
  return reserveId;
}

function photoUploadErrorMessage(err) {
  if (!err) return 'Ошибка загрузки фото';
  if (err.code === 'LIMIT_FILE_SIZE') return 'Файл слишком большой (макс. 10 МБ)';
  if (err.code === 'LIMIT_FILE_COUNT') return 'Слишком много файлов за один раз';
  if (err.message === 'INVALID_MIME') return 'Допустимы только JPEG, PNG, WebP и GIF';
  if (err.message === 'INVALID_IMAGE') return 'Файл не является изображением';
  if (err.message === 'EMPTY_FILE') return 'Пустой файл';
  return err.message || 'Ошибка загрузки фото';
}

router.get('/reserves/:id/photos', (req, res) => {
  const reserveId = parseReserveIdParam(req, res);
  if (reserveId === null) return undefined;

  try {
    if (!reserveExists(reserveId)) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }
    const photos = listPhotosForReserve(reserveId);
    return res.json({ success: true, data: photos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/reserves/:id/photos', (req, res) => {
  const reserveId = parseReserveIdParam(req, res);
  if (reserveId === null) return undefined;

  uploadReservePhotos.array('photos', 20)(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, error: photoUploadErrorMessage(multerErr) });
    }

    try {
      if (!reserveExists(reserveId)) {
        return res.status(404).json({ success: false, error: 'Reserve not found' });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        return res.status(400).json({ success: false, error: 'Выберите хотя бы одно изображение' });
      }

      const saved = [];
      const errors = [];

      for (const file of files) {
        try {
          saved.push(await saveUploadedPhoto(reserveId, file.buffer, file.mimetype));
        } catch (err) {
          errors.push({ name: file.originalname, error: photoUploadErrorMessage(err) });
        }
      }

      if (saved.length) {
        writeAuditLog({
          adminUserId: req.user.userId,
          action: 'reserve_photos_upload',
          targetType: 'reserve',
          targetId: reserveId,
          payload: { count: saved.length, photoIds: saved.map((p) => p.id) },
        });
      }

      if (!saved.length) {
        return res.status(400).json({
          success: false,
          error: errors[0]?.error || 'Не удалось загрузить фото',
          data: { errors },
        });
      }

      return res.status(201).json({
        success: true,
        data: { photos: saved, errors: errors.length ? errors : undefined },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

router.delete('/reserves/:id/photos/:photoId', (req, res) => {
  const reserveId = parseReserveIdParam(req, res);
  if (reserveId === null) return undefined;

  const photoId = Number.parseInt(req.params.photoId, 10);
  if (Number.isNaN(photoId)) {
    return res.status(400).json({ success: false, error: 'Invalid photo ID' });
  }

  try {
    const removed = deletePhoto(reserveId, photoId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'reserve_photo_delete',
      targetType: 'reserve',
      targetId: reserveId,
      payload: { photoId },
    });

    return res.json({ success: true, data: { deleted: true, photoId } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/users', (_req, res) => {
  try {
    const users = db
      .prepare(
        `SELECT id, email, name, role, avatar_url, is_blocked
         FROM users
         ORDER BY id DESC`
      )
      .all();
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/users/:id/role', (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const nextRole = String(req.body?.role || '').trim();
  if (Number.isNaN(userId) || !nextRole) {
    return res.status(400).json({ success: false, error: 'Invalid request payload' });
  }
  if (!['user', 'admin'].includes(nextRole)) {
    return res.status(400).json({ success: false, error: 'Unsupported role' });
  }
  if (req.user.userId === userId) {
    return res.status(400).json({ success: false, error: 'Cannot change your own role' });
  }

  try {
    const targetUser = db.prepare('SELECT id, role, is_blocked FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (targetUser.role === 'admin' && nextRole !== 'admin') {
      const adminsCount = db
        .prepare('SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_blocked = 0')
        .get('admin').count;
      if (adminsCount <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot remove last active admin' });
      }
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(nextRole, userId);
    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'user_role_change',
      targetType: 'user',
      targetId: userId,
      payload: { role: nextRole },
    });
    return res.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/users/:id/block', (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const isBlocked = req.body?.is_blocked ? 1 : 0;
  if (Number.isNaN(userId)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }
  if (req.user.userId === userId) {
    return res.status(400).json({ success: false, error: 'Cannot change your own block status' });
  }

  try {
    const targetUser = db.prepare('SELECT id, role, is_blocked FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (targetUser.role === 'admin' && isBlocked) {
      const activeAdmins = db
        .prepare('SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_blocked = 0')
        .get('admin').count;
      if (activeAdmins <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot block last active admin' });
      }
    }

    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(isBlocked, userId);
    writeAuditLog({
      adminUserId: req.user.userId,
      action: isBlocked ? 'user_block' : 'user_unblock',
      targetType: 'user',
      targetId: userId,
      payload: { is_blocked: isBlocked },
    });
    return res.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/reviews', (req, res) => {
  const {
    status = '',
    search = '',
    reserve_id: reserveIdRaw = '',
    user_id: userIdRaw = '',
    limit = 50,
    offset = 0,
  } = req.query;

  const conditions = [];
  const params = [];
  const countParams = [];
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const normalizedStatus = String(status).trim().toLowerCase();

  if (normalizedStatus && ['pending', 'approved', 'hidden', 'rejected'].includes(normalizedStatus)) {
    conditions.push('rv.status = ?');
    params.push(normalizedStatus);
    countParams.push(normalizedStatus);
  }

  const reserveId = Number.parseInt(String(reserveIdRaw), 10);
  if (Number.isFinite(reserveId)) {
    conditions.push('rv.reserve_id = ?');
    params.push(reserveId);
    countParams.push(reserveId);
  }

  const userId = Number.parseInt(String(userIdRaw), 10);
  if (Number.isFinite(userId)) {
    conditions.push('rv.user_id = ?');
    params.push(userId);
    countParams.push(userId);
  }

  if (search) {
    conditions.push('(rv.comment LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR r.name LIKE ?)');
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue);
    countParams.push(searchValue, searchValue, searchValue, searchValue);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const data = db
      .prepare(
        `SELECT
          rv.id,
          rv.reserve_id,
          rv.user_id,
          rv.rating,
          rv.comment,
          rv.status,
          rv.created_at,
          rv.updated_at,
          rv.moderated_at,
          rv.moderated_by,
          u.email AS user_email,
          u.name AS user_name,
          r.name AS reserve_name,
          mu.email AS moderated_by_email
        FROM reviews rv
        JOIN users u ON u.id = rv.user_id
        JOIN reserves r ON r.id = rv.reserve_id
        LEFT JOIN users mu ON mu.id = rv.moderated_by
        ${whereClause}
        ORDER BY rv.created_at DESC, rv.id DESC
        LIMIT ? OFFSET ?`
      )
      .all(...params, safeLimit, safeOffset);

    const total = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         JOIN reserves r ON r.id = rv.reserve_id
         ${whereClause}`
      )
      .get(...countParams).count;

    return res.json({ success: true, data, total, limit: safeLimit, offset: safeOffset });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/reviews/:id/status', (req, res) => {
  const reviewId = Number.parseInt(req.params.id, 10);
  const status = String(req.body?.status || '')
    .trim()
    .toLowerCase();

  if (Number.isNaN(reviewId) || !['pending', 'approved', 'hidden', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid review ID or status' });
  }

  try {
    const review = db
      .prepare('SELECT id, status, user_id, reserve_id, comment FROM reviews WHERE id = ?')
      .get(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    db.prepare(
      `UPDATE reviews
       SET status = ?, moderated_by = ?, moderated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(status, req.user.userId, reviewId);

    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'review_moderate',
      targetType: 'review',
      targetId: reviewId,
      payload: {
        prev_status: review.status,
        next_status: status,
        review_user_id: review.user_id,
        reserve_id: review.reserve_id,
      },
    });

    return res.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/audit-logs', (req, res) => {
  const {
    action = '',
    target_type: targetType = '',
    admin_user_id: adminUserIdRaw = '',
    from = '',
    to = '',
    limit = 100,
    offset = 0,
  } = req.query;

  const conditions = [];
  const params = [];
  const countParams = [];
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  if (action) {
    conditions.push('l.action = ?');
    params.push(action);
    countParams.push(action);
  }
  if (targetType) {
    conditions.push('l.target_type = ?');
    params.push(targetType);
    countParams.push(targetType);
  }
  const adminUserId = Number.parseInt(String(adminUserIdRaw), 10);
  if (Number.isFinite(adminUserId)) {
    conditions.push('l.admin_user_id = ?');
    params.push(adminUserId);
    countParams.push(adminUserId);
  }
  if (from) {
    conditions.push('l.created_at >= ?');
    params.push(from);
    countParams.push(from);
  }
  if (to) {
    conditions.push("l.created_at <= datetime(?, '+1 day')");
    params.push(to);
    countParams.push(to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const data = db
      .prepare(
        `SELECT
          l.id,
          l.admin_user_id,
          l.action,
          l.target_type,
          l.target_id,
          l.payload,
          l.created_at,
          u.email AS admin_email,
          u.name AS admin_name
        FROM admin_audit_logs l
        JOIN users u ON u.id = l.admin_user_id
        ${whereClause}
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT ? OFFSET ?`
      )
      .all(...params, safeLimit, safeOffset);

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM admin_audit_logs l ${whereClause}`)
      .get(...countParams).count;

    return res.json({ success: true, data, total, limit: safeLimit, offset: safeOffset });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/dashboard', (_req, res) => {
  try {
    const usersTotal = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const usersActive = db.prepare('SELECT COUNT(*) AS count FROM users WHERE is_blocked = 0').get().count;
    const reservesTotal = db.prepare('SELECT COUNT(*) AS count FROM reserves').get().count;
    const reservesPublished = db
      .prepare('SELECT COUNT(*) AS count FROM reserves WHERE is_published = 1')
      .get().count;
    const reviewsTotal = db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
    const reviewsPending = db
      .prepare("SELECT COUNT(*) AS count FROM reviews WHERE status = 'pending'")
      .get().count;
    const eventsTotal = db.prepare('SELECT COUNT(*) AS count FROM analytics_events').get().count;

    const eventsByDay = db
      .prepare(
        `SELECT date(created_at) AS day, COUNT(*) AS count
         FROM analytics_events
         WHERE created_at >= datetime('now', '-13 days')
         GROUP BY date(created_at)
         ORDER BY day ASC`
      )
      .all();

    const topViewedReserves = db
      .prepare(
        `SELECT r.id, r.name, COUNT(*) AS views
         FROM analytics_events e
         JOIN reserves r ON r.id = e.reserve_id
         WHERE e.event_type = 'reserve_view'
         GROUP BY r.id, r.name
         ORDER BY views DESC
         LIMIT 5`
      )
      .all();

    const topReviewedReserves = db
      .prepare(
        `SELECT r.id, r.name, COUNT(rv.id) AS reviews_count, ROUND(AVG(rv.rating), 2) AS avg_rating
         FROM reserves r
         LEFT JOIN reviews rv ON rv.reserve_id = r.id AND rv.status = 'approved'
         GROUP BY r.id, r.name
         HAVING reviews_count > 0
         ORDER BY reviews_count DESC, avg_rating DESC
         LIMIT 5`
      )
      .all();

    return res.json({
      success: true,
      data: {
        kpi: {
          users_total: usersTotal,
          users_active: usersActive,
          reserves_total: reservesTotal,
          reserves_published: reservesPublished,
          reviews_total: reviewsTotal,
          reviews_pending: reviewsPending,
          events_total: eventsTotal,
        },
        events_by_day: eventsByDay,
        top_viewed_reserves: topViewedReserves,
        top_reviewed_reserves: topReviewedReserves,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/analytics/summary', (_req, res) => {
  try {
    const eventsByType = db
      .prepare(
        `SELECT event_type, COUNT(*) AS count
         FROM analytics_events
         GROUP BY event_type
         ORDER BY count DESC`
      )
      .all();

    const topViewedReserves = db
      .prepare(
        `SELECT r.id, r.name, COUNT(*) AS views
         FROM analytics_events e
         JOIN reserves r ON r.id = e.reserve_id
         WHERE e.event_type = 'reserve_view'
         GROUP BY r.id, r.name
         ORDER BY views DESC
         LIMIT 10`
      )
      .all();

    return res.json({
      success: true,
      data: {
        events_by_type: eventsByType,
        top_viewed_reserves: topViewedReserves,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

function mapCuratedAdminRow(row) {
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
    distanceM:
      row.distance_m != null && Number.isFinite(Number(row.distance_m))
        ? Number(row.distance_m)
        : null,
    durationS:
      row.duration_s != null && Number.isFinite(Number(row.duration_s))
        ? Number(row.duration_s)
        : null,
    sortOrder: row.sort_order,
    isPublished: !!row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/curated-routes', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT *
         FROM curated_routes
         ORDER BY sort_order ASC, id ASC`,
      )
      .all();
    return res.json({ success: true, data: rows.map(mapCuratedAdminRow) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

async function resolveOrsListFields(reserveIds, profile) {
  const metrics = await computeCuratedRouteMetrics(reserveIds, profile);
  if (metrics.ok) {
    return {
      distanceM: metrics.distanceM,
      durationS: metrics.durationS,
      listDistance: metrics.listDistance,
      listDuration: metrics.listDuration,
      orsWarning: null,
    };
  }
  return {
    distanceM: null,
    durationS: null,
    listDistance: null,
    listDuration: null,
    orsWarning: metrics.error,
  };
}

router.post('/curated-routes/preview-route', async (req, res) => {
  const body = req.body || {};
  const profile = String(body.profile || '').trim();
  const reserveIds = parseReserveIds(body);

  if (profile !== 'driving-car' && profile !== 'foot-walking') {
    return res.status(400).json({ success: false, error: 'profile: driving-car или foot-walking' });
  }
  const idsErr = validateReserveIds(reserveIds);
  if (idsErr) return res.status(400).json({ success: false, error: idsErr });

  const metrics = await computeCuratedRouteMetrics(reserveIds, profile);
  if (!metrics.ok) {
    return res.status(502).json({ success: false, error: metrics.error });
  }
  return res.json({
    success: true,
    data: {
      distanceM: metrics.distanceM,
      durationS: metrics.durationS,
      listDistance: metrics.listDistance,
      listDuration: metrics.listDuration,
    },
  });
});

router.post('/curated-routes', async (req, res) => {
  const body = req.body || {};
  const slug = String(body.slug || '').trim().toLowerCase();
  const title = String(body.title || '').trim();
  const teaser = body.teaser != null ? String(body.teaser).trim() : '';
  const profile = String(body.profile || '').trim();
  const regionLabel = String(body.regionLabel || body.region_label || '').trim();
  const reserveIds = parseReserveIds(body);
  const descriptionArr = parseDescriptionArray(body);
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.floor(Number(body.sortOrder)) : 0;
  const isPublished = body.isPublished === false || body.isPublished === 0 ? 0 : 1;

  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({
      success: false,
      error: 'slug: только латиница в нижнем регистре, цифры и дефисы (например berezina-elnya-avto)',
    });
  }
  if (!title) {
    return res.status(400).json({ success: false, error: 'Укажите название' });
  }
  if (profile !== 'driving-car' && profile !== 'foot-walking') {
    return res.status(400).json({ success: false, error: 'profile: driving-car или foot-walking' });
  }
  if (!regionLabel) {
    return res.status(400).json({ success: false, error: 'Укажите подпись региона (regionLabel)' });
  }
  const idsErr = validateReserveIds(reserveIds);
  if (idsErr) return res.status(400).json({ success: false, error: idsErr });
  if (!descriptionArr.length) {
    return res.status(400).json({ success: false, error: 'Добавьте описание (хотя бы один абзац)' });
  }

  const orsFields = await resolveOrsListFields(reserveIds, profile);

  try {
    const info = db
      .prepare(
        `INSERT INTO curated_routes (
          slug, title, teaser, profile, reserve_ids, region_label, description,
          list_distance, list_duration, distance_m, duration_s, sort_order, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slug,
        title,
        teaser || null,
        profile,
        JSON.stringify(reserveIds),
        regionLabel,
        JSON.stringify(descriptionArr),
        orsFields.listDistance,
        orsFields.listDuration,
        orsFields.distanceM,
        orsFields.durationS,
        sortOrder,
        isPublished,
      );
    const id = info.lastInsertRowid;
    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'curated_route_create',
      targetType: 'curated_route',
      targetId: id,
      payload: { slug, title },
    });
    const row = db.prepare('SELECT * FROM curated_routes WHERE id = ?').get(id);
    const payload = { success: true, data: mapCuratedAdminRow(row) };
    if (orsFields.orsWarning) payload.orsWarning = orsFields.orsWarning;
    return res.status(201).json(payload);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Маршрут с таким slug уже есть' });
    }
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/curated-routes/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }
  const existing = db.prepare('SELECT id FROM curated_routes WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const body = req.body || {};
  const slug = String(body.slug || '').trim().toLowerCase();
  const title = String(body.title || '').trim();
  const teaser = body.teaser != null ? String(body.teaser).trim() : '';
  const profile = String(body.profile || '').trim();
  const regionLabel = String(body.regionLabel || body.region_label || '').trim();
  const reserveIds = parseReserveIds(body);
  const descriptionArr = parseDescriptionArray(body);
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.floor(Number(body.sortOrder)) : 0;
  const isPublished = body.isPublished === false || body.isPublished === 0 ? 0 : 1;

  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({
      success: false,
      error: 'slug: только латиница в нижнем регистре, цифры и дефисы',
    });
  }
  if (!title) return res.status(400).json({ success: false, error: 'Укажите название' });
  if (profile !== 'driving-car' && profile !== 'foot-walking') {
    return res.status(400).json({ success: false, error: 'profile: driving-car или foot-walking' });
  }
  if (!regionLabel) return res.status(400).json({ success: false, error: 'Укажите regionLabel' });
  const idsErr = validateReserveIds(reserveIds);
  if (idsErr) return res.status(400).json({ success: false, error: idsErr });
  if (!descriptionArr.length) {
    return res.status(400).json({ success: false, error: 'Добавьте описание' });
  }

  const orsFields = await resolveOrsListFields(reserveIds, profile);

  try {
    const other = db.prepare('SELECT id FROM curated_routes WHERE slug = ? AND id != ?').get(slug, id);
    if (other) {
      return res.status(409).json({ success: false, error: 'Другой маршрут уже использует этот slug' });
    }
    db.prepare(
      `UPDATE curated_routes SET
        slug = ?, title = ?, teaser = ?, profile = ?, reserve_ids = ?, region_label = ?, description = ?,
        list_distance = ?, list_duration = ?, distance_m = ?, duration_s = ?,
        sort_order = ?, is_published = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(
      slug,
      title,
      teaser || null,
      profile,
      JSON.stringify(reserveIds),
      regionLabel,
      JSON.stringify(descriptionArr),
      orsFields.listDistance,
      orsFields.listDuration,
      orsFields.distanceM,
      orsFields.durationS,
      sortOrder,
      isPublished,
      id,
    );
    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'curated_route_update',
      targetType: 'curated_route',
      targetId: id,
      payload: { slug, title },
    });
    const row = db.prepare('SELECT * FROM curated_routes WHERE id = ?').get(id);
    const payload = { success: true, data: mapCuratedAdminRow(row) };
    if (orsFields.orsWarning) payload.orsWarning = orsFields.orsWarning;
    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/curated-routes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }
  try {
    const row = db.prepare('SELECT * FROM curated_routes WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    db.prepare('DELETE FROM curated_routes WHERE id = ?').run(id);
    writeAuditLog({
      adminUserId: req.user.userId,
      action: 'curated_route_delete',
      targetType: 'curated_route',
      targetId: id,
      payload: { slug: row.slug },
    });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
