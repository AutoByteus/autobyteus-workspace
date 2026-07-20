const mapRow = (row) => ({
    launchRequestId: row.launch_request_id,
    lessonId: row.lesson_id,
    status: row.status,
    bindingId: row.binding_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    committedAt: row.committed_at,
});
export const createPendingLaunchRequestRepository = (db) => ({
    getByLaunchRequestId(launchRequestId) {
        const row = db
            .prepare(`SELECT launch_request_id, lesson_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_launch_requests
          WHERE launch_request_id = ?`)
            .get(launchRequestId);
        return row ? mapRow(row) : null;
    },
    insertPendingLaunchRequest(input) {
        db.prepare(`INSERT INTO pending_launch_requests (
         launch_request_id,
         lesson_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(input.launchRequestId, input.lessonId, input.status, input.bindingId, input.createdAt, input.updatedAt, input.committedAt);
    },
    markCommitted(input) {
        db.prepare(`UPDATE pending_launch_requests
          SET status = 'COMMITTED',
              binding_id = ?,
              updated_at = ?,
              committed_at = COALESCE(committed_at, ?)
        WHERE launch_request_id = ?`).run(input.bindingId, input.committedAt, input.committedAt, input.launchRequestId);
    },
});
