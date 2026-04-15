const mapRow = (row) => ({
    briefId: row.brief_id,
    applicationSessionId: row.application_session_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
});
export const createBriefRepository = (db) => ({
    getById(briefId) {
        const row = db
            .prepare(`SELECT brief_id, application_session_id, title, status, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         WHERE brief_id = ?`)
            .get(briefId);
        return row ? mapRow(row) : null;
    },
    listSummaries() {
        const rows = db
            .prepare(`SELECT brief_id, application_session_id, title, status, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         ORDER BY datetime(updated_at) DESC, brief_id DESC`)
            .all();
        return rows.map(mapRow).map(({ createdAt, approvedAt, rejectedAt, ...summary }) => summary);
    },
    upsertProjectedBrief(input) {
        db.prepare(`INSERT INTO briefs (
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
        updated_at = excluded.updated_at`).run(input.briefId, input.applicationSessionId, input.title, input.status, input.updatedAt, input.updatedAt);
    },
    setStatus(input) {
        db.prepare(`UPDATE briefs
       SET status = ?,
           updated_at = ?,
           approved_at = ?,
           rejected_at = ?
       WHERE brief_id = ?`).run(input.status, input.updatedAt, input.approvedAt ?? null, input.rejectedAt ?? null, input.briefId);
    },
});
