import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const runRealRuntimeTokenUsageE2e = process.env.RUN_RUNTIME_TOKEN_USAGE_E2E === "1"
  ? describe
  : describe.skip;
const REAL_RUNTIME_TIMEOUT_MS = Number(process.env.RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS || 300_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.RUNTIME_TOKEN_USAGE_E2E_EVENT_WAIT_TIMEOUT_MS || 180_000);
const GRAPHQL_PERSISTENCE_TIMEOUT_MS = Number(process.env.RUNTIME_TOKEN_USAGE_E2E_GRAPHQL_WAIT_TIMEOUT_MS || 60_000);
const DEFAULT_LMSTUDIO_QWEN_TARGET = "qwen3.5";

type RuntimeKindUnderTest = "autobyteus" | "codex_app_server" | "claude_agent_sdk";

type RuntimeSpec = {
  id: string;
  runtimeKind: RuntimeKindUnderTest;
  expectedIngestionKind: string;
  resolveModelIdentifier: () => Promise<string>;
  llmConfig?: Record<string, unknown> | null;
};

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type RunSummary = {
  runId: string;
  grossInputTokens: number;
  standardInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
  billableOutputTokens: number;
  totalTokens: number;
  reasoningOutputTokens: number;
  cacheState: string;
  estimatedApiReasoningOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: string;
  latestPromptTokens: number | null;
  effectiveContextWindowTokens: number | null;
  contextWindowUsagePercent: number | null;
  latestModelIdentifier: string | null;
  latestRuntimeKind: string | null;
  usageReportCount: number;
};

type UsageStatisticsRow = {
  llmModel: string;
  promptTokens: number;
  assistantTokens: number;
  reasoningTokens: number;
  reasoningCost: number | null;
  totalCost: number | null;
  currency: string | null;
  apiCostStatus: string;
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const waitForCondition = async <T>(
  producer: () => Promise<T | null> | T | null,
  label: string,
  timeoutMs: number,
  intervalMs = 250,
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const value = await producer();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw new Error(
    `Timed out waiting for ${label}.${lastError ? ` Last error: ${String(lastError)}` : ""}`,
  );
};

const waitForMessage = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
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
    .slice(-30)
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 240)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await wait(250);
  }

  const preview = messages
    .slice(Math.max(startIndex, messages.length - 30))
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 240)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) {
    return override;
  }

  const preferredOrder = [
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.3-codex",
    "gpt-5.2-codex",
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

const chooseClaudeModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CLAUDE_E2E_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) {
    return override;
  }

  const preferredOrder = ["sonnet", "default", "opus", "haiku"];
  for (const preferred of preferredOrder) {
    if (modelIdentifiers.includes(preferred)) {
      return preferred;
    }
  }
  return modelIdentifiers[0]!;
};

const resolveAutoByteusLmStudioQwenModelIdentifier = async (): Promise<string> => {
  const override = process.env.LMSTUDIO_MODEL_ID?.trim();
  if (override) {
    return override;
  }

  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    throw new Error("No LM Studio models were discovered for AutoByteus runtime token usage E2E.");
  }

  const target = (process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_QWEN_TARGET).toLowerCase();
  const usableModels = models.filter((model) => {
    const identifier = model.model_identifier.toLowerCase();
    return !identifier.includes("embedding") && !identifier.includes("embed") && !identifier.includes("vl");
  });
  const selected =
    usableModels.find((model) => model.model_identifier.toLowerCase().includes(target)) ??
    usableModels.find((model) => model.model_identifier.toLowerCase().includes("qwen3.5")) ??
    usableModels.find((model) => model.model_identifier.toLowerCase().includes("qwen")) ??
    usableModels[0] ??
    models[0];

  if (!selected) {
    throw new Error("Unable to select an LM Studio text model for AutoByteus runtime token usage E2E.");
  }
  return selected.model_identifier;
};

