const crypto = require('crypto');
const db = require('../../database');
const { sendMail } = require('./mail');
const { buildVerificationEmail } = require('./emailTemplates');

const VERIFY_EXPIRES_HOURS = Number.parseInt(process.env.EMAIL_VERIFY_EXPIRES_HOURS || '48', 10);
const RESEND_COOLDOWN_MS = Number.parseInt(process.env.EMAIL_RESEND_COOLDOWN_SEC || '120', 10) * 1000;

const resendCooldown = new Map();

function getPublicAppUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getExpiresAt() {
  return new Date(Date.now() + VERIFY_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();
}

function buildVerifyUrl(token) {
  return `${getPublicAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(user) {
  const token = generateToken();
  const expiresAt = getExpiresAt();

  db.prepare(
    `UPDATE users
     SET email_verify_token = ?, email_verify_expires = ?
     WHERE id = ?`,
  ).run(token, expiresAt, user.id);

  const verifyUrl = buildVerifyUrl(token);
  const subject = 'Подтвердите email — Zapovednik';
  const { html, text } = buildVerificationEmail({
    userName: user.name,
    verifyUrl,
    expiresHours: VERIFY_EXPIRES_HOURS,
  });

  await sendMail({ to: user.email, subject, html, text });
}

function verifyEmailToken(token) {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Недействительная ссылка подтверждения.' };
  }

  const user = db
    .prepare(
      `SELECT id, email, name, role, is_blocked, email_verified, email_verify_expires
       FROM users
       WHERE email_verify_token = ?`,
    )
    .get(token);

  if (!user) {
    return { ok: false, error: 'Ссылка недействительна или уже использована.' };
  }

  if (user.email_verified) {
    return { ok: true, user, alreadyVerified: true };
  }

  if (!user.email_verify_expires || new Date(user.email_verify_expires).getTime() < Date.now()) {
    return { ok: false, error: 'Срок действия ссылки истёк. Запросите новое письмо.' };
  }

  db.prepare(
    `UPDATE users
     SET email_verified = 1,
         email_verify_token = NULL,
         email_verify_expires = NULL
     WHERE id = ?`,
  ).run(user.id);

  return { ok: true, user: { ...user, email_verified: 1 } };
}

function canResend(email) {
  const key = email.toLowerCase();
  const last = resendCooldown.get(key);
  if (last && Date.now() - last < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last)) / 1000);
    return { allowed: false, waitSec };
  }
  return { allowed: true };
}

function markResent(email) {
  resendCooldown.set(email.toLowerCase(), Date.now());
}

async function resendVerificationEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: 'Укажите email.' };
  }

  const cooldown = canResend(normalized);
  if (!cooldown.allowed) {
    return {
      ok: false,
      error: `Подождите ${cooldown.waitSec} сек. перед повторной отправкой.`,
      status: 429,
    };
  }

  const user = db
    .prepare(
      `SELECT id, email, name, role, email_verified
       FROM users
       WHERE LOWER(email) = ?`,
    )
    .get(normalized);

  if (!user) {
    markResent(normalized);
    return { ok: true, message: 'Если аккаунт существует, письмо отправлено.' };
  }

  if (user.email_verified) {
    markResent(normalized);
    return { ok: true, message: 'Email уже подтверждён.' };
  }

  await sendVerificationEmail(user);
  markResent(normalized);
  return { ok: true, message: 'Письмо с подтверждением отправлено.' };
}

function isUserEmailVerified(userId) {
  const row = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(userId);
  return row?.email_verified === 1;
}

module.exports = {
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
  isUserEmailVerified,
};
