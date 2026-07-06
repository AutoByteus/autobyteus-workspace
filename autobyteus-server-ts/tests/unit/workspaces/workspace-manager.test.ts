import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { TempWorkspace } from "../../../src/workspaces/temp-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { buildFilesystemWorkspaceId } from "../../../src/workspaces/workspace-registry-store.js";

vi.mock("../../../src/file-explorer/file-name-indexer.js", () => ({
  FileNameIndexer: class {
    async start() {}
    async stop() {}
  },
}));

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-ws-"));

const resetWorkspaceManager = () => {
  (WorkspaceManager as unknown as { instance: WorkspaceManager | null }).instance = null;
};

describe("WorkspaceManager", () => {
  let manager: WorkspaceManager;
  let appDataDir: string;

  beforeEach(() => {
    appDataDir = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(appDataDir);
    resetWorkspaceManager();
    manager = WorkspaceManager.getInstance();
  });

  afterEach(async () => {
    const workspaces = manager.getAllWorkspaces();
    for (const workspace of workspaces) {
      await workspace.close();
    }
    (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> }).activeWorkspaces.clear();
    vi.restoreAllMocks();
    fs.rmSync(appDataDir, { recursive: true, force: true });
  });

  it("creates and registers a workspace", async () => {
    const rootPath = createTempRoot();
    const config = { rootPath };

    const workspace = await manager.createWorkspace(config);

    expect(workspace).toBeInstanceOf(FileSystemWorkspace);
    expect(manager.getWorkspaceById(workspace.workspaceId)).toBe(workspace);
    expect(manager.getAllWorkspaces()).toHaveLength(1);
  });

  it("reuses an existing workspace with the same config", async () => {
    const rootPath = createTempRoot();
    const config = { rootPath };

    const first = await manager.createWorkspace(config);
    const second = await manager.createWorkspace(config);

    expect(second).toBe(first);
    expect(manager.getAllWorkspaces()).toHaveLength(1);
  });

  it("reuses an existing workspace when equivalent root paths normalize to the same workspace ID", async () => {
    const rootPath = createTempRoot();
    const first = await manager.createWorkspace({ rootPath });
    const second = await manager.createWorkspace(
      { rootPath: `${rootPath}/.` },
    );

    expect(second).toBe(first);
    expect(manager.getAllWorkspaces()).toHaveLength(1);
  });

  it("routes the configured temp root to TempWorkspace instead of registering a filesystem workspace", async () => {
    const tempRoot = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(tempRoot);

    const workspace = await manager.createWorkspace({ rootPath: `${tempRoot}/.` });

    expect(workspace).toBeInstanceOf(TempWorkspace);
    expect(workspace.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
    expect(workspace.getBasePath()).toBe(tempRoot);
    expect(await manager.listRegisteredFilesystemWorkspaces()).toEqual([]);
    expect(
      fs.existsSync(path.join(appDataDir, "workspaces.json"))
        ? fs.readFileSync(path.join(appDataDir, "workspaces.json"), "utf-8")
        : "",
    ).not.toContain(buildFilesystemWorkspaceId(tempRoot));
  });

  it("decommissions persisted filesystem entries for the configured temp root", async () => {
    const tempRoot = createTempRoot();
    const regularRoot = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(tempRoot);
    const tempFilesystemWorkspaceId = buildFilesystemWorkspaceId(tempRoot);
    const regularWorkspaceId = buildFilesystemWorkspaceId(regularRoot);
    fs.writeFileSync(
      path.join(appDataDir, "workspaces.json"),
      `${JSON.stringify({
        [tempFilesystemWorkspaceId]: tempRoot,
        [regularWorkspaceId]: regularRoot,
      }, null, 2)}\n`,
      "utf-8",
    );
    (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> })
      .activeWorkspaces
      .set(tempFilesystemWorkspaceId, new FileSystemWorkspace({ rootPath: tempRoot }));

    await manager.getOrCreateTempWorkspace();
    const visibleWorkspaces = await manager.listVisibleWorkspaces();

    expect(visibleWorkspaces.map((workspace) => workspace.workspaceId).sort()).toEqual(
      [regularWorkspaceId, TempWorkspace.TEMP_WORKSPACE_ID].sort(),
    );
    expect(manager.getWorkspaceById(tempFilesystemWorkspaceId)).toBeUndefined();
    expect(await manager.getRegisteredWorkspaceRootPath(tempFilesystemWorkspaceId)).toBeNull();
    expect(await manager.getRegisteredWorkspaceRootPath(regularWorkspaceId)).toBe(regularRoot);
  });

  it("returns undefined for unknown workspace IDs", () => {
    expect(manager.getWorkspaceById("missing")).toBeUndefined();
  });

  it("returns all active workspaces", async () => {
    const rootA = createTempRoot();
    const rootB = createTempRoot();

    const first = await manager.createWorkspace({ rootPath: rootA });
    const second = await manager.createWorkspace({ rootPath: rootB });

    const all = manager.getAllWorkspaces();
    expect(all).toHaveLength(2);
    expect(all).toContain(first);
    expect(all).toContain(second);
  });

  it("creates the temp workspace on first call", async () => {
    const tempRoot = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(tempRoot);

    const tempWorkspace = await manager.getOrCreateTempWorkspace();

    expect(tempWorkspace).toBeInstanceOf(TempWorkspace);
    expect(tempWorkspace.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
    expect(tempWorkspace.getName()).toBe("Temp Workspace");
    expect(manager.getWorkspaceById(TempWorkspace.TEMP_WORKSPACE_ID)).toBe(tempWorkspace);
  });

  it("returns cached temp workspace on subsequent calls", async () => {
    const tempRoot = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(tempRoot);

    const first = await manager.getOrCreateTempWorkspace();
    const second = await manager.getOrCreateTempWorkspace();

    expect(second).toBe(first);
    const allTemp = manager
      .getAllWorkspaces()
      .filter((workspace) => workspace.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID);
    expect(allTemp).toHaveLength(1);
  });

  it("recreates an ordinary filesystem workspace from its deterministic ID after restart", async () => {
    const rootPath = createTempRoot();
    const initial = await manager.createWorkspace({ rootPath });
    const workspaceId = initial.workspaceId;

    await initial.close();
    (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> }).activeWorkspaces.clear();

    resetWorkspaceManager();
    manager = WorkspaceManager.getInstance();

    const recreated = await manager.getOrCreateWorkspace(workspaceId);

    expect(recreated.workspaceId).toBe(buildFilesystemWorkspaceId(rootPath));
    expect(recreated.getBasePath()).toBe(rootPath);
    expect(manager.getWorkspaceById(workspaceId)).toBe(recreated);
  });

  it("removes a registered workspace entry without deleting workspace files", async () => {
    const rootPath = createTempRoot();
    const filePath = path.join(rootPath, "keep.txt");
    fs.writeFileSync(filePath, "preserved", "utf-8");
    const workspace = await manager.createWorkspace({ rootPath });

    const result = await manager.removeRegisteredWorkspace(workspace.workspaceId);

    expect(result).toMatchObject({
      success: true,
      workspaceId: workspace.workspaceId,
      workspaceRootPath: rootPath,
    });
    expect(manager.getWorkspaceById(workspace.workspaceId)).toBeUndefined();
    expect(await manager.getRegisteredWorkspaceRootPath(workspace.workspaceId)).toBeNull();
    expect(await manager.listRegisteredFilesystemWorkspaces()).toEqual([]);
    expect(fs.readFileSync(filePath, "utf-8")).toBe("preserved");
    await expect(manager.getOrCreateWorkspace(workspace.workspaceId)).rejects.toThrow(
      `Workspace '${workspace.workspaceId}' not found`,
    );
  });

  it("recreates the temp workspace from its stable workspace ID", async () => {
    const tempRoot = createTempRoot();
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(tempRoot);

    const tempWorkspace = await manager.getOrCreateWorkspace(TempWorkspace.TEMP_WORKSPACE_ID);

    expect(tempWorkspace).toBeInstanceOf(TempWorkspace);
    expect(tempWorkspace.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
  });
});
