const jwt = require('jsonwebtoken');
const db = require('../../database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function buildAccessPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
  };
}

function issueAccessToken(user) {
  return jwt.sign(buildAccessPayload(user), JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function issueRefreshToken(user) {
  const token = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  db.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES (?, ?, ?)`
  ).run(user.id, token, expiresAt);
  return token;
}

function revokeRefreshToken(token) {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token = ? AND revoked_at IS NULL`
  ).run(token);
}

function rotateRefreshToken(token) {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET);
  const stored = db
    .prepare(
      `SELECT token, user_id, revoked_at, expires_at
       FROM refresh_tokens
       WHERE token = ?`
    )
    .get(token);

  if (!stored || stored.revoked_at) {
    throw new Error('Invalid refresh token');
  }

  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    throw new Error('Refresh token expired');
  }

  const user = db
    .prepare('SELECT id, email, role, name, is_blocked, email_verified FROM users WHERE id = ?')
    .get(payload.userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.is_blocked) {
    throw new Error('User is blocked');
  }
  if (!user.email_verified && user.role !== 'admin') {
    throw new Error('Email not verified');
  }

  revokeRefreshToken(token);
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);
  return { user, accessToken, refreshToken };
}

module.exports = {
  issueAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
};
