import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  type InboxStore,
  type InboundInboxDisposition,
  type InboundInboxRecord,
  type InboundInboxStatus,
} from "../../domain/models/inbox-store.js";
import { buildInboundIdempotencyKey } from "./idempotency-service.js";
import { replayRecordNotFound, replayStatusMismatch } from "./replay-error.js";

export class InboundInboxService {
  constructor(private readonly store: InboxStore) {}

  async enqueue(envelope: ExternalMessageEnvelope): Promise<{
    record: InboundInboxRecord;
    duplicate: boolean;
  }> {
    return this.store.upsertByIngressKey({
      ingressKey: buildInboundIdempotencyKey(envelope),
      payload: envelope,
    });
  }

  async leasePending(limit: number, nowIso: string): Promise<InboundInboxRecord[]> {
    return this.store.leasePending(limit, nowIso);
  }

  async markForwarding(recordId: string): Promise<InboundInboxRecord> {
    return this.store.updateStatus(recordId, {
      status: "FORWARDING",
      nextAttemptAt: null,
      lastError: null,
    });
  }

  async markCompleted(
    recordId: string,
    disposition: InboundInboxDisposition,
  ): Promise<InboundInboxRecord> {
    return this.store.updateStatus(recordId, {
      status: dispositionToStatus(disposition),
      nextAttemptAt: null,
      lastError: null,
    });
  }

  async markRetry(
    recordId: string,
    errorMessage: string,
    nextAttemptAtIso: string,
  ): Promise<InboundInboxRecord> {
    const current = await this.requireRecord(recordId);
    return this.store.updateStatus(recordId, {
      status: "FAILED_RETRY",
      attemptCount: current.attemptCount + 1,
      nextAttemptAt: nextAttemptAtIso,
      lastError: errorMessage,
    });
  }

  async markDeadLetter(recordId: string, errorMessage: string): Promise<InboundInboxRecord> {
    const current = await this.requireRecord(recordId);
    return this.store.updateStatus(recordId, {
      status: "DEAD_LETTER",
      attemptCount: current.attemptCount + 1,
      nextAttemptAt: null,
      lastError: errorMessage,
    });
  }

  async markBlocked(recordId: string, reason: string): Promise<InboundInboxRecord> {
    return this.store.updateStatus(recordId, {
      status: "BLOCKED",
      nextAttemptAt: null,
      lastError: reason,
    });
  }

  async getById(recordId: string): Promise<InboundInboxRecord | null> {
    return this.store.getById(recordId);
  }

  async listByStatus(statuses: InboundInboxStatus[]): Promise<InboundInboxRecord[]> {
    return this.store.listByStatus(statuses);
  }

  async replayFromStatus(
    recordId: string,
    expectedStatus: InboundInboxStatus,
  ): Promise<InboundInboxRecord> {
    const current = await this.requireRecord(recordId);
    if (current.status !== expectedStatus) {
      throw replayStatusMismatch(
        `Inbound record ${recordId} status mismatch: expected ${expectedStatus}, got ${current.status}.`,
      );
    }
    return this.store.updateStatus(recordId, {
      status: "RECEIVED",
      nextAttemptAt: null,
      lastError: null,
    });
  }

  private async requireRecord(recordId: string): Promise<InboundInboxRecord> {
    const record = await this.store.getById(recordId);
    if (!record) {
      throw replayRecordNotFound(`Inbound inbox record not found: ${recordId}`);
    }
    return record;
  }
}

const dispositionToStatus = (disposition: InboundInboxDisposition): InboundInboxStatus => {
  if (disposition === "ROUTED") {
    return "COMPLETED_ROUTED";
  }
  if (disposition === "UNBOUND") {
    return "COMPLETED_UNBOUND";
  }
  return "COMPLETED_DUPLICATE";
};
