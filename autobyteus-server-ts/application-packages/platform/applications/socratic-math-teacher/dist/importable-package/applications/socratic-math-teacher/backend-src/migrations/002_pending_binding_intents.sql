CREATE TABLE IF NOT EXISTS pending_binding_intents (
  binding_intent_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  status TEXT NOT NULL,
  binding_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  committed_at TEXT
);
