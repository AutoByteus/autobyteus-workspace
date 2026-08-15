import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { resetTeamRunHistoryCatalogState, TeamRunHistoryCatalogService } from "../../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const buildTree = (teamRunId = "team-1") => testExecutionTree({
  rootTeamRunId: teamRunId,
  rootTeamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorAddress: "/planner",
  createdAt: "2026-08-15T10:00:00.000Z",
  children: [testAgentNode("/planner", { agentRunId: "planner-run", workspaceRootPath: "/tmp/workspace" })],
});

describe("TeamRunHistoryCatalogService current V1 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;
  const manager = { getActiveRun: vi.fn(() => null) };

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-history-catalog-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    resetTeamRunHistoryCatalogState(memoryDir);
    manager.getActiveRun.mockReset().mockReturnValue(null);
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

  it("archives the exact V1 execution tree and derived catalog row together", async () => {
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

    manager.getActiveRun.mockReturnValue({});
    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: false, message: expect.stringContaining("active") });
    manager.getActiveRun.mockReturnValue(null);
    await expect(service.deleteTeamRun("../escape")).resolves.toMatchObject({ success: false, message: expect.stringContaining("Invalid") });
    await expect(fs.stat(rootDir)).resolves.toBeDefined();
    await expect(service.deleteTeamRun("team-1")).resolves.toMatchObject({ success: true });
    await expect(fs.stat(rootDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
