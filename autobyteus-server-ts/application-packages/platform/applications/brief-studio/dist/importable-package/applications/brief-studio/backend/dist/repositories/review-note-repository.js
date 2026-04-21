const mapRow = (row) => ({
    noteId: row.note_id,
    briefId: row.brief_id,
    body: row.body,
    createdAt: row.created_at,
});
export const createReviewNoteRepository = (db) => ({
    insertNote(input) {
        db.prepare(`INSERT INTO review_notes (note_id, brief_id, body, created_at) VALUES (?, ?, ?, ?)`).run(input.noteId, input.briefId, input.body, input.createdAt);
    },
    listByBriefId(briefId) {
        const rows = db
            .prepare(`SELECT note_id, brief_id, body, created_at
         FROM review_notes
         WHERE brief_id = ?
         ORDER BY datetime(created_at) DESC, note_id DESC`)
            .all(briefId);
        return rows.map(mapRow);
    },
});
