const crypto = require('crypto');
const db = require('../../database');
const { sendMail } = require('./mail');
const { buildPasswordResetEmail } = require('./emailTemplates');

const RESET_EXPIRES_HOURS = Number.parseInt(process.env.PASSWORD_RESET_EXPIRES_HOURS || '1', 10);
const RESEND_COOLDOWN_MS = Number.parseInt(process.env.EMAIL_RESEND_COOLDOWN_SEC || '120', 10) * 1000;

const forgotCooldown = new Map();

function getPublicAppUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getExpiresAt() {
  return new Date(Date.now() + RESET_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();
}

function buildResetUrl(token) {
  return `${getPublicAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function canRequestReset(email) {
  const key = email.toLowerCase();
  const last = forgotCooldown.get(key);
  if (last && Date.now() - last < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last)) / 1000);
    return { allowed: false, waitSec };
  }
  return { allowed: true };
}

function markRequested(email) {
  forgotCooldown.set(email.toLowerCase(), Date.now());
}

async function sendPasswordResetEmail(user) {
  const token = generateToken();
  const expiresAt = getExpiresAt();

  db.prepare(
    `UPDATE users
     SET password_reset_token = ?, password_reset_expires = ?
     WHERE id = ?`,
  ).run(token, expiresAt, user.id);

  const resetUrl = buildResetUrl(token);
  const subject = 'Сброс пароля — Zapovednik';
  const { html, text } = buildPasswordResetEmail({
    userName: user.name,
    resetUrl,
    expiresHours: RESET_EXPIRES_HOURS,
  });

  await sendMail({ to: user.email, subject, html, text });
}

async function requestPasswordReset(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: 'Укажите email.' };
  }

  const cooldown = canRequestReset(normalized);
  if (!cooldown.allowed) {
    return {
      ok: false,
      error: `Подождите ${cooldown.waitSec} сек. перед повторной отправкой.`,
      status: 429,
    };
  }

  const user = db
    .prepare(
      `SELECT id, email, name, email_verified, is_blocked
       FROM users
       WHERE LOWER(email) = ?`,
    )
    .get(normalized);

  markRequested(normalized);

  if (!user || !user.email_verified || user.is_blocked) {
    return { ok: true, message: 'Если аккаунт существует, письмо для сброса пароля отправлено.' };
  }

  await sendPasswordResetEmail(user);
  return { ok: true, message: 'Если аккаунт существует, письмо для сброса пароля отправлено.' };
}

function resetPasswordWithToken(token, newPassword) {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Недействительная ссылка сброса пароля.' };
  }

  if (!newPassword || String(newPassword).length < 6) {
    return { ok: false, error: 'Пароль должен быть не короче 6 символов.' };
  }

  const user = db
    .prepare(
      `SELECT id, password_reset_expires
       FROM users
       WHERE password_reset_token = ?`,
    )
    .get(token);

  if (!user) {
    return { ok: false, error: 'Ссылка недействительна или уже использована.' };
  }

  if (!user.password_reset_expires || new Date(user.password_reset_expires).getTime() < Date.now()) {
    return { ok: false, error: 'Срок действия ссылки истёк. Запросите сброс пароля снова.' };
  }

  return { ok: true, userId: user.id };
}

function clearPasswordResetToken(userId) {
  db.prepare(
    `UPDATE users
     SET password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE id = ?`,
  ).run(userId);
}

function revokeAllRefreshTokens(userId) {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND revoked_at IS NULL`,
  ).run(userId);
}

module.exports = {
  requestPasswordReset,
  resetPasswordWithToken,
  clearPasswordResetToken,
  revokeAllRefreshTokens,
};
