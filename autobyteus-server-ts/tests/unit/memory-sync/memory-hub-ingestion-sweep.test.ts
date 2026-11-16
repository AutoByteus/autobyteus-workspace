import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryHubIngestionService } from "../../../src/memory-sync/hub/memory-hub-ingestion-service.js";
import { MemoryHubStagedFileStore } from "../../../src/memory-sync/hub/memory-hub-staged-file-store.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import type { LocalFileMemoryImportStore } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import type { MemoryHubCredentialService } from "../../../src/memory-sync/hub/memory-hub-credential-service.js";
import type { MemorySyncConfigService } from "../../../src/memory-sync/source/memory-sync-config-service.js";
import { withFilePathLock } from "../../../src/persistence/file/store-utils.js";

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");
const HOUR_MS = 60 * 60 * 1000;

const makeService = (stagedFiles: MemoryHubStagedFileStore) => new MemoryHubIngestionService(
  { getConfig: async () => ({ hub: { enabled: true } }) } as unknown as MemorySyncConfigService,
  { bindCredentialToSource: async () => ({}) } as unknown as MemoryHubCredentialService,
  { commitBatch: async () => ({}) } as unknown as LocalFileMemoryImportStore,
  stagedFiles,
);

describe("MemoryHubIngestionService staging sweep cadence", () => {
  beforeEach(() => {
    configureMemorySyncCapability(true);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts a sweep without waiting for it, never two at once, and at most once an hour (AR-008)", async () => {
    let finishSweep!: () => void;
    const sweepStale = vi.fn(() => new Promise<void>((resolve) => { finishSweep = resolve; }));
    const service = makeService({ sweepStale, receivedBytes: async () => 0 } as unknown as MemoryHubStagedFileStore);

    expect(service.requestStagingSweep()).toBeUndefined();
    await service.getStagedFileStatus({ credentialId: "c", memorySyncSourceId: "src", sha256: sha256("x") });
    expect(sweepStale).toHaveBeenCalledTimes(1);

    // The first sweep is still running: even an hour later no second one starts.
    vi.setSystemTime(new Date(Date.now() + HOUR_MS));
    service.requestStagingSweep();
    expect(sweepStale).toHaveBeenCalledTimes(1);

    finishSweep();
    await new Promise((resolve) => setImmediate(resolve));
    service.requestStagingSweep();
    expect(sweepStale).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(Date.now() + 30 * 60 * 1000));
    service.requestStagingSweep();
    expect(sweepStale).toHaveBeenCalledTimes(2);
  });

  it("logs a failed sweep as a warning and lets the next interval try again", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sweepStale = vi.fn(async () => { throw new Error("disk gone"); });
    const service = makeService({ sweepStale } as unknown as MemoryHubStagedFileStore);

    service.requestStagingSweep();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("disk gone")));
    vi.setSystemTime(new Date(Date.now() + HOUR_MS));
    service.requestStagingSweep();

    expect(sweepStale).toHaveBeenCalledTimes(2);
  });

  it("completes a piece request of one source while a sweep waits on another source's manifest lock", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-ingestion-sweep-"));
    try {
      const staged = new MemoryHubStagedFileStore({ getMemoryDir: () => memoryDir });
      const service = makeService(staged);
      await staged.appendPiece("source-b", sha256("old"), 0, Buffer.from("old"));
      const longAgo = new Date(Date.now() - 25 * HOUR_MS);
      await fs.utimes(path.join(memoryDir, "memory-sync-staging", "source-b", `${sha256("old")}.partial`), longAgo, longAgo);
      const importRootB = path.join(memoryDir, "imports", "source-b");
      await fs.mkdir(importRootB, { recursive: true });
      let releaseLock!: () => void;
      const commitHoldingLock = withFilePathLock(path.join(importRootB, "sync-manifest.json"), () => new Promise<void>((resolve) => { releaseLock = resolve; }));
      await vi.waitFor(() => expect(releaseLock).toBeTypeOf("function"));

      const received = await service.receiveStagedFilePiece({
        credentialId: "c", memorySyncSourceId: "source-a", sha256: sha256("piece"), offset: 0, bytes: Buffer.from("piece"),
      });

      expect(received).toEqual({ receivedBytes: 5 });
      releaseLock();
      await commitHoldingLock;
    } finally {
      await fs.rm(memoryDir, { recursive: true, force: true });
    }
  });
});
