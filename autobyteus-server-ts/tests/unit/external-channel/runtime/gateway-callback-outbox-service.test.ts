import { describe, expect, it, vi } from "vitest";
import { GatewayCallbackOutboxService } from "../../../../src/external-channel/runtime/gateway-callback-outbox-service.js";

describe("GatewayCallbackOutboxService", () => {
  it("delegates enqueue and lease operations to the underlying store", async () => {
    const enqueueOrGet = vi.fn().mockResolvedValue({
      created: true,
      record: { id: "record-1" },
    });
    const leaseBatch = vi.fn().mockResolvedValue([{ id: "record-1" }]);
    const service = new GatewayCallbackOutboxService({
      enqueueOrGet,
      leaseBatch,
      markSent: vi.fn(),
      markRetry: vi.fn(),
      markDeadLetter: vi.fn(),
      getById: vi.fn(),
      listByStatus: vi.fn(),
    } as any);

    const payload = {
      provider: "telegram",
      transport: "business_api",
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "callback-1",
      replyText: "hello",
      attachments: [],
      chunks: [],
      metadata: {},
    } as any;

    await expect(service.enqueueOrGet("callback-1", payload)).resolves.toEqual({
      created: true,
      record: { id: "record-1" },
    });
    await expect(
      service.leaseBatch({
        limit: 5,
        nowIso: "2026-03-10T12:00:00.000Z",
        leaseDurationMs: 15_000,
      }),
    ).resolves.toEqual([{ id: "record-1" }]);

    expect(enqueueOrGet).toHaveBeenCalledWith({
      callbackIdempotencyKey: "callback-1",
      payload,
    });
    expect(leaseBatch).toHaveBeenCalledWith({
      limit: 5,
      nowIso: "2026-03-10T12:00:00.000Z",
      leaseDurationMs: 15_000,
    });
  });

  it("normalizes dead-letter updates to the store contract", async () => {
    const markDeadLetter = vi.fn().mockResolvedValue({ id: "record-1" });
    const service = new GatewayCallbackOutboxService({
      enqueueOrGet: vi.fn(),
      leaseBatch: vi.fn(),
      markSent: vi.fn(),
      markRetry: vi.fn(),
      markDeadLetter,
      getById: vi.fn(),
      listByStatus: vi.fn(),
    } as any);

    await expect(
      service.markDeadLetter("record-1", "lease-1", "gateway unavailable"),
    ).resolves.toEqual({ id: "record-1" });

    expect(markDeadLetter).toHaveBeenCalledWith("record-1", "lease-1", {
      lastError: "gateway unavailable",
    });
  });
});
