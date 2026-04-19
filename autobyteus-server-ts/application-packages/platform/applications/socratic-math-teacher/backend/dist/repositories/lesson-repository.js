const mapRow = (row) => ({
    lessonId: row.lesson_id,
    prompt: row.prompt,
    status: row.status,
    latestBindingId: row.latest_binding_id,
    latestRunId: row.latest_run_id,
    latestBindingStatus: row.latest_binding_status,
    lastErrorMessage: row.last_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
});
export const createLessonRepository = (db) => ({
    getById(lessonId) {
        const row = db
            .prepare(`SELECT lesson_id, prompt, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, closed_at
         FROM lessons
         WHERE lesson_id = ?`)
            .get(lessonId);
        return row ? mapRow(row) : null;
    },
    listSummaries() {
        const rows = db
            .prepare(`SELECT lesson_id, prompt, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, closed_at
         FROM lessons
         ORDER BY datetime(updated_at) DESC, lesson_id DESC`)
            .all();
        return rows.map(mapRow).map(({ createdAt, closedAt, ...summary }) => summary);
    },
    upsertLesson(input) {
        db.prepare(`INSERT INTO lessons (
        lesson_id,
        prompt,
        status,
        latest_binding_id,
        latest_run_id,
        latest_binding_status,
        last_error_message,
        created_at,
        updated_at,
        closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lesson_id) DO UPDATE SET
        prompt = excluded.prompt,
        status = excluded.status,
        latest_binding_id = excluded.latest_binding_id,
        latest_run_id = excluded.latest_run_id,
        latest_binding_status = excluded.latest_binding_status,
        last_error_message = excluded.last_error_message,
        updated_at = excluded.updated_at,
        closed_at = excluded.closed_at`).run(input.lessonId, input.prompt, input.status, input.latestBindingId ?? null, input.latestRunId ?? null, input.latestBindingStatus ?? null, input.lastErrorMessage ?? null, input.updatedAt, input.updatedAt, input.closedAt ?? null);
    },
});
