import type { DatabaseSync } from "node:sqlite";

export type BriefBindingRecord = {
  briefId: string;
  bindingId: string;
  bindingIntentId: string;
  runId: string;
  createdAt: string;
  updatedAt: string;
  artifactCatchupCompletedAt: string | null;
};

type BriefBindingRow = {
  brief_id: string;
  binding_id: string;
  binding_intent_id: string;
  run_id: string;
  created_at: string;
  updated_at: string;
  artifact_catchup_completed_at: string | null;
};

const mapRow = (row: BriefBindingRow): BriefBindingRecord => ({
  briefId: row.brief_id,
  bindingId: row.binding_id,
  bindingIntentId: row.binding_intent_id,
  runId: row.run_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  artifactCatchupCompletedAt: row.artifact_catchup_completed_at,
});

export const createBriefBindingRepository = (db: DatabaseSync) => ({
  getByBindingId(bindingId: string): BriefBindingRecord | null {
    const row = db
      .prepare(
        `SELECT brief_id, binding_id, binding_intent_id, run_id, created_at, updated_at, artifact_catchup_completed_at
           FROM brief_bindings
          WHERE binding_id = ?`,
      )
      .get(bindingId) as BriefBindingRow | undefined;
    return row ? mapRow(row) : null;
  },

  listByBriefId(briefId: string): BriefBindingRecord[] {
    const rows = db
      .prepare(
        `SELECT brief_id, binding_id, binding_intent_id, run_id, created_at, updated_at, artifact_catchup_completed_at
           FROM brief_bindings
          WHERE brief_id = ?
          ORDER BY datetime(created_at) DESC, binding_id DESC`,
      )
      .all(briefId) as BriefBindingRow[];
    return rows.map(mapRow);
  },

  upsertBinding(input: BriefBindingRecord): void {
    db.prepare(
      `INSERT INTO brief_bindings (
         brief_id,
         binding_id,
         binding_intent_id,
         run_id,
         created_at,
         updated_at,
         artifact_catchup_completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(binding_id) DO UPDATE SET
         brief_id = excluded.brief_id,
         binding_intent_id = excluded.binding_intent_id,
         run_id = excluded.run_id,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         artifact_catchup_completed_at = COALESCE(excluded.artifact_catchup_completed_at, brief_bindings.artifact_catchup_completed_at)`,
    ).run(
      input.briefId,
      input.bindingId,
      input.bindingIntentId,
      input.runId,
      input.createdAt,
      input.updatedAt,
      input.artifactCatchupCompletedAt,
    );
  },

  markArtifactCatchupCompleted(bindingId: string, completedAt: string): void {
    db.prepare(
      `UPDATE brief_bindings
          SET artifact_catchup_completed_at = ?,
              updated_at = CASE
                WHEN datetime(updated_at) > datetime(?) THEN updated_at
                ELSE ?
              END
        WHERE binding_id = ?`,
    ).run(completedAt, completedAt, completedAt, bindingId);
  },

  clearArtifactCatchupCompleted(bindingId: string): void {
    db.prepare(
      `UPDATE brief_bindings
          SET artifact_catchup_completed_at = NULL
        WHERE binding_id = ?`,
    ).run(bindingId);
  },
});
