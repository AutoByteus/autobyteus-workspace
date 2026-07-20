import type { DatabaseSync } from "node:sqlite";

export type PendingLaunchRequestStatus = "PENDING_START" | "COMMITTED";

export type PendingLaunchRequestRecord = {
  launchRequestId: string;
  lessonId: string;
  status: PendingLaunchRequestStatus;
  bindingId: string | null;
  createdAt: string;
  updatedAt: string;
  committedAt: string | null;
};

type PendingLaunchRequestRow = {
  launch_request_id: string;
  lesson_id: string;
  status: PendingLaunchRequestStatus;
  binding_id: string | null;
  created_at: string;
  updated_at: string;
  committed_at: string | null;
};

const mapRow = (row: PendingLaunchRequestRow): PendingLaunchRequestRecord => ({
  launchRequestId: row.launch_request_id,
  lessonId: row.lesson_id,
  status: row.status,
  bindingId: row.binding_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  committedAt: row.committed_at,
});

export const createPendingLaunchRequestRepository = (db: DatabaseSync) => ({
  getByLaunchRequestId(launchRequestId: string): PendingLaunchRequestRecord | null {
    const row = db
      .prepare(
        `SELECT launch_request_id, lesson_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_launch_requests
          WHERE launch_request_id = ?`,
      )
      .get(launchRequestId) as PendingLaunchRequestRow | undefined;
    return row ? mapRow(row) : null;
  },

  insertPendingLaunchRequest(input: PendingLaunchRequestRecord): void {
    db.prepare(
      `INSERT INTO pending_launch_requests (
         launch_request_id,
         lesson_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.launchRequestId,
      input.lessonId,
      input.status,
      input.bindingId,
      input.createdAt,
      input.updatedAt,
      input.committedAt,
    );
  },

  markCommitted(input: {
    launchRequestId: string;
    bindingId: string;
    committedAt: string;
  }): void {
    db.prepare(
      `UPDATE pending_launch_requests
          SET status = 'COMMITTED',
              binding_id = ?,
              updated_at = ?,
              committed_at = COALESCE(committed_at, ?)
        WHERE launch_request_id = ?`,
    ).run(input.bindingId, input.committedAt, input.committedAt, input.launchRequestId);
  },
});
