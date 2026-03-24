import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type {
  OutboxStore,
  OutboundOutboxRecord,
  OutboundOutboxStatus,
} from "../../domain/models/outbox-store.js";
import { replayRecordNotFound, replayStatusMismatch } from "./replay-error.js";

export class OutboundOutboxService {
  constructor(private readonly store: OutboxStore) {}

  async enqueueOrGet(
    dispatchKey: string,
    payload: ExternalOutboundEnvelope,
  ): Promise<{
    record: OutboundOutboxRecord;
    duplicate: boolean;
  }> {
    return this.store.upsertByDispatchKey({
      dispatchKey,
      payload,
    });
  }

  async leasePending(limit: number, nowIso: string): Promise<OutboundOutboxRecord[]> {
    return this.store.leasePending(limit, nowIso);
  }

  async markSending(recordId: string): Promise<OutboundOutboxRecord> {
    return this.store.updateStatus(recordId, {
      status: "SENDING",
      nextAttemptAt: null,
      lastError: null,
    });
  }

  async markSent(recordId: string): Promise<OutboundOutboxRecord> {
    return this.store.updateStatus(recordId, {
      status: "SENT",
      nextAttemptAt: null,
      lastError: null,
    });
  }

  async markRetry(
    recordId: string,
    errorMessage: string,
    nextAttemptAtIso: string,
  ): Promise<OutboundOutboxRecord> {
    const current = await this.requireRecord(recordId);
    return this.store.updateStatus(recordId, {
      status: "FAILED_RETRY",
      attemptCount: current.attemptCount + 1,
      nextAttemptAt: nextAttemptAtIso,
      lastError: errorMessage,
    });
  }

  async markDeadLetter(recordId: string, errorMessage: string): Promise<OutboundOutboxRecord> {
    const current = await this.requireRecord(recordId);
    return this.store.updateStatus(recordId, {
      status: "DEAD_LETTER",
      attemptCount: current.attemptCount + 1,
      nextAttemptAt: null,
      lastError: errorMessage,
    });
  }

  async getById(recordId: string): Promise<OutboundOutboxRecord | null> {
    return this.store.getById(recordId);
  }

  async listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]> {
    return this.store.listByStatus(statuses);
  }

  async replayFromStatus(
    recordId: string,
    expectedStatus: OutboundOutboxStatus,
  ): Promise<OutboundOutboxRecord> {
    const current = await this.requireRecord(recordId);
    if (current.status !== expectedStatus) {
      throw replayStatusMismatch(
        `Outbound record ${recordId} status mismatch: expected ${expectedStatus}, got ${current.status}.`,
      );
    }
    return this.store.updateStatus(recordId, {
      status: "PENDING",
      nextAttemptAt: null,
      lastError: null,
    });
  }

  private async requireRecord(recordId: string): Promise<OutboundOutboxRecord> {
    const record = await this.store.getById(recordId);
    if (!record) {
      throw replayRecordNotFound(`Outbound outbox record not found: ${recordId}`);
    }
    return record;
  }
}