runRealRuntimeTokenUsageE2e("real runtime token usage GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();
  const createdRunIds = new Set<string>();

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "runtime-token-usage-e2e-"));
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
  }, REAL_RUNTIME_TIMEOUT_MS);

  afterEach(async () => {
    await getCodexAppServerClientManager().close();
    await wait(750);
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
    }
    createdRunIds.clear();
    for (const workspaceRoot of createdWorkspaceRoots) {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
    createdWorkspaceRoots.clear();
    if (testDataDir) {
      await rm(testDataDir, { recursive: true, force: true });
      testDataDir = null;
    }
    await shutdownPrisma();
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

  const fetchRuntimeModelIdentifier = async (
    runtimeKind: RuntimeKindUnderTest,
    chooser: (modelIdentifiers: string[]) => string,
  ): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels {
            modelIdentifier
          }
        }
      }
    `;

    const result = await execGraphql<{
      providerModelCatalogSnapshots: Array<{
        llmModels: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, { runtimeKind });

    const modelIdentifiers = result.providerModelCatalogSnapshots.flatMap((provider) =>
      provider.llmModels
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error(`No model identifier was returned for runtime '${runtimeKind}'.`);
    }
    return chooser(modelIdentifiers);
  };

  const createAgentDefinition = async (runtimeId: string): Promise<string> => {
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
        name: `token-usage-runtime-${runtimeId}-${randomUUID()}`,
        role: "assistant",
        description: "real runtime token usage e2e agent",
        instructions:
          "Reply directly and briefly. Do not use tools. If asked for a word, output that word plainly.",
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
    runtimeKind: RuntimeKindUnderTest;
    llmConfig?: Record<string, unknown> | null;
  }): Promise<string> => {
    const mutation = `
      mutation CreateAgentRun($input: CreateAgentRunInput!) {
        createAgentRun(input: $input) {
          success
          message
          runId
        }
      }
    `;

    const result = await execGraphql<{
      createAgentRun: { success: boolean; message: string; runId: string | null };
    }>(mutation, {
      input: {
        agentDefinitionId: input.agentDefinitionId,
        workspaceRootPath: input.workspaceRootPath,
        llmModelIdentifier: input.llmModelIdentifier,
        autoExecuteTools: true,
        runtimeKind: input.runtimeKind,
        llmConfig: input.llmConfig ?? null,
        skillAccessMode: "NONE",
      },
    });

    expect(result.createAgentRun.success, result.createAgentRun.message).toBe(true);
    expect(result.createAgentRun.runId).toBeTruthy();
    const runId = result.createAgentRun.runId as string;
    createdRunIds.add(runId);
    return runId;
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

  const getRunSummary = async (runId: string): Promise<RunSummary> => {
    const query = `
      query RunTokenUsage($runId: String!) {
        getAgentRunTokenUsageSummary(runId: $runId) {
          runId
          grossInputTokens
          standardInputTokens
          cacheReadInputTokens
          outputTokens
          billableOutputTokens
          totalTokens
          reasoningOutputTokens
          cacheState
          estimatedApiReasoningOutputCost
          estimatedApiTotalCost
          currency
          apiCostStatus
          latestPromptTokens
          effectiveContextWindowTokens
          contextWindowUsagePercent
          latestModelIdentifier
          latestRuntimeKind
          usageReportCount
        }
      }
    `;
    const result = await execGraphql<{ getAgentRunTokenUsageSummary: RunSummary }>(query, { runId });
    return result.getAgentRunTokenUsageSummary;
  };

  const queryStatistics = async (startTime: Date, endTime: Date): Promise<UsageStatisticsRow[]> => {
    const query = `
      query RuntimeTokenUsageStats($startTime: DateTime!, $endTime: DateTime!) {
        usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
          llmModel
          promptTokens
          assistantTokens
          reasoningTokens
          reasoningCost
          totalCost
          currency
          apiCostStatus
        }
      }
    `;
    const result = await execGraphql<{ usageStatisticsInPeriod: UsageStatisticsRow[] }>(query, {
      startTime,
      endTime,
    });
    return result.usageStatisticsInPeriod;
  };

  const waitForPersistedRunSummary = async (runId: string): Promise<RunSummary> =>
    waitForCondition(
      async () => {
        const summary = await getRunSummary(runId);
        return summary.usageReportCount > 0 && summary.totalTokens > 0 ? summary : null;
      },
      `persisted token usage summary for run '${runId}'`,
      GRAPHQL_PERSISTENCE_TIMEOUT_MS,
      500,
    );

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

  const runtimeSpecs: RuntimeSpec[] = [
    {
      id: "autobyteus-lmstudio-qwen35",
      runtimeKind: "autobyteus",
      expectedIngestionKind: "autobyteus_llm_phase",
      resolveModelIdentifier: resolveAutoByteusLmStudioQwenModelIdentifier,
      llmConfig: null,
    },
    {
      id: "codex-app-server",
      runtimeKind: "codex_app_server",
      expectedIngestionKind: "codex_thread_token_usage",
      resolveModelIdentifier: () => fetchRuntimeModelIdentifier("codex_app_server", chooseCodexModelIdentifier),
      llmConfig: { reasoning_effort: "medium" },
    },
    {
      id: "claude-agent-sdk",
      runtimeKind: "claude_agent_sdk",
      expectedIngestionKind: "claude_sdk_result",
      resolveModelIdentifier: () => fetchRuntimeModelIdentifier("claude_agent_sdk", chooseClaudeModelIdentifier),
      llmConfig: null,
    },
  ];

  for (const spec of runtimeSpecs) {
    it(
      `persists token usage from a real ${spec.id} runtime turn and exposes it through GraphQL`,
      async () => {
        const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), `${spec.id}-token-usage-workspace-`));
        createdWorkspaceRoots.add(workspaceRootPath);

        const llmModelIdentifier = await spec.resolveModelIdentifier();
        expect(llmModelIdentifier).toBeTruthy();
        if (spec.runtimeKind === "autobyteus") {
          expect(llmModelIdentifier.toLowerCase()).toContain("qwen");
          expect(llmModelIdentifier.toLowerCase()).toContain("lmstudio");
        }

        const agentDefinitionId = await createAgentDefinition(spec.id);
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
          runtimeKind: spec.runtimeKind,
          llmConfig: spec.llmConfig,
        });

        const { app, socket, messages } = await openAgentSocket(runId);
        const expectedToken = `TOK_${randomUUID().replace(/-/g, "_")}`;
        const runStartIndex = messages.length;
        const usageWindowStart = new Date(Date.now() - 1_000);

        try {
          sendE2eSendMessageCommand(socket, {
            content: `Reply with exactly ${expectedToken} and no other words.`,
          });

          await waitForMessageAfter(
            messages,
            runStartIndex,
            (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.accepted === true,
            `${spec.id} SEND_MESSAGE accepted`,
            30_000,
          );

          const tokenUsageMessage = await waitForMessageAfter(
            messages,
            runStartIndex,
            (message) => {
              if (message.type !== "TOKEN_USAGE_UPDATED") return false;
              if (message.payload.run_id !== runId) return false;
              if (message.payload.runtime_kind !== spec.runtimeKind) return false;
              if (message.payload.ingestion_kind !== spec.expectedIngestionKind) return false;
              const totalTokens = asNumber(message.payload.accounting_total_tokens) ?? asNumber(message.payload.reported_total_tokens);
              return totalTokens !== null && totalTokens > 0;
            },
            `${spec.id} TOKEN_USAGE_UPDATED`,
          );

          expect(tokenUsageMessage.payload).toMatchObject({
            run_id: runId,
            runtime_kind: spec.runtimeKind,
            ingestion_kind: spec.expectedIngestionKind,
          });
          expect(tokenUsageMessage.payload).toHaveProperty("latest_prompt_tokens");
          expect(tokenUsageMessage.payload).toHaveProperty("input_token_semantic");
          expect(tokenUsageMessage.payload).toHaveProperty("cache_state");
          expect(asNumber(tokenUsageMessage.payload.reported_input_tokens)).not.toBeNull();
          expect(asNumber(tokenUsageMessage.payload.reported_output_tokens)).not.toBeNull();
          expect(asNumber(tokenUsageMessage.payload.accounting_input_tokens)).toBeGreaterThan(0);
          expect(asNumber(tokenUsageMessage.payload.accounting_output_tokens)).toBeGreaterThan(0);
          expect(asNumber(tokenUsageMessage.payload.accounting_total_tokens)).toBeGreaterThan(0);
          const emittedModelIdentifier = typeof tokenUsageMessage.payload.model_identifier === "string" &&
            tokenUsageMessage.payload.model_identifier.trim().length > 0
            ? tokenUsageMessage.payload.model_identifier
            : llmModelIdentifier;

          await waitForMessageAfter(
            messages,
            runStartIndex,
            (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle",
            `${spec.id} AGENT_STATUS idle`,
          );

          const summary = await waitForPersistedRunSummary(runId);
          expect(summary).toMatchObject({
            runId,
            latestRuntimeKind: spec.runtimeKind,
            latestModelIdentifier: emittedModelIdentifier,
          });
          expect(summary.grossInputTokens).toBeGreaterThan(0);
          expect(summary.standardInputTokens).toBeGreaterThanOrEqual(0);
          expect(summary.cacheReadInputTokens).toBeGreaterThanOrEqual(0);
          expect(summary.outputTokens).toBeGreaterThan(0);
          expect(summary.billableOutputTokens).toBeGreaterThanOrEqual(summary.outputTokens);
          expect(summary.totalTokens).toBeGreaterThan(0);
          expect(summary.reasoningOutputTokens).toBeGreaterThanOrEqual(0);
          expect(summary.usageReportCount).toBeGreaterThan(0);
          expect(["positive", "zero_reported", "not_reported", "unsupported_or_local", "unknown"]).toContain(summary.cacheState);
          expect(["estimated", "price_missing", "partial_price_missing"]).toContain(summary.apiCostStatus);

          const usageWindowEnd = new Date(Date.now() + 5_000);
          const statistics = await queryStatistics(usageWindowStart, usageWindowEnd);
          expect(statistics).toEqual(expect.arrayContaining([
            expect.objectContaining({
              llmModel: emittedModelIdentifier,
              promptTokens: expect.any(Number),
              assistantTokens: expect.any(Number),
              apiCostStatus: summary.apiCostStatus,
            }),
          ]));
          const runtimeStats = statistics.find((row) => row.llmModel === emittedModelIdentifier);
          expect(runtimeStats?.promptTokens).toBeGreaterThan(0);
          expect(runtimeStats?.assistantTokens).toBeGreaterThan(0);
          expect(runtimeStats?.reasoningTokens).toBeGreaterThanOrEqual(0);
        } finally {
          socket.close();
          await app.close();
          await terminateAgentRun(runId).catch(() => undefined);
          await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId } });
        }
      },
      REAL_RUNTIME_TIMEOUT_MS,
    );
  }
});
