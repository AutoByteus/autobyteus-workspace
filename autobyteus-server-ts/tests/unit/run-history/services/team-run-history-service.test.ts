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
    getCatalogRow: vi.fn(async (teamRunId: string) => teamRunId === row.teamRunId ? row : null),
    archiveTeamRun: vi.fn(async () => ({ success: true, message: "archived" })),
    deleteTeamRun: vi.fn(async () => ({ success: true, message: "deleted" })),
  };
  const treeStore = { read: vi.fn(async () => input.storedTree === undefined ? tree : input.storedTree) };
  const livePosition = vi.fn(() => ({ liveSequenceId: "live-team-1", changeSequence: 12, lastMessageChangeSequence: 9 }));
  const manager = {
    hasManagedTeamRun: vi.fn(() => Boolean(input.active)), closedTaskExecutionsFor: vi.fn(() => []),
    getManagedTeamRun: vi.fn(() => input.active ? { getLivePosition: livePosition } : null),
  };
  const live = { getCatalogListLiveProjection: vi.fn(() => ({
    isActive: input.active ?? false,
    memberStatusSnapshots: input.active ? [{ agentRunId: "worker-run", status: "running" }] : [],
  })) };
  const adHocTasks = { deleteAdHocTasksHostedBy: vi.fn(async () => undefined) };
  return {
    catalog,
    treeStore,
    manager,
    live,
    adHocTasks,
    service: new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalog as never,
      executionTreeStore: treeStore as never,
      teamRunManager: manager as never,
      liveProjectionService: live as never,
      adHocTasks,
    }),
  };
};

describe("TeamRunHistoryService current execution tree", () => {
  it("projects history from the derived catalog plus exact current V2 execution tree", async () => {
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

  it("carries each Team run's last activity from the reader (workspace-tree-vs-chooser DS-005)", async () => {
    const forTeamRun = vi.fn(async () => "2026-11-05T09:30:00.000Z");
    const { catalog, treeStore, manager, live } = harness();
    const service = new TeamRunHistoryService("/tmp/memory", {
      catalogService: catalog as never,
      executionTreeStore: treeStore as never,
      teamRunManager: manager as never,
      liveProjectionService: live as never,
      lastActivity: { forTeamRun },
    });
    const [item] = await service.listTeamRunHistory();
    expect(item?.lastActivityAt).toBe("2026-11-05T09:30:00.000Z");
    expect(forTeamRun).toHaveBeenCalledWith({ teamRunId: "team-1", createdAt: item?.createdAt });
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

  it("skips catalog rows whose strict current V2 tree is missing", async () => {
    const { service } = harness({ storedTree: null });
    await expect(service.listTeamRunHistory()).resolves.toEqual([]);
  });

  it("returns exact resume identity/tree and reports missing current packages", async () => {
    const active = harness({ active: true });
    // The stored closure read goes through the root-kind manager, against the same stored tree.
    active.manager.closedTaskExecutionsFor.mockReturnValue([{ agentRunId: "worker-run" }] as never);
    await expect(active.service.getTeamRunResumeConfig("team-1")).resolves.toEqual({
      teamRunId: "team-1",
      isActive: true,
      executionTree: tree,
      closedTaskExecutions: [{ agentRunId: "worker-run" }],
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
      // The running Team's live sequence and change sequence, as its stream snapshot names them (autobyteus-358).
      liveSequenceId: "live-team-1",
      baseChangeSequence: 12,
      lastMessageChangeSequence: 9,
    });
    expect(active.manager.closedTaskExecutionsFor).toHaveBeenCalledWith("team-1", tree);
    await expect(harness({ active: false }).service.getTeamRunResumeConfig("team-1"))
      .resolves.toMatchObject({ isActive: false, liveSequenceId: null, baseChangeSequence: 0, lastMessageChangeSequence: null });
    await expect(harness({ storedTree: null }).service.getTeamRunResumeConfig("missing"))
      .rejects.toThrow("execution tree not found");
  });

  it("delegates archive and delete to the current catalog owner; a committed delete removes the run's ad-hoc Tasks", async () => {
    const { service, catalog, adHocTasks } = harness();
    await expect(service.archiveStoredTeamRun("team-1")).resolves.toMatchObject({ success: true });
    expect(adHocTasks.deleteAdHocTasksHostedBy).not.toHaveBeenCalled();
    await expect(service.deleteStoredTeamRun("team-1")).resolves.toMatchObject({ success: true });
    expect(catalog.archiveTeamRun).toHaveBeenCalledWith("team-1");
    expect(catalog.deleteTeamRun).toHaveBeenCalledWith("team-1");
    expect(adHocTasks.deleteAdHocTasksHostedBy).toHaveBeenCalledExactlyOnceWith({ rootSubjectKind: "agent_team", rootRunId: "team-1" });
  });

  it("a refused delete keeps the run's ad-hoc Tasks", async () => {
    const { service, catalog, adHocTasks } = harness();
    catalog.deleteTeamRun.mockResolvedValueOnce({ success: false, message: "Team run is active." });
    await expect(service.deleteStoredTeamRun("team-1")).resolves.toEqual({ success: false, message: "Team run is active." });
    expect(adHocTasks.deleteAdHocTasksHostedBy).not.toHaveBeenCalled();
  });
});
