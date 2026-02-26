import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileInboxStore } from "../../../../src/infrastructure/inbox/file-inbox-store.js";

const buildEnvelope = (externalMessageId: string) => ({
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:123",
  peerType: "USER",
  threadId: null,
  externalMessageId,
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-12T00:00:00.000Z",
  metadata: {},
  routingKey: "DISCORD:BUSINESS_API:acc-1:user:123:_",
});

describe("FileInboxStore integration", () => {
  it("rehydrates persisted records after process restart", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-it-"));
    try {
      const firstStore = new FileInboxStore(root);
      const created = await firstStore.upsertByIngressKey({
        ingressKey: "ingress-1",
        payload: buildEnvelope("m-1") as any,
      });
      await firstStore.updateStatus(created.record.id, {
        status: "COMPLETED_ROUTED",
      });

      const restartedStore = new FileInboxStore(root);
      const loaded = await restartedStore.getById(created.record.id);
      expect(loaded?.status).toBe("COMPLETED_ROUTED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
