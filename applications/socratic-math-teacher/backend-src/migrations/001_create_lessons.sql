CREATE TABLE IF NOT EXISTS lessons (
  lesson_id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  latest_binding_id TEXT,
  latest_run_id TEXT,
  latest_binding_status TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS lesson_messages (
  message_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  role TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_event_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  journal_sequence INTEGER NOT NULL,
  processed_at TEXT NOT NULL
);
