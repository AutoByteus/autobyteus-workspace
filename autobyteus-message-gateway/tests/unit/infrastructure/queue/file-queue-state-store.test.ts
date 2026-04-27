import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FileQueueStateStore } from "../../../../src/infrastructure/queue/file-queue-state-store.js";

type TestQueueState = {
  version: 1;
  records: Array<{ id: string }>;
};

const createEmptyState = (): TestQueueState => ({
  version: 1,
  records: [],
});

const parseTestState = (value: unknown): TestQueueState => {
  if (!isRecord(value)) {
    throw new Error("Invalid test queue state payload.");
  }
  if (value.version !== 1) {
    throw new Error("Unsupported test queue state version.");
  }
  if (!Array.isArray(value.records)) {
    throw new Error("Test queue records must be an array.");
  }
  return {
    version: 1,
    records: value.records.map((record) => {
      if (!isRecord(record) || typeof record.id !== "string") {
        throw new Error("Test queue record id must be a string.");
      }
      return { id: record.id };
    }),
  };
};

describe("FileQueueStateStore", () => {
  it("initializes a missing queue data file as an empty in-memory state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-queue-state-store-"));
    try {
      const filePath = path.join(root, "queue.json");
      const logger = vi.fn();
      const store = new FileQueueStateStore({
        queueName: "test queue",
        filePath,
        createEmptyState,
        parseState: parseTestState,
        logger,
      });

      await expect(store.load()).resolves.toEqual({ version: 1, records: [] });
      await expect(readFile(filePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      expect(await listQuarantineFiles(root, "queue.json")).toEqual([]);
      expect(logger).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("loads a valid queue file and persists serialized mutations atomically", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-queue-state-store-"));
    try {
      const filePath = path.join(root, "queue.json");
      await writeJson(filePath, { version: 1, records: [{ id: "existing" }] });
      const store = new FileQueueStateStore({
        queueName: "test queue",
        filePath,
        createEmptyState,
        parseState: parseTestState,
      });

      await expect(store.load()).resolves.toEqual({
        version: 1,
        records: [{ id: "existing" }],
      });
      const result = await store.withMutation((state) => {
        state.records.push({ id: "new" });
        return { result: state.records.length, persist: true };
      });

      expect(result).toBe(2);
      await expect(readJson(filePath)).resolves.toEqual({
        version: 1,
        records: [{ id: "existing" }, { id: "new" }],
      });
      expect(await listQuarantineFiles(root, "queue.json")).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines invalid JSON, logs diagnostics, and writes a fresh empty state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-queue-state-store-"));
    try {
      const filePath = path.join(root, "queue.json");
      await writeFile(filePath, "{not-json", "utf8");
      const logger = vi.fn();
      const store = new FileQueueStateStore({
        queueName: "test queue",
        filePath,
        createEmptyState,
        parseState: parseTestState,
        logger,
        now: () => new Date("2026-04-27T05:42:13.456Z"),
        uniqueSuffix: () => "fixed-id",
      });

      await expect(store.load()).resolves.toEqual({ version: 1, records: [] });

      const quarantineFilePath = path.join(
        root,
        "queue.json.quarantined-20260427T054213456Z-fixed-id",
      );
      await expect(readJson(filePath)).resolves.toEqual({ version: 1, records: [] });
      await expect(readFile(quarantineFilePath, "utf8")).resolves.toBe("{not-json");
      expect(logger).toHaveBeenCalledWith({
        queueName: "test queue",
        reason: expect.stringMatching(/JSON|Expected|position|Unexpected/),
        originalFilePath: filePath,
        quarantineFilePath,
        quarantinedAt: "2026-04-27T05:42:13.456Z",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("avoids quarantine path collisions and does not touch queue lock files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "file-queue-state-store-"));
    try {
      const inboxDir = path.join(root, "inbox");
      const locksDir = path.join(root, "locks");
      const filePath = path.join(inboxDir, "inbound-inbox.json");
      const lockPath = path.join(locksDir, "inbox.lock.json");
      await writeJson(filePath, { version: 2, records: [] });
      await writeJson(lockPath, { version: 1, ownerId: "owner-1" });
      const collidingPath = path.join(
        inboxDir,
        "inbound-inbox.json.quarantined-20260427T060000000Z-same",
      );
      await writeFile(collidingPath, "previous quarantine", "utf8");
      const suffixes = ["same", "next"];
      const logger = vi.fn();
      const store = new FileQueueStateStore({
        queueName: "inbound inbox",
        filePath,
        createEmptyState,
        parseState: parseTestState,
        logger,
        now: () => new Date("2026-04-27T06:00:00.000Z"),
        uniqueSuffix: () => suffixes.shift() ?? "fallback",
      });

      await expect(store.load()).resolves.toEqual({ version: 1, records: [] });

      const nextQuarantinePath = path.join(
        inboxDir,
        "inbound-inbox.json.quarantined-20260427T060000000Z-next",
      );
      await expect(readFile(collidingPath, "utf8")).resolves.toBe("previous quarantine");
      await expect(readJson(nextQuarantinePath)).resolves.toEqual({ version: 2, records: [] });
      await expect(readJson(lockPath)).resolves.toEqual({ version: 1, ownerId: "owner-1" });
      expect(logger).toHaveBeenCalledWith(
        expect.objectContaining({
          queueName: "inbound inbox",
          originalFilePath: filePath,
          quarantineFilePath: nextQuarantinePath,
        }),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, "utf8"));

const listQuarantineFiles = async (root: string, fileName: string): Promise<string[]> =>
  (await readdir(root))
    .filter((entry) => entry.startsWith(`${fileName}.quarantined-`))
    .sort();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
