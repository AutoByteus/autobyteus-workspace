import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  MEMORY_SYNC_SOURCE_ID_NAMES_MIGRATION_ID,
  MemorySyncSourceIdNamesMigration,
} from "../../../src/app-data-migrations/migrations/memory-sync-source-id-names/memory-sync-source-id-names-migration.js";
import { LocalFileMemoryHubCredentialStore } from "../../../src/memory-sync/hub/local-file-memory-hub-credential-store.js";
import { LocalFileMemoryImportStore } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { LocalFileMemorySyncStateStore } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { MemorySyncConfigService } from "../../../src/memory-sync/source/memory-sync-config-service.js";

/**
 * autobyteus-290 SM-2 … SM-5. The fixtures are the released writers' exact output (`origin/personal` c78ffb15a2):
 * the config with and without a source, source-state files, credentials with a null and a set binding, and two import
 * folders. After the migration, the current stores read the same values under the new names.
 */
const HUB = "http://hub.tailnet:29695";
const hubKey = createHash("sha256").update(HUB, "utf8").digest("hex").slice(0, 24);

let appDataDir: string;
let memoryDir: string;
const syncDir = () => path.join(appDataDir, "memory-sync");
const importDir = (id: string) => path.join(memoryDir, "imports", id);
const writeJson = async (filePath: string, value: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = async (filePath: string) => JSON.parse(await fs.readFile(filePath, "utf-8"));
const run = () => new MemorySyncSourceIdNamesMigration(appDataDir, memoryDir).execute();
const files = async (dir: string) => (await fs.readdir(dir)).sort();

const releasedConfig = (sourceNodeId: string | null) => ({
  schemaVersion: 1,
  hub: { enabled: true, advertisedHubBaseUrl: HUB, updatedAt: "2026-05-01T00:00:00.000Z" },
  source: { enabled: true, sourceNodeId, displayName: "Laptop", hubBaseUrl: HUB, hubToken: "mst_secret", backgroundEnabled: true,
    intervalMs: 60000, batchSize: 25, updatedAt: "2026-05-01T00:00:00.000Z" },
});
const releasedState = (sourceNodeId: string) => ({ schemaVersion: 1, hubKey, hubBaseUrl: HUB, sourceNodeId,
  lastSuccessfulSyncAt: "2026-05-02T00:00:00.000Z", lastError: null, lastJobState: "success",
  files: { "agents/run-1/raw_traces.jsonl": { kind: "agents", relativePath: "run-1/raw_traces.jsonl", size: 5, sha256: "h", mtimeMs: 1, lastSyncedAt: "x", lastBatchId: "b1" } } });
const releasedCredentials = [
  { credentialId: "cred-1", label: "Laptop", credentialHash: "hash-1", boundSourceNodeId: "laptop-1", createdAt: "2026-05-01T00:00:00.000Z", lastUsedAt: null, revokedAt: null },
  { credentialId: "cred-2", label: null, credentialHash: "hash-2", boundSourceNodeId: null, createdAt: "2026-05-01T00:00:00.000Z", lastUsedAt: null, revokedAt: null },
];
const releasedMemorySyncSourceMetadata = (sourceNodeId: string) => ({ schemaVersion: 1, sourceNodeId, displayName: `Name of ${sourceNodeId}`,
  firstImportedAt: "2026-05-01T00:00:00.000Z", lastImportedAt: "2026-05-02T00:00:00.000Z", lastKnownEndpoint: null,
  sourceServerVersion: null, lastSyncStatus: "success", lastError: null });
const releasedManifest = (sourceNodeId: string) => ({ schemaVersion: 1, sourceNodeId, lastCommittedBatchId: "b1", lastCommittedAt: "x",
  batchDigests: { b1: { batchId: "b1", digest: "d", committedAt: "x", operationCount: 1 } },
  recentBatches: [{ batchId: "b1", digest: "d", committedAt: "x", operationCount: 1 }], totals: { fileCount: 1, totalBytes: 5 },
  files: { "agents/run-1/raw_traces.jsonl": { kind: "agents", relativePath: "run-1/raw_traces.jsonl", size: 5, sha256: "h", mtimeMs: 1, lastBatchId: "b1", lastSyncedAt: "x" } } });

const seedReleased = async () => {
  await writeJson(path.join(syncDir(), "memory-sync-config.json"), releasedConfig("laptop-1"));
  await writeJson(path.join(syncDir(), "source-state", `${hubKey}--laptop-1.json`), releasedState("laptop-1"));
  await writeJson(path.join(syncDir(), "hub-credentials.json"), releasedCredentials);
  for (const id of ["laptop-1", "desk.2"]) {
    await writeJson(path.join(importDir(id), "source-node.json"), releasedMemorySyncSourceMetadata(id));
    await writeJson(path.join(importDir(id), "sync-manifest.json"), releasedManifest(id));
  }
};

beforeEach(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-sm2-5-"));
  appDataDir = path.join(root, "data");
  memoryDir = path.join(root, "memory");
  configureMemorySyncCapability(true);
});
afterEach(async () => {
  await fs.rm(path.dirname(appDataDir), { recursive: true, force: true });
});

