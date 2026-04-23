ALTER TABLE brief_bindings ADD COLUMN artifact_catchup_completed_at TEXT;

CREATE TABLE IF NOT EXISTS brief_artifact_revisions (
  revision_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  binding_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  publication_kind TEXT NOT NULL,
  path TEXT NOT NULL,
  producer_member_route_key TEXT NOT NULL,
  published_at TEXT NOT NULL,
  projected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS brief_artifact_revisions_by_brief_id
  ON brief_artifact_revisions (brief_id, published_at DESC);

CREATE TABLE brief_artifacts_next (
  brief_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  publication_kind TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  body TEXT NOT NULL,
  producer_member_route_key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (brief_id, artifact_kind)
);

INSERT INTO brief_artifacts_next (
  brief_id,
  artifact_kind,
  publication_kind,
  revision_id,
  path,
  description,
  body,
  producer_member_route_key,
  updated_at
)
SELECT
  brief_id,
  artifact_kind,
  CASE
    WHEN artifact_kind = 'researcher' AND artifact_type = 'research_blocker_note' THEN 'research_blocker'
    WHEN artifact_kind = 'researcher' THEN 'research'
    WHEN artifact_kind = 'writer' AND artifact_type = 'final_brief' THEN 'final'
    WHEN artifact_kind = 'writer' AND artifact_type = 'brief_blocker_note' THEN 'writer_blocker'
    ELSE 'draft'
  END,
  'legacy:' || brief_id || ':' || artifact_kind || ':' || updated_at,
  CASE
    WHEN artifact_kind = 'researcher' AND artifact_type = 'research_blocker_note' THEN 'brief-studio/research-blocker.md'
    WHEN artifact_kind = 'researcher' THEN 'brief-studio/research.md'
    WHEN artifact_kind = 'writer' AND artifact_type = 'final_brief' THEN 'brief-studio/final-brief.md'
    WHEN artifact_kind = 'writer' AND artifact_type = 'brief_blocker_note' THEN 'brief-studio/brief-blocker.md'
    ELSE 'brief-studio/brief-draft.md'
  END,
  summary,
  COALESCE(
    CAST(json_extract(artifact_ref_json, '$.value.body') AS TEXT),
    summary,
    title,
    ''
  ),
  producer_member_route_key,
  updated_at
FROM brief_artifacts;

DROP TABLE brief_artifacts;
ALTER TABLE brief_artifacts_next RENAME TO brief_artifacts;
