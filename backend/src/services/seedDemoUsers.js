const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || '10', 10);

const DEFAULTS = {
  admin: {
    email: 'admin@zapovednik.local',
    password: 'Admin123',
    name: 'Администратор',
    role: 'admin',
  },
  user: {
    email: 'user@zapovednik.local',
    password: 'User123',
    name: 'Тестовый пользователь',
    role: 'user',
  },
};

function readAccount(prefix, defaults) {
  const email = (process.env[`${prefix}_EMAIL`] || defaults.email).trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`] || defaults.password;
  const name = process.env[`${prefix}_NAME`] || defaults.name;
  const role = defaults.role;
  return { email, password, name, role };
}

function upsertDemoUser(db, { email, password, name, role }) {
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const existing = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
    .get(email);

  if (existing) {
    db.prepare(
      `UPDATE users
       SET password_hash = ?,
           name = ?,
           role = ?,
           email_verified = 1,
           is_blocked = 0,
           email_verify_token = NULL,
           email_verify_expires = NULL
       WHERE id = ?`,
    ).run(passwordHash, name, role, existing.id);
    return { email, role, created: false };
  }

  db.prepare(
    `INSERT INTO users (email, password_hash, name, role, email_verified)
     VALUES (?, ?, ?, ?, 1)`,
  ).run(email, passwordHash, name, role);
  return { email, role, created: true };
}

/**
 * Создаёт или обновляет демо-админа и тестового пользователя (email уже подтверждён).
 * Пароли и почты можно переопределить через DEMO_ADMIN_* и DEMO_USER_* в .env.
 */
function seedDemoUsers(db) {
  const accounts = [
    readAccount('DEMO_ADMIN', DEFAULTS.admin),
    readAccount('DEMO_USER', DEFAULTS.user),
  ];

  const results = accounts.map((account) => upsertDemoUser(db, account));
  return results;
}

module.exports = { seedDemoUsers, DEFAULTS };
