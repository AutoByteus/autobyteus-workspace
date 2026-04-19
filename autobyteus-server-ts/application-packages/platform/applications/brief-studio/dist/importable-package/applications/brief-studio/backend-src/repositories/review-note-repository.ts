import type { DatabaseSync } from "node:sqlite";
import type { ReviewNoteRecord } from "../domain/review-note-model.js";

type ReviewNoteRow = {
  note_id: string;
  brief_id: string;
  body: string;
  created_at: string;
};

const mapRow = (row: ReviewNoteRow): ReviewNoteRecord => ({
  noteId: row.note_id,
  briefId: row.brief_id,
  body: row.body,
  createdAt: row.created_at,
});

export const createReviewNoteRepository = (db: DatabaseSync) => ({
  insertNote(input: { noteId: string; briefId: string; body: string; createdAt: string }): void {
    db.prepare(
      `INSERT INTO review_notes (note_id, brief_id, body, created_at) VALUES (?, ?, ?, ?)`,
    ).run(input.noteId, input.briefId, input.body, input.createdAt);
  },

  listByBriefId(briefId: string): ReviewNoteRecord[] {
    const rows = db
      .prepare(
        `SELECT note_id, brief_id, body, created_at
         FROM review_notes
         WHERE brief_id = ?
         ORDER BY datetime(created_at) DESC, note_id DESC`,
      )
      .all(briefId) as ReviewNoteRow[];
    return rows.map(mapRow);
  },
});
