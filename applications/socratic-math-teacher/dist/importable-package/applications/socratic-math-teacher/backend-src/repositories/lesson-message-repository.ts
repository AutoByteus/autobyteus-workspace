import type { DatabaseSync } from "node:sqlite";
import type { LessonMessageKind, LessonMessageRecord, LessonMessageRole } from "../domain/lesson-message-model.js";

type LessonMessageRow = {
  message_id: string;
  lesson_id: string;
  role: LessonMessageRole;
  kind: LessonMessageKind;
  body: string;
  created_at: string;
};

const mapRow = (row: LessonMessageRow): LessonMessageRecord => ({
  messageId: row.message_id,
  lessonId: row.lesson_id,
  role: row.role,
  kind: row.kind,
  body: row.body,
  createdAt: row.created_at,
});

export const createLessonMessageRepository = (db: DatabaseSync) => ({
  insertMessage(input: {
    messageId: string;
    lessonId: string;
    role: LessonMessageRole;
    kind: LessonMessageKind;
    body: string;
    createdAt: string;
    sourceEventId?: string | null;
    sourceRevisionId?: string | null;
  }): boolean {
    const result = db.prepare(
      `INSERT OR IGNORE INTO lesson_messages (message_id, lesson_id, role, kind, body, created_at, source_event_id, source_revision_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.messageId,
      input.lessonId,
      input.role,
      input.kind,
      input.body,
      input.createdAt,
      input.sourceEventId ?? null,
      input.sourceRevisionId ?? null,
    );
    return Number(result.changes ?? 0) > 0;
  },

  listByLessonId(lessonId: string): LessonMessageRecord[] {
    const rows = db
      .prepare(
        `SELECT message_id, lesson_id, role, kind, body, created_at
         FROM lesson_messages
         WHERE lesson_id = ?
         ORDER BY datetime(created_at) ASC, message_id ASC`,
      )
      .all(lessonId) as LessonMessageRow[];
    return rows.map(mapRow);
  },
});
