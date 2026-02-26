import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

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
});
