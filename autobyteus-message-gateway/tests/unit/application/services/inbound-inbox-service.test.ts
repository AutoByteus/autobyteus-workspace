import { describe, expect, it } from "vitest";
import { InboundInboxService } from "../../../../src/application/services/inbound-inbox-service.js";
import { ReplayError } from "../../../../src/application/services/replay-error.js";
import type {
  InboxStore,
  InboundInboxCreateInput,
  InboundInboxRecord,
  InboundInboxStatus,
  InboundInboxStatusUpdate,
  InboundInboxUpsertResult,
} from "../../../../src/domain/models/inbox-store.js";

class FakeInboxStore implements InboxStore {
  private readonly records = new Map<string, InboundInboxRecord>();
  private readonly byIngressKey = new Map<string, string>();
  private nextId = 1;

  async upsertByIngressKey(input: InboundInboxCreateInput): Promise<InboundInboxUpsertResult> {
    const existingId = this.byIngressKey.get(input.ingressKey);
    if (existingId) {
      return {
        record: this.records.get(existingId)!,
        duplicate: true,
      };
    }

    const createdAt = input.createdAt ?? "2026-02-12T00:00:00.000Z";
    const record: InboundInboxRecord = {
      id: `r-${this.nextId++}`,
      ingressKey: input.ingressKey,
      provider: input.payload.provider,
      transport: input.payload.transport,
      accountId: input.payload.accountId,
      peerId: input.payload.peerId,
      threadId: input.payload.threadId,
      externalMessageId: input.payload.externalMessageId,
      payload: input.payload,
      status: "RECEIVED",
      attemptCount: 0,
      nextAttemptAt: null,
      lastError: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.records.set(record.id, record);
    this.byIngressKey.set(record.ingressKey, record.id);
    return {
      record,
      duplicate: false,
    };
  }

  async getById(recordId: string): Promise<InboundInboxRecord | null> {
    return this.records.get(recordId) ?? null;
  }

  async leasePending(limit: number): Promise<InboundInboxRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.status === "RECEIVED" || record.status === "FAILED_RETRY")
      .slice(0, limit);
  }

  async updateStatus(recordId: string, update: InboundInboxStatusUpdate): Promise<InboundInboxRecord> {
    const current = this.records.get(recordId);
    if (!current) {
      throw new Error("missing");
    }
    const next: InboundInboxRecord = {
      ...current,
      status: update.status,
      attemptCount: update.attemptCount ?? current.attemptCount,
      nextAttemptAt:
        update.nextAttemptAt === undefined ? current.nextAttemptAt : update.nextAttemptAt,
      lastError: update.lastError === undefined ? current.lastError : update.lastError,
      updatedAt: update.updatedAt ?? current.updatedAt,
    };
    this.records.set(recordId, next);
    return next;
  }

  async listByStatus(statuses: InboundInboxStatus[]): Promise<InboundInboxRecord[]> {
    const filter = new Set(statuses);
    return [...this.records.values()].filter((record) => filter.has(record.status));
  }
}

const buildEnvelope = (externalMessageId: string) => ({
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:1",
  peerType: "USER",
  threadId: null,
  externalMessageId,
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-12T00:00:00.000Z",
  metadata: {},
  routingKey: "DISCORD:BUSINESS_API:acc-1:user:1:_",
});

describe("InboundInboxService", () => {
  it("enqueues and deduplicates by ingress key", async () => {
    const service = new InboundInboxService(new FakeInboxStore());

    const first = await service.enqueue(buildEnvelope("m-1") as any);
    const second = await service.enqueue(buildEnvelope("m-1") as any);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);
  });

  it("maps completion and retry/dead-letter transitions", async () => {
    const service = new InboundInboxService(new FakeInboxStore());
    const created = await service.enqueue(buildEnvelope("m-2") as any);

    await service.markForwarding(created.record.id);
    await service.markRetry(created.record.id, "timeout", "2026-02-12T00:00:10.000Z");
    await service.markCompleted(created.record.id, "UNBOUND");

    const completed = await service.getById(created.record.id);
    expect(completed).toMatchObject({
      status: "COMPLETED_UNBOUND",
    });

    await service.markDeadLetter(created.record.id, "fatal");
    const deadLetter = await service.getById(created.record.id);
    expect(deadLetter).toMatchObject({
      status: "DEAD_LETTER",
      lastError: "fatal",
    });
  });

  it("replays records only from expected status", async () => {
    const service = new InboundInboxService(new FakeInboxStore());
    const created = await service.enqueue(buildEnvelope("m-3") as any);
    await service.markDeadLetter(created.record.id, "terminal");

    const replayed = await service.replayFromStatus(created.record.id, "DEAD_LETTER");
    expect(replayed.status).toBe("RECEIVED");

    await expect(
      service.replayFromStatus(created.record.id, "COMPLETED_UNBOUND"),
    ).rejects.toMatchObject({
      code: "REPLAY_STATUS_MISMATCH",
    } satisfies Partial<ReplayError>);
  });

  it("raises a typed replay error when the record is missing", async () => {
    const service = new InboundInboxService(new FakeInboxStore());

    await expect(service.replayFromStatus("missing", "DEAD_LETTER")).rejects.toMatchObject({
      code: "RECORD_NOT_FOUND",
    } satisfies Partial<ReplayError>);
  });
});
