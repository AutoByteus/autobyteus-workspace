import { noDelegations } from "../../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/run-history/services/agent-run-history-service.js", () => ({
  getAgentRunHistoryService: vi.fn(() => {
    throw new Error("getAgentRunHistoryService should not be used in this unit test");
  }),
}));

vi.mock("../../../../src/run-history/services/team-run-history-service.js", () => ({
  getTeamRunHistoryService: vi.fn(() => {
    throw new Error("getTeamRunHistoryService should not be used in this unit test");
  }),
}));

import { WorkspaceRunHistoryService } from "../../../../src/run-history/services/workspace-run-history-service.js";
import { NO_CLOSED_DELEGATIONS } from "../../../../src/remote-collaboration/inbound/closed-delegations.js";

describe("WorkspaceRunHistoryService", () => {
  it("returns one workspace-grouped payload containing grouped agent and team definitions", async () => {
    const agentRunHistoryService = {
      listRunHistory: vi.fn(async () => [
        {
          workspaceRootPath: "/ws/a",
          workspaceName: "a",
          agents: [
            {
              agentDefinitionId: "agent-def-1",
              agentName: "Planner",
              runs: [
                {
                  runId: "run-1",
                  summary: "hello",
                  createdAt: "2026-03-26T10:00:00.000Z",
                  archivedAt: null,
                  terminatedAt: null,
                  status: "offline",
                  isActive: false,
                  shouldConnectStream: false,
                  statusSource: "INACTIVE",
                },
              ],
            },
          ],
        },
      ]),
    } as any;

    const teamRunHistoryService = {
      listTeamRunHistory: vi.fn(async () => [
        {
          teamRunId: "team-1",
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team Alpha",
          coordinatorMemberRouteKey: "coordinator",
          workspaceRootPath: "/ws/a",
          summary: "team summary",
          createdAt: "2026-03-26T11:00:00.000Z",
          archivedAt: null,
          terminatedAt: null,
          status: "running",
          isActive: true,
          memberTree: [],
          members: [],
        },
      ]),
    } as any;

    const service = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: NO_CLOSED_DELEGATIONS,
      agentRunHistoryService,
      teamRunHistoryService,
    });

    const result = await service.listWorkspaceRunHistory(6);

    expect(result).toEqual([
      {
        workspaceRootPath: "/ws/a",
        workspaceName: "a",
        agentDefinitions: [
          {
            agentDefinitionId: "agent-def-1",
            agentName: "Planner",
            runs: [
              {
                runId: "run-1",
                summary: "hello",
                createdAt: "2026-03-26T10:00:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                status: "offline",
                isActive: false,
                shouldConnectStream: false,
                statusSource: "INACTIVE",
              },
            ],
          },
        ],
        teamDefinitions: [
          {
            teamDefinitionId: "team-def-1",
            teamDefinitionName: "Team Alpha",
            runs: [
              expect.objectContaining({
                teamRunId: "team-1",
                teamDefinitionName: "Team Alpha",
                coordinatorMemberRouteKey: "coordinator",
                createdAt: "2026-03-26T11:00:00.000Z",
                status: "running",
              }),
            ],
          },
        ],
      },
    ]);
  });

  it("autobyteus-591 DN-6: leaves out a peer-started run its delegating node closed, agent or team, by the record in memory", async () => {
    const agentRun = (runId: string) => ({ runId, summary: runId, createdAt: "2026-03-26T10:00:00.000Z", archivedAt: null, terminatedAt: null,
      status: "offline", isActive: false, shouldConnectStream: false, statusSource: "INACTIVE" });
    const listRunHistory = vi.fn(async (_limit: number | null, listed: (row: { runId: string }) => boolean) => [{ workspaceRootPath: "/ws/a", workspaceName: "a",
      agents: [{ agentDefinitionId: "publisher", agentName: "Publisher", runs: ["publisher_r1", "publisher_r2"].filter((runId) => listed({ runId })).map(agentRun) }] }]);
    const listTeamRunHistory = vi.fn(async (listed: (row: { teamRunId: string }) => boolean) => ["studio_team_b", "studio_team_c"].filter((teamRunId) => listed({ teamRunId }))
      .map((teamRunId) => ({ teamRunId, teamDefinitionId: "studio", teamDefinitionName: "Studio", coordinatorMemberRouteKey: "lead", workspaceRootPath: "/ws/a",
        summary: "", createdAt: "2026-03-26T11:00:00.000Z", archivedAt: null, terminatedAt: null, status: "offline", isActive: false, memberTree: [], members: [] })));
    const closed = new Set(["agent:publisher_r1", "agent_team:studio_team_b"]);
    const service = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: { has: (run) => closed.has(`${run.kind}:${run.runId}`) },
      agentRunHistoryService: { listRunHistory } as any, teamRunHistoryService: { listTeamRunHistory } as any });
    const [group] = await service.listWorkspaceRunHistory(6);
    expect(group!.agentDefinitions[0]!.runs.map((run) => run.runId)).toEqual(["publisher_r2"]);
    expect(group!.teamDefinitions[0]!.runs.map((run) => run.teamRunId)).toEqual(["studio_team_c"]);
    // The phone's folder read is the same rule.
    const folder = await service.getWorkspaceRunHistory("/ws/a", 6);
    expect(folder.agentDefinitions[0]!.runs.map((run) => run.runId)).toEqual(["publisher_r2"]);
    // Opened again (a follow-up Task): listed again on the next read.
    closed.clear();
    const [again] = await service.listWorkspaceRunHistory(6);
    expect(again!.agentDefinitions[0]!.runs).toHaveLength(2);
  });

  it("creates an unassigned workspace bucket for team runs without workspace root path", async () => {
    const service = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: NO_CLOSED_DELEGATIONS,
      agentRunHistoryService: {
        listRunHistory: vi.fn(async () => []),
      } as any,
      teamRunHistoryService: {
        listTeamRunHistory: vi.fn(async () => [
          {
            teamRunId: "team-unassigned",
            teamDefinitionId: "team-def-2",
            teamDefinitionName: "Unassigned Team",
            coordinatorMemberRouteKey: "lead",
            workspaceRootPath: null,
            summary: "summary",
            createdAt: "2026-03-26T12:00:00.000Z",
            archivedAt: null,
            terminatedAt: null,
            status: "offline",
            isActive: false,
            memberTree: [],
            members: [],
          },
        ]),
      } as any,
    });

    const result = await service.listWorkspaceRunHistory();

    expect(result).toEqual([
      expect.objectContaining({
        workspaceRootPath: "unassigned-team-workspace",
        workspaceName: "Unassigned Team Workspace",
        teamDefinitions: [
          expect.objectContaining({
            teamDefinitionId: "team-def-2",
            teamDefinitionName: "Unassigned Team",
          }),
        ],
      }),
    ]);
  });

  it("returns only the requested canonical workspace history group", async () => {
    const agentRunHistoryService = {
      listRunHistory: vi.fn(async () => [
        {
          workspaceRootPath: "/ws/a/.",
          workspaceName: "Workspace A",
          agents: [
            {
              agentDefinitionId: "agent-a",
              agentName: "Agent A",
              runs: [
                {
                  runId: "run-a",
                  summary: "scoped agent",
                  createdAt: "2026-03-26T10:00:00.000Z",
                  archivedAt: null,
                  terminatedAt: null,
                  status: "offline",
                  isActive: false,
                  shouldConnectStream: false,
                  statusSource: "INACTIVE",
                },
              ],
            },
          ],
        },
        {
          workspaceRootPath: "/ws/b",
          workspaceName: "Workspace B",
          agents: [
            {
              agentDefinitionId: "agent-b",
              agentName: "Agent B",
              runs: [
                {
                  runId: "run-b",
                  summary: "other workspace",
                  createdAt: "2026-03-26T10:30:00.000Z",
                  archivedAt: null,
                  terminatedAt: null,
                  status: "offline",
                  isActive: false,
                  shouldConnectStream: false,
                  statusSource: "INACTIVE",
                },
              ],
            },
          ],
        },
      ]),
    } as any;
    const teamRunHistoryService = {
      listTeamRunHistory: vi.fn(async () => [
        {
          teamRunId: "team-a",
          teamDefinitionId: "team-def-a",
          teamDefinitionName: "Team A",
          coordinatorMemberRouteKey: "coordinator",
          workspaceRootPath: "/ws/a",
          summary: "scoped team",
          createdAt: "2026-03-26T11:00:00.000Z",
          archivedAt: null,
          terminatedAt: null,
          status: "offline",
          isActive: false,
          memberTree: [],
          members: [],
        },
        {
          teamRunId: "team-b",
          teamDefinitionId: "team-def-b",
          teamDefinitionName: "Team B",
          coordinatorMemberRouteKey: "coordinator",
          workspaceRootPath: "/ws/b",
          summary: "other team",
          createdAt: "2026-03-26T11:30:00.000Z",
          archivedAt: null,
          terminatedAt: null,
          status: "offline",
          isActive: false,
          memberTree: [],
          members: [],
        },
      ]),
    } as any;
    const service = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: NO_CLOSED_DELEGATIONS,
      agentRunHistoryService,
      teamRunHistoryService,
    });

    const result = await service.getWorkspaceRunHistory("/ws/a");

    expect(agentRunHistoryService.listRunHistory).toHaveBeenCalledWith(6, expect.any(Function));
    expect(result).toMatchObject({
      workspaceRootPath: "/ws/a",
      workspaceName: "Workspace A",
      agentDefinitions: [
        expect.objectContaining({
          agentDefinitionId: "agent-a",
          runs: [expect.objectContaining({ runId: "run-a" })],
        }),
      ],
      teamDefinitions: [
        expect.objectContaining({
          teamDefinitionId: "team-def-a",
          runs: [expect.objectContaining({ teamRunId: "team-a" })],
        }),
      ],
    });
    expect(JSON.stringify(result)).not.toContain("run-b");
    expect(JSON.stringify(result)).not.toContain("team-b");
  });

  it("returns an empty scoped history group for a registered workspace with no history", async () => {
    const service = new WorkspaceRunHistoryService({ tree: noDelegations(), closedDelegations: NO_CLOSED_DELEGATIONS,
      agentRunHistoryService: {
        listRunHistory: vi.fn(async () => []),
      } as any,
      teamRunHistoryService: {
        listTeamRunHistory: vi.fn(async () => []),
      } as any,
    });

    const result = await service.getWorkspaceRunHistory("/ws/empty", 2);

    expect(result).toEqual({
      workspaceRootPath: "/ws/empty",
      workspaceName: "empty",
      agentDefinitions: [],
      teamDefinitions: [],
    });
  });
});
