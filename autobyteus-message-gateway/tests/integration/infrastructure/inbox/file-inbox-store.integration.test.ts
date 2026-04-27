import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
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
        status: "COMPLETED_ACCEPTED",
      });

      const restartedStore = new FileInboxStore(root);
      const loaded = await restartedStore.getById(created.record.id);
      expect(loaded?.status).toBe("COMPLETED_ACCEPTED");
      expect(await listQuarantineFiles(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines a legacy-status inbox file and persists a fresh empty state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-it-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const originalState = {
        version: 1,
        records: [
          {
            ...buildPersistedRecord("legacy-routed"),
            status: "COMPLETED_ROUTED",
          },
        ],
      };
      await writeStateFile(root, originalState);

      const store = new FileInboxStore(root);
      await expect(store.leasePending(10, "2026-02-12T00:00:00.000Z")).resolves.toEqual([]);

      await expect(readStateFile(root)).resolves.toEqual({ version: 1, records: [] });
      const quarantineFiles = await listQuarantineFiles(root);
      expect(quarantineFiles).toHaveLength(1);
      await expect(readFile(path.join(root, quarantineFiles[0]), "utf8")).resolves.toContain(
        "COMPLETED_ROUTED",
      );
      expect(warn).toHaveBeenCalledWith(
        "[gateway] reliability queue state file quarantined",
        expect.objectContaining({
          queueName: "inbound inbox",
          originalFilePath: path.join(root, "inbound-inbox.json"),
          quarantineFilePath: path.join(root, quarantineFiles[0]),
        }),
      );
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines invalid JSON inbox content and recovers with an empty state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-inbox-store-it-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await writeFile(path.join(root, "inbound-inbox.json"), "{not-json", "utf8");

      const store = new FileInboxStore(root);
      await expect(store.listByStatus(["RECEIVED"])).resolves.toEqual([]);

      await expect(readStateFile(root)).resolves.toEqual({ version: 1, records: [] });
      const quarantineFiles = await listQuarantineFiles(root);
      expect(quarantineFiles).toHaveLength(1);
      await expect(readFile(path.join(root, quarantineFiles[0]), "utf8")).resolves.toBe(
        "{not-json",
      );
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});

const writeStateFile = async (root: string, state: unknown): Promise<void> => {
  await writeFile(path.join(root, "inbound-inbox.json"), JSON.stringify(state, null, 2), "utf8");
};

const readStateFile = async (root: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(root, "inbound-inbox.json"), "utf8"));

const listQuarantineFiles = async (root: string): Promise<string[]> =>
  (await readdir(root))
    .filter((entry) => entry.startsWith("inbound-inbox.json.quarantined-"))
    .sort();

const buildPersistedRecord = (externalMessageId: string) => ({
  id: `record-${externalMessageId}`,
  ingressKey: `ingress-${externalMessageId}`,
  provider: "DISCORD",
  transport: "BUSINESS_API",
  accountId: "acc-1",
  peerId: "user:123",
  threadId: null,
  externalMessageId,
  payload: buildEnvelope(externalMessageId),
  status: "RECEIVED",
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: "2026-02-12T00:00:00.000Z",
  updatedAt: "2026-02-12T00:00:00.000Z",
});
