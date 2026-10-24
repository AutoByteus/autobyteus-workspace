import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalFileMemoryHubCredentialStore } from "../../../src/memory-sync/hub/local-file-memory-hub-credential-store.js";
import { LocalFileMemoryImportStore } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import {
  configureMemorySyncCapability,
  MEMORY_SYNC_NOT_MIGRATED,
  MEMORY_SYNC_NOT_MIGRATED_TEXT,
  MemorySyncNotMigratedError,
} from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { LocalFileMemorySyncStateStore } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { MemorySyncConfigService } from "../../../src/memory-sync/source/memory-sync-config-service.js";
import { MemorySyncWorker } from "../../../src/memory-sync/source/memory-sync-worker.js";
import { MemoryExplorerSourceService } from "../../../src/agent-memory/services/memory-explorer-source-service.js";

/** autobyteus-290 `memory_sync` hold-back: while SM-2 … SM-5 have not succeeded, nothing reads or writes Memory Sync files. */
const hoisted = vi.hoisted(() => ({ root: "", health: vi.fn() }));

vi.mock("../../../src/memory-sync/hub/memory-hub-ingestion-service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMemoryHubIngestionService: () => ({ health: hoisted.health, commitBatch: hoisted.health }),
}));
vi.mock("../../../src/memory-sync/source/memory-sync-config-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/memory-sync/source/memory-sync-config-service.js")>();
  return { ...actual, getMemorySyncConfigService: () => new actual.MemorySyncConfigService({ getAppDataDir: () => hoisted.root }) };
});

const expectHeldBack = async (call: Promise<unknown>) => {
  await expect(call).rejects.toBeInstanceOf(MemorySyncNotMigratedError);
};

beforeEach(async () => {
  hoisted.root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-memory-sync-hold-back-"));
  configureMemorySyncCapability(false);
});
afterEach(async () => {
  vi.useRealTimers();
  configureMemorySyncCapability(true);
  await fs.rm(hoisted.root, { recursive: true, force: true });
});

describe("Memory Sync held back (autobyteus-290 memory_sync)", () => {
  it("every store refuses with the one error and writes nothing", async () => {
    const dirs = { getAppDataDir: () => hoisted.root, getMemoryDir: () => hoisted.root };
    const config = new MemorySyncConfigService(dirs);
    await expectHeldBack(config.getConfig());
    await expectHeldBack(config.updateSourceConfig({ sourceId: "laptop-1" }));
    await expectHeldBack(config.updateHubConfig({ enabled: false }));
    const state = new LocalFileMemorySyncStateStore(dirs);
    await expectHeldBack(state.readState("http://hub", "laptop-1"));
    await expectHeldBack(state.updateState("http://hub", "laptop-1", (value) => value));
    const credentials = new LocalFileMemoryHubCredentialStore(dirs);
    await expectHeldBack(credentials.listRecords());
    await expectHeldBack(credentials.writeRecords([]));
    const imports = new LocalFileMemoryImportStore(dirs);
    await expectHeldBack(imports.listSourceIds());
    await expectHeldBack(imports.readManifest("laptop-1"));
    await expectHeldBack(imports.commitBatch({ protocolVersion: 1, batchId: "b1", sourceId: "laptop-1", operations: [] } as never));
    await expect(fs.readdir(hoisted.root)).resolves.toEqual([]);
    await expect(config.getConfig()).rejects.toMatchObject({ code: MEMORY_SYNC_NOT_MIGRATED, message: MEMORY_SYNC_NOT_MIGRATED_TEXT });
  });

  it("the background loop does not run", async () => {
    vi.useFakeTimers();
    await new MemorySyncWorker().reload();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("hub ingestion answers its sources 503 with the code and the reason", async () => {
    hoisted.health.mockRejectedValue(new MemorySyncNotMigratedError());
    const { registerMemorySyncRoutes } = await import("../../../src/api/rest/memory-sync.js");
    const app = Fastify();
    await registerMemorySyncRoutes(app);
    const health = await app.inject({ method: "GET", url: "/memory-sync/v1/health?sourceId=laptop-1" });
    const batch = await app.inject({ method: "POST", url: "/memory-sync/v1/batches", payload: { protocolVersion: 1 } });
    await app.close();
    for (const answer of [health, batch]) {
      expect(answer.statusCode).toBe(503);
      expect(answer.json()).toEqual({ error: MEMORY_SYNC_NOT_MIGRATED, message: MEMORY_SYNC_NOT_MIGRATED_TEXT });
    }
  });

  it("the settings reads and saves fail with the reason", async () => {
    const { MemorySyncResolver } = await import("../../../src/api/graphql/types/memory-sync.js");
    const resolver = new MemorySyncResolver();
    await expect(resolver.getMemorySyncStatus()).rejects.toThrow(MEMORY_SYNC_NOT_MIGRATED_TEXT);
    await expect(fs.readdir(hoisted.root)).resolves.toEqual([]);
  });

  it("the Memory page lists only this node's memory and refuses an imported source with the reason", async () => {
    const catalog = { listImports: vi.fn() };
    const importStore = { sourceExists: vi.fn(), readSourceMetadata: vi.fn(), getImportRootDir: vi.fn() };
    const service = new MemoryExplorerSourceService(catalog as never, importStore as never);
    const sources = await service.listSources();
    expect(sources.map((source) => source.type)).toEqual(["LOCAL"]);
    await expect(service.resolveSource({ type: "IMPORTED", sourceId: "laptop-1" } as never))
      .rejects.toMatchObject({ code: MEMORY_SYNC_NOT_MIGRATED, message: MEMORY_SYNC_NOT_MIGRATED_TEXT });
    expect(catalog.listImports).not.toHaveBeenCalled();
    expect(importStore.sourceExists).not.toHaveBeenCalled();
  });
});
