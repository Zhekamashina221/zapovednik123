const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../database');
const { protectRoute } = require('../middleware/auth');
const {
  issueAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} = require('../services/tokens');
const { trackEvent } = require('../services/analytics');
const { isMailConfigured } = require('../services/mail');
const {
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
} = require('../services/emailVerification');
const {
  requestPasswordReset,
  resetPasswordWithToken,
  clearPasswordResetToken,
  revokeAllRefreshTokens,
} = require('../services/passwordReset');

const router = express.Router();
const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || '10', 10);

function authSuccessPayload(user, token, refreshToken) {
  return {
    token,
    refresh_token: refreshToken,
    user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    email_verified: user.email_verified === 1,
  };
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ success: false, error: 'Почта и пароль обязательны.' });
  }

  try {
    const existing = db
      .prepare(
        `SELECT id, email, name, email_verified
         FROM users
         WHERE LOWER(email) = ?`,
      )
      .get(normalizedEmail);

    if (existing) {
      if (existing.email_verified) {
        return res
          .status(409)
          .json({ success: false, error: 'Пользователь с такой почтой уже существует.' });
      }

      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?').run(
        hash,
        name || existing.name || null,
        existing.id,
      );

      await sendVerificationEmail({ id: existing.id, email: existing.email, name: name || existing.name });

      return res.status(200).json({
        success: true,
        data: {
          needs_verification: true,
          email: existing.email,
          message: 'Письмо с подтверждением отправлено повторно.',
        },
      });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, email_verified)
         VALUES (?, ?, ?, 0)`,
      )
      .run(normalizedEmail, hash, name || null);

    const user = { id: info.lastInsertRowid, email: normalizedEmail, name: name || null };
    await sendVerificationEmail(user);
    trackEvent({ userId: user.id, eventType: 'auth_register' });

    return res.status(201).json({
      success: true,
      data: {
        needs_verification: true,
        email: normalizedEmail,
        message: 'На вашу почту отправлено письмо с подтверждением.',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ success: false, error: 'Почта и пароль обязательны.' });
  }

  try {
    const user = db
      .prepare(
        `SELECT id, email, password_hash, name, role, is_blocked, email_verified
         FROM users
         WHERE LOWER(email) = ?`,
      )
      .get(normalizedEmail);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res
        .status(401)
        .json({ success: false, error: 'Неверный адрес электронной почты или пароль.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ success: false, error: 'Аккаунт заблокирован администратором.' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Подтвердите email. Проверьте почту или запросите письмо повторно.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const token = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    trackEvent({ userId: user.id, eventType: 'auth_login' });

    return res.json({
      success: true,
      data: authSuccessPayload(user, token, refreshToken),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    const result = verifyEmailToken(token);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const user = result.user;
    if (user.is_blocked) {
      return res.status(403).json({ success: false, error: 'Аккаунт заблокирован администратором.' });
    }

    if (result.alreadyVerified) {
      return res.json({
        success: true,
        data: {
          already_verified: true,
          message: 'Email уже был подтверждён. Войдите в аккаунт.',
        },
      });
    }

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    trackEvent({ userId: user.id, eventType: 'auth_email_verified' });

    return res.json({
      success: true,
      data: {
        ...authSuccessPayload(user, accessToken, refreshToken),
        message: 'Email успешно подтверждён.',
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/config', (_req, res) => {
  return res.json({
    success: true,
    data: { smtp_configured: isMailConfigured() },
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};

  try {
    const result = await requestPasswordReset(email);
    if (!result.ok) {
      return res.status(result.status || 400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: { message: result.message } });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};

  try {
    const result = resetPasswordWithToken(token, password);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, result.userId);
    clearPasswordResetToken(result.userId);
    revokeAllRefreshTokens(result.userId);
    trackEvent({ userId: result.userId, eventType: 'auth_password_reset' });

    return res.json({
      success: true,
      data: { message: 'Пароль изменён. Теперь можно войти с новым паролем.' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body || {};

  try {
    const result = await resendVerificationEmail(email);
    if (!result.ok) {
      return res.status(result.status || 400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: { message: result.message } });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/refresh', (req, res) => {
  const { refresh_token: refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required.' });
  }

  try {
    const { user, accessToken, refreshToken: nextRefreshToken } = rotateRefreshToken(refreshToken);
    return res.json({
      success: true,
      data: authSuccessPayload(user, accessToken, nextRefreshToken),
    });
  } catch (_error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token.' });
  }
});

router.post('/logout', protectRoute, (req, res) => {
  const { refresh_token: refreshToken } = req.body || {};
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }
  return res.json({ success: true, data: { message: 'Logged out' } });
});

module.exports = router;
