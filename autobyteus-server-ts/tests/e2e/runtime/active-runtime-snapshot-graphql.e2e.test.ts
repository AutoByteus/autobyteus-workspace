import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { getTeamMemberManager } from "../../../src/agent-team-execution/services/team-member-manager.js";
import { getTeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";

describe("Active runtime snapshot GraphQL e2e", () => {
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
    vi.restoreAllMocks();
  });

  it("excludes team-member runs from agentRuns and includes member-runtime teams in agentTeamRuns", async () => {
    const agentRunManager = AgentRunManager.getInstance();
    const agentTeamRunManager = AgentTeamRunManager.getInstance();
    const teamMemberManager = getTeamMemberManager();
    const teamRunHistoryService = getTeamRunHistoryService();

    const standaloneAgent = {
      agentId: "run-standalone-1",
      currentStatus: "ACTIVE",
      context: {
        config: { name: "Professor Agent", role: "Professor" },
        customData: { agent_definition_id: "professor-agent" },
      },
    };
    const teamMemberAgent = {
      agentId: "professor_d1b2d7525aa08a86",
      currentStatus: "ACTIVE",
      context: {
        config: { name: "Professor", role: "Professor" },
        customData: {
          agent_definition_id: "professor-agent",
          member_route_key: "professor",
          member_run_id: "professor_d1b2d7525aa08a86",
        },
      },
    };
    const nativeTeam = {
      teamId: "team-native-1",
      name: "Professor Student Team",
      role: "coordinator",
      currentStatus: "ACTIVE",
    };

    vi.spyOn(agentRunManager, "listActiveRuns").mockReturnValue([
      standaloneAgent.agentId,
      teamMemberAgent.agentId,
    ]);
    vi.spyOn(agentRunManager, "getAgentRun").mockImplementation((runId: string) => {
      if (runId === standaloneAgent.agentId) {
        return standaloneAgent as any;
      }
      if (runId === teamMemberAgent.agentId) {
        return teamMemberAgent as any;
      }
      return null;
    });

    vi.spyOn(agentTeamRunManager, "listActiveRuns").mockReturnValue([nativeTeam.teamId]);
    vi.spyOn(agentTeamRunManager, "getTeamRun").mockImplementation((teamRunId: string) => {
      if (teamRunId === nativeTeam.teamId) {
        return nativeTeam as any;
      }
      return null;
    });

    vi.spyOn(teamMemberManager, "listActiveTeamRunIds").mockReturnValue([
      "team-member-runtime-1",
    ]);
    vi.spyOn(teamRunHistoryService, "getTeamRunResumeConfig").mockResolvedValue({
      teamRunId: "team-member-runtime-1",
      isActive: true,
      metadata: {
        teamDefinitionName: "Professor Student Team",
      },
    } as any);

    const result = await graphql({
      schema,
      source: `
        query GetActiveRuntimeSnapshot {
          agentRuns {
            id
            currentStatus
          }
          agentTeamRuns {
            id
            name
            currentStatus
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect((result.data as any)?.agentRuns).toEqual([
      {
        id: "run-standalone-1",
        currentStatus: "ACTIVE",
      },
    ]);
    expect((result.data as any)?.agentTeamRuns).toEqual([
      {
        id: "team-native-1",
        name: "Professor Student Team",
        currentStatus: "ACTIVE",
      },
      {
        id: "team-member-runtime-1",
        name: "Professor Student Team",
        currentStatus: "PROCESSING",
      },
    ]);
  });
});
