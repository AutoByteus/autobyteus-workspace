import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { SqlTokenUsageRecordRepository } from "../../../src/token-usage/repositories/sql/token-usage-record-repository.js";

const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const codexRuntimeEnabled = codexBinaryReady && process.env.RUN_CODEX_E2E === "1";
const describeCodex = codexRuntimeEnabled ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as {
      type?: unknown;
      payload?: unknown;
    };
    if (typeof parsed.type !== "string") {
      return null;
    }
    const payload =
      parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {};
    return {
      type: parsed.type,
      payload,
    };
  } catch {
    return null;
  }
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket open")),
      timeoutMs,
    );
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForMessage = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 120_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.find(predicate);
    if (match) {
      return match;
    }
    await wait(250);
  }

  const preview = messages
    .slice(-25)
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 180)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 120_000,
): Promise<WsMessage> => {
  return waitForMessage(
    messages,
    (message) => messages.indexOf(message) >= startIndex && predicate(message),
    label,
    timeoutMs,
  );
};

const assistantTextMatches = (message: WsMessage, token: string): boolean => {
  if (message.type === "SEGMENT_CONTENT") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }

  if (message.type === "SEGMENT_END") {
    const item =
      message.payload.item && typeof message.payload.item === "object"
        ? (message.payload.item as Record<string, unknown>)
        : null;
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : item && typeof item.text === "string"
          ? item.text
          : null;
    return typeof text === "string" && text.includes(token);
  }

  if (message.type === "ASSISTANT_COMPLETE") {
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : typeof message.payload.content === "string"
          ? message.payload.content
          : typeof message.payload.result === "string"
            ? message.payload.result
            : null;
    return typeof text === "string" && text.includes(token);
  }

  return false;
};

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) {
    return override;
  }

  const preferredOrder = [
    "gpt-5.4-mini",
    "gpt-5.3-codex",
    "gpt-5.3-codex-spark",
    "gpt-5.2-codex",
    "gpt-5.1-codex-max",
    "gpt-5.1-codex-mini",
  ];
  for (const preferred of preferredOrder) {
    if (modelIdentifiers.includes(preferred)) {
      return preferred;
    }
  }

  const codexMatch = modelIdentifiers.find((modelIdentifier) =>
    modelIdentifier.toLowerCase().includes("codex"),
  );
  return codexMatch ?? modelIdentifiers[0]!;
};

