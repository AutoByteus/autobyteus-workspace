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

describe("FileInboxStore", () => {
  it("upserts by ingress key and marks duplicates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-"));
    try {
      const store = new FileInboxStore(root);
      const first = await store.upsertByIngressKey({
        ingressKey: "ingress-1",
        payload: buildEnvelope("m-1") as any,
      });
      const second = await store.upsertByIngressKey({
        ingressKey: "ingress-1",
        payload: buildEnvelope("m-1") as any,
      });

      expect(first.duplicate).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(second.record.id).toBe(first.record.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leases pending records by status and retry time", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-"));
    try {
      const store = new FileInboxStore(root);
      const pending = await store.upsertByIngressKey({
        ingressKey: "ingress-pending",
        payload: buildEnvelope("m-pending") as any,
      });
      const retryDue = await store.upsertByIngressKey({
        ingressKey: "ingress-retry-due",
        payload: buildEnvelope("m-retry-due") as any,
      });
      const retryFuture = await store.upsertByIngressKey({
        ingressKey: "ingress-retry-future",
        payload: buildEnvelope("m-retry-future") as any,
      });

      await store.updateStatus(retryDue.record.id, {
        status: "FAILED_RETRY",
        nextAttemptAt: "2026-02-12T00:00:05.000Z",
      });
      await store.updateStatus(retryFuture.record.id, {
        status: "FAILED_RETRY",
        nextAttemptAt: "2026-02-12T00:00:20.000Z",
      });

      const leased = await store.leasePending(10, "2026-02-12T00:00:10.000Z");
      expect(leased.map((record) => record.ingressKey)).toEqual([
        "ingress-pending",
        "ingress-retry-due",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("persists updates and supports status queries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-"));
    try {
      const store = new FileInboxStore(root);
      const created = await store.upsertByIngressKey({
        ingressKey: "ingress-1",
        payload: buildEnvelope("m-1") as any,
      });
      await store.updateStatus(created.record.id, {
        status: "COMPLETED_UNBOUND",
      });

      const reloaded = new FileInboxStore(root);
      const fetched = await reloaded.getById(created.record.id);
      const completed = await reloaded.listByStatus(["COMPLETED_UNBOUND"]);

      expect(fetched?.status).toBe("COMPLETED_UNBOUND");
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe(created.record.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
