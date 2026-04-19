import type { DatabaseSync } from "node:sqlite";
import {
  APPLICATION_EVENT_DELIVERY_SEMANTICS,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type {
  ApplicationExecutionEventJournalEvent,
  ApplicationExecutionEventJournalRecord,
} from "../domain/models.js";

const ensureTables = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __autobyteus_execution_event_journal (
      journal_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      application_id TEXT NOT NULL,
      execution_ref TEXT NOT NULL,
      family TEXT NOT NULL,
      published_at TEXT NOT NULL,
      binding_json TEXT NOT NULL,
      producer_json TEXT,
      payload_json TEXT NOT NULL,
      acked_at TEXT,
      last_dispatch_attempt_number INTEGER NOT NULL DEFAULT 0,
      last_dispatched_at TEXT,
      last_error_kind TEXT,
      last_error_message TEXT,
      next_attempt_after TEXT
    );
    CREATE TABLE IF NOT EXISTS __autobyteus_execution_event_dispatch_cursor (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      last_acked_journal_sequence INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.prepare(
    `INSERT OR IGNORE INTO __autobyteus_execution_event_dispatch_cursor (
       singleton_id,
       last_acked_journal_sequence,
       updated_at
     ) VALUES (1, 0, ?)`,
  ).run(new Date().toISOString());
};

const hydrateJournalRecord = (row: Record<string, unknown>): ApplicationExecutionEventJournalRecord => ({
  event: {
    eventId: String(row.event_id),
    journalSequence: Number(row.journal_sequence),
    applicationId: String(row.application_id),
    executionRef: String(row.execution_ref),
    family: row.family as ApplicationExecutionEventJournalEvent["family"],
    publishedAt: String(row.published_at),
    binding: JSON.parse(String(row.binding_json)) as ApplicationExecutionEventJournalEvent["binding"],
    producer: row.producer_json ? JSON.parse(String(row.producer_json)) as ApplicationExecutionEventJournalEvent["producer"] : null,
    payload: JSON.parse(String(row.payload_json)) as ApplicationExecutionEventJournalEvent["payload"],
  },
  ackedAt: row.acked_at ? String(row.acked_at) : null,
  lastDispatchAttemptNumber: Number(row.last_dispatch_attempt_number ?? 0),
  lastDispatchedAt: row.last_dispatched_at ? String(row.last_dispatched_at) : null,
  lastErrorKind: row.last_error_kind ? String(row.last_error_kind) : null,
  lastErrorMessage: row.last_error_message ? String(row.last_error_message) : null,
  nextAttemptAfter: row.next_attempt_after ? String(row.next_attempt_after) : null,
});

export class ApplicationExecutionEventJournalStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  appendEvent(
    db: DatabaseSync,
    event: Omit<ApplicationExecutionEventJournalEvent, "journalSequence">,
  ): ApplicationExecutionEventJournalRecord {
    ensureTables(db);
    const result = db.prepare(
      `INSERT INTO __autobyteus_execution_event_journal (
         event_id,
         application_id,
         execution_ref,
         family,
         published_at,
         binding_json,
         producer_json,
         payload_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      event.eventId,
      event.applicationId,
      event.executionRef,
      event.family,
      event.publishedAt,
      JSON.stringify(event.binding),
      event.producer ? JSON.stringify(event.producer) : null,
      JSON.stringify(event.payload),
    ) as { lastInsertRowid?: number | bigint };

    return {
      event: {
        ...event,
        journalSequence: Number(result.lastInsertRowid ?? 0),
      },
      ackedAt: null,
      lastDispatchAttemptNumber: 0,
      lastDispatchedAt: null,
      lastErrorKind: null,
      lastErrorMessage: null,
      nextAttemptAfter: null,
    };
  }

  async appendEventAwaitable(
    applicationId: string,
    event: Omit<ApplicationExecutionEventJournalEvent, "journalSequence">,
  ): Promise<ApplicationExecutionEventJournalRecord> {
    return this.platformStateStore.withTransaction(applicationId, (db) => this.appendEvent(db, event));
  }

  async getNextPendingRecord(applicationId: string): Promise<ApplicationExecutionEventJournalRecord | null> {
    return this.platformStateStore.withDatabase(applicationId, (db) => this.readNextPendingRecord(db, applicationId));
  }

  async getNextPendingRecordIfPresent(applicationId: string): Promise<ApplicationExecutionEventJournalRecord | null> {
    const result = await this.platformStateStore.withExistingDatabase(
      applicationId,
      (db) => this.readNextPendingRecord(db, applicationId),
    );
    return result ?? null;
  }

  async recordDispatchAttempt(
    applicationId: string,
    journalSequence: number,
    attemptNumber: number,
    dispatchedAt: string,
  ): Promise<void> {
    await this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureTables(db);
      db.prepare(
        `UPDATE __autobyteus_execution_event_journal
            SET last_dispatch_attempt_number = ?,
                last_dispatched_at = ?,
                last_error_kind = NULL,
                last_error_message = NULL,
                next_attempt_after = NULL
          WHERE journal_sequence = ?`,
      ).run(attemptNumber, dispatchedAt, journalSequence);
    });
  }

  async acknowledgeRecord(applicationId: string, journalSequence: number, ackedAt: string): Promise<void> {
    await this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureTables(db);
      db.prepare(
        `UPDATE __autobyteus_execution_event_journal
            SET acked_at = ?,
                next_attempt_after = NULL,
                last_error_kind = NULL,
                last_error_message = NULL
          WHERE journal_sequence = ?`,
      ).run(ackedAt, journalSequence);
      db.prepare(
        `UPDATE __autobyteus_execution_event_dispatch_cursor
            SET last_acked_journal_sequence = ?,
                updated_at = ?
          WHERE singleton_id = 1`,
      ).run(journalSequence, ackedAt);
    });
  }

  async recordDispatchFailure(
    applicationId: string,
    journalSequence: number,
    input: {
      errorKind: string;
      errorMessage: string;
      nextAttemptAfter: string;
    },
  ): Promise<void> {
    await this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureTables(db);
      db.prepare(
        `UPDATE __autobyteus_execution_event_journal
            SET last_error_kind = ?,
                last_error_message = ?,
                next_attempt_after = ?
          WHERE journal_sequence = ?`,
      ).run(input.errorKind, input.errorMessage, input.nextAttemptAfter, journalSequence);
    });
  }

  buildDispatchEnvelope(
    record: ApplicationExecutionEventJournalRecord,
    attemptNumber: number,
    dispatchedAt: string,
  ) {
    return {
      event: record.event,
      delivery: {
        semantics: APPLICATION_EVENT_DELIVERY_SEMANTICS,
        attemptNumber,
        dispatchedAt,
      },
    };
  }

  private readNextPendingRecord(
    db: DatabaseSync,
    applicationId: string,
  ): ApplicationExecutionEventJournalRecord | null {
    ensureTables(db);
    const cursorRow = db
      .prepare(
        `SELECT last_acked_journal_sequence
           FROM __autobyteus_execution_event_dispatch_cursor
          WHERE singleton_id = 1`,
      )
      .get() as { last_acked_journal_sequence: number } | undefined;
    const lastAckedJournalSequence = cursorRow?.last_acked_journal_sequence ?? 0;
    const row = db
      .prepare(
        `SELECT journal_sequence,
                event_id,
                application_id,
                execution_ref,
                family,
                published_at,
                binding_json,
                producer_json,
                payload_json,
                acked_at,
                last_dispatch_attempt_number,
                last_dispatched_at,
                last_error_kind,
                last_error_message,
                next_attempt_after
           FROM __autobyteus_execution_event_journal
          WHERE application_id = ?
            AND journal_sequence > ?
          ORDER BY journal_sequence ASC
          LIMIT 1`,
      )
      .get(applicationId, lastAckedJournalSequence) as Record<string, unknown> | undefined;
    return row ? hydrateJournalRecord(row) : null;
  }
}
