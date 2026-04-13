import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";

const listWorkspaceRunHistoryMock = vi.fn();

vi.mock("../../../src/run-history/services/workspace-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/workspace-run-history-service.js")
  >("../../../src/run-history/services/workspace-run-history-service.js");

  return {
    ...actual,
    getWorkspaceRunHistoryService: () => ({
      listWorkspaceRunHistory: listWorkspaceRunHistoryMock,
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
                lastActivityAt: "2026-04-12T01:00:00.000Z",
                lastKnownStatus: "IDLE",
                isActive: false,
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
                lastActivityAt: "2026-04-12T01:05:00.000Z",
                lastKnownStatus: "ACTIVE",
                deleteLifecycle: "READY",
                isActive: true,
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
              lastActivityAt
              lastKnownStatus
              isActive
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
              lastActivityAt
              lastKnownStatus
              deleteLifecycle
              isActive
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
                lastActivityAt: "2026-04-12T01:00:00.000Z",
                lastKnownStatus: "IDLE",
                isActive: false,
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
                lastActivityAt: "2026-04-12T01:05:00.000Z",
                lastKnownStatus: "ACTIVE",
                deleteLifecycle: "READY",
                isActive: true,
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
});
