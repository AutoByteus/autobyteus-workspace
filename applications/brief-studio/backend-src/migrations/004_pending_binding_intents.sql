CREATE TABLE IF NOT EXISTS pending_binding_intents (
  binding_intent_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  status TEXT NOT NULL,
  binding_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  committed_at TEXT
);

CREATE TABLE IF NOT EXISTS brief_bindings (
  binding_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  binding_intent_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS brief_bindings_by_brief_id
  ON brief_bindings (brief_id, created_at DESC);
