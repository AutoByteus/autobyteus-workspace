const mapRow = (row) => ({
    briefId: row.brief_id,
    title: row.title,
    status: row.status,
    latestBindingId: row.latest_binding_id,
    latestRunId: row.latest_run_id,
    latestBindingStatus: row.latest_binding_status,
    lastErrorMessage: row.last_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
});
export const createBriefRepository = (db) => ({
    getById(briefId) {
        const row = db
            .prepare(`SELECT brief_id, title, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         WHERE brief_id = ?`)
            .get(briefId);
        return row ? mapRow(row) : null;
    },
    listSummaries() {
        const rows = db
            .prepare(`SELECT brief_id, title, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         ORDER BY datetime(updated_at) DESC, brief_id DESC`)
            .all();
        return rows.map(mapRow).map(({ createdAt, approvedAt, rejectedAt, ...summary }) => summary);
    },
    upsertProjectedBrief(input) {
        db.prepare(`INSERT INTO briefs (
        brief_id,
        title,
        status,
        latest_binding_id,
        latest_run_id,
        latest_binding_status,
        last_error_message,
        created_at,
        updated_at,
        approved_at,
        rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT(brief_id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        latest_binding_id = excluded.latest_binding_id,
        latest_run_id = excluded.latest_run_id,
        latest_binding_status = excluded.latest_binding_status,
        last_error_message = excluded.last_error_message,
        updated_at = excluded.updated_at`).run(input.briefId, input.title, input.status, input.latestBindingId ?? null, input.latestRunId ?? null, input.latestBindingStatus ?? null, input.lastErrorMessage ?? null, input.updatedAt, input.updatedAt);
    },
    setStatus(input) {
        db.prepare(`UPDATE briefs
       SET status = ?,
           updated_at = ?,
           approved_at = ?,
           rejected_at = ?,
           last_error_message = NULL
       WHERE brief_id = ?`).run(input.status, input.updatedAt, input.approvedAt ?? null, input.rejectedAt ?? null, input.briefId);
    },
});
