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

describe("FileOutboxStore", () => {
  it("upserts by dispatch key and marks duplicates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-"));
    try {
      const store = new FileOutboxStore(root);
      const first = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-1",
        payload: buildEnvelope("cb-1") as any,
      });
      const second = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-1",
        payload: buildEnvelope("cb-1") as any,
      });

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(second.record.id).toBe(first.record.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leases pending records by status and retry time", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-"));
    try {
      const store = new FileOutboxStore(root);
      const pending = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-pending",
        payload: buildEnvelope("cb-pending") as any,
      });
      const retryDue = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-retry-due",
        payload: buildEnvelope("cb-retry-due") as any,
      });
      const retryFuture = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-retry-future",
        payload: buildEnvelope("cb-retry-future") as any,
      });

      await store.updateStatus(retryDue.record.id, {
        status: "FAILED_RETRY",
        nextAttemptAt: "2026-02-12T00:00:05.000Z",
      });
      await store.updateStatus(retryFuture.record.id, {
        status: "FAILED_RETRY",
        nextAttemptAt: "2026-02-12T00:00:20.000Z",
      });
      await store.updateStatus(pending.record.id, {
        status: "PENDING",
      });

      const leased = await store.leasePending(10, "2026-02-12T00:00:10.000Z");
      expect(leased.map((record) => record.dispatchKey)).toEqual([
        "dispatch-pending",
        "dispatch-retry-due",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("persists updates and supports status queries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-"));
    try {
      const store = new FileOutboxStore(root);
      const created = await store.upsertByDispatchKey({
        dispatchKey: "dispatch-1",
        payload: buildEnvelope("cb-1") as any,
      });
      await store.updateStatus(created.record.id, {
        status: "SENT",
      });

      const reloaded = new FileOutboxStore(root);
      const fetched = await reloaded.getById(created.record.id);
      const sent = await reloaded.listByStatus(["SENT"]);

      expect(fetched?.status).toBe("SENT");
      expect(sent).toHaveLength(1);
      expect(sent[0].id).toBe(created.record.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
