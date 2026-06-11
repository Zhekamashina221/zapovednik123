const express = require('express');
const db = require('../../database');
const { protectRoute, requireVerifiedEmail } = require('../middleware/auth');
const { trackEvent } = require('../services/analytics');

const router = express.Router();

function parseReserveId(raw) {
  const reserveId = Number.parseInt(raw, 10);
  if (Number.isNaN(reserveId)) {
    return null;
  }
  return reserveId;
}

router.get('/me', protectRoute, requireVerifiedEmail, (req, res) => {
  try {
    const data = db
      .prepare(
        `SELECT rv.id, rv.reserve_id, r.name AS reserve_name, rv.user_id, rv.rating, rv.comment, rv.status, rv.created_at, rv.updated_at
         FROM reviews rv
         JOIN reserves r ON r.id = rv.reserve_id
         WHERE rv.user_id = ?
         ORDER BY rv.created_at DESC, rv.id DESC`
      )
      .all(req.user.userId);

    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:reserve_id', (req, res) => {
  const reserveId = parseReserveId(req.params.reserve_id);
  if (!reserveId) {
    return res.status(400).json({ success: false, error: 'Invalid reserve ID' });
  }

  try {
    const reserveExists = db.prepare('SELECT id FROM reserves WHERE id = ?').get(reserveId);
    if (!reserveExists) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    const data = db
      .prepare(
        `SELECT rv.id, rv.reserve_id, rv.user_id, rv.rating, rv.comment, rv.created_at, rv.updated_at, u.name AS user_name
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         WHERE rv.reserve_id = ?
           AND rv.status = 'approved'
         ORDER BY rv.created_at DESC, rv.id DESC`
      )
      .all(reserveId);

    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/:reserve_id', protectRoute, requireVerifiedEmail, (req, res) => {
  const reserveId = parseReserveId(req.params.reserve_id);
  if (!reserveId) {
    return res.status(400).json({ success: false, error: 'Invalid reserve ID' });
  }

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
  }
  if (comment.length < 10 || comment.length > 2000) {
    return res.status(400).json({ success: false, error: 'Comment length must be between 10 and 2000 characters.' });
  }

  try {
    const reserve = db.prepare('SELECT id FROM reserves WHERE id = ? AND is_published = 1').get(reserveId);
    if (!reserve) {
      return res.status(404).json({ success: false, error: 'Reserve not found' });
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE user_id = ? AND reserve_id = ?')
      .get(req.user.userId, reserveId);
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: 'You have already left a review for this reserve.' });
    }

    const info = db
      .prepare(
        `INSERT INTO reviews (reserve_id, user_id, rating, comment, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(reserveId, req.user.userId, rating, comment);

    const review = db
      .prepare(
        `SELECT rv.id, rv.reserve_id, rv.user_id, rv.rating, rv.comment, rv.status, rv.created_at, rv.updated_at, u.name AS user_name
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         WHERE rv.id = ?`
      )
      .get(info.lastInsertRowid);

    trackEvent({
      userId: req.user.userId,
      reserveId,
      eventType: 'review_add',
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/:id', protectRoute, requireVerifiedEmail, (req, res) => {
  const reviewId = Number.parseInt(req.params.id, 10);
  if (!reviewId) {
    return res.status(400).json({ success: false, error: 'Invalid review ID' });
  }

  try {
    const review = db
      .prepare('SELECT id, user_id, reserve_id FROM reviews WHERE id = ?')
      .get(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    if (review.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Вы можете удалить только свой комментарий.' });
    }

    db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);

    trackEvent({
      userId: req.user.userId,
      reserveId: review.reserve_id,
      eventType: 'review_delete',
    });

    return res.json({ success: true, data: { message: 'Комментарий удален.' } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
