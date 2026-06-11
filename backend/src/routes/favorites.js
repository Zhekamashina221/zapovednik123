const express = require('express');
const db = require('../../database');
const { protectRoute, requireVerifiedEmail } = require('../middleware/auth');
const { getPhotosForReserveId } = require('../services/photos');
const { trackEvent } = require('../services/analytics');

const router = express.Router();

router.get('/', protectRoute, requireVerifiedEmail, (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT r.*
         FROM reserves r
         JOIN favorites f ON r.id = f.reserve_id
         WHERE f.user_id = ? AND r.is_published = 1`
      )
      .all(req.user.userId);

    const data = rows.map((reserve) => ({
      ...reserve,
      photos: getPhotosForReserveId(reserve.id),
      is_favorite: true,
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/:reserve_id', protectRoute, requireVerifiedEmail, (req, res) => {
  const reserveId = Number.parseInt(req.params.reserve_id, 10);
  if (Number.isNaN(reserveId)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  try {
    const reserve = db.prepare('SELECT id FROM reserves WHERE id = ?').get(reserveId);
    if (!reserve) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    db.prepare(
      `INSERT OR IGNORE INTO favorites (user_id, reserve_id)
       VALUES (?, ?)`
    ).run(req.user.userId, reserveId);

    trackEvent({
      userId: req.user.userId,
      reserveId,
      eventType: 'favorite_add',
    });

    return res.json({
      success: true,
      data: { action: 'added', reserve_id: reserveId, is_favorite: true },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/:reserve_id', protectRoute, requireVerifiedEmail, (req, res) => {
  const reserveId = Number.parseInt(req.params.reserve_id, 10);
  if (Number.isNaN(reserveId)) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  try {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND reserve_id = ?').run(
      req.user.userId,
      reserveId
    );
    return res.json({
      success: true,
      data: { action: 'removed', reserve_id: reserveId, is_favorite: false },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
