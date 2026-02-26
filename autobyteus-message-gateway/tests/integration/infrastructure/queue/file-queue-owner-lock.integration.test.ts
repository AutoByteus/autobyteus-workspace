import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileQueueOwnerLock } from "../../../../src/infrastructure/queue/file-queue-owner-lock.js";

describe("FileQueueOwnerLock integration", () => {
  it("prevents concurrent owners and allows takeover after release", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "queue-owner-lock-it-"));
    try {
      const owner1 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-1",
      });
      const owner2 = new FileQueueOwnerLock({
        rootDir: root,
        namespace: "inbox",
        ownerId: "owner-2",
      });

      await owner1.acquire();
      await expect(owner2.acquire()).rejects.toThrow("Queue lock is owned by another process");

      await owner1.release();
      await expect(owner2.acquire()).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
