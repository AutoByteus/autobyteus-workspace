import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceConfig } from "autobyteus-ts";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { TempWorkspace } from "../../../src/workspaces/temp-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

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

  beforeEach(() => {
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
  });

  it("creates and registers a workspace", async () => {
    const rootPath = createTempRoot();
    const config = new WorkspaceConfig({ rootPath: rootPath });

    const workspace = await manager.createWorkspace(config);

    expect(workspace).toBeInstanceOf(FileSystemWorkspace);
    expect(manager.getWorkspaceById(workspace.workspaceId)).toBe(workspace);
    expect(manager.getAllWorkspaces()).toHaveLength(1);
  });

  it("reuses an existing workspace with the same config", async () => {
    const rootPath = createTempRoot();
    const config = new WorkspaceConfig({ rootPath: rootPath });

    const first = await manager.createWorkspace(config);
    const second = await manager.createWorkspace(config);

    expect(second).toBe(first);
    expect(manager.getAllWorkspaces()).toHaveLength(1);
  });

  it("returns undefined for unknown workspace IDs", () => {
    expect(manager.getWorkspaceById("missing")).toBeUndefined();
  });

  it("returns all active workspaces", async () => {
    const rootA = createTempRoot();
    const rootB = createTempRoot();

    const first = await manager.createWorkspace(new WorkspaceConfig({ rootPath: rootA }));
    const second = await manager.createWorkspace(new WorkspaceConfig({ rootPath: rootB }));

    const all = manager.getAllWorkspaces();
    expect(all).toHaveLength(2);
    expect(all).toContain(first);
    expect(all).toContain(second);
  });

  it("creates the temp workspace on first call", async () => {
    const tempRoot = createTempRoot();
    const mockConfig = {
      getTempWorkspaceDir: () => tempRoot,
    };

    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(mockConfig as any);

    const tempWorkspace = await manager.getOrCreateTempWorkspace();

    expect(tempWorkspace).toBeInstanceOf(TempWorkspace);
    expect(tempWorkspace.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
    expect(tempWorkspace.getName()).toBe("Temp Workspace");
    expect(manager.getWorkspaceById(TempWorkspace.TEMP_WORKSPACE_ID)).toBe(tempWorkspace);
  });

  it("returns cached temp workspace on subsequent calls", async () => {
    const tempRoot = createTempRoot();
    const mockConfig = {
      getTempWorkspaceDir: () => tempRoot,
    };

    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(mockConfig as any);

    const first = await manager.getOrCreateTempWorkspace();
    const second = await manager.getOrCreateTempWorkspace();

    expect(second).toBe(first);
    const allTemp = manager
      .getAllWorkspaces()
      .filter((workspace) => workspace.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID);
    expect(allTemp).toHaveLength(1);
  });
});
