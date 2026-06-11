const jwt = require('jsonwebtoken');
const db = require('../../database');
const { isUserEmailVerified } = require('../services/emailVerification');

const JWT_SECRET = process.env.JWT_SECRET;

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function protectRoute(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access denied. No token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    // 401 so clients can refresh access tokens (many HTTP clients only retry on 401).
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
  } catch (_error) {
    // Ignore invalid token for optional auth endpoints.
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  return next();
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user?.userId) {
    return res.status(401).json({ success: false, error: 'Access denied. No token.' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!isUserEmailVerified(req.user.userId)) {
    const row = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.userId);
    return res.status(403).json({
      success: false,
      error: 'Подтвердите email, чтобы пользоваться этой функцией.',
      code: 'EMAIL_NOT_VERIFIED',
      email: row?.email || null,
    });
  }

  return next();
}

module.exports = {
  protectRoute,
  optionalAuth,
  requireAdmin,
  requireVerifiedEmail,
};
