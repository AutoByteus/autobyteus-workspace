import { describe, expect, it, vi } from "vitest";
import { TeamRunHistoryService } from "../../../../src/run-history/services/team-run-history-service.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const tree = testExecutionTree({
  rootTeamRunId: "team-1",
  rootTeamDefinitionId: "team-def-1",
  teamDefinitionName: "Team Alpha",
  coordinatorAddress: "/Coordinator",
  children: [
    testAgentNode("/Coordinator", { agentRunId: "coordinator-run", workspaceRootPath: "/ws/a" }),
    testAgentNode("/Worker", { agentRunId: "worker-run" }),
  ],
});
const row = {
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team Alpha",
  workspaceRootPath: "/ws/a",
  summary: "team summary",
  createdAt: tree.createdAt,
  archivedAt: null,
  terminatedAt: null,
};

const harness = (input: { storedTree?: typeof tree | null; active?: boolean } = {}) => {
  const catalog = {
    listCatalogRows: vi.fn(async () => [row]),
    archiveTeamRun: vi.fn(async () => ({ success: true, message: "archived" })),
    deleteTeamRun: vi.fn(async () => ({ success: true, message: "deleted" })),
  };
  const treeStore = { read: vi.fn(async () => input.storedTree === undefined ? tree : input.storedTree) };
  const manager = { hasManagedTeamRun: vi.fn(() => Boolean(input.active)) };
  const live = { getCatalogListLiveProjection: vi.fn(() => ({
    isActive: input.active ?? false,
    memberStatusSnapshots: input.active ? [{ agentRunId: "worker-run", status: "running" }] : [],
  })) };
  return {
    catalog,
    treeStore,
    manager,
    live,
    service: new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalog as never,
      executionTreeStore: treeStore as never,
      teamRunManager: manager as never,
      liveProjectionService: live as never,
    }),
  };
};

describe("TeamRunHistoryService current execution tree", () => {
  it("projects history from the derived catalog plus exact V1 execution tree", async () => {
    const { service } = harness();
    await expect(service.listTeamRunHistory()).resolves.toEqual([expect.objectContaining({
      teamRunId: "team-1",
      coordinatorAddress: "/Coordinator",
      summary: "team summary",
      members: [
        expect.objectContaining({ memberAddress: "/Coordinator", agentRunId: "coordinator-run", status: "offline" }),
        expect.objectContaining({ memberAddress: "/Worker", agentRunId: "worker-run", status: "offline" }),
      ],
      rootTeam: expect.objectContaining({ team_run_id: "team-1" }),
    })]);
  });

  it("uses exact AgentRun status identity without address or display-name fallback", async () => {
    const { service } = harness({ active: true });
    const [result] = await service.listTeamRunHistory();
    expect(result?.isActive).toBe(true);
    expect(result?.members.map((member) => [member.agentRunId, member.status])).toEqual([
      ["coordinator-run", "offline"],
      ["worker-run", "running"],
    ]);
  });

  it("skips catalog rows whose strict V1 tree is missing", async () => {
    const { service } = harness({ storedTree: null });
    await expect(service.listTeamRunHistory()).resolves.toEqual([]);
  });

  it("returns exact resume identity/tree and reports missing current packages", async () => {
    await expect(harness({ active: true }).service.getTeamRunResumeConfig("team-1")).resolves.toEqual({
      teamRunId: "team-1",
      isActive: true,
      executionTree: tree,
    });
    await expect(harness({ storedTree: null }).service.getTeamRunResumeConfig("missing"))
      .rejects.toThrow("execution tree not found");
  });

  it("delegates archive and delete to the current catalog owner", async () => {
    const { service, catalog } = harness();
    await expect(service.archiveStoredTeamRun("team-1")).resolves.toMatchObject({ success: true });
    await expect(service.deleteStoredTeamRun("team-1")).resolves.toMatchObject({ success: true });
    expect(catalog.archiveTeamRun).toHaveBeenCalledWith("team-1");
    expect(catalog.deleteTeamRun).toHaveBeenCalledWith("team-1");
  });
});
