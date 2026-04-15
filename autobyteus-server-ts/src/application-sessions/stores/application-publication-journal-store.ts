import type { DatabaseSync } from "node:sqlite";
import {
  APPLICATION_EVENT_DELIVERY_SEMANTICS,
  type NormalizedPublicationEvent,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type {
  ApplicationNormalizedPublicationPayload,
  ApplicationPublicationDispatchEnvelope,
  ApplicationPublicationJournalRecord,
} from "../domain/models.js";

const hydrateJournalRecord = (row: Record<string, unknown>): ApplicationPublicationJournalRecord => ({
  event: {
    eventId: String(row.event_id),
    journalSequence: Number(row.journal_sequence),
    applicationId: String(row.application_id),
    applicationSessionId: String(row.application_session_id),
    family: row.family as NormalizedPublicationEvent<ApplicationNormalizedPublicationPayload>["family"],
    publishedAt: String(row.published_at),
    producer: JSON.parse(String(row.producer_json)) as NormalizedPublicationEvent["producer"],
    payload: JSON.parse(String(row.payload_json)) as ApplicationNormalizedPublicationPayload,
  },
  ackedAt: row.acked_at ? String(row.acked_at) : null,
  lastDispatchAttemptNumber: Number(row.last_dispatch_attempt_number ?? 0),
  lastDispatchedAt: row.last_dispatched_at ? String(row.last_dispatched_at) : null,
  lastErrorKind: row.last_error_kind ? String(row.last_error_kind) : null,
  lastErrorMessage: row.last_error_message ? String(row.last_error_message) : null,
  nextAttemptAfter: row.next_attempt_after ? String(row.next_attempt_after) : null,
});

export class ApplicationPublicationJournalStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  appendNormalizedEvent(
    db: DatabaseSync,
    event: Omit<NormalizedPublicationEvent<ApplicationNormalizedPublicationPayload>, "journalSequence">,
  ): ApplicationPublicationJournalRecord {
    const result = db.prepare(
      `INSERT INTO __autobyteus_publication_journal (
         event_id,
         application_id,
         application_session_id,
         family,
         published_at,
         producer_json,
         payload_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      event.eventId,
      event.applicationId,
      event.applicationSessionId,
      event.family,
      event.publishedAt,
      JSON.stringify(event.producer),
      JSON.stringify(event.payload),
    ) as { lastInsertRowid?: number | bigint };
    const journalSequence = Number(result.lastInsertRowid ?? 0);
    return {
      event: {
        ...event,
        journalSequence,
      },
      ackedAt: null,
      lastDispatchAttemptNumber: 0,
      lastDispatchedAt: null,
      lastErrorKind: null,
      lastErrorMessage: null,
      nextAttemptAfter: null,
    };
  }

  async getNextPendingRecord(applicationId: string): Promise<ApplicationPublicationJournalRecord | null> {
    return this.platformStateStore.withDatabase(applicationId, (db) => this.readNextPendingRecord(db, applicationId));
  }

  async getNextPendingRecordIfPresent(applicationId: string): Promise<ApplicationPublicationJournalRecord | null> {
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
      db.prepare(
        `UPDATE __autobyteus_publication_journal
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
      db.prepare(
        `UPDATE __autobyteus_publication_journal
            SET acked_at = ?,
                next_attempt_after = NULL,
                last_error_kind = NULL,
                last_error_message = NULL
          WHERE journal_sequence = ?`,
      ).run(ackedAt, journalSequence);
      db.prepare(
        `UPDATE __autobyteus_publication_dispatch_cursor
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
      db.prepare(
        `UPDATE __autobyteus_publication_journal
            SET last_error_kind = ?,
                last_error_message = ?,
                next_attempt_after = ?
          WHERE journal_sequence = ?`,
      ).run(input.errorKind, input.errorMessage, input.nextAttemptAfter, journalSequence);
    });
  }

  buildDispatchEnvelope(
    record: ApplicationPublicationJournalRecord,
    attemptNumber: number,
    dispatchedAt: string,
  ): ApplicationPublicationDispatchEnvelope {
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
  ): ApplicationPublicationJournalRecord | null {
    const cursorRow = db
      .prepare(
        `SELECT last_acked_journal_sequence
           FROM __autobyteus_publication_dispatch_cursor
          WHERE singleton_id = 1`,
      )
      .get() as { last_acked_journal_sequence: number } | undefined;
    const lastAckedJournalSequence = cursorRow?.last_acked_journal_sequence ?? 0;
    const row = db
      .prepare(
        `SELECT journal_sequence,
                event_id,
                application_id,
                application_session_id,
                family,
                published_at,
                producer_json,
                payload_json,
                acked_at,
                last_dispatch_attempt_number,
                last_dispatched_at,
                last_error_kind,
                last_error_message,
                next_attempt_after
           FROM __autobyteus_publication_journal
          WHERE application_id = ?
            AND journal_sequence > ?
          ORDER BY journal_sequence ASC
          LIMIT 1`,
      )
      .get(applicationId, lastAckedJournalSequence) as Record<string, unknown> | undefined;
    return row ? hydrateJournalRecord(row) : null;
  }
}
