function hasColumn(db, tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => row.name === columnName);
}

function runSchemaMigrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      reserve_id INTEGER,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserve_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL CHECK (LENGTH(TRIM(comment)) > 0),
      status TEXT NOT NULL DEFAULT 'approved',
      moderated_by INTEGER,
      moderated_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (user_id, reserve_id)
    );
  `);

  if (!hasColumn(db, 'users', 'role')) {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
  }

  if (!hasColumn(db, 'users', 'avatar_url')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT;`);
  }

  if (!hasColumn(db, 'users', 'is_blocked')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0;`);
  }

  if (!hasColumn(db, 'users', 'email_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;`);
    db.exec(`UPDATE users SET email_verified = 1;`);
  }

  if (!hasColumn(db, 'users', 'email_verify_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verify_token TEXT;`);
  }

  if (!hasColumn(db, 'users', 'email_verify_expires')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verify_expires TEXT;`);
  }

  if (!hasColumn(db, 'users', 'password_reset_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN password_reset_token TEXT;`);
  }

  if (!hasColumn(db, 'users', 'password_reset_expires')) {
    db.exec(`ALTER TABLE users ADD COLUMN password_reset_expires TEXT;`);
  }

  if (!hasColumn(db, 'reserves', 'is_published')) {
    db.exec(`ALTER TABLE reserves ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;`);
  }

  if (!hasColumn(db, 'reviews', 'status')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';`);
  }

  if (!hasColumn(db, 'reviews', 'moderated_by')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN moderated_by INTEGER;`);
  }

  if (!hasColumn(db, 'reviews', 'moderated_at')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN moderated_at TEXT;`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_saved_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reserve_id INTEGER NOT NULL,
      profile TEXT NOT NULL,
      title TEXT,
      geojson TEXT NOT NULL,
      distance_m REAL,
      duration_s REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reserves_published ON reserves(is_published);
    CREATE INDEX IF NOT EXISTS idx_reviews_reserve ON reviews(reserve_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_reserve ON analytics_events(reserve_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_user_saved_routes_user ON user_saved_routes(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_saved_routes_reserve ON user_saved_routes(reserve_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS curated_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      teaser TEXT,
      profile TEXT NOT NULL CHECK (profile IN ('driving-car', 'foot-walking')),
      reserve_ids TEXT NOT NULL,
      region_label TEXT NOT NULL,
      description TEXT NOT NULL,
      list_distance TEXT,
      list_duration TEXT,
      distance_m INTEGER,
      duration_s INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_curated_routes_published ON curated_routes(is_published);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_curated_routes_sort ON curated_routes(sort_order, id);`);

  const curatedCols = db.prepare('PRAGMA table_info(curated_routes)').all();
  if (!curatedCols.some((c) => c.name === 'distance_m')) {
    db.exec('ALTER TABLE curated_routes ADD COLUMN distance_m INTEGER');
  }
  if (!curatedCols.some((c) => c.name === 'duration_s')) {
    db.exec('ALTER TABLE curated_routes ADD COLUMN duration_s INTEGER');
  }

  const curatedCount = db.prepare('SELECT COUNT(*) AS n FROM curated_routes').get().n;
  if (curatedCount === 0) {
    const ins = db.prepare(`
      INSERT INTO curated_routes (
        slug, title, teaser, profile, reserve_ids, region_label, description,
        list_distance, list_duration, sort_order, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    ins.run(
      'berezina-elnya-avto',
      'От Березинского заповедника к болоту Ельня',
      'Связка двух известных ООПТ севера Беларуси: заповедник и крупнейшее верховое болото.',
      'driving-car',
      '[41,42]',
      'Витебская и Минская области',
      JSON.stringify([
        'Маршрут для тех, кто хочет за день или выходные совместить визит к Березинскому биосферному заповеднику и к заказнику «Ельня» — одному из крупнейших верховых болот Европы.',
        'На что обратить внимание: контраст ландшафтов (лесные массивы и озёрно-болотный комплекс), сезонность (для журавлей — осень), наличие визит-центров и экотроп — уточняйте на сайтах объектов перед поездкой.',
      ]),
      '~220 км',
      '~3–4 ч за рулём (без остановок)',
      0,
      1,
    );
    ins.run(
      'berezina-elnya-peshkom',
      'Тот же маршрут: пеший профиль (ORS)',
      'Демонстрация профиля «пешком» по тем же точкам — для сравнения времени и линии на карте.',
      'foot-walking',
      '[41,42]',
      'Север Беларуси',
      JSON.stringify([
        'Тот же набор объектов, но с профилем пешеходной маршрутизации. В реальности такое расстояние пешком не планируют; блок полезен как тест и для коротких «логических» цепочек в городе/на тропе.',
      ]),
      null,
      null,
      1,
      1,
    );
    ins.run(
      'berezina-elnya-dolgoe-avto',
      'Три объекта севера (авто)',
      'Березинский заповедник — Ельня — заказник у озера Долгое.',
      'driving-car',
      '[41,42,43]',
      'Витебская область',
      JSON.stringify([
        'Автомаршрут по трём известным ООПТ: биосферный заповедник, болото Ельня и заказник «Долгое» с глубоким озером.',
        'Время и километраж на карте считаются по дорожной сети; остановки и посещение территорий — по правилам каждого объекта.',
      ]),
      null,
      null,
      2,
      1,
    );
  }
}

module.exports = runSchemaMigrate;
