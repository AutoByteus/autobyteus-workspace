import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

const createAgentDefinitionMutation = `
  mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) {
      id
      name
    }
  }
`;

const createAgentTeamDefinitionMutation = `
  mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
    createAgentTeamDefinition(input: $input) {
      id
      name
    }
  }
`;

const launchPresetFixture = {
  workspaceRootPath: "/tmp/autobyteus-external-channel-workspace",
  llmModelIdentifier: "gpt-test",
  runtimeKind: "AUTOBYTEUS",
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  llmConfig: null,
};

const teamLaunchPresetFixture = {
  workspaceRootPath: launchPresetFixture.workspaceRootPath,
  llmModelIdentifier: launchPresetFixture.llmModelIdentifier,
  runtimeKind: launchPresetFixture.runtimeKind,
  autoExecuteTools: launchPresetFixture.autoExecuteTools,
  skillAccessMode: launchPresetFixture.skillAccessMode,
  llmConfig: launchPresetFixture.llmConfig,
};

describe("External channel setup GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const generatedBindingFilePath = path.join(
    process.cwd(),
    "external-channel",
    "bindings.json",
  );

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await rm(generatedBindingFilePath, { force: true });
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

  const createAgentDefinition = async (): Promise<string> => {
    const data = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(createAgentDefinitionMutation, {
      input: {
        name: unique("external-channel-agent"),
        role: "assistant",
        description: "Agent definition for external channel setup e2e",
        category: "software-engineering",
        instructions: "You are an external channel setup validation agent.",
        toolNames: [],
        skillNames: [],
      },
    });
    return data.createAgentDefinition.id;
  };

  const createTeamDefinition = async (): Promise<{
    teamDefinitionId: string;
    teamDefinitionName: string;
  }> => {
    const coordinatorAgentDefinitionId = await createAgentDefinition();
    const teamDefinitionName = unique("Telegram Team");
    const data = await execGraphql<{
      createAgentTeamDefinition: { id: string; name: string };
    }>(createAgentTeamDefinitionMutation, {
      input: {
        name: teamDefinitionName,
        description: "Team definition for external channel setup e2e",
        instructions: "Coordinate the team and deliver a single response.",
        coordinatorMemberName: "coordinator",
        nodes: [
          {
            memberName: "coordinator",
            ref: coordinatorAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });
    return {
      teamDefinitionId: data.createAgentTeamDefinition.id,
      teamDefinitionName: data.createAgentTeamDefinition.name,
    };
  };

  it("exposes setup capability query", async () => {
    const query = `
      query Capabilities {
        externalChannelCapabilities {
          bindingCrudEnabled
          reason
          acceptedProviderTransportPairs
        }
      }
    `;

    const data = await execGraphql<{
      externalChannelCapabilities: {
        bindingCrudEnabled: boolean;
        reason: string | null;
        acceptedProviderTransportPairs: string[];
      };
    }>(query);

    expect(data.externalChannelCapabilities.bindingCrudEnabled).toBe(true);
    expect(data.externalChannelCapabilities.reason).toBeNull();
    expect(data.externalChannelCapabilities.acceptedProviderTransportPairs).toEqual([
      "DISCORD:BUSINESS_API",
      "TELEGRAM:BUSINESS_API",
      "WHATSAPP:BUSINESS_API",
      "WHATSAPP:PERSONAL_SESSION",
      "WECOM:BUSINESS_API",
      "WECHAT:PERSONAL_SESSION",
    ]);
  });

  it("supports upsert/list/delete binding setup lifecycle with targetAgentDefinitionId and launchPreset", async () => {
    const agentDefinitionId = await createAgentDefinition();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
          provider
          transport
          accountId
          peerId
          threadId
          targetType
          targetAgentDefinitionId
          launchPreset {
            workspaceRootPath
            llmModelIdentifier
            runtimeKind
            autoExecuteTools
            skillAccessMode
          }
        }
      }
    `;

    const upsertData = await execGraphql<{
      upsertExternalChannelBinding: {
        id: string;
        accountId: string;
        peerId: string;
        targetType: string;
        targetAgentDefinitionId: string;
        launchPreset: {
          workspaceRootPath: string;
          llmModelIdentifier: string;
          runtimeKind: string;
          autoExecuteTools: boolean;
          skillAccessMode: string;
        };
      };
    }>(upsertMutation, {
      input: {
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId,
        peerId,
        threadId: null,
        targetType: "AGENT",
        targetAgentDefinitionId: agentDefinitionId,
        launchPreset: launchPresetFixture,
      },
    });

    expect(upsertData.upsertExternalChannelBinding.accountId).toBe(accountId);
    expect(upsertData.upsertExternalChannelBinding.peerId).toBe(peerId);
    expect(upsertData.upsertExternalChannelBinding.targetType).toBe("AGENT");
    expect(upsertData.upsertExternalChannelBinding.targetAgentDefinitionId).toBe(agentDefinitionId);
    expect(upsertData.upsertExternalChannelBinding.launchPreset).toMatchObject({
      workspaceRootPath: launchPresetFixture.workspaceRootPath,
      llmModelIdentifier: launchPresetFixture.llmModelIdentifier,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      autoExecuteTools: launchPresetFixture.autoExecuteTools,
      skillAccessMode: launchPresetFixture.skillAccessMode,
    });

    const bindingId = upsertData.upsertExternalChannelBinding.id;

    const listQuery = `
      query ListBindings {
        externalChannelBindings {
          id
          accountId
          peerId
          targetType
          targetAgentDefinitionId
          launchPreset {
            workspaceRootPath
            llmModelIdentifier
            runtimeKind
          }
        }
      }
    `;

    const listed = await execGraphql<{
      externalChannelBindings: Array<{
        id: string;
        accountId: string;
        peerId: string;
        targetType: string;
        targetAgentDefinitionId: string;
        launchPreset: {
          workspaceRootPath: string;
          llmModelIdentifier: string;
          runtimeKind: string;
        } | null;
      }>;
    }>(listQuery);

    const created = listed.externalChannelBindings.find((binding) => binding.id === bindingId);
    expect(created).toBeTruthy();
    expect(created?.accountId).toBe(accountId);
    expect(created?.peerId).toBe(peerId);
    expect(created?.targetType).toBe("AGENT");
    expect(created?.targetAgentDefinitionId).toBe(agentDefinitionId);
    expect(created?.launchPreset).toMatchObject({
      workspaceRootPath: launchPresetFixture.workspaceRootPath,
      llmModelIdentifier: launchPresetFixture.llmModelIdentifier,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const deleteMutation = `
      mutation DeleteBinding($id: String!) {
        deleteExternalChannelBinding(id: $id)
      }
    `;

    const deleted = await execGraphql<{ deleteExternalChannelBinding: boolean }>(
      deleteMutation,
      { id: bindingId },
    );

    expect(deleted.deleteExternalChannelBinding).toBe(true);

    const listedAfterDelete = await execGraphql<{
      externalChannelBindings: Array<{ id: string }>;
    }>(listQuery);

    expect(
      listedAfterDelete.externalChannelBindings.some((binding) => binding.id === bindingId),
    ).toBe(false);
  });

  it("rejects missing agent definitions during upsert", async () => {
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
        }
      }
    `;

    const result = await graphql({
      schema,
      source: upsertMutation,
      variableValues: {
        input: {
          provider: "WHATSAPP",
          transport: "PERSONAL_SESSION",
          accountId: "acct-stale",
          peerId: "peer-stale",
          threadId: null,
          targetType: "AGENT",
          targetAgentDefinitionId: "non-existent-definition",
          launchPreset: launchPresetFixture,
        },
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe("Selected agent definition does not exist.");
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "TARGET_AGENT_DEFINITION_NOT_FOUND",
      field: "targetAgentDefinitionId",
    });
  });

  it("rejects unsupported provider/transport combinations during upsert", async () => {
    const agentDefinitionId = await createAgentDefinition();
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
        }
      }
    `;

    await expect(
      execGraphql(upsertMutation, {
        input: {
          provider: "WECHAT",
          transport: "BUSINESS_API",
          accountId: "acct-wechat",
          peerId: "peer-wechat",
          threadId: null,
          targetType: "AGENT",
          targetAgentDefinitionId: agentDefinitionId,
          launchPreset: launchPresetFixture,
        },
      }),
    ).rejects.toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
  });

  it("accepts supported provider/transport binding combinations with launch presets", async () => {
    const agentDefinitionId = await createAgentDefinition();
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          provider
          transport
          accountId
          peerId
          threadId
          targetType
          targetAgentDefinitionId
          launchPreset {
            workspaceRootPath
            llmModelIdentifier
            runtimeKind
          }
        }
      }
    `;

    const discordResult = await execGraphql<{
      upsertExternalChannelBinding: {
        provider: string;
        transport: string;
        accountId: string;
        peerId: string;
        threadId: string | null;
        targetType: string;
        targetAgentDefinitionId: string;
        launchPreset: {
          workspaceRootPath: string;
          llmModelIdentifier: string;
          runtimeKind: string;
        };
      };
    }>(upsertMutation, {
      input: {
        provider: "DISCORD",
        transport: "BUSINESS_API",
        accountId: "1234567890",
        peerId: "channel:111222333444",
        threadId: "777888999000",
        targetType: "AGENT",
        targetAgentDefinitionId: agentDefinitionId,
        launchPreset: launchPresetFixture,
      },
    });

    expect(discordResult.upsertExternalChannelBinding).toMatchObject({
      provider: "DISCORD",
      transport: "BUSINESS_API",
      accountId: "1234567890",
      peerId: "channel:111222333444",
      threadId: "777888999000",
      targetType: "AGENT",
      targetAgentDefinitionId: agentDefinitionId,
    });
    expect(discordResult.upsertExternalChannelBinding.launchPreset).toMatchObject({
      workspaceRootPath: launchPresetFixture.workspaceRootPath,
      llmModelIdentifier: launchPresetFixture.llmModelIdentifier,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const telegramResult = await execGraphql<{
      upsertExternalChannelBinding: {
        provider: string;
        transport: string;
        accountId: string;
        peerId: string;
        threadId: string | null;
        targetType: string;
        targetAgentDefinitionId: string;
      };
    }>(upsertMutation, {
      input: {
        provider: "TELEGRAM",
        transport: "BUSINESS_API",
        accountId: "telegram-account",
        peerId: "telegram-chat-123",
        threadId: "42",
        targetType: "AGENT",
        targetAgentDefinitionId: agentDefinitionId,
        launchPreset: launchPresetFixture,
      },
    });

    expect(telegramResult.upsertExternalChannelBinding).toMatchObject({
      provider: "TELEGRAM",
      transport: "BUSINESS_API",
      accountId: "telegram-account",
      peerId: "telegram-chat-123",
      threadId: "42",
      targetType: "AGENT",
      targetAgentDefinitionId: agentDefinitionId,
    });
  });

  it("lists team definition options and supports TEAM binding lifecycle", async () => {
    const team = await createTeamDefinition();
    const accountId = unique("telegram-acct");
    const peerId = unique("telegram-peer");

    const optionsQuery = `
      query TeamDefinitionOptions {
        externalChannelTeamDefinitionOptions {
          teamDefinitionId
          teamDefinitionName
          description
          coordinatorMemberName
          memberCount
        }
      }
    `;

    const options = await execGraphql<{
      externalChannelTeamDefinitionOptions: Array<{
        teamDefinitionId: string;
        teamDefinitionName: string;
        description: string;
        coordinatorMemberName: string;
        memberCount: number;
      }>;
    }>(optionsQuery);

    const option = options.externalChannelTeamDefinitionOptions.find(
      (entry) => entry.teamDefinitionId === team.teamDefinitionId,
    );
    expect(option).toMatchObject({
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName,
      description: "Team definition for external channel setup e2e",
      coordinatorMemberName: "coordinator",
      memberCount: 1,
    });

    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
          provider
          transport
          accountId
          peerId
          threadId
          targetType
          targetAgentDefinitionId
          targetTeamDefinitionId
          launchPreset {
            workspaceRootPath
          }
          teamLaunchPreset {
            workspaceRootPath
            skillAccessMode
          }
          teamRunId
        }
      }
    `;

    const upsertData = await execGraphql<{
      upsertExternalChannelBinding: {
        id: string;
        provider: string;
        transport: string;
        accountId: string;
        peerId: string;
        threadId: string | null;
        targetType: string;
        targetAgentDefinitionId: string | null;
        targetTeamDefinitionId: string | null;
        launchPreset: { workspaceRootPath: string } | null;
        teamLaunchPreset: {
          workspaceRootPath: string;
          skillAccessMode: string;
        } | null;
        teamRunId: string | null;
      };
    }>(upsertMutation, {
      input: {
        provider: "TELEGRAM",
        transport: "BUSINESS_API",
        accountId,
        peerId,
        threadId: null,
        targetType: "TEAM",
        targetAgentDefinitionId: null,
        targetTeamDefinitionId: team.teamDefinitionId,
        launchPreset: null,
        teamLaunchPreset: teamLaunchPresetFixture,
      },
    });

    expect(upsertData.upsertExternalChannelBinding).toMatchObject({
      provider: "TELEGRAM",
      transport: "BUSINESS_API",
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      targetAgentDefinitionId: null,
      targetTeamDefinitionId: team.teamDefinitionId,
      launchPreset: null,
      teamLaunchPreset: {
        workspaceRootPath: teamLaunchPresetFixture.workspaceRootPath,
        skillAccessMode: teamLaunchPresetFixture.skillAccessMode,
      },
      teamRunId: null,
    });

    const bindingId = upsertData.upsertExternalChannelBinding.id;
    const listQuery = `
      query ListBindings {
        externalChannelBindings {
          id
          accountId
          peerId
          targetType
          targetAgentDefinitionId
          targetTeamDefinitionId
          launchPreset {
            workspaceRootPath
          }
          teamLaunchPreset {
            workspaceRootPath
            skillAccessMode
          }
          teamRunId
        }
      }
    `;

    const listed = await execGraphql<{
      externalChannelBindings: Array<{
        id: string;
        accountId: string;
        peerId: string;
        targetType: string;
        targetAgentDefinitionId: string | null;
        targetTeamDefinitionId: string | null;
        launchPreset: { workspaceRootPath: string } | null;
        teamLaunchPreset: {
          workspaceRootPath: string;
          skillAccessMode: string;
        } | null;
        teamRunId: string | null;
      }>;
    }>(listQuery);

    const created = listed.externalChannelBindings.find((binding) => binding.id === bindingId);
    expect(created).toMatchObject({
      id: bindingId,
      accountId,
      peerId,
      targetType: "TEAM",
      targetAgentDefinitionId: null,
      targetTeamDefinitionId: team.teamDefinitionId,
      launchPreset: null,
      teamLaunchPreset: {
        workspaceRootPath: teamLaunchPresetFixture.workspaceRootPath,
        skillAccessMode: teamLaunchPresetFixture.skillAccessMode,
      },
      teamRunId: null,
    });

    const deleteMutation = `
      mutation DeleteBinding($id: String!) {
        deleteExternalChannelBinding(id: $id)
      }
    `;

    const deleted = await execGraphql<{ deleteExternalChannelBinding: boolean }>(
      deleteMutation,
      { id: bindingId },
    );

    expect(deleted.deleteExternalChannelBinding).toBe(true);
  });

  it("rejects missing team definitions during TEAM upsert", async () => {
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
        }
      }
    `;

    const result = await graphql({
      schema,
      source: upsertMutation,
      variableValues: {
        input: {
          provider: "TELEGRAM",
          transport: "BUSINESS_API",
          accountId: "telegram-account",
          peerId: "telegram-chat-123",
          threadId: null,
          targetType: "TEAM",
          targetAgentDefinitionId: null,
          targetTeamDefinitionId: "missing-team-definition",
          launchPreset: null,
          teamLaunchPreset: teamLaunchPresetFixture,
        },
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe("Selected team definition does not exist.");
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "TARGET_TEAM_DEFINITION_NOT_FOUND",
      field: "targetTeamDefinitionId",
    });
  });

  it("rejects malformed Discord peerId with typed field-aware error", async () => {
    const agentDefinitionId = await createAgentDefinition();
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          id
        }
      }
    `;

    const result = await graphql({
      schema,
      source: upsertMutation,
      variableValues: {
        input: {
          provider: "DISCORD",
          transport: "BUSINESS_API",
          accountId: "1234567890",
          peerId: "invalid-peer",
          threadId: null,
          targetType: "AGENT",
          targetAgentDefinitionId: agentDefinitionId,
          launchPreset: launchPresetFixture,
        },
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      "Discord peerId must match user:<snowflake> or channel:<snowflake>.",
    );
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "INVALID_DISCORD_PEER_ID",
      field: "peerId",
    });
  });
});
