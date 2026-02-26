import { describe, expect, it } from "vitest";
import { OutboundOutboxService } from "../../../../src/application/services/outbound-outbox-service.js";
import type {
  OutboxStore,
  OutboundOutboxCreateInput,
  OutboundOutboxRecord,
  OutboundOutboxStatus,
  OutboundOutboxStatusUpdate,
  OutboundOutboxUpsertResult,
} from "../../../../src/domain/models/outbox-store.js";

class FakeOutboxStore implements OutboxStore {
  private readonly records = new Map<string, OutboundOutboxRecord>();
  private readonly byDispatchKey = new Map<string, string>();
  private nextId = 1;

  async upsertByDispatchKey(input: OutboundOutboxCreateInput): Promise<OutboundOutboxUpsertResult> {
    const existingId = this.byDispatchKey.get(input.dispatchKey);
    if (existingId) {
      return {
        record: this.records.get(existingId)!,
        duplicate: true,
      };
    }

    const createdAt = input.createdAt ?? "2026-02-12T00:00:00.000Z";
    const record: OutboundOutboxRecord = {
      id: `o-${this.nextId++}`,
      dispatchKey: input.dispatchKey,
      provider: input.payload.provider,
      transport: input.payload.transport,
      accountId: input.payload.accountId,
      peerId: input.payload.peerId,
      threadId: input.payload.threadId,
      payload: input.payload,
      status: "PENDING",
      attemptCount: 0,
      nextAttemptAt: null,
      lastError: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.records.set(record.id, record);
    this.byDispatchKey.set(record.dispatchKey, record.id);
    return {
      record,
      duplicate: false,
    };
  }

  async getById(recordId: string): Promise<OutboundOutboxRecord | null> {
    return this.records.get(recordId) ?? null;
  }

  async leasePending(limit: number): Promise<OutboundOutboxRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.status === "PENDING" || record.status === "FAILED_RETRY")
      .slice(0, limit);
  }

  async updateStatus(recordId: string, update: OutboundOutboxStatusUpdate): Promise<OutboundOutboxRecord> {
    const current = this.records.get(recordId);
    if (!current) {
      throw new Error("missing");
    }
    const next: OutboundOutboxRecord = {
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

  async listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]> {
    const filter = new Set(statuses);
    return [...this.records.values()].filter((record) => filter.has(record.status));
  }
}

const buildOutbound = (callbackIdempotencyKey: string) => ({
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:1",
  threadId: null,
  correlationMessageId: "corr-1",
  callbackIdempotencyKey,
  replyText: "hello",
  attachments: [],
  chunks: [],
  metadata: {},
});

describe("OutboundOutboxService", () => {
  it("enqueues and deduplicates by dispatch key", async () => {
    const service = new OutboundOutboxService(new FakeOutboxStore());
    const first = await service.enqueueOrGet("dispatch-1", buildOutbound("cb-1") as any);
    const second = await service.enqueueOrGet("dispatch-1", buildOutbound("cb-1") as any);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);
  });

  it("tracks sending, retry and dead-letter transitions", async () => {
    const service = new OutboundOutboxService(new FakeOutboxStore());
    const created = await service.enqueueOrGet("dispatch-2", buildOutbound("cb-2") as any);

    await service.markSending(created.record.id);
    await service.markRetry(created.record.id, "timeout", "2026-02-12T00:00:10.000Z");
    await service.markSent(created.record.id);

    const sent = await service.getById(created.record.id);
    expect(sent).toMatchObject({
      status: "SENT",
    });

    await service.markDeadLetter(created.record.id, "terminal");
    const dead = await service.getById(created.record.id);
    expect(dead).toMatchObject({
      status: "DEAD_LETTER",
      lastError: "terminal",
    });
  });

  it("replays records only from expected status", async () => {
    const service = new OutboundOutboxService(new FakeOutboxStore());
    const created = await service.enqueueOrGet("dispatch-3", buildOutbound("cb-3") as any);
    await service.markDeadLetter(created.record.id, "terminal");

    const replayed = await service.replayFromStatus(created.record.id, "DEAD_LETTER");
    expect(replayed.status).toBe("PENDING");

    await expect(service.replayFromStatus(created.record.id, "SENT")).rejects.toThrow(
      "status mismatch",
    );
  });
});
