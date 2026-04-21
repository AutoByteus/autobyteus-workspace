import type { DatabaseSync } from "node:sqlite";

export const createProcessedEventRepository = (db: DatabaseSync) => ({
  claimEvent(input: {
    eventId: string;
    briefId: string;
    journalSequence: number;
    processedAt: string;
  }): boolean {
    const result = db.prepare(
      `INSERT INTO processed_events (event_id, brief_id, journal_sequence, processed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id) DO NOTHING`,
    ).run(input.eventId, input.briefId, input.journalSequence, input.processedAt);
    return Number(result.changes ?? 0) > 0;
  },
});
