export const createProcessedEventRepository = (db) => ({
    claimEvent(input) {
        const result = db.prepare(`INSERT OR IGNORE INTO processed_events (event_id, lesson_id, journal_sequence, processed_at)
       VALUES (?, ?, ?, ?)`).run(input.eventId, input.lessonId, input.journalSequence, input.processedAt);
        return result.changes > 0;
    },
});
