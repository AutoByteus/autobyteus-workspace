ALTER TABLE briefs DROP COLUMN latest_delivery_state;
ALTER TABLE brief_artifacts RENAME COLUMN publication_key TO artifact_key;
ALTER TABLE brief_artifacts ADD COLUMN metadata_json TEXT;
