ALTER TABLE lessons ADD COLUMN artifact_catchup_completed_at TEXT;
ALTER TABLE lesson_messages ADD COLUMN source_revision_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS lesson_messages_by_source_revision_id
  ON lesson_messages (source_revision_id)
  WHERE source_revision_id IS NOT NULL;
