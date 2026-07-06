import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Skill access mode GraphQL API e2e", () => {
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

  const execute = async (source: string, variableValues?: Record<string, unknown>) =>
    graphql({
      schema,
      source,
      variableValues,
    });

  const expectLegacyModeRejected = async (input: {
    source: string;
    variableValues: Record<string, unknown>;
    enumName: string;
  }): Promise<void> => {
    const result = await execute(input.source, input.variableValues);
    expect(result.errors?.length).toBeGreaterThan(0);
    const messages = result.errors?.map((error) => error.message).join("\n") ?? "";
    expect(messages).toContain("GLOBAL_DISCOVERY");
    expect(messages).toContain(input.enumName);
    expect(result.data).toBeUndefined();
  };

  it("exposes only configured-only and no-skill enum values", async () => {
    const result = await execute(`
      query SkillAccessModeEnums {
        skillAccessMode: __type(name: "SkillAccessModeEnum") {
          enumValues { name }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const data = result.data as {
      skillAccessMode: { enumValues: Array<{ name: string }> };
    };
    expect(data.skillAccessMode.enumValues.map((value) => value.name).sort()).toEqual([
      "NONE",
      "PRELOADED_ONLY",
    ]);
  });

  it("rejects legacy GLOBAL_DISCOVERY single-agent run inputs", async () => {
    await expectLegacyModeRejected({
      enumName: "SkillAccessModeEnum",
      source: `
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) {
            success
            message
            runId
          }
        }
      `,
      variableValues: {
        input: {
          agentDefinitionId: "agent-definition-id",
          workspaceRootPath: "/tmp/autobyteus-global-discovery-rejection-agent",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          llmConfig: null,
          skillAccessMode: "GLOBAL_DISCOVERY",
          runtimeKind: "autobyteus",
        },
      },
    });
  });

  it("rejects legacy GLOBAL_DISCOVERY team member run inputs", async () => {
    await expectLegacyModeRejected({
      enumName: "SkillAccessModeEnum",
      source: `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }
      `,
      variableValues: {
        input: {
          teamDefinitionId: "team-definition-id",
          memberConfigs: [
            {
              memberName: "lead",
              agentDefinitionId: "agent-definition-id",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: false,
              skillAccessMode: "GLOBAL_DISCOVERY",
              workspaceRootPath: "/tmp/autobyteus-global-discovery-rejection-team",
              llmConfig: null,
              runtimeKind: "autobyteus",
            },
          ],
        },
      },
    });
  });

  it("rejects legacy GLOBAL_DISCOVERY external-channel agent launch preset inputs", async () => {
    await expectLegacyModeRejected({
      enumName: "SkillAccessModeEnum",
      source: `
        mutation UpsertExternalChannelBinding($input: UpsertExternalChannelBindingInput!) {
          upsertExternalChannelBinding(input: $input) {
            id
          }
        }
      `,
      variableValues: {
        input: {
          provider: "TELEGRAM",
          transport: "BOT_API",
          accountId: "telegram-account",
          peerId: "telegram-peer",
          targetType: "AGENT",
          targetAgentDefinitionId: "agent-definition-id",
          launchPreset: {
            workspaceRootPath: "/tmp/autobyteus-global-discovery-rejection-channel-agent",
            llmModelIdentifier: "gpt-test",
            runtimeKind: "AUTOBYTEUS",
            autoExecuteTools: false,
            skillAccessMode: "GLOBAL_DISCOVERY",
            llmConfig: null,
          },
        },
      },
    });
  });

  it("rejects legacy GLOBAL_DISCOVERY external-channel team launch preset inputs", async () => {
    await expectLegacyModeRejected({
      enumName: "SkillAccessModeEnum",
      source: `
        mutation UpsertExternalChannelBinding($input: UpsertExternalChannelBindingInput!) {
          upsertExternalChannelBinding(input: $input) {
            id
          }
        }
      `,
      variableValues: {
        input: {
          provider: "TELEGRAM",
          transport: "BOT_API",
          accountId: "telegram-account",
          peerId: "telegram-peer",
          targetType: "TEAM",
          targetTeamDefinitionId: "team-definition-id",
          teamLaunchPreset: {
            workspaceRootPath: "/tmp/autobyteus-global-discovery-rejection-channel-team",
            llmModelIdentifier: "gpt-test",
            runtimeKind: "AUTOBYTEUS",
            autoExecuteTools: false,
            skillAccessMode: "GLOBAL_DISCOVERY",
            llmConfig: null,
          },
        },
      },
    });
  });
});
