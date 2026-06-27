import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";

const listWorkspaceRunHistoryMock = vi.fn();
const getWorkspaceRunHistoryMock = vi.fn();
const getRegisteredWorkspaceRootPathMock = vi.fn();

vi.mock("../../../src/run-history/services/workspace-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/workspace-run-history-service.js")
  >("../../../src/run-history/services/workspace-run-history-service.js");

  return {
    ...actual,
    getWorkspaceRunHistoryService: () => ({
      listWorkspaceRunHistory: listWorkspaceRunHistoryMock,
      getWorkspaceRunHistory: getWorkspaceRunHistoryMock,
    }),
  };
});

vi.mock("../../../src/workspaces/workspace-manager.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/workspaces/workspace-manager.js")
  >("../../../src/workspaces/workspace-manager.js");

  return {
    ...actual,
    getWorkspaceManager: () => ({
      getRegisteredWorkspaceRootPath: getRegisteredWorkspaceRootPathMock,
    }),
  };
});

import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Workspace run history GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const runGraphql = async (
    query: string,
    variables?: Record<string, unknown>,
  ) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  it("returns grouped agent and team definitions for workspace history", async () => {
    listWorkspaceRunHistoryMock.mockResolvedValue([
      {
        workspaceRootPath: "/ws/a",
        workspaceName: "workspace-a",
        agentDefinitions: [
          {
            agentDefinitionId: "agent-def-1",
            agentName: "Planner",
            runs: [
              {
                runId: "run-1",
                summary: "Plan the rollout",
                createdAt: "2026-04-12T01:00:00.000Z",
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
            teamDefinitionName: "Software Engineering Team",
            runs: [
              {
                teamRunId: "team-run-1",
                teamDefinitionId: "team-def-1",
                teamDefinitionName: "Software Engineering Team",
                coordinatorMemberRouteKey: "coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Rebuild the workspace history sidebar",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                status: "running",
                isActive: true,
                memberTree: [],
                members: [
                  {
                    memberRouteKey: "coordinator",
                    memberName: "solution_designer",
                    memberRunId: "member-run-1",
                    runtimeKind: "AUTOBYTEUS",
                    workspaceRootPath: "/ws/a",
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const query = `
      query WorkspaceRunHistory($limitPerAgent: Int!) {
        listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
          workspaceRootPath
          workspaceName
          agentDefinitions {
            agentDefinitionId
            agentName
            runs {
              runId
              summary
              createdAt
              archivedAt
              terminatedAt
              status
              isActive
              shouldConnectStream
              statusSource
            }
          }
          teamDefinitions {
            teamDefinitionId
            teamDefinitionName
            runs {
              teamRunId
              teamDefinitionId
              teamDefinitionName
              coordinatorMemberRouteKey
              workspaceRootPath
              summary
              createdAt
              archivedAt
              terminatedAt
              status
              isActive
              memberTree
              members {
                memberRouteKey
                memberName
                memberRunId
                runtimeKind
                workspaceRootPath
              }
            }
          }
        }
      }
    `;

    const result = await execGraphql<{
      listWorkspaceRunHistory: Array<Record<string, unknown>>;
    }>(query, {
      limitPerAgent: 6,
    });

    expect(listWorkspaceRunHistoryMock).toHaveBeenCalledWith(6);
    expect(result.listWorkspaceRunHistory).toEqual([
      {
        workspaceRootPath: "/ws/a",
        workspaceName: "workspace-a",
        agentDefinitions: [
          {
            agentDefinitionId: "agent-def-1",
            agentName: "Planner",
            runs: [
              {
                runId: "run-1",
                summary: "Plan the rollout",
                createdAt: "2026-04-12T01:00:00.000Z",
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
            teamDefinitionName: "Software Engineering Team",
            runs: [
              {
                teamRunId: "team-run-1",
                teamDefinitionId: "team-def-1",
                teamDefinitionName: "Software Engineering Team",
                coordinatorMemberRouteKey: "coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Rebuild the workspace history sidebar",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                status: "running",
                isActive: true,
                memberTree: [],
                members: [
                  {
                    memberRouteKey: "coordinator",
                    memberName: "solution_designer",
                    memberRunId: "member-run-1",
                    runtimeKind: "AUTOBYTEUS",
                    workspaceRootPath: "/ws/a",
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("returns scoped history for a registered workspace id", async () => {
    getRegisteredWorkspaceRootPathMock.mockResolvedValue("/ws/a");
    getWorkspaceRunHistoryMock.mockResolvedValue({
      workspaceRootPath: "/ws/a",
      workspaceName: "workspace-a",
      agentDefinitions: [
        {
          agentDefinitionId: "agent-def-1",
          agentName: "Planner",
          runs: [
            {
              runId: "run-1",
              summary: "Scoped plan",
              createdAt: "2026-04-12T01:00:00.000Z",
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
      teamDefinitions: [],
    });

    const result = await execGraphql<{
      workspaceRunHistory: {
        workspaceRootPath: string;
        workspaceName: string;
        agentDefinitions: Array<{
          agentDefinitionId: string;
          runs: Array<{ runId: string; summary: string }>;
        }>;
        teamDefinitions: unknown[];
      };
    }>(`
      query WorkspaceRunHistory($workspaceId: String!, $limitPerAgent: Int!) {
        workspaceRunHistory(workspaceId: $workspaceId, limitPerAgent: $limitPerAgent) {
          workspaceRootPath
          workspaceName
          agentDefinitions {
            agentDefinitionId
            runs {
              runId
              summary
            }
          }
          teamDefinitions {
            teamDefinitionId
          }
        }
      }
    `, {
      workspaceId: "ws-registered",
      limitPerAgent: 3,
    });

    expect(getRegisteredWorkspaceRootPathMock).toHaveBeenCalledWith("ws-registered");
    expect(getWorkspaceRunHistoryMock).toHaveBeenCalledWith("/ws/a", 3);
    expect(result.workspaceRunHistory).toEqual({
      workspaceRootPath: "/ws/a",
      workspaceName: "workspace-a",
      agentDefinitions: [
        {
          agentDefinitionId: "agent-def-1",
          runs: [
            {
              runId: "run-1",
              summary: "Scoped plan",
            },
          ],
        },
      ],
      teamDefinitions: [],
    });
  });

  it("rejects workspaceRunHistory for a missing or removed workspace id", async () => {
    getRegisteredWorkspaceRootPathMock.mockResolvedValue(null);

    const result = await runGraphql(`
      query RemovedWorkspaceHistory {
        workspaceRunHistory(workspaceId: "ws-removed", limitPerAgent: 2) {
          workspaceRootPath
        }
      }
    `);

    expect(getRegisteredWorkspaceRootPathMock).toHaveBeenCalledWith("ws-removed");
    expect(getWorkspaceRunHistoryMock).not.toHaveBeenCalled();
    expect((result.errors ?? []).map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Registered workspace 'ws-removed' was not found."),
      ]),
    );
  });

  it("does not expose the legacy flat workspace history fields", async () => {
    const result = await runGraphql(`
      query LegacyWorkspaceRunHistory {
        listWorkspaceRunHistory(limitPerAgent: 2) {
          workspaceRootPath
          agents {
            agentDefinitionId
          }
          teamRuns {
            teamRunId
          }
        }
      }
    `);

    const messages = (result.errors ?? []).map((error) => error.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cannot query field "agents"'),
        expect.stringContaining('Cannot query field "teamRuns"'),
      ]),
    );
  });

  it("rejects removed persisted status/activity fields while team stable fields remain queryable", async () => {
    listWorkspaceRunHistoryMock.mockResolvedValue([]);

    const removedStandaloneFieldResult = await runGraphql(`
      query RemovedStandaloneFields {
        listWorkspaceRunHistory(limitPerAgent: 2) {
          agentDefinitions {
            runs {
              runId
              lastActivityAt
              lastKnownStatus
            }
          }
        }
      }
    `);

    const removedStandaloneMessages = (removedStandaloneFieldResult.errors ?? []).map(
      (error) => error.message,
    );
    expect(removedStandaloneMessages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cannot query field "lastActivityAt"'),
        expect.stringContaining('Cannot query field "lastKnownStatus"'),
      ]),
    );

    const removedTeamFieldResult = await runGraphql(`
      query RemovedTeamFields {
        listWorkspaceRunHistory(limitPerAgent: 2) {
          teamDefinitions {
            runs {
              teamRunId
              lastActivityAt
              lastKnownStatus
              deleteLifecycle
            }
          }
        }
      }
    `);

    const removedTeamMessages = (removedTeamFieldResult.errors ?? []).map(
      (error) => error.message,
    );
    expect(removedTeamMessages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cannot query field "lastActivityAt"'),
        expect.stringContaining('Cannot query field "lastKnownStatus"'),
        expect.stringContaining('Cannot query field "deleteLifecycle"'),
      ]),
    );

    listWorkspaceRunHistoryMock.mockResolvedValue([
      {
        workspaceRootPath: "/ws/a",
        workspaceName: "workspace-a",
        agentDefinitions: [],
        teamDefinitions: [
          {
            teamDefinitionId: "team-def-1",
            teamDefinitionName: "Software Engineering Team",
            runs: [
              {
                teamRunId: "team-run-1",
                teamDefinitionId: "team-def-1",
                teamDefinitionName: "Software Engineering Team",
                coordinatorMemberRouteKey: "coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Team fields are intentionally retained",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                status: "running",
                isActive: true,
                memberTree: [],
                members: [],
              },
            ],
          },
        ],
      },
    ]);

    const teamFieldResult = await execGraphql<{
      listWorkspaceRunHistory: Array<{
        teamDefinitions: Array<{
          runs: Array<{
            createdAt: string;
            status: string;
          }>;
        }>;
      }>;
    }>(`
      query TeamStableFieldsRemain {
        listWorkspaceRunHistory(limitPerAgent: 2) {
          teamDefinitions {
            runs {
              teamRunId
              createdAt
              status
            }
          }
        }
      }
    `);

    expect(teamFieldResult.listWorkspaceRunHistory[0]?.teamDefinitions[0]?.runs[0]).toEqual(
      expect.objectContaining({
        createdAt: "2026-04-12T01:05:00.000Z",
        status: "running",
      }),
    );
  });
});