describe("MemorySyncSourceIdNamesMigration (SM-2 … SM-5)", () => {
  it("is registered last, required on startup, startup-only, and holds back memory_sync", () => {
    const last = new AppDataMigrationRegistry().listDefinitions().at(-1)!;
    expect(last.id).toBe(MEMORY_SYNC_SOURCE_ID_NAMES_MIGRATION_ID);
    expect(last).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY", holdsBackCapabilities: ["memory_sync"] });
  });

  it("renames every stored name, keeps the values and a backup of each file, and the current stores read the same source", async () => {
    await seedReleased();

    const result = await run();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ migratedCount: 7, failedCount: 0 });
    const config = await readJson(path.join(syncDir(), "memory-sync-config.json"));
    expect(config.source).toEqual({ ...releasedConfig("laptop-1").source, sourceNodeId: undefined, memorySyncSourceId: "laptop-1" });
    expect(Object.keys(config.source)).toEqual(Object.keys(releasedConfig("laptop-1").source).map((key) => key === "sourceNodeId" ? "memorySyncSourceId" : key));
    const importFiles = await files(importDir("desk.2"));
    expect(importFiles.filter((name) => !name.includes(".backup-"))).toEqual(["memory-sync-source.json", "sync-manifest.json"]);
    expect(importFiles.filter((name) => name.includes(".backup-")).map((name) => name.replace(/\.backup-.*/, ""))).toEqual(["source-node.json", "sync-manifest.json"]);
    expect(result.summary.details.every((detail) => detail.status !== "MIGRATED" || detail.backupPath)).toBe(true);

    const configService = new MemorySyncConfigService({ getAppDataDir: () => appDataDir });
    expect((await configService.getConfig()).source).toMatchObject({ memorySyncSourceId: "laptop-1", displayName: "Laptop", hubToken: "mst_secret" });
    const state = await new LocalFileMemorySyncStateStore({ getAppDataDir: () => appDataDir }).readState(HUB, "laptop-1");
    expect(state).toMatchObject({ memorySyncSourceId: "laptop-1", lastJobState: "success", lastSuccessfulSyncAt: "2026-05-02T00:00:00.000Z" });
    expect(Object.keys(state.files)).toEqual(["agents/run-1/raw_traces.jsonl"]);
    const credentials = await new LocalFileMemoryHubCredentialStore({ getAppDataDir: () => appDataDir }).listRecords();
    expect(credentials.map((record) => [record.credentialId, record.boundMemorySyncSourceId])).toEqual([["cred-1", "laptop-1"], ["cred-2", null]]);
    expect(credentials.some((record) => "boundSourceNodeId" in record)).toBe(false);
    const imports = new LocalFileMemoryImportStore({ getMemoryDir: () => memoryDir });
    expect(await imports.listMemorySyncSourceIds()).toEqual(["desk.2", "laptop-1"]);
    expect(await imports.readMemorySyncSourceMetadata("desk.2")).toMatchObject({ memorySyncSourceId: "desk.2", displayName: "Name of desk.2" });
    expect(await imports.readManifest("laptop-1")).toMatchObject({ memorySyncSourceId: "laptop-1", lastCommittedBatchId: "b1", totals: { fileCount: 1, totalBytes: 5 } });
  });

  it("a config without a Memory Sync source ID, a fresh install, and a re-run change nothing", async () => {
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, failedCount: 0 } });
    await writeJson(path.join(syncDir(), "memory-sync-config.json"), releasedConfig(null));
    await run();
    expect((await readJson(path.join(syncDir(), "memory-sync-config.json"))).source).toMatchObject({ memorySyncSourceId: null });
    await seedReleased();
    await run();
    const before = await readJson(path.join(importDir("laptop-1"), "memory-sync-source.json"));
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, failedCount: 0 } });
    expect(await readJson(path.join(importDir("laptop-1"), "memory-sync-source.json"))).toEqual(before);
  });

  it("finishes source-node.json interrupted after memory-sync-source.json was written: same source removes the old file", async () => {
    await writeJson(path.join(importDir("laptop-1"), "source-node.json"), releasedMemorySyncSourceMetadata("laptop-1"));
    await writeJson(path.join(importDir("laptop-1"), "memory-sync-source.json"), { ...releasedMemorySyncSourceMetadata("laptop-1"), sourceNodeId: undefined, memorySyncSourceId: "laptop-1" });

    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect((await files(importDir("laptop-1"))).filter((name) => !name.includes(".backup-"))).toEqual(["memory-sync-source.json"]);
  });

  it("fails without touching anything it cannot convert, naming the file, and so holds back memory_sync", async () => {
    await writeJson(path.join(importDir("laptop-1"), "source-node.json"), releasedMemorySyncSourceMetadata("laptop-1"));
    await writeJson(path.join(importDir("laptop-1"), "memory-sync-source.json"), { memorySyncSourceId: "someone-else" });
    await fs.mkdir(syncDir(), { recursive: true });
    await fs.writeFile(path.join(syncDir(), "hub-credentials.json"), "{broken");
    await writeJson(path.join(syncDir(), "source-state", `${hubKey}--x.json`), { sourceNodeId: "x", memorySyncSourceId: "y" });

    const result = await run();

    expect(result.status).toBe("FAILED");
    expect(result.summary.failedCount).toBe(3);
    expect(result.errorMessage).toContain(path.join(importDir("laptop-1"), "source-node.json"));
    expect(result.errorMessage).toContain(path.join(syncDir(), "hub-credentials.json"));
    expect(await fs.readFile(path.join(syncDir(), "hub-credentials.json"), "utf-8")).toBe("{broken");
    expect(await files(importDir("laptop-1"))).toEqual(["memory-sync-source.json", "source-node.json"]);
  });
});
