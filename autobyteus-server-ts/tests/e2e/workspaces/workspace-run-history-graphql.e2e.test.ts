import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";

const listWorkspaceRunHistoryMock = vi.fn();
const getWorkspaceRunHistoryMock = vi.fn();
const getWorkspaceRootPathForHistoryMock = vi.fn();

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
      getWorkspaceRootPathForHistory: getWorkspaceRootPathForHistoryMock,
    }),
  };
});

import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";

describe("Workspace run history GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let closeStudioServices: (() => void) | null = null;

  beforeAll(async () => {
    closeStudioServices = configureE2eStudioApplicationApiServices().close;
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(() => closeStudioServices?.());

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
                coordinatorAddress: "/coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Rebuild the workspace history sidebar",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                isActive: true,
                members: [
                  {
                    memberAddress: "/coordinator",
                    displayName: "solution_designer",
                    agentRunId: "member-run-1",
                    status: "idle",
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
              coordinatorAddress
              workspaceRootPath
              summary
              createdAt
              archivedAt
              terminatedAt
              isActive
              members {
                memberAddress
                displayName
                agentRunId
                status
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
                coordinatorAddress: "/coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Rebuild the workspace history sidebar",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                isActive: true,
                members: [
                  {
                    memberAddress: "/coordinator",
                    displayName: "solution_designer",
                    agentRunId: "member-run-1",
                    status: "idle",
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
    getWorkspaceRootPathForHistoryMock.mockResolvedValue("/ws/a");
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

    expect(getWorkspaceRootPathForHistoryMock).toHaveBeenCalledWith("ws-registered");
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

  it("returns scoped history for the default temp workspace id", async () => {
    getWorkspaceRootPathForHistoryMock.mockResolvedValue("/tmp/autobyteus-temp");
    getWorkspaceRunHistoryMock.mockResolvedValue({
      workspaceRootPath: "/tmp/autobyteus-temp",
      workspaceName: "Temp Workspace",
      agentDefinitions: [],
      teamDefinitions: [],
    });

    const result = await execGraphql<{
      workspaceRunHistory: {
        workspaceRootPath: string;
        workspaceName: string;
      };
    }>(`
      query WorkspaceRunHistory($workspaceId: String!, $limitPerAgent: Int!) {
        workspaceRunHistory(workspaceId: $workspaceId, limitPerAgent: $limitPerAgent) {
          workspaceRootPath
          workspaceName
        }
      }
    `, {
      workspaceId: "temp_ws_default",
      limitPerAgent: 6,
    });

    expect(getWorkspaceRootPathForHistoryMock).toHaveBeenCalledWith("temp_ws_default");
    expect(getWorkspaceRunHistoryMock).toHaveBeenCalledWith("/tmp/autobyteus-temp", 6);
    expect(result.workspaceRunHistory).toEqual({
      workspaceRootPath: "/tmp/autobyteus-temp",
      workspaceName: "Temp Workspace",
    });
  });

  it("rejects workspaceRunHistory for a missing or removed workspace id", async () => {
    getWorkspaceRootPathForHistoryMock.mockResolvedValue(null);

    const result = await runGraphql(`
      query RemovedWorkspaceHistory {
        workspaceRunHistory(workspaceId: "ws-removed", limitPerAgent: 2) {
          workspaceRootPath
        }
      }
    `);

    expect(getWorkspaceRootPathForHistoryMock).toHaveBeenCalledWith("ws-removed");
    expect(getWorkspaceRunHistoryMock).not.toHaveBeenCalled();
    expect((result.errors ?? []).map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Workspace 'ws-removed' was not found or is not visible for run history."),
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
              status
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
        expect.stringContaining('Cannot query field "status"'),
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
                coordinatorAddress: "/coordinator",
                workspaceRootPath: "/ws/a",
                summary: "Team fields are intentionally retained",
                createdAt: "2026-04-12T01:05:00.000Z",
                archivedAt: null,
                terminatedAt: null,
                isActive: true,
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
            isActive: boolean;
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
              isActive
            }
          }
        }
      }
    `);

    expect(teamFieldResult.listWorkspaceRunHistory[0]?.teamDefinitions[0]?.runs[0]).toEqual(
      expect.objectContaining({
        createdAt: "2026-04-12T01:05:00.000Z",
        isActive: true,
      }),
    );
  });
});
