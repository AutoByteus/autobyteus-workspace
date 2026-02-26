import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileOutboxStore } from "../../../../src/infrastructure/outbox/file-outbox-store.js";

const buildEnvelope = (callbackIdempotencyKey: string) => ({
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:123",
  threadId: null,
  correlationMessageId: "corr-1",
  callbackIdempotencyKey,
  replyText: "done",
  attachments: [],
  chunks: [],
  metadata: {},
});

describe("FileOutboxStore integration", () => {
  it("rehydrates persisted records after process restart", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-it-"));
    try {
      const firstStore = new FileOutboxStore(root);
      const created = await firstStore.upsertByDispatchKey({
        dispatchKey: "dispatch-1",
        payload: buildEnvelope("cb-1") as any,
      });
      await firstStore.updateStatus(created.record.id, {
        status: "SENT",
      });

      const restartedStore = new FileOutboxStore(root);
      const loaded = await restartedStore.getById(created.record.id);
      expect(loaded?.status).toBe("SENT");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
