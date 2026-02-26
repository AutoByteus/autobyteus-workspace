import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { OutboundSenderWorker } from "../../../../src/application/services/outbound-sender-worker.js";
import type { OutboundOutboxRecord } from "../../../../src/domain/models/outbox-store.js";

const buildRecord = (id: string, attemptCount: number = 0): OutboundOutboxRecord => ({
  id,
  dispatchKey: `dispatch-${id}`,
  provider: ExternalChannelProvider.DISCORD,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acc-1",
  peerId: "user:1",
  threadId: null,
  payload: {
    provider: ExternalChannelProvider.DISCORD,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acc-1",
    peerId: "user:1",
    threadId: null,
    correlationMessageId: `corr-${id}`,
    callbackIdempotencyKey: `cb-${id}`,
    replyText: "hello",
    attachments: [],
    chunks: [],
    metadata: {},
  } as any,
  status: "PENDING",
  attemptCount,
  nextAttemptAt: null,
  lastError: null,
  createdAt: "2026-02-12T00:00:00.000Z",
  updatedAt: "2026-02-12T00:00:00.000Z",
});

describe("OutboundSenderWorker", () => {
  it("marks dead-letter when adapter is not configured", async () => {
    const markDeadLetter = vi.fn(async () => buildRecord("1"));
    const worker = new OutboundSenderWorker({
      outboxService: {
        leasePending: vi.fn(async () => [buildRecord("1")]),
        markSending: vi.fn(),
        markSent: vi.fn(),
        markRetry: vi.fn(),
        markDeadLetter,
      },
      outboundAdaptersByRoutingKey: new Map(),
      config: {
        batchSize: 10,
        loopIntervalMs: 100,
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2,
      },
    });

    await worker.runOnce();
    expect(markDeadLetter).toHaveBeenCalledOnce();
  });

  it("marks sent when adapter delivery succeeds", async () => {
    const record = buildRecord("2");
    const sendOutbound = vi.fn(async () => ({
      providerMessageId: "provider-1",
      deliveredAt: "2026-02-12T00:00:00.000Z",
      metadata: {},
    }));
    const markSent = vi.fn(async () => record);

    const worker = new OutboundSenderWorker({
      outboxService: {
        leasePending: vi.fn(async () => [record]),
        markSending: vi.fn(async () => record),
        markSent,
        markRetry: vi.fn(),
        markDeadLetter: vi.fn(),
      },
      outboundAdaptersByRoutingKey: new Map([
        ["DISCORD:BUSINESS_API", { sendOutbound } as any],
      ]),
      config: {
        batchSize: 10,
        loopIntervalMs: 100,
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2,
      },
    });

    await worker.runOnce();
    expect(sendOutbound).toHaveBeenCalledOnce();
    expect(markSent).toHaveBeenCalledWith("2");
  });

  it("marks retry on retryable provider failures", async () => {
    const record = buildRecord("3", 0);
    const markRetry = vi.fn(async () => record);

    const worker = new OutboundSenderWorker({
      outboxService: {
        leasePending: vi.fn(async () => [record]),
        markSending: vi.fn(async () => record),
        markSent: vi.fn(),
        markRetry,
        markDeadLetter: vi.fn(),
      },
      outboundAdaptersByRoutingKey: new Map([
        [
          "DISCORD:BUSINESS_API",
          {
            sendOutbound: vi.fn(async () => {
              throw Object.assign(new Error("timeout"), { retryable: true });
            }),
          } as any,
        ],
      ]),
      config: {
        batchSize: 10,
        loopIntervalMs: 100,
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2,
      },
      nowIso: () => "2026-02-12T00:00:00.000Z",
    });

    await worker.runOnce();
    expect(markRetry).toHaveBeenCalledOnce();
    const retryCall = (markRetry as any).mock.calls[0];
    expect(retryCall[0]).toBe("3");
    expect(retryCall[1]).toBe("timeout");
  });

  it("marks dead-letter on terminal provider failures", async () => {
    const record = buildRecord("4", 0);
    const markDeadLetter = vi.fn(async () => record);

    const worker = new OutboundSenderWorker({
      outboxService: {
        leasePending: vi.fn(async () => [record]),
        markSending: vi.fn(async () => record),
        markSent: vi.fn(),
        markRetry: vi.fn(),
        markDeadLetter,
      },
      outboundAdaptersByRoutingKey: new Map([
        [
          "DISCORD:BUSINESS_API",
          {
            sendOutbound: vi.fn(async () => {
              throw Object.assign(new Error("bad request"), { status: 400 });
            }),
          } as any,
        ],
      ]),
      config: {
        batchSize: 10,
        loopIntervalMs: 100,
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2,
      },
    });

    await worker.runOnce();
    expect(markDeadLetter).toHaveBeenCalledWith("4", "bad request");
  });
});
