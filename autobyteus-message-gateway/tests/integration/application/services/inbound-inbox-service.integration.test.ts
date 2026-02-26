import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { InboundInboxService } from "../../../../src/application/services/inbound-inbox-service.js";
import { FileInboxStore } from "../../../../src/infrastructure/inbox/file-inbox-store.js";

const buildEnvelope = (externalMessageId: string) => ({
  provider: ExternalChannelProvider.DISCORD,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acc-1",
  peerId: "user:1",
  peerType: ExternalPeerType.USER,
  threadId: null,
  externalMessageId,
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-12T00:00:00.000Z",
  metadata: {},
  routingKey: "DISCORD:BUSINESS_API:acc-1:user:1:_",
});

describe("InboundInboxService integration", () => {
  it("persists dedupe and status transitions across service instances", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "inbound-inbox-service-"));
    try {
      const service = new InboundInboxService(new FileInboxStore(root));
      const first = await service.enqueue(buildEnvelope("m-1") as any);
      const duplicate = await service.enqueue(buildEnvelope("m-1") as any);
      expect(duplicate.duplicate).toBe(true);
      expect(duplicate.record.id).toBe(first.record.id);

      await service.markDeadLetter(first.record.id, "terminal");
      const replayed = await service.replayFromStatus(first.record.id, "DEAD_LETTER");
      expect(replayed.status).toBe("RECEIVED");

      const reloadedService = new InboundInboxService(new FileInboxStore(root));
      const reloadedRecord = await reloadedService.getById(first.record.id);
      expect(reloadedRecord?.status).toBe("RECEIVED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
