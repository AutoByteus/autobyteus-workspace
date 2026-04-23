const mapRow = (row) => ({
    messageId: row.message_id,
    lessonId: row.lesson_id,
    role: row.role,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
});
export const createLessonMessageRepository = (db) => ({
    insertMessage(input) {
        const result = db.prepare(`INSERT OR IGNORE INTO lesson_messages (message_id, lesson_id, role, kind, body, created_at, source_event_id, source_revision_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(input.messageId, input.lessonId, input.role, input.kind, input.body, input.createdAt, input.sourceEventId ?? null, input.sourceRevisionId ?? null);
        return Number(result.changes ?? 0) > 0;
    },
    listByLessonId(lessonId) {
        const rows = db
            .prepare(`SELECT message_id, lesson_id, role, kind, body, created_at
         FROM lesson_messages
         WHERE lesson_id = ?
         ORDER BY datetime(created_at) ASC, message_id ASC`)
            .all(lessonId);
        return rows.map(mapRow);
    },
});
