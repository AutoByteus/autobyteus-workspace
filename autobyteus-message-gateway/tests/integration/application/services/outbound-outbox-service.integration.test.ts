import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { OutboundOutboxService } from "../../../../src/application/services/outbound-outbox-service.js";
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

describe("OutboundOutboxService integration", () => {
  it("persists dedupe and replay transitions across service instances", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "outbound-outbox-service-"));
    try {
      const service = new OutboundOutboxService(new FileOutboxStore(root));
      const first = await service.enqueueOrGet("dispatch-1", buildOutbound("cb-1") as any);
      const duplicate = await service.enqueueOrGet("dispatch-1", buildOutbound("cb-1") as any);
      expect(duplicate.duplicate).toBe(true);
      expect(duplicate.record.id).toBe(first.record.id);

      await service.markDeadLetter(first.record.id, "terminal");
      const replayed = await service.replayFromStatus(first.record.id, "DEAD_LETTER");
      expect(replayed.status).toBe("PENDING");

      const reloadedService = new OutboundOutboxService(new FileOutboxStore(root));
      const reloadedRecord = await reloadedService.getById(first.record.id);
      expect(reloadedRecord?.status).toBe("PENDING");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
