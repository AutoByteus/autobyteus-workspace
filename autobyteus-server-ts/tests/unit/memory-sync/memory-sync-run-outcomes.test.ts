import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalFileMemorySyncStateStore } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { MemoryFileChangePlanner } from "../../../src/memory-sync/source/memory-file-change-planner.js";
import { MemorySyncService } from "../../../src/memory-sync/source/memory-sync-service.js";
import { createDefaultMemorySyncConfig } from "../../../src/memory-sync/source/memory-sync-config.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import type { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";
import type { MemorySyncBatchTransfer } from "../../../src/memory-sync/source/memory-sync-batch-transfer.js";
import type { MemorySyncConfigService } from "../../../src/memory-sync/source/memory-sync-config-service.js";
import type { MemoryFileEntry, MemorySyncConfig } from "../../../src/memory-sync/shared/memory-sync-types.js";

const HUB = "http://hub.local";

describe("MemorySyncService run outcomes", () => {
  let root: string;
  let stateStore: LocalFileMemorySyncStateStore;
  let entries: MemoryFileEntry[];
  let send: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;

  const config = (batchSize: number): MemorySyncConfig => {
    const base = createDefaultMemorySyncConfig();
    return { ...base, source: { ...base.source, enabled: true, memorySyncSourceId: "src", hubBaseUrl: HUB, hubToken: "tok", batchSize } };
  };

  const makeEntry = async (name: string, content: string): Promise<MemoryFileEntry> => {
    const absolutePath = path.join(root, name);
    await fs.writeFile(absolutePath, content);
    const stat = await fs.stat(absolutePath);
    return { kind: "agents", relativePath: name, absolutePath, size: stat.size, mtimeMs: stat.mtimeMs };
  };

  const makeService = (batchSize = 1) => new MemorySyncService(
    { getConfig: async () => config(batchSize) } as unknown as MemorySyncConfigService,
    stateStore,
    { scan: async () => ({ files: entries }) } as unknown as LocalMemoryExportScanner,
    new MemoryFileChangePlanner(),
    { send } as unknown as MemorySyncBatchTransfer,
  );

  beforeEach(async () => {
    configureMemorySyncCapability(true);
    root = await fs.mkdtemp(path.join(os.tmpdir(), "memory-run-outcomes-"));
    stateStore = new LocalFileMemorySyncStateStore({ getAppDataDir: () => path.join(root, "app-data") });
    entries = [];
    send = vi.fn();
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("records each batch's outcomes before the next batch, so a later run-level error keeps them (AR-006)", async () => {
    entries = [await makeEntry("a.txt", "a"), await makeEntry("b.txt", "b")];
    send
      .mockImplementationOnce(async (batch) => ({ outcomes: batch.files.map(({ file }: { file: MemoryFileEntry }) => ({
        status: "synced", file: { ...file, sha256: "x" }, batchId: "b1", committedAt: "2026-11-15T12:00:00.000Z",
      })), committedBatches: 1, duplicateBatches: 0 }))
      .mockRejectedValueOnce(new Error("connection lost"));

    await expect(makeService().startSync("background")).rejects.toThrow("connection lost");

    const state = await stateStore.readState(HUB, "src");
    expect(Object.keys(state.files)).toEqual(["agents/a.txt"]);
    expect(state).toMatchObject({ lastJobState: "error", lastError: "connection lost" });
  });

  it("records a file failure with a delay, logs it once per reason, and counts it in the run result (REQ-005, REQ-007)", async () => {
    entries = [await makeEntry("a.txt", "a")];
    send.mockImplementation(async (batch) => ({
      outcomes: batch.files.map(({ file }: { file: MemoryFileEntry }) => ({ status: "failed", file, reason: "Uploaded file hash mismatch for agents/a.txt." })),
      committedBatches: 0, duplicateBatches: 0,
    }));
    const service = makeService();

    const first = await service.startManualSync();
    const second = await service.startManualSync();

    const state = await stateStore.readState(HUB, "src");
    expect(first).toMatchObject({ failedFiles: 1, changedFiles: 1, committedBatches: 0 });
    expect(second.failedFiles).toBe(1);
    expect(state.lastJobState).toBe("success");
    expect(state.fileFailures["agents/a.txt"]).toMatchObject({
      kind: "agents", relativePath: "a.txt", size: 1, reason: "Uploaded file hash mismatch for agents/a.txt.", attempts: 2,
    });
    expect(Date.parse(state.fileFailures["agents/a.txt"]?.nextAttemptAt as string)).toBeGreaterThan(Date.now());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(
      /^Memory Sync could not sync agents\/a\.txt \(1 bytes\): Uploaded file hash mismatch for agents\/a\.txt\.\. Next attempt at \d{4}-/,
    ));
  });

  it("leaves a failing file alone on a background run before its delay and retries it on Sync now; a sync clears the failure", async () => {
    entries = [await makeEntry("a.txt", "a")];
    send.mockImplementationOnce(async (batch) => ({
      outcomes: batch.files.map(({ file }: { file: MemoryFileEntry }) => ({ status: "failed", file, reason: "refused" })),
      committedBatches: 0, duplicateBatches: 0,
    }));
    const service = makeService();
    await service.startSync("background");
    send.mockClear();

    const background = await service.startSync("background");
    expect(send).not.toHaveBeenCalled();
    expect(background).toMatchObject({ changedFiles: 0, deferredFiles: 1 });

    send.mockImplementationOnce(async (batch) => ({
      outcomes: batch.files.map(({ file }: { file: MemoryFileEntry }) => ({
        status: "synced", file: { ...file, sha256: "x" }, batchId: "b9", committedAt: "2026-11-15T12:00:00.000Z",
      })),
      committedBatches: 1, duplicateBatches: 0,
    }));
    await service.startManualSync();

    const state = await stateStore.readState(HUB, "src");
    expect(state.fileFailures).toEqual({});
    expect(state.files["agents/a.txt"]).toMatchObject({ lastBatchId: "b9" });
  });

  it("clears the failure of a file that no longer exists", async () => {
    entries = [await makeEntry("a.txt", "a")];
    send.mockImplementation(async (batch) => ({
      outcomes: batch.files.map(({ file }: { file: MemoryFileEntry }) => ({ status: "failed", file, reason: "refused" })),
      committedBatches: 0, duplicateBatches: 0,
    }));
    const service = makeService();
    await service.startSync("background");
    entries = [];

    await service.startSync("background");

    expect((await stateStore.readState(HUB, "src")).fileFailures).toEqual({});
  });

  it("records a file that cannot be read on this node as a failure without a send", async () => {
    const folderPath = path.join(root, "not-a-file");
    await fs.mkdir(folderPath);
    const folder = await fs.stat(folderPath);
    entries = [{ kind: "agents", relativePath: "a.txt", absolutePath: folderPath, size: folder.size, mtimeMs: folder.mtimeMs }];

    const result = await makeService().startSync("background");

    expect(send).not.toHaveBeenCalled();
    expect(result).toMatchObject({ failedFiles: 1, changedFiles: 0 });
    expect((await stateStore.readState(HUB, "src")).fileFailures["agents/a.txt"]?.reason).toContain("Could not read file");
  });
});
