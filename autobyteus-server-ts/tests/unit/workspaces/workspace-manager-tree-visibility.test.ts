import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TempWorkspace } from "../../../src/workspaces/temp-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME } from "../../../src/workspaces/workspace-tree-visibility.js";

vi.mock("../../../src/file-explorer/file-name-indexer.js", () => ({
  FileNameIndexer: class {
    async start() {}
    async stop() {}
  },
}));

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-ws-tree-"));

describe("WorkspaceManager: hidden from the Workspaces tree (autobyteus-385)", () => {
  let manager: WorkspaceManager;
  let appDataDir: string;
  let activeRunWorkspaceIds: string[];
  const roots: string[] = [];

  const root = () => {
    const created = createTempRoot();
    roots.push(created);
    return created;
  };
  const shown = async () => Object.fromEntries(
    (await manager.listVisibleWorkspaces()).map(({ workspace, shownInWorkspacesTree }) =>
      [workspace.workspaceId, shownInWorkspacesTree]),
  );
  const restartManager = () => {
    (WorkspaceManager as unknown as { instance: WorkspaceManager | null }).instance = null;
    manager = WorkspaceManager.getInstance();
  };

  beforeEach(() => {
    appDataDir = createTempRoot();
    activeRunWorkspaceIds = [];
    vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(appDataDir);
    vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(path.join(appDataDir, "temp"));
    vi.spyOn(AgentRunManager, "getInstance").mockReturnValue({
      listActiveRuns: () => activeRunWorkspaceIds.map((_, index) => `run-${index}`),
      getActiveRun: (runId: string) => ({
        config: { workspaceId: activeRunWorkspaceIds[Number(runId.slice("run-".length))] },
      }),
    } as unknown as AgentRunManager);
    vi.spyOn(AgentTeamRunManager, "getInstance").mockReturnValue(
      { listManagedTeamRunIds: () => [] } as unknown as AgentTeamRunManager,
    );
    restartManager();
  });

  afterEach(async () => {
    for (const workspace of manager.getAllWorkspaces()) await workspace.close();
    vi.restoreAllMocks();
    for (const created of roots.splice(0)) fs.rmSync(created, { recursive: true, force: true });
    fs.rmSync(appDataDir, { recursive: true, force: true });
  });

  it("hides a folder from the tree only: it stays registered and listed, and workspaces.json keeps its bytes", async () => {
    const workspace = await manager.createWorkspace({ rootPath: root() });
    const other = await manager.createWorkspace({ rootPath: root() });
    const registryBytes = fs.readFileSync(path.join(appDataDir, "workspaces.json"), "utf-8");

    const result = await manager.hideFromWorkspacesTree(workspace.workspaceId);

    expect(result).toMatchObject({ success: true, workspaceId: workspace.workspaceId });
    expect(await shown()).toMatchObject({ [workspace.workspaceId]: false, [other.workspaceId]: true });
    expect(await manager.isShownInWorkspacesTree(workspace.workspaceId)).toBe(false);
    expect(await manager.getRegisteredWorkspaceRootPath(workspace.workspaceId)).toBe(workspace.getBasePath());
    expect(manager.getWorkspaceById(workspace.workspaceId)).toBe(workspace);
    expect(fs.readFileSync(path.join(appDataDir, "workspaces.json"), "utf-8")).toBe(registryBytes);
    expect(JSON.parse(fs.readFileSync(path.join(appDataDir, WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME), "utf-8")))
      .toEqual({ workspaceIds: [workspace.workspaceId] });

    restartManager();
    expect(await shown()).toMatchObject({ [workspace.workspaceId]: false, [other.workspaceId]: true });
  });

  it("refuses to hide while a run is active in the folder, with the removal guard's message", async () => {
    const workspace = await manager.createWorkspace({ rootPath: root() });
    activeRunWorkspaceIds = [workspace.workspaceId];

    const hidden = await manager.hideFromWorkspacesTree(workspace.workspaceId);
    const removed = await manager.removeRegisteredWorkspace(workspace.workspaceId);

    const message = "Stop active agent or team runs in this workspace before removing it from Workspaces.";
    expect(hidden).toEqual({ success: false, message, workspaceId: workspace.workspaceId });
    expect(removed).toMatchObject({ success: false, message });
    expect(await manager.isShownInWorkspacesTree(workspace.workspaceId)).toBe(true);
  });

  it("refuses the Temp workspace and unregistered IDs", async () => {
    expect(await manager.hideFromWorkspacesTree(TempWorkspace.TEMP_WORKSPACE_ID)).toMatchObject({ success: false });
    expect(await manager.hideFromWorkspacesTree("agent_ws_unknown")).toEqual({
      success: false, message: "Workspace is not registered.", workspaceId: "agent_ws_unknown",
    });
  });

  it("internal re-registration (a delegation's ensureWorkspaceByRootPath) leaves the folder hidden", async () => {
    const rootPath = root();
    const workspace = await manager.createWorkspace({ rootPath });
    await manager.hideFromWorkspacesTree(workspace.workspaceId);

    await manager.ensureWorkspaceByRootPath(rootPath);
    restartManager();
    await manager.ensureWorkspaceByRootPath(rootPath);

    expect(await manager.isShownInWorkspacesTree(workspace.workspaceId)).toBe(false);
  });

  it("showInWorkspacesTree brings hidden folders back by root path, ignoring empty and unknown roots", async () => {
    const rootA = root();
    const rootB = root();
    const a = await manager.createWorkspace({ rootPath: rootA });
    const b = await manager.createWorkspace({ rootPath: rootB });
    await manager.hideFromWorkspacesTree(a.workspaceId);
    await manager.hideFromWorkspacesTree(b.workspaceId);

    await manager.showInWorkspacesTree([null, " ", path.join(appDataDir, "never-registered"), `${rootA}/`]);

    expect(await shown()).toMatchObject({ [a.workspaceId]: true, [b.workspaceId]: false });
  });

  it("showInWorkspacesTree logs and does not throw when the write fails", async () => {
    const workspace = await manager.createWorkspace({ rootPath: root() });
    await manager.hideFromWorkspacesTree(workspace.workspaceId);
    fs.chmodSync(appDataDir, 0o500);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(manager.showInWorkspacesTree([workspace.getBasePath()])).resolves.toBeUndefined();
    } finally {
      fs.chmodSync(appDataDir, 0o700);
    }
    expect(String(warn.mock.calls.at(-1)?.[0])).toContain("Could not show workspaces in the Workspaces tree");
  });

  it("removal forgets the hidden mark, so adding the folder again starts shown", async () => {
    const rootPath = root();
    const workspace = await manager.createWorkspace({ rootPath });
    await manager.hideFromWorkspacesTree(workspace.workspaceId);

    expect(await manager.removeRegisteredWorkspace(workspace.workspaceId)).toMatchObject({ success: true });
    expect(JSON.parse(fs.readFileSync(path.join(appDataDir, WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME), "utf-8")))
      .toEqual({ workspaceIds: [] });

    const again = await manager.ensureWorkspaceByRootPath(rootPath);
    expect(again.workspaceId).toBe(workspace.workspaceId);
    expect(await shown()).toMatchObject({ [workspace.workspaceId]: true });
  });
});
