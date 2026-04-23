CREATE TABLE briefs_next (
  brief_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  latest_binding_id TEXT,
  latest_run_id TEXT,
  latest_binding_status TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT
);

INSERT INTO briefs_next (
  brief_id,
  title,
  status,
  created_at,
  updated_at,
  approved_at,
  rejected_at
)
SELECT
  brief_id,
  title,
  status,
  created_at,
  updated_at,
  approved_at,
  rejected_at
FROM briefs;

DROP TABLE briefs;
ALTER TABLE briefs_next RENAME TO briefs;
