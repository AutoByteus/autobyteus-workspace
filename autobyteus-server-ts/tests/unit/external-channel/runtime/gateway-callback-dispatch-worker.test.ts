import { describe, expect, it, vi } from "vitest";
import { GatewayCallbackDispatchWorker } from "../../../../src/external-channel/runtime/gateway-callback-dispatch-worker.js";

const createRecord = () => ({
  id: "outbox-1",
  callbackIdempotencyKey: "cb-1",
  payload: {
    provider: "WHATSAPP",
    transport: "PERSONAL_SESSION",
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
    correlationMessageId: "message-1",
    callbackIdempotencyKey: "cb-1",
    replyText: "hello",
    attachments: [],
    chunks: [],
    metadata: {},
  },
  status: "DISPATCHING" as const,
  attemptCount: 0,
  nextAttemptAt: null,
  leaseToken: "lease-1",
  leaseExpiresAt: "2026-03-10T10:00:15.000Z",
  lastError: null,
  createdAt: "2026-03-10T10:00:00.000Z",
  updatedAt: "2026-03-10T10:00:00.000Z",
});

const createWorker = (overrides?: {
  leaseBatch?: ReturnType<typeof vi.fn>;
  markSent?: ReturnType<typeof vi.fn>;
  markRetry?: ReturnType<typeof vi.fn>;
  markDeadLetter?: ReturnType<typeof vi.fn>;
  recordSent?: ReturnType<typeof vi.fn>;
  recordFailed?: ReturnType<typeof vi.fn>;
  resolveGatewayCallbackDispatchTarget?: ReturnType<typeof vi.fn>;
}) => {
  const outboxService = {
    leaseBatch: overrides?.leaseBatch ?? vi.fn().mockResolvedValue([createRecord()]),
    markSent: overrides?.markSent ?? vi.fn().mockResolvedValue(undefined),
    markRetry: overrides?.markRetry ?? vi.fn().mockResolvedValue(undefined),
    markDeadLetter:
      overrides?.markDeadLetter ?? vi.fn().mockResolvedValue(undefined),
  };
  const deliveryEventService = {
    recordSent: overrides?.recordSent ?? vi.fn().mockResolvedValue(undefined),
    recordFailed:
      overrides?.recordFailed ?? vi.fn().mockResolvedValue(undefined),
  };
  const targetResolver = {
    resolveGatewayCallbackDispatchTarget:
      overrides?.resolveGatewayCallbackDispatchTarget ??
      vi.fn().mockResolvedValue({
        state: "AVAILABLE",
        options: {
          baseUrl: "http://gateway.example:8010",
          sharedSecret: null,
          timeoutMs: 5_000,
          fetchFn: vi.fn().mockResolvedValue({
            ok: true,
          }),
        },
        reason: null,
      }),
  };

  return {
    worker: new GatewayCallbackDispatchWorker({
      outboxService,
      deliveryEventService: deliveryEventService as any,
      targetResolver,
      config: {
        batchSize: 1,
        loopIntervalMs: 100,
        leaseDurationMs: 10_000,
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs: 10_000,
        backoffFactor: 2,
      },
      nowIso: () => "2026-03-10T10:00:00.000Z",
    }),
    outboxService,
    deliveryEventService,
    targetResolver,
  };
};

describe("GatewayCallbackDispatchWorker", () => {
  it("marks sent and records delivery when the gateway accepts the callback", async () => {
    const { worker, outboxService, deliveryEventService } = createWorker();

    await worker.runOnce();

    expect(outboxService.markSent).toHaveBeenCalledWith("outbox-1", "lease-1");
    expect(deliveryEventService.recordSent).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackIdempotencyKey: "cb-1",
      }),
    );
    expect(outboxService.markRetry).not.toHaveBeenCalled();
  });

  it("marks retry when the target is temporarily unavailable", async () => {
    const { worker, outboxService, deliveryEventService } = createWorker({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "UNAVAILABLE",
        options: null,
        reason: "Managed messaging gateway target is not currently available.",
      }),
    });

    await worker.runOnce();

    expect(outboxService.markRetry).toHaveBeenCalledWith(
      "outbox-1",
      "lease-1",
      expect.objectContaining({
        lastError: "Managed messaging gateway target is not currently available.",
      }),
    );
    expect(deliveryEventService.recordSent).not.toHaveBeenCalled();
    expect(outboxService.markDeadLetter).not.toHaveBeenCalled();
  });

  it("dead-letters when delivery is disabled", async () => {
    const { worker, outboxService, deliveryEventService } = createWorker({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "DISABLED",
        options: null,
        reason: "Channel callback delivery is not configured.",
      }),
    });

    await worker.runOnce();

    expect(outboxService.markDeadLetter).toHaveBeenCalledWith(
      "outbox-1",
      "lease-1",
      "Channel callback delivery is not configured.",
    );
    expect(deliveryEventService.recordFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackIdempotencyKey: "cb-1",
        errorMessage: "Channel callback delivery is not configured.",
      }),
    );
  });
});
