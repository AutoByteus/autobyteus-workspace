import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FileQueueOwnerLock,
  QueueOwnerLockLostError,
} from "../../../../src/infrastructure/queue/file-queue-owner-lock.js";

describe("FileQueueOwnerLock", () => {
  it("acquires lock, heartbeats, and releases", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    let now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const lock = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });

      await lock.acquire();
      now += 1_000;
      await lock.heartbeat();
      await lock.release();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("blocks acquisition when another owner holds an active lock", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    let now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const owner1 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });
      const owner2 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-2",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });

      await owner1.acquire();
      await expect(owner2.acquire()).rejects.toThrow("Queue lock is owned by another process");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows takeover after lock lease expiry", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    let now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const owner1 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "outbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });
      const owner2 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "outbox",
        ownerId: "owner-2",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });

      await owner1.acquire();
      now += 10_000;

      await expect(owner2.acquire()).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("throws lock lost when heartbeat sees a different owner", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    const now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const lock = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });
      await lock.acquire();

      const lockPath = path.join(root, "inbox.lock.json");
      await writeFile(
        lockPath,
        JSON.stringify(
          {
            version: 1,
            ownerId: "owner-2",
            expiresAtEpochMs: now + 5_000,
            acquiredAtIso: "2026-02-12T00:00:00.000Z",
            updatedAtIso: "2026-02-12T00:00:00.000Z",
          },
          null,
          2,
        ),
        "utf8",
      );

      await expect(lock.heartbeat()).rejects.toBeInstanceOf(QueueOwnerLockLostError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails acquire when active claim file is held by another owner", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    const now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const claimPath = path.join(root, "inbox.lock.json.claim.json");
      await writeFile(
        claimPath,
        JSON.stringify(
          {
            version: 1,
            ownerId: "owner-claim",
            expiresAtEpochMs: now + 5_000,
          },
          null,
          2,
        ),
        "utf8",
      );

      const lock = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });

      await expect(lock.acquire()).rejects.toThrow("acquire is busy");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reclaims stale claim file and acquires lock", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-"));
    const now = Date.parse("2026-02-12T00:00:00.000Z");

    try {
      const claimPath = path.join(root, "inbox.lock.json.claim.json");
      await writeFile(
        claimPath,
        JSON.stringify(
          {
            version: 1,
            ownerId: "owner-stale",
            expiresAtEpochMs: now - 1,
          },
          null,
          2,
        ),
        "utf8",
      );

      const lock = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
        leaseMs: 5_000,
        nowEpochMs: () => now,
      });
      await expect(lock.acquire()).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
