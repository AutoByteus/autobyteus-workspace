import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
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
      expect(await listQuarantineFiles(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines an invalid-status outbox file and persists a fresh empty state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-it-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const originalState = {
        version: 1,
        records: [
          {
            ...buildPersistedRecord("invalid-status"),
            status: "QUEUED",
          },
        ],
      };
      await writeStateFile(root, originalState);

      const store = new FileOutboxStore(root);
      await expect(store.leasePending(10, "2026-02-12T00:00:00.000Z")).resolves.toEqual([]);

      await expect(readStateFile(root)).resolves.toEqual({ version: 1, records: [] });
      const quarantineFiles = await listQuarantineFiles(root);
      expect(quarantineFiles).toHaveLength(1);
      await expect(readFile(path.join(root, quarantineFiles[0]), "utf8")).resolves.toContain(
        '"QUEUED"',
      );
      expect(warn).toHaveBeenCalledWith(
        "[gateway] reliability queue state file quarantined",
        expect.objectContaining({
          queueName: "outbound outbox",
          originalFilePath: path.join(root, "outbound-outbox.json"),
          quarantineFilePath: path.join(root, quarantineFiles[0]),
        }),
      );
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines an unsupported-version outbox file and recovers with an empty state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-outbox-store-it-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await writeStateFile(root, { version: 2, records: [] });

      const store = new FileOutboxStore(root);
      await expect(store.listByStatus(["PENDING"])).resolves.toEqual([]);

      await expect(readStateFile(root)).resolves.toEqual({ version: 1, records: [] });
      const quarantineFiles = await listQuarantineFiles(root);
      expect(quarantineFiles).toHaveLength(1);
      await expect(readFile(path.join(root, quarantineFiles[0]), "utf8")).resolves.toContain(
        '"version": 2',
      );
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});

const writeStateFile = async (root: string, state: unknown): Promise<void> => {
  await writeFile(path.join(root, "outbound-outbox.json"), JSON.stringify(state, null, 2), "utf8");
};

const readStateFile = async (root: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(root, "outbound-outbox.json"), "utf8"));

const listQuarantineFiles = async (root: string): Promise<string[]> =>
  (await readdir(root))
    .filter((entry) => entry.startsWith("outbound-outbox.json.quarantined-"))
    .sort();

const buildPersistedRecord = (callbackIdempotencyKey: string) => ({
  id: `record-${callbackIdempotencyKey}`,
  dispatchKey: `dispatch-${callbackIdempotencyKey}`,
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:123",
  threadId: null,
  payload: buildEnvelope(callbackIdempotencyKey),
  status: "PENDING",
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: "2026-02-12T00:00:00.000Z",
  updatedAt: "2026-02-12T00:00:00.000Z",
});
