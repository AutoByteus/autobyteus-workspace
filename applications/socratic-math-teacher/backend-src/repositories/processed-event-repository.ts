import type { DatabaseSync } from "node:sqlite";

export const createProcessedEventRepository = (db: DatabaseSync) => ({
  claimEvent(input: {
    eventId: string;
    lessonId: string;
    journalSequence: number;
    processedAt: string;
  }): boolean {
    const result = db.prepare(
      `INSERT OR IGNORE INTO processed_events (event_id, lesson_id, journal_sequence, processed_at)
       VALUES (?, ?, ?, ?)`,
    ).run(input.eventId, input.lessonId, input.journalSequence, input.processedAt);
    return result.changes > 0;
  },
});
