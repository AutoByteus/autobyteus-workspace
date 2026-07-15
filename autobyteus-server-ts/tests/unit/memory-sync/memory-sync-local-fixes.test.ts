import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalFileMemoryImportStore } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import { createDefaultMemorySyncConfig, toPublicMemorySyncConfig } from "../../../src/memory-sync/source/memory-sync-config.js";
import { MemorySyncConfigService } from "../../../src/memory-sync/source/memory-sync-config-service.js";
import { MemorySyncConnectionTestService } from "../../../src/memory-sync/source/memory-sync-connection-test-service.js";
import { LocalFileMemorySyncStateStore } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { MemoryFileChangePlanner } from "../../../src/memory-sync/source/memory-file-change-planner.js";
import { MemorySyncService } from "../../../src/memory-sync/source/memory-sync-service.js";
import type { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";
import type { MemoryHubClient } from "../../../src/memory-sync/source/memory-hub-client.js";
import type { MemoryFileOperation, MemorySyncBatch, MemorySyncConfig } from "../../../src/memory-sync/shared/memory-sync-types.js";

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

const makeOperation = (relativePath: string, content: string): MemoryFileOperation => ({
  opId: `agents:${relativePath}`,
  operation: "replace",
  kind: "agents",
  relativePath,
  size: Buffer.byteLength(content),
  sha256: sha256(content),
  mtimeMs: 100,
  contentEncoding: "base64",
  contentBase64: Buffer.from(content).toString("base64"),
});

const makeBatch = (input: {
  sourceNodeId?: string;
  batchId: string;
  relativePath: string;
  content: string;
}): MemorySyncBatch => ({
  protocolVersion: 1,
  batchId: input.batchId,
  sourceNodeId: input.sourceNodeId ?? "source-a",
  sourceDisplayName: "Source A",
  sourceEndpoint: "http://source.local",
  generatedAt: new Date(0).toISOString(),
  operations: [makeOperation(input.relativePath, input.content)],
});

describe("Memory Sync local fix regressions", () => {
  let tempRoot: string | null = null;

  const makeTempRoot = async (): Promise<string> => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memory-sync-local-fixes-"));
    return tempRoot;
  };

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  it("keys source sync state by hub URL and sourceNodeId", async () => {
    const root = await makeTempRoot();
    const store = new LocalFileMemorySyncStateStore({ getAppDataDir: () => root });
    const hubBaseUrl = "http://hub.local";

    await store.updateState(hubBaseUrl, "old-source", (state) => ({
      ...state,
      files: {
        "agents/agent-a/raw_traces_active.jsonl": {
          kind: "agents",
          relativePath: "agent-a/raw_traces_active.jsonl",
          size: 8,
          sha256: "old-sha",
          mtimeMs: 1,
          lastBatchId: "batch-old",
          lastSyncedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    }));

    const oldState = await store.readState(hubBaseUrl, "old-source");
    const newState = await store.readState(hubBaseUrl, "new-source");

    expect(Object.keys(oldState.files)).toEqual(["agents/agent-a/raw_traces_active.jsonl"]);
    expect(newState.sourceNodeId).toBe("new-source");
    expect(newState.files).toEqual({});
    expect(store.getFilePath(hubBaseUrl, "old-source")).not.toBe(store.getFilePath(hubBaseUrl, "new-source"));
  });

  it("keeps hubToken out of the public config runtime object", () => {
    const config = createDefaultMemorySyncConfig();
    config.source = {
      ...config.source,
      enabled: true,
      sourceNodeId: "source-a",
      hubBaseUrl: "http://hub.local",
      hubToken: "short",
    };

    const publicConfig = toPublicMemorySyncConfig(config);

    expect(Object.prototype.hasOwnProperty.call(publicConfig.source, "hubToken")).toBe(false);
    expect("hubToken" in publicConfig.source).toBe(false);
    expect(publicConfig.source.hubTokenConfigured).toBe(true);
    expect(publicConfig.source.hubTokenPreview).toBe("••••••••");
    expect(JSON.stringify(publicConfig)).not.toContain("short");
  });

  it("serializes concurrent distinct hub batches for one source", async () => {
    const root = await makeTempRoot();
    const store = new LocalFileMemoryImportStore({ getMemoryDir: () => path.join(root, "memory") });

    const [first, second] = await Promise.all([
      store.commitBatch(makeBatch({ batchId: "batch-1", relativePath: "agent-a/one.txt", content: "one" })),
      store.commitBatch(makeBatch({ batchId: "batch-2", relativePath: "agent-b/two.txt", content: "two" })),
    ]);
    const manifest = await store.readManifest("source-a");

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(manifest.totals.fileCount).toBe(2);
    expect(Object.keys(manifest.files).sort()).toEqual([
      "agents/agent-a/one.txt",
      "agents/agent-b/two.txt",
    ]);
    expect(Object.keys(manifest.batchDigests).sort()).toEqual(["batch-1", "batch-2"]);
    expect(manifest.recentBatches).toHaveLength(2);
  });

  it("no-ops true duplicate hub batches", async () => {
    const root = await makeTempRoot();
    const store = new LocalFileMemoryImportStore({ getMemoryDir: () => path.join(root, "memory") });
    const batch = makeBatch({ batchId: "batch-duplicate", relativePath: "agent-a/one.txt", content: "one" });

    const first = await store.commitBatch(batch);
    const second = await store.commitBatch(batch);
    const manifest = await store.readManifest("source-a");

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.committedAt).toBe(first.committedAt);
    expect(manifest.totals.fileCount).toBe(1);
    expect(manifest.recentBatches.map((record) => record.batchId)).toEqual(["batch-duplicate"]);
  });

  it("rejects conflicting hub batchId reuse after the batch falls out of recentBatches", async () => {
    const root = await makeTempRoot();
    const store = new LocalFileMemoryImportStore({ getMemoryDir: () => path.join(root, "memory") });

    await store.commitBatch(makeBatch({ batchId: "batch-0", relativePath: "agent-a/zero.txt", content: "zero" }));
    for (let index = 1; index <= 51; index += 1) {
      await store.commitBatch(makeBatch({
        batchId: `batch-${index}`,
        relativePath: `agent-a/${index}.txt`,
        content: `content-${index}`,
      }));
    }

    const manifestBeforeConflict = await store.readManifest("source-a");
    expect(manifestBeforeConflict.recentBatches.some((record) => record.batchId === "batch-0")).toBe(false);
    expect(manifestBeforeConflict.batchDigests["batch-0"]?.batchId).toBe("batch-0");

    await expect(store.commitBatch(makeBatch({
      batchId: "batch-0",
      relativePath: "agent-a/zero.txt",
      content: "changed-zero",
    }))).rejects.toThrow("already committed with different content");
  });


  it("tests saved Memory Sync source settings without mixing draft identity fields", async () => {
    const config: MemorySyncConfig = {
      ...createDefaultMemorySyncConfig(),
      source: {
        enabled: true,
        sourceNodeId: "saved-source",
        displayName: null,
        hubBaseUrl: "http://saved-hub.local",
        hubToken: "saved-token",
        backgroundEnabled: false,
        intervalMs: 60_000,
        batchSize: 25,
        updatedAt: null,
      },
    };
    const configService = {
      getConfig: vi.fn(async () => config),
    } as unknown as MemorySyncConfigService;
    const hubClient = {
      testConnection: vi.fn(async () => ({
        ok: true,
        hubEnabled: true,
        sourceNodeId: "saved-source",
        authenticated: true,
        message: "ok",
      })),
    } as unknown as MemoryHubClient;
    const service = new MemorySyncConnectionTestService(configService, hubClient);

    await service.testConnection({ mode: "saved" });

    expect(hubClient.testConnection).toHaveBeenCalledWith({
      hubBaseUrl: "http://saved-hub.local",
      sourceNodeId: "saved-source",
      token: "saved-token",
    });
  });

  it("tests draft Memory Sync source input as one explicit draft identity", async () => {
    const configService = {
      getConfig: vi.fn(),
    } as unknown as MemorySyncConfigService;
    const hubClient = {
      testConnection: vi.fn(async () => ({
        ok: true,
        hubEnabled: true,
        sourceNodeId: "draft-source",
        authenticated: true,
        message: "ok",
      })),
    } as unknown as MemoryHubClient;
    const service = new MemorySyncConnectionTestService(configService, hubClient);

    await service.testConnection({
      mode: "draft",
      hubBaseUrl: "http://draft-hub.local/",
      sourceNodeId: "draft-source",
      token: "draft-token",
    });

    expect(configService.getConfig).not.toHaveBeenCalled();
    expect(hubClient.testConnection).toHaveBeenCalledWith({
      hubBaseUrl: "http://draft-hub.local",
      sourceNodeId: "draft-source",
      token: "draft-token",
    });
  });

  it("coalesces background and manual source sync entry points through one run gate", async () => {
    const root = await makeTempRoot();
    const stateStore = new LocalFileMemorySyncStateStore({ getAppDataDir: () => root });
    const config: MemorySyncConfig = {
      ...createDefaultMemorySyncConfig(),
      source: {
        enabled: true,
        sourceNodeId: "source-a",
        displayName: null,
        hubBaseUrl: "http://hub.local",
        hubToken: "secret-token",
        backgroundEnabled: true,
        intervalMs: 60_000,
        batchSize: 25,
        updatedAt: null,
      },
    };
    const configService = {
      getConfig: vi.fn(async () => config),
    } as unknown as MemorySyncConfigService;

    let releaseScan!: () => void;
    const scanCanFinish = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    let scanStarted!: () => void;
    const scanStartedPromise = new Promise<void>((resolve) => {
      scanStarted = resolve;
    });
    const scanner = {
      scan: vi.fn(async () => {
        scanStarted();
        await scanCanFinish;
        return { files: [], deferred: [] };
      }),
    } as unknown as LocalMemoryExportScanner;
    const hubClient = { pushBatch: vi.fn() } as unknown as MemoryHubClient;
    const service = new MemorySyncService(
      configService,
      stateStore,
      scanner,
      new MemoryFileChangePlanner(),
      hubClient,
    );

    const backgroundRun = service.startSync();
    await scanStartedPromise;
    const manualRun = service.startManualSync();
    releaseScan();

    const [backgroundResult, manualResult] = await Promise.all([backgroundRun, manualRun]);

    expect(backgroundResult).toBe(manualResult);
    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(hubClient.pushBatch).not.toHaveBeenCalled();
    await expect(stateStore.readState("http://hub.local", "source-a")).resolves.toMatchObject({
      lastJobState: "success",
      files: {},
    });
  });
});
