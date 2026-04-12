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
                  lastActivityAt: "2026-03-26T10:00:00.000Z",
                  lastKnownStatus: "IDLE",
                  isActive: false,
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
          lastActivityAt: "2026-03-26T11:00:00.000Z",
          lastKnownStatus: "ACTIVE",
          deleteLifecycle: "READY",
          isActive: true,
          members: [],
        },
      ]),
    } as any;

    const service = new WorkspaceRunHistoryService({
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
                lastActivityAt: "2026-03-26T10:00:00.000Z",
                lastKnownStatus: "IDLE",
                isActive: false,
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
              }),
            ],
          },
        ],
      },
    ]);
  });

  it("creates an unassigned workspace bucket for team runs without workspace root path", async () => {
    const service = new WorkspaceRunHistoryService({
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
            lastActivityAt: "2026-03-26T12:00:00.000Z",
            lastKnownStatus: "IDLE",
            deleteLifecycle: "READY",
            isActive: false,
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
});
