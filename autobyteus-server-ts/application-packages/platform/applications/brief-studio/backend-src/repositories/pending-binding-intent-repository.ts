import type { DatabaseSync } from "node:sqlite";

export type PendingBindingIntentStatus = "PENDING_START" | "COMMITTED";

export type PendingBindingIntentRecord = {
  bindingIntentId: string;
  briefId: string;
  status: PendingBindingIntentStatus;
  bindingId: string | null;
  createdAt: string;
  updatedAt: string;
  committedAt: string | null;
};

type PendingBindingIntentRow = {
  binding_intent_id: string;
  brief_id: string;
  status: PendingBindingIntentStatus;
  binding_id: string | null;
  created_at: string;
  updated_at: string;
  committed_at: string | null;
};

const mapRow = (row: PendingBindingIntentRow): PendingBindingIntentRecord => ({
  bindingIntentId: row.binding_intent_id,
  briefId: row.brief_id,
  status: row.status,
  bindingId: row.binding_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  committedAt: row.committed_at,
});

export const createPendingBindingIntentRepository = (db: DatabaseSync) => ({
  getByBindingIntentId(bindingIntentId: string): PendingBindingIntentRecord | null {
    const row = db
      .prepare(
        `SELECT binding_intent_id, brief_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_binding_intents
          WHERE binding_intent_id = ?`,
      )
      .get(bindingIntentId) as PendingBindingIntentRow | undefined;
    return row ? mapRow(row) : null;
  },

  insertPendingIntent(input: PendingBindingIntentRecord): void {
    db.prepare(
      `INSERT INTO pending_binding_intents (
         binding_intent_id,
         brief_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.bindingIntentId,
      input.briefId,
      input.status,
      input.bindingId,
      input.createdAt,
      input.updatedAt,
      input.committedAt,
    );
  },

  markCommitted(input: {
    bindingIntentId: string;
    bindingId: string;
    committedAt: string;
  }): void {
    db.prepare(
      `UPDATE pending_binding_intents
          SET status = 'COMMITTED',
              binding_id = ?,
              updated_at = ?,
              committed_at = COALESCE(committed_at, ?)
        WHERE binding_intent_id = ?`,
    ).run(input.bindingId, input.committedAt, input.committedAt, input.bindingIntentId);
  },
});
