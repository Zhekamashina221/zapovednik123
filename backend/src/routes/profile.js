const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../database');
const { protectRoute, requireVerifiedEmail } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailVerification');
const { revokeAllRefreshTokens } = require('../services/passwordReset');
const {
  notifyPasswordChanged,
  notifyEmailChangeRequested,
} = require('../services/profileNotifications');

const router = express.Router();
const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || '10', 10);

router.get('/', protectRoute, (req, res) => {
  try {
    const user = db
      .prepare(
        'SELECT id, email, name, role, avatar_url, is_blocked, email_verified FROM users WHERE id = ?',
      )
      .get(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/', protectRoute, async (req, res) => {
  const { name, email, avatar_url: avatarUrl } = req.body || {};
  if (!name && !email && avatarUrl === undefined) {
    return res.status(400).json({ success: false, error: 'Нет данных для обновления' });
  }

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  let emailChanged = false;
  let emailChangeMeta = null;
  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = db
      .prepare('SELECT 1 FROM users WHERE LOWER(email) = ? AND id != ?')
      .get(normalizedEmail, req.user.userId);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Электронная почта уже используется' });
    }
    const current = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.userId);
    if (current && current.email.toLowerCase() !== normalizedEmail) {
      emailChanged = true;
      emailChangeMeta = {
        oldEmail: current.email,
        newEmail: normalizedEmail,
        userName: current.name,
      };
      updates.push('email = ?');
      params.push(normalizedEmail);
      updates.push('email_verified = 0');
      updates.push('email_verify_token = NULL');
      updates.push('email_verify_expires = NULL');
    }
  }
  if (avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    params.push(avatarUrl || null);
  }

  params.push(req.user.userId);

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (emailChanged) {
      const user = db
        .prepare('SELECT id, email, name FROM users WHERE id = ?')
        .get(req.user.userId);
      if (emailChangeMeta) {
        await notifyEmailChangeRequested(emailChangeMeta);
      }
      await sendVerificationEmail(user);
      return res.json({
        success: true,
        data: {
          message: 'Профиль обновлён. Подтвердите новый email — письмо отправлено.',
          needs_email_verification: true,
        },
      });
    }

    return res.json({ success: true, data: { message: 'Профиль обновлен' } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/password', protectRoute, requireVerifiedEmail, async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Текущий и новый пароли обязательны.' });
  }
  if (String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ success: false, error: 'Новый пароль должен быть не короче 6 символов.' });
  }
  if (currentPassword === newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Новый пароль должен отличаться от текущего.' });
  }

  try {
    const user = db
      .prepare('SELECT id, email, name, password_hash FROM users WHERE id = ?')
      .get(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const isValidCurrentPassword = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!isValidCurrentPassword) {
      return res.status(400).json({ success: false, error: 'Текущий пароль неверный.' });
    }

    const nextHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(nextHash, req.user.userId);
    revokeAllRefreshTokens(user.id);
    await notifyPasswordChanged({ email: user.email, name: user.name });

    return res.json({
      success: true,
      data: {
        message: 'Пароль успешно изменен. На почту отправлено уведомление.',
        sessions_revoked: true,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
