import type { DatabaseSync } from "node:sqlite";
import type { BriefDetail, BriefStatus, BriefSummary } from "../domain/brief-model.js";

type BriefRow = {
  brief_id: string;
  application_session_id: string;
  title: string;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
};

const mapRow = (row: BriefRow): BriefDetail => ({
  briefId: row.brief_id,
  applicationSessionId: row.application_session_id,
  title: row.title,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  approvedAt: row.approved_at,
  rejectedAt: row.rejected_at,
});

export const createBriefRepository = (db: DatabaseSync) => ({
  getById(briefId: string): BriefDetail | null {
    const row = db
      .prepare(
        `SELECT brief_id, application_session_id, title, status, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         WHERE brief_id = ?`,
      )
      .get(briefId) as BriefRow | undefined;
    return row ? mapRow(row) : null;
  },

  listSummaries(): BriefSummary[] {
    const rows = db
      .prepare(
        `SELECT brief_id, application_session_id, title, status, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         ORDER BY datetime(updated_at) DESC, brief_id DESC`,
      )
      .all() as BriefRow[];
    return rows.map(mapRow).map(({ createdAt, approvedAt, rejectedAt, ...summary }) => summary);
  },

  upsertProjectedBrief(input: {
    briefId: string;
    applicationSessionId: string;
    title: string;
    status: BriefStatus;
    updatedAt: string;
  }): void {
    db.prepare(
      `INSERT INTO briefs (
        brief_id,
        application_session_id,
        title,
        status,
        created_at,
        updated_at,
        approved_at,
        rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT(brief_id) DO UPDATE SET
        application_session_id = excluded.application_session_id,
        title = excluded.title,
        status = excluded.status,
        updated_at = excluded.updated_at`,
    ).run(
      input.briefId,
      input.applicationSessionId,
      input.title,
      input.status,
      input.updatedAt,
      input.updatedAt,
    );
  },

  setStatus(input: {
    briefId: string;
    status: BriefStatus;
    updatedAt: string;
    approvedAt?: string | null;
    rejectedAt?: string | null;
  }): void {
    db.prepare(
      `UPDATE briefs
       SET status = ?,
           updated_at = ?,
           approved_at = ?,
           rejected_at = ?
       WHERE brief_id = ?`,
    ).run(
      input.status,
      input.updatedAt,
      input.approvedAt ?? null,
      input.rejectedAt ?? null,
      input.briefId,
    );
  },
});
