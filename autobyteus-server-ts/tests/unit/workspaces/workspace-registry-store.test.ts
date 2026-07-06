import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  buildFilesystemWorkspaceId,
  WorkspaceRegistryStore,
} from "../../../src/workspaces/workspace-registry-store.js";
import { canonicalizeWorkspaceRootPath } from "../../../src/workspaces/workspace-path-utils.js";

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-registry-"));

const registryRecordForRoots = (roots: string[]): Record<string, string> =>
  Object.fromEntries(
    roots.map((rootPath) => {
      const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
      return [buildFilesystemWorkspaceId(workspaceRootPath), workspaceRootPath];
    }),
  );

describe("WorkspaceRegistryStore", () => {
  let appDataDir: string;
  let registryFilePath: string;

  const writeRegistry = (record: Record<string, string>) => {
    fs.mkdirSync(appDataDir, { recursive: true });
    fs.writeFileSync(registryFilePath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
  };

  const readRegistry = (): Record<string, string> =>
    JSON.parse(fs.readFileSync(registryFilePath, "utf-8")) as Record<string, string>;

  beforeEach(() => {
    appDataDir = createTempRoot();
    registryFilePath = path.join(appDataDir, "workspaces.json");
    vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(appDataDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(appDataDir, { recursive: true, force: true });
  });

  it("preserves existing registry entries when load and upsert overlap", async () => {
    const existingRoots = [createTempRoot(), createTempRoot(), createTempRoot()];
    writeRegistry(registryRecordForRoots(existingRoots));
    const store = new WorkspaceRegistryStore();
    const newRoot = createTempRoot();

    const listPromise = store.listEntries();
    const upsertPromise = store.upsertEntry(buildFilesystemWorkspaceId(newRoot), newRoot);
    await Promise.all([listPromise, upsertPromise]);

    expect(Object.values(readRegistry()).sort()).toEqual([...existingRoots, newRoot].sort());
  });

  it("serializes concurrent upserts so all roots remain registered", async () => {
    const store = new WorkspaceRegistryStore();
    const roots = [createTempRoot(), createTempRoot(), createTempRoot(), createTempRoot()];

    await Promise.all(
      roots.map((rootPath) =>
        store.upsertEntry(buildFilesystemWorkspaceId(rootPath), rootPath),
      ),
    );

    expect(Object.values(readRegistry()).sort()).toEqual(roots.sort());
  });

  it("allows explicit delete of only the requested registry entry", async () => {
    const [rootA, rootB, rootC] = [
      createTempRoot(),
      createTempRoot(),
      createTempRoot(),
    ] as [string, string, string];
    writeRegistry(registryRecordForRoots([rootA, rootB, rootC]));
    const store = new WorkspaceRegistryStore();

    const removed = await store.deleteEntry(buildFilesystemWorkspaceId(rootB));

    expect(removed).toMatchObject({
      workspaceId: buildFilesystemWorkspaceId(rootB),
      workspaceRootPath: rootB,
    });
    expect(Object.values(readRegistry()).sort()).toEqual([rootA, rootC].sort());
  });

  it("rejects an unexpected shrink and preserves the persisted registry", async () => {
    const [rootA, rootB, rootC] = [
      createTempRoot(),
      createTempRoot(),
      createTempRoot(),
    ] as [string, string, string];
    const originalRecord = registryRecordForRoots([rootA, rootB, rootC]);
    writeRegistry(originalRecord);
    const store = new WorkspaceRegistryStore();
    await store.listEntries();
    const unrelatedRoot = createTempRoot();
    (store as unknown as { entries: Map<string, string> }).entries = new Map([
      [buildFilesystemWorkspaceId(rootA), rootA],
      [buildFilesystemWorkspaceId(unrelatedRoot), unrelatedRoot],
    ]);

    const newRoot = createTempRoot();
    await expect(
      store.upsertEntry(buildFilesystemWorkspaceId(newRoot), newRoot),
    ).rejects.toThrow("Suspicious workspace registry shrink rejected");

    expect(readRegistry()).toEqual(originalRecord);
  });

  it("allows explicit cleanup by root path without creating persistent backup files", async () => {
    const [rootA, tempRoot, rootB] = [
      createTempRoot(),
      createTempRoot(),
      createTempRoot(),
    ] as [string, string, string];
    writeRegistry(registryRecordForRoots([rootA, tempRoot, rootB]));
    const store = new WorkspaceRegistryStore();

    const removed = await store.deleteEntriesByRootPath(
      tempRoot,
      "configured temp workspace root cleanup",
    );

    expect(removed).toEqual([
      {
        workspaceId: buildFilesystemWorkspaceId(tempRoot),
        workspaceRootPath: tempRoot,
      },
    ]);
    expect(Object.values(readRegistry()).sort()).toEqual([rootA, rootB].sort());
    const registryDirFiles = fs.readdirSync(appDataDir);
    expect(registryDirFiles.some((fileName) => fileName.includes(".bak"))).toBe(false);
    expect(
      registryDirFiles.filter((fileName) => fileName.startsWith("workspaces.json.tmp-")),
    ).toHaveLength(0);
  });
});