describeCodex("Codex token usage GraphQL runtime e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();
  const tokenUsageRepo = new SqlTokenUsageRecordRepository();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-token-usage-runtime-e2e-"));
    await writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    await getCodexAppServerClientManager().close();
    await wait(750);
  });

  afterAll(async () => {
    for (const workspaceRoot of createdWorkspaceRoots) {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
    createdWorkspaceRoots.clear();
    if (testDataDir) {
      await rm(testDataDir, { recursive: true, force: true });
      testDataDir = null;
    }
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

  const fetchModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models {
            modelIdentifier
          }
        }
      }
    `;

    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{
        models: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, {
      runtimeKind: "codex_app_server",
    });

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No model identifier was returned for codex_app_server.");
    }
    return chooseCodexModelIdentifier(modelIdentifiers);
  };

  const createAgentDefinition = async (): Promise<string> => {
    const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
        }
      }
    `;

    const result = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(mutation, {
      input: {
        name: `codex-token-usage-${randomUUID()}`,
        role: "assistant",
        description: "codex token usage runtime e2e agent",
        instructions:
          "Reply to the user directly. If the user asks for an exact token, output that token exactly.",
        category: "runtime-e2e",
        toolNames: [],
        skillNames: [],
      },
    });
    return result.createAgentDefinition.id;
  };

  const createAgentRun = async (input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    workspaceRootPath: string;
  }): Promise<string> => {
    const mutation = `
      mutation CreateAgentRun($input: CreateAgentRunInput!) {
        createAgentRun(input: $input) {
          success
          runId
        }
      }
    `;

    const result = await execGraphql<{
      createAgentRun: { success: boolean; runId: string | null };
    }>(mutation, {
      input: {
        agentDefinitionId: input.agentDefinitionId,
        workspaceRootPath: input.workspaceRootPath,
        llmModelIdentifier: input.llmModelIdentifier,
        autoExecuteTools: true,
        runtimeKind: "codex_app_server",
        llmConfig: { reasoning_effort: "medium" },
        skillAccessMode: "NONE",
      },
    });

    expect(result.createAgentRun.success).toBe(true);
    expect(result.createAgentRun.runId).toBeTruthy();
    return result.createAgentRun.runId as string;
  };

  const terminateAgentRun = async (runId: string): Promise<void> => {
    const mutation = `
      mutation TerminateAgentRun($agentRunId: String!) {
        terminateAgentRun(agentRunId: $agentRunId) {
          success
        }
      }
    `;
    const result = await execGraphql<{
      terminateAgentRun: { success: boolean };
    }>(mutation, { agentRunId: runId });
    expect(result.terminateAgentRun.success).toBe(true);
  };

  const queryTokenUsage = async (startTime: Date, endTime: Date) => {
    const query = `
      query TokenUsage($startTime: DateTime!, $endTime: DateTime!) {
        totalCostInPeriod(startTime: $startTime, endTime: $endTime)
        usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
          llmModel
          promptTokens
          assistantTokens
          totalCost
        }
      }
    `;

    return execGraphql<{
      totalCostInPeriod: number;
      usageStatisticsInPeriod: Array<{
        llmModel: string;
        promptTokens: number;
        assistantTokens: number;
        totalCost: number | null;
      }>;
    }>(query, {
      startTime,
      endTime,
    });
  };

  const openAgentSocket = async (runId: string): Promise<{
    app: Awaited<ReturnType<typeof fastify>>;
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    const app = fastify();
    await app.register(websocket);
    const dummyTeamHandler = {
      connect: async () => null,
      handleMessage: async () => {},
      disconnect: async () => {},
    } as unknown as Parameters<typeof registerAgentWebsocket>[2];
    await registerAgentWebsocket(app, undefined, dummyTeamHandler);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        messages.push(parsed);
      }
    });
    await waitForSocketOpen(socket);
    await waitForMessage(messages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { app, socket, messages };
  };

  it("persists token usage from a real Codex runtime turn and exposes it through GraphQL statistics", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-token-usage-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const llmModelIdentifier = await fetchModelIdentifier();
    const agentDefinitionId = await createAgentDefinition();
    const runId = await createAgentRun({
      agentDefinitionId,
      llmModelIdentifier,
      workspaceRootPath,
    });

    const beforeStartTime = new Date(Date.now() - 60_000);
    const beforeEndTime = new Date();
    const beforeUsage = await queryTokenUsage(beforeStartTime, beforeEndTime);
    expect(beforeUsage.totalCostInPeriod).toBe(0);
    expect(beforeUsage.usageStatisticsInPeriod).toHaveLength(0);

    const { app, socket, messages } = await openAgentSocket(runId);
    const expectedToken = `TOKEN_USAGE_${randomUUID().replace(/-/g, "_")}`;
    const runStartIndex = messages.length;
    const usageWindowStart = new Date(Date.now() - 5_000);

    try {
      socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: `Reply with exactly ${expectedToken} and nothing else.`,
          },
        }),
      );

      await waitForMessageAfter(
        messages,
        runStartIndex,
        (message) => assistantTextMatches(message, expectedToken),
        `assistant text containing ${expectedToken}`,
      );
      await waitForMessageAfter(
        messages,
        runStartIndex,
        (message) => message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
        "AGENT_STATUS IDLE after token usage turn",
      );

      const usageWindowEnd = new Date(Date.now() + 5_000);
      const usage = await queryTokenUsage(usageWindowStart, usageWindowEnd);
      expect(usage.usageStatisticsInPeriod.length).toBeGreaterThan(0);

      const totalPromptTokens = usage.usageStatisticsInPeriod.reduce(
        (sum, row) => sum + row.promptTokens,
        0,
      );
      const totalAssistantTokens = usage.usageStatisticsInPeriod.reduce(
        (sum, row) => sum + row.assistantTokens,
        0,
      );

      expect(totalPromptTokens).toBeGreaterThan(0);
      expect(totalAssistantTokens).toBeGreaterThan(0);
      expect(usage.totalCostInPeriod).toBeGreaterThanOrEqual(0);
    } finally {
      socket.close();
      await app.close();
      await terminateAgentRun(runId).catch(() => undefined);
      await tokenUsageRepo.deleteMany({
        where: { runId },
      });
    }
  }, 180_000);
});
