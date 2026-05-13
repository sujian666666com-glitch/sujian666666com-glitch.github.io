CREATE TABLE IF NOT EXISTS wall_messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TEXT NOT NULL,
  day_key TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_wall_messages_status_created_at
  ON wall_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_messages_day_key
  ON wall_messages (day_key);

CREATE INDEX IF NOT EXISTS idx_wall_messages_ip_created_at
  ON wall_messages (ip, created_at DESC);
