import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { OutboundOutboxService } from "../../../../src/application/services/outbound-outbox-service.js";
import { OutboundSenderWorker } from "../../../../src/application/services/outbound-sender-worker.js";
import { FileOutboxStore } from "../../../../src/infrastructure/outbox/file-outbox-store.js";

const buildOutbound = (callbackIdempotencyKey: string) => ({
  provider: ExternalChannelProvider.DISCORD,
  transport: ExternalChannelTransport.BUSINESS_API,
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

describe("OutboundSenderWorker integration", () => {
  it("sends queued outbound records and marks them SENT", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "outbound-sender-worker-"));
    try {
      const outboxService = new OutboundOutboxService(new FileOutboxStore(root));
      const queued = await outboxService.enqueueOrGet("dispatch-1", buildOutbound("cb-1") as any);
      const sendOutbound = vi.fn(async () => ({
        providerMessageId: "provider-1",
        deliveredAt: "2026-02-12T00:00:00.000Z",
        metadata: {},
      }));
      const worker = new OutboundSenderWorker({
        outboxService,
        outboundAdaptersByRoutingKey: new Map([
          [
            `${ExternalChannelProvider.DISCORD}:${ExternalChannelTransport.BUSINESS_API}`,
            {
              provider: ExternalChannelProvider.DISCORD,
              transport: ExternalChannelTransport.BUSINESS_API,
              sendOutbound,
            },
          ],
        ]),
        config: {
          batchSize: 10,
          loopIntervalMs: 10,
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
        },
      });

      await worker.runOnce();

      const updated = await outboxService.getById(queued.record.id);
      expect(sendOutbound).toHaveBeenCalledOnce();
      expect(updated?.status).toBe("SENT");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
