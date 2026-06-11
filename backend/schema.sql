PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     email TEXT UNIQUE NOT NULL,
                                     password_hash TEXT NOT NULL,
                                     name TEXT,
                                     role TEXT NOT NULL DEFAULT 'user',
                                     avatar_url TEXT,
                                     is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
                                     email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
                                     email_verify_token TEXT,
                                     email_verify_expires TEXT,
                                     password_reset_token TEXT,
                                     password_reset_expires TEXT
);

CREATE TABLE IF NOT EXISTS reserves (
                                        id INTEGER PRIMARY KEY,
                                        name TEXT NOT NULL,
                                        type TEXT,
                                        created TEXT,
                                        status_text TEXT,
                                        status_date TEXT,
                                        phone TEXT,
                                        email TEXT,
                                        latitude REAL,
                                        longitude REAL,
                                        area REAL,
                                        website TEXT,
                                        postal_address TEXT,
                                        description TEXT,
                                        region TEXT,
                                        district TEXT,
                                        is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1))
);

CREATE TABLE IF NOT EXISTS photos (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      reserve_id INTEGER NOT NULL,
                                      url TEXT NOT NULL,
                                      FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS favorites (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         user_id INTEGER NOT NULL,
                                         reserve_id INTEGER NOT NULL,
                                         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE CASCADE,
    UNIQUE (user_id, reserve_id)
    );

CREATE TABLE IF NOT EXISTS reviews (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       reserve_id INTEGER NOT NULL,
                                       user_id INTEGER NOT NULL,
                                       rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                                       comment TEXT NOT NULL CHECK (LENGTH(TRIM(comment)) > 0),
                                       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       FOREIGN KEY (reserve_id) REFERENCES reserves(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, reserve_id)
    );

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              user_id INTEGER NOT NULL,
                                              token TEXT NOT NULL UNIQUE,
                                              expires_at TEXT NOT NULL,
                                              revoked_at TEXT,
                                              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

-- Индексы для скорости
CREATE INDEX IF NOT EXISTS idx_reserves_type ON reserves(type);
CREATE INDEX IF NOT EXISTS idx_reserves_region ON reserves(region);
CREATE INDEX IF NOT EXISTS idx_reserves_district ON reserves(district);
CREATE INDEX IF NOT EXISTS idx_reserves_published ON reserves(is_published);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reserve ON reviews(reserve_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reserve ON analytics_events(reserve_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

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

CREATE INDEX IF NOT EXISTS idx_curated_routes_published ON curated_routes(is_published);
CREATE INDEX IF NOT EXISTS idx_curated_routes_sort ON curated_routes(sort_order, id);