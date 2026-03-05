import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  getTeamMemberRuntimeOrchestrator,
  TeamRuntimeRoutingError,
} from "../../../src/agent-team-execution/services/team-member-runtime-orchestrator.js";

describe("SendMessageToTeam GraphQL contract e2e", () => {
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

  it("keeps backward-compatible send input fields for team messaging", async () => {
    const result = await graphql({
      schema,
      source: `
        query InputFieldIntrospection {
          sendMessage: __type(name: "SendMessageToTeamInput") {
            inputFields {
              name
            }
          }
          memberConfig: __type(name: "TeamMemberConfigInput") {
            inputFields {
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();

    const sendInputFields = (result.data as any)?.sendMessage?.inputFields?.map((field: any) => field.name) ?? [];
    const memberConfigFields =
      (result.data as any)?.memberConfig?.inputFields?.map((field: any) => field.name) ?? [];

    expect(sendInputFields).toContain("targetMemberName");
    expect(sendInputFields).toContain("targetNodeName");
    expect(memberConfigFields).toContain("workspaceRootPath");
  });

  it("accepts targetMemberName and workspaceRootPath payload without GraphQL validation failure", async () => {
    const result = await graphql({
      schema,
      source: `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `,
      variableValues: {
        input: {
          userInput: {
            content: "hello",
            contextFiles: [],
          },
          teamRunId: "missing-team-id",
          targetMemberName: "super_agent",
          memberConfigs: [
            {
              memberName: "super_agent",
              agentDefinitionId: "1",
              llmModelIdentifier: "dummy-model",
              autoExecuteTools: false,
              workspaceId: null,
              workspaceRootPath: "/tmp/test-workspace",
            },
          ],
        },
      },
    });

    expect(result.errors).toBeUndefined();
    expect((result.data as any)?.sendMessageToTeam?.success).toBe(false);
    expect((result.data as any)?.sendMessageToTeam?.message).toContain("not found");
  });

  it("surfaces deterministic codex-member routing errors through GraphQL response payload", async () => {
    const orchestrator = getTeamMemberRuntimeOrchestrator();
    vi.spyOn(orchestrator, "getTeamRuntimeMode").mockReturnValue("external_member_runtime");
    vi.spyOn(orchestrator, "sendToMember").mockRejectedValue(
      new TeamRuntimeRoutingError({
        code: "TARGET_MEMBER_NOT_FOUND",
        message: "Target member 'ghost_agent' is not part of this team run.",
      }),
    );

    const result = await graphql({
      schema,
      source: `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `,
      variableValues: {
        input: {
          userInput: {
            content: "hello",
            contextFiles: [],
          },
          teamRunId: "team-codex-routing-test",
          targetMemberName: "ghost_agent",
          memberConfigs: [
            {
              memberName: "ghost_agent",
              agentDefinitionId: "agent-ghost",
              llmModelIdentifier: "dummy-model",
              autoExecuteTools: false,
            },
          ],
        },
      },
    });

    expect(result.errors).toBeUndefined();
    expect((result.data as any)?.sendMessageToTeam?.success).toBe(false);
    expect((result.data as any)?.sendMessageToTeam?.message).toContain(
      "[TARGET_MEMBER_NOT_FOUND]",
    );
  });
});
