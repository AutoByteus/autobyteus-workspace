import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { resetTeamRunHistoryCatalogState, TeamRunHistoryCatalogService } from "../../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { TeamRunPackageCatalog } from "../../../../src/run-history/services/team-run-package-catalog.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const buildTree = (teamRunId = "team-1") => testExecutionTree({
  rootTeamRunId: teamRunId,
  rootTeamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorAddress: "/planner",
  createdAt: "2026-08-15T10:00:00.000Z",
  children: [testAgentNode("/planner", { agentRunId: "planner-run", workspaceRootPath: "/tmp/workspace" })],
});

describe("TeamRunHistoryCatalogService current V2 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;
  let managed = false;
  const manager = {
    hasManagedTeamRun: vi.fn(() => managed),
    withUnmanagedHistoryDeletion: vi.fn(async <T>(_teamRunId: string, operation: () => Promise<T>) =>
      managed ? { kind: "managed" as const } : { kind: "completed" as const, value: await operation() }),
  };

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-catalog-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);
    managed = false;
    manager.hasManagedTeamRun.mockClear();
    manager.withUnmanagedHistoryDeletion.mockClear();
  });

  afterEach(async () => {
    resetTeamRunHistoryCatalogState(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("records one derived catalog row without creating a fourth Team state authority", async () => {
    const tree = buildTree();
    const service = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: manager });
    await service.recordTeamRunCreated({ tree, summary: "initial summary" });

    await expect(new TeamRunHistoryIndexStore(memoryDir).listRows()).resolves.toEqual([{
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamDefinitionName: "Team One",
      workspaceRootPath: "/tmp/workspace",
      summary: "initial summary",
      createdAt: "2026-08-15T10:00:00.000Z",
      archivedAt: null,
      terminatedAt: null,
    }]);
    await expect(fs.readdir(layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] })))
      .rejects.toMatchObject({ code: "ENOENT" });
  });

  it("records the first summary only and serializes current lifecycle updates", async () => {
    const service = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: manager });
    await service.recordTeamRunCreated({ tree: buildTree() });
    await Promise.all([
      service.recordTeamRunSummary({ teamRunId: "team-1", summary: "first" }),
      service.recordTeamRunSummary({ teamRunId: "team-1", summary: "second" }),
    ]);
    await service.recordTeamRunTerminated({ teamRunId: "team-1", terminatedAt: "2026-08-15T11:00:00.000Z" });
    await expect(service.getCatalogRow("team-1")).resolves.toMatchObject({
      summary: "first",
      terminatedAt: "2026-08-15T11:00:00.000Z",
    });
  });

  it("archives the exact V2 execution tree and derived catalog row together", async () => {
    const tree = buildTree();
    const rootDir = layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(rootDir, tree);
    const service = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: manager });
    await service.recordTeamRunCreated({ tree });

    await expect(service.archiveTeamRun("team-1")).resolves.toMatchObject({ success: true });
    await expect(new TeamRunExecutionTreeStore().read(rootDir, "team-1"))
      .resolves.toMatchObject({ archivedAt: expect.any(String) });
    await expect(service.getCatalogRow("team-1")).resolves.toMatchObject({ archivedAt: expect.any(String) });
  });

  it("blocks active deletion and rejects unsafe identities before filesystem effects", async () => {
    const tree = buildTree();
    const rootDir = layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(rootDir, tree);
    const service = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: manager });
    await service.recordTeamRunCreated({ tree });

    managed = true;
    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    managed = false;
    await expect(service.deleteTeamRun("../escape")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    await expect(fs.stat(rootDir)).resolves.toBeDefined();
    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: true });
    await expect(fs.stat(rootDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the current row and package when the candidate index write fails", async () => {
    const tree = buildTree();
    const rootDir = layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(rootDir, tree);
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const service = new TeamRunHistoryCatalogService(memoryDir, { teamRunManager: manager, indexStore });
    await service.recordTeamRunCreated({ tree });
    const packageCatalog = new TeamRunPackageCatalog(memoryDir);
    packageCatalog.admit("team-1");
    vi.spyOn(indexStore, "writeIndex").mockRejectedValueOnce(new Error("candidate write failed"));

    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: false, message: expect.stringContaining("index") });
    await expect(service.getCatalogRow("team-1")).resolves.toMatchObject({ teamRunId: "team-1" });
    await expect(fs.stat(rootDir)).resolves.toBeDefined();
    expect(packageCatalog.isAdmitted("team-1")).toBe(true);
  });

  it("durably compensates and validates the original row before reporting package removal failure", async () => {
    const tree = buildTree();
    const rootDir = layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(rootDir, tree);
    const indexStore = new TeamRunHistoryIndexStore(memoryDir);
    const packageCatalog = new TeamRunPackageCatalog(memoryDir);
    packageCatalog.admit("team-1");
    const service = new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: manager,
      indexStore,
      packageCatalog,
      removePackage: vi.fn(async () => { throw new Error("package busy"); }),
    });
    await service.recordTeamRunCreated({ tree });
    const writeSpy = vi.spyOn(indexStore, "writeIndex");

    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: false, message: expect.stringContaining("package") });
    expect(writeSpy).toHaveBeenCalledTimes(2);
    await expect(indexStore.getRow("team-1")).resolves.toMatchObject({ teamRunId: "team-1" });
    await expect(new TeamRunExecutionTreeStore().read(rootDir, "team-1")).resolves.toMatchObject({ rootTeam: { teamRunId: "team-1" } });
    expect(packageCatalog.isAdmitted("team-1")).toBe(true);
  });
});
