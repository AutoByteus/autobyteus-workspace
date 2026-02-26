import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { InboundForwarderWorker } from "../../../../src/application/services/inbound-forwarder-worker.js";
import type { InboundInboxRecord } from "../../../../src/domain/models/inbox-store.js";

const buildRecord = (id: string, attemptCount: number = 0): InboundInboxRecord => ({
  id,
  ingressKey: `ingress-${id}`,
  provider: ExternalChannelProvider.DISCORD,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acc-1",
  peerId: "user:1",
  threadId: null,
  externalMessageId: `m-${id}`,
  payload: {
    provider: ExternalChannelProvider.DISCORD,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acc-1",
    peerId: "user:1",
    peerType: ExternalPeerType.USER,
    threadId: null,
    externalMessageId: `m-${id}`,
    content: "hello",
    attachments: [],
    receivedAt: "2026-02-12T00:00:00.000Z",
    metadata: {},
    routingKey: "DISCORD:BUSINESS_API:acc-1:user:1:_",
  } as any,
  status: "RECEIVED",
  attemptCount,
  nextAttemptAt: null,
  lastError: null,
  createdAt: "2026-02-12T00:00:00.000Z",
  updatedAt: "2026-02-12T00:00:00.000Z",
});

describe("InboundForwarderWorker", () => {
  it("marks blocked records without forwarding", async () => {
    const leasePending = vi.fn(async () => [buildRecord("1")]);
    const markBlocked = vi.fn(async () => buildRecord("1"));
    const forwardInbound = vi.fn();

    const worker = new InboundForwarderWorker({
      inboxService: {
        leasePending,
        markForwarding: vi.fn(),
        markCompleted: vi.fn(),
        markBlocked,
        markRetry: vi.fn(),
        markDeadLetter: vi.fn(),
      },
      classifierService: {
        classify: vi.fn(() => ({ decision: "BLOCKED", reason: "GROUP_MENTION_REQUIRED" } as const)),
      },
      serverClient: { forwardInbound },
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
    expect(markBlocked).toHaveBeenCalledWith("1", "GROUP_MENTION_REQUIRED");
    expect(forwardInbound).not.toHaveBeenCalled();
  });

  it("marks completed with server disposition", async () => {
    const record = buildRecord("2");
    const markForwarding = vi.fn(async () => record);
    const markCompleted = vi.fn(async () => record);

    const worker = new InboundForwarderWorker({
      inboxService: {
        leasePending: vi.fn(async () => [record]),
        markForwarding,
        markCompleted,
        markBlocked: vi.fn(),
        markRetry: vi.fn(),
        markDeadLetter: vi.fn(),
      },
      classifierService: {
        classify: vi.fn(() => ({ decision: "FORWARDABLE" } as const)),
      },
      serverClient: {
        forwardInbound: vi.fn(async () => ({
          accepted: true,
          duplicate: false,
          disposition: "UNBOUND" as const,
          bindingResolved: false,
        })),
      },
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
    expect(markForwarding).toHaveBeenCalledWith("2");
    expect(markCompleted).toHaveBeenCalledWith("2", "UNBOUND");
  });

  it("marks retry on retryable failure before max attempts", async () => {
    const record = buildRecord("3", 0);
    const markRetry = vi.fn(async () => record);

    const worker = new InboundForwarderWorker({
      inboxService: {
        leasePending: vi.fn(async () => [record]),
        markForwarding: vi.fn(async () => record),
        markCompleted: vi.fn(),
        markBlocked: vi.fn(),
        markRetry,
        markDeadLetter: vi.fn(),
      },
      classifierService: {
        classify: vi.fn(() => ({ decision: "FORWARDABLE" } as const)),
      },
      serverClient: {
        forwardInbound: vi.fn(async () => {
          throw Object.assign(new Error("timeout"), { retryable: true });
        }),
      },
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

  it("marks dead-letter on terminal failure", async () => {
    const record = buildRecord("4", 0);
    const markDeadLetter = vi.fn(async () => record);

    const worker = new InboundForwarderWorker({
      inboxService: {
        leasePending: vi.fn(async () => [record]),
        markForwarding: vi.fn(async () => record),
        markCompleted: vi.fn(),
        markBlocked: vi.fn(),
        markRetry: vi.fn(),
        markDeadLetter,
      },
      classifierService: {
        classify: vi.fn(() => ({ decision: "FORWARDABLE" } as const)),
      },
      serverClient: {
        forwardInbound: vi.fn(async () => {
          throw Object.assign(new Error("bad request"), { status: 400 });
        }),
      },
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
