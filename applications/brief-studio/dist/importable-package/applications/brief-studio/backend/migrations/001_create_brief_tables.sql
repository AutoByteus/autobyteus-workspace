CREATE TABLE IF NOT EXISTS briefs (
  brief_id TEXT PRIMARY KEY,
  application_session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  latest_delivery_state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT
);

CREATE TABLE IF NOT EXISTS brief_artifacts (
  brief_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  publication_key TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  artifact_ref_json TEXT NOT NULL,
  is_final INTEGER NOT NULL,
  producer_member_route_key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (brief_id, artifact_kind)
);

CREATE TABLE IF NOT EXISTS review_notes (
  note_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  journal_sequence INTEGER NOT NULL,
  processed_at TEXT NOT NULL
);
