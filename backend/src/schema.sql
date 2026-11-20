CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One row per user and day. Each category is NULL until the user presses its
-- button ('done'); once marked it cannot be undone.
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  training TEXT CHECK (training IN ('done')),
  steps TEXT CHECK (steps IN ('done')),
  nutrition TEXT CHECK (nutrition IN ('done')),
  xp INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, date)
);

-- Boss events. The villain has max_hp hit points; every completed daily
-- item during the event removes one (see event_hits).
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  compliance_margin INTEGER NOT NULL DEFAULT 70,
  max_hp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hits are kept even if the user is deleted, so the villain doesn't heal.
CREATE TABLE IF NOT EXISTS event_hits (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  log_date DATE NOT NULL,
  category TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  UNIQUE (event_id, user_id, log_date, category)
);

CREATE INDEX IF NOT EXISTS idx_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_hits_event ON event_hits(event_id);
