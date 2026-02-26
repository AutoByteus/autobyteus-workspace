import "reflect-metadata";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

describe("External channel setup GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  const activeAgentId = unique("active-agent");

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;

    const agentManager = AgentRunManager.getInstance();
    vi.spyOn(agentManager, "listActiveRuns").mockReturnValue([activeAgentId]);
    vi.spyOn(agentManager, "getAgentRun").mockImplementation((id: string) => {
      if (id !== activeAgentId) {
        return null;
      }
      return {
        agentRunId: activeAgentId,
        context: {
          config: {
            name: "Setup Agent",
          },
        },
        currentStatus: "IDLE",
      } as any;
    });

    const teamManager = AgentTeamRunManager.getInstance();
    vi.spyOn(teamManager, "listActiveRuns").mockReturnValue([]);
    vi.spyOn(teamManager, "getTeamRun").mockReturnValue(null);
  });

  afterAll(() => {
    vi.restoreAllMocks();
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

  it("returns active binding target options", async () => {
    const query = `
      query TargetOptions {
        externalChannelBindingTargetOptions {
          targetType
          targetId
          displayName
          status
        }
      }
    `;

    const data = await execGraphql<{
      externalChannelBindingTargetOptions: Array<{
        targetType: string;
        targetId: string;
        displayName: string;
        status: string;
      }>;
    }>(query);

    expect(data.externalChannelBindingTargetOptions).toEqual([
      {
        targetType: "AGENT",
        targetId: activeAgentId,
        displayName: "Setup Agent",
        status: "IDLE",
      },
    ]);
  });

  it("supports upsert/list/delete binding setup lifecycle", async () => {
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
          targetId
        }
      }
    `;

    const upsertData = await execGraphql<{
      upsertExternalChannelBinding: {
        id: string;
        accountId: string;
        peerId: string;
        targetType: string;
        targetId: string;
      };
    }>(upsertMutation, {
      input: {
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId,
        peerId,
        threadId: null,
        targetType: "AGENT",
        targetId: activeAgentId,
      },
    });

    expect(upsertData.upsertExternalChannelBinding.accountId).toBe(accountId);
    expect(upsertData.upsertExternalChannelBinding.peerId).toBe(peerId);
    expect(upsertData.upsertExternalChannelBinding.targetType).toBe("AGENT");
    expect(upsertData.upsertExternalChannelBinding.targetId).toBe(activeAgentId);

    const bindingId = upsertData.upsertExternalChannelBinding.id;

    const listQuery = `
      query ListBindings {
        externalChannelBindings {
          id
          accountId
          peerId
          targetType
          targetId
        }
      }
    `;

    const listed = await execGraphql<{
      externalChannelBindings: Array<{
        id: string;
        accountId: string;
        peerId: string;
        targetType: string;
        targetId: string;
      }>;
    }>(listQuery);

    const created = listed.externalChannelBindings.find((binding) => binding.id === bindingId);
    expect(created).toBeTruthy();
    expect(created?.accountId).toBe(accountId);
    expect(created?.peerId).toBe(peerId);
    expect(created?.targetType).toBe("AGENT");
    expect(created?.targetId).toBe(activeAgentId);

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

  it("rejects stale target ids during upsert", async () => {
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
          provider: "WHATSAPP",
          transport: "PERSONAL_SESSION",
          accountId: "acct-stale",
          peerId: "peer-stale",
          threadId: null,
          targetType: "AGENT",
          targetId: "non-existent-agent",
        },
      }),
    ).rejects.toThrow("TARGET_NOT_ACTIVE");
  });

  it("rejects unsupported provider/transport combinations during upsert", async () => {
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
          targetId: activeAgentId,
        },
      }),
    ).rejects.toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
  });

  it("accepts supported WECHAT + PERSONAL_SESSION binding combinations", async () => {
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          provider
          transport
          targetType
          targetId
        }
      }
    `;

    const result = await execGraphql<{
      upsertExternalChannelBinding: {
        provider: string;
        transport: string;
        targetType: string;
        targetId: string;
      };
    }>(upsertMutation, {
      input: {
        provider: "WECHAT",
        transport: "PERSONAL_SESSION",
        accountId: "wechat-acct",
        peerId: "wechat-peer",
        threadId: null,
        targetType: "AGENT",
        targetId: activeAgentId,
      },
    });

    expect(result.upsertExternalChannelBinding).toMatchObject({
      provider: "WECHAT",
      transport: "PERSONAL_SESSION",
      targetType: "AGENT",
      targetId: activeAgentId,
    });
  });

  it("accepts supported DISCORD + BUSINESS_API binding combinations", async () => {
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          provider
          transport
          accountId
          peerId
          threadId
          targetType
          targetId
        }
      }
    `;

    const result = await execGraphql<{
      upsertExternalChannelBinding: {
        provider: string;
        transport: string;
        accountId: string;
        peerId: string;
        threadId: string | null;
        targetType: string;
        targetId: string;
      };
    }>(upsertMutation, {
      input: {
        provider: "DISCORD",
        transport: "BUSINESS_API",
        accountId: "1234567890",
        peerId: "channel:111222333444",
        threadId: "777888999000",
        targetType: "AGENT",
        targetId: activeAgentId,
      },
    });

    expect(result.upsertExternalChannelBinding).toMatchObject({
      provider: "DISCORD",
      transport: "BUSINESS_API",
      accountId: "1234567890",
      peerId: "channel:111222333444",
      threadId: "777888999000",
      targetType: "AGENT",
      targetId: activeAgentId,
    });
  });

  it("accepts supported TELEGRAM + BUSINESS_API binding combinations", async () => {
    const upsertMutation = `
      mutation Upsert($input: UpsertExternalChannelBindingInput!) {
        upsertExternalChannelBinding(input: $input) {
          provider
          transport
          accountId
          peerId
          threadId
          targetType
          targetId
        }
      }
    `;

    const result = await execGraphql<{
      upsertExternalChannelBinding: {
        provider: string;
        transport: string;
        accountId: string;
        peerId: string;
        threadId: string | null;
        targetType: string;
        targetId: string;
      };
    }>(upsertMutation, {
      input: {
        provider: "TELEGRAM",
        transport: "BUSINESS_API",
        accountId: "telegram-account",
        peerId: "telegram-chat-123",
        threadId: "42",
        targetType: "AGENT",
        targetId: activeAgentId,
      },
    });

    expect(result.upsertExternalChannelBinding).toMatchObject({
      provider: "TELEGRAM",
      transport: "BUSINESS_API",
      accountId: "telegram-account",
      peerId: "telegram-chat-123",
      threadId: "42",
      targetType: "AGENT",
      targetId: activeAgentId,
    });
  });

  it("rejects TELEGRAM TEAM target bindings with explicit policy error", async () => {
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
          targetId: "team-1",
        },
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      "Telegram bindings currently support AGENT targets only.",
    );
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "TELEGRAM_TEAM_TARGET_NOT_SUPPORTED",
      field: "targetType",
      detail: "Telegram bindings currently support AGENT targets only.",
    });
  });

  it("rejects malformed Discord peerId with typed field-aware error", async () => {
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
          targetId: activeAgentId,
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
      detail: "Discord peerId must match user:<snowflake> or channel:<snowflake>.",
    });
  });

  it("rejects Discord user peer with threadId using typed thread error", async () => {
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
          peerId: "user:111222333444",
          threadId: "777888999000",
          targetType: "AGENT",
          targetId: activeAgentId,
        },
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      "Discord threadId can only be used with channel:<snowflake> peerId targets.",
    );
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "INVALID_DISCORD_THREAD_TARGET_COMBINATION",
      field: "threadId",
      detail: "Discord threadId can only be used with channel:<snowflake> peerId targets.",
    });
  });
});
