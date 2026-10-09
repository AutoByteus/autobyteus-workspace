import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Opt-in real-runtime token usage through the Studio server (public GraphQL + agent WebSocket).
// Run: RUN_RUNTIME_TOKEN_USAGE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts --no-watch
// (add -t "codex-app-server|claude|Claude" without an LM Studio server; optional CLAUDE_E2E_MODEL, CODEX_E2E_TOOL_MODEL).
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
  contextCompactionThresholdTokens: number | null;
  latestModelIdentifier: string | null;
  latestRuntimeKind: string | null;
  usageReportCount: number;
  revision: number;
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

/**
 * Each runtime's own context reading on a model-call observation (token-meter-accuracy REQ-001):
 * Claude reports the SDK's getContextUsage after the call, which equals that call's prompt
 * (input + cache read + cache creation, probes P2/P4), never the turn's sum; Codex reports its own
 * `last.totalTokens`, which never exceeds the cumulative total.
 */
const expectRuntimeContextReading = (runtimeKind: RuntimeKindUnderTest, payload: Record<string, unknown>): void => {
  const prompt = asNumber(payload.latest_prompt_tokens);
  const window = asNumber(payload.effective_context_window_tokens);
  const percent = asNumber(payload.context_window_usage_percent);
  if (runtimeKind === "claude_agent_sdk") {
    const callPrompt = (asNumber(payload.reported_input_tokens) ?? 0)
      + (asNumber(payload.cache_read_input_tokens) ?? 0)
      + (asNumber(payload.cache_creation_input_tokens) ?? 0);
    expect(payload.quality_flags).not.toContain("claude_sdk_context_usage_unavailable");
    expect(prompt).toBe(callPrompt);
    expect(window).toBeGreaterThan(0);
    expect(percent).toBeCloseTo((100 * prompt!) / window!, 8);
    const threshold = payload.context_compaction_threshold_tokens;
    if (threshold !== null) {
      expect(asNumber(threshold)).toBeGreaterThan(0);
      expect(asNumber(threshold)).toBeLessThanOrEqual(window!);
    }
  } else if (runtimeKind === "codex_app_server") {
    expect(prompt).toBeGreaterThan(0);
    expect(prompt).toBeLessThanOrEqual(asNumber(payload.reported_total_tokens)!);
    expect(window).toBeGreaterThan(0);
    expect(percent).toBeCloseTo((100 * prompt!) / window!, 8);
    expect(payload.context_compaction_threshold_tokens).toBeNull();
  }
};

runRealRuntimeTokenUsageE2e("real runtime token usage GraphQL e2e", () => {
  // The real Studio composition: public GraphQL over HTTP and the server's own agent WebSocket.
  let studio: FastifyInstance | null = null;
  let serverUrl: URL;
  let testDataDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();
  const createdRunIds = new Set<string>();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "runtime-token-usage-e2e-"));
    await writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    const started = await startStudioE2eRuntimeServer();
    studio = started.fastify;
    serverUrl = started.mainUrl;
  }, REAL_RUNTIME_TIMEOUT_MS);

  afterEach(async () => {
    await getCodexAppServerClientManager().close();
    await wait(750);
  });

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: runIds } } });
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
    if (studio) await studio.close();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(new URL("/graphql", serverUrl), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const result = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || result.errors?.length || !result.data) {
      throw new Error(JSON.stringify(result.errors ?? result));
    }
    return result.data;
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

  const createAgentDefinition = async (
    runtimeId: string,
    instructions = "Reply directly and briefly. Do not use tools. If asked for a word, output that word plainly.",
  ): Promise<string> => {
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
        instructions,
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
          contextCompactionThresholdTokens
          latestModelIdentifier
          latestRuntimeKind
          usageReportCount
          revision
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
    app: { close(): Promise<void> };
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    // The socket belongs to the shared Studio server; closing the returned handle closes nothing else.
    const app = { close: async () => undefined };
    const socket = new WebSocket(`ws://${serverUrl.hostname}:${serverUrl.port}/ws/agent/${runId}`);
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
      // One observation per main-loop model call (token-meter-accuracy D-2); the turn-end
      // claude_sdk_result is reconciliation only.
      expectedIngestionKind: "claude_sdk_call",
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
          expect(tokenUsageMessage.payload.reports_model_call).toBe(true);
          expectRuntimeContextReading(spec.runtimeKind, tokenUsageMessage.payload);
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
          const lastCall = [...messages.slice(runStartIndex)].reverse().find((message) =>
            message.type === "TOKEN_USAGE_UPDATED" && message.payload.run_id === runId
            && message.payload.reports_model_call === true);
          // The meter keeps the runtime's own reading for the latest model call.
          expect(summary.latestPromptTokens).toBe(asNumber(lastCall?.payload.latest_prompt_tokens));
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
          await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId } });
        }
      },
      REAL_RUNTIME_TIMEOUT_MS,
    );
  }

  it(
    "publishes every Claude model call of a multi-call turn live, each with the SDK's own reading, and totals equal the calls plus the turn-end remainder",
    async () => {
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-multi-call-token-usage-workspace-"));
      createdWorkspaceRoots.add(workspaceRootPath);
      const llmModelIdentifier = await fetchRuntimeModelIdentifier("claude_agent_sdk", chooseClaudeModelIdentifier);
      const agentDefinitionId = await createAgentDefinition(
        "claude-multi-call",
        "You are a test agent. When asked to run shell commands, run each one with the Bash tool, one tool call per step, waiting for each result. Then answer briefly.",
      );
      const runId = await createAgentRun({ agentDefinitionId, llmModelIdentifier, workspaceRootPath,
        runtimeKind: "claude_agent_sdk", llmConfig: null });
      const { app, socket, messages } = await openAgentSocket(runId);
      const expectedToken = `TOK_${randomUUID().replace(/-/g, "_")}`;
      const start = messages.length;
      try {
        sendE2eSendMessageCommand(socket, {
          content: "Use the Bash tool to run `echo first`. After you see its output, use the Bash tool again to run " +
            `\`echo second\`. After you see that output, reply with exactly ${expectedToken} and nothing else.`,
        });
        await waitForMessageAfter(messages, start,
          (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.accepted === true, "SEND_MESSAGE accepted", 30_000);
        const firstCall = await waitForMessageAfter(messages, start, (message) => message.type === "TOKEN_USAGE_UPDATED"
          && message.payload.run_id === runId && message.payload.ingestion_kind === "claude_sdk_call", "first live Claude call");
        // Live: the first call is published while the turn is still running (AC-003).
        const firstCallIndex = messages.indexOf(firstCall);
        expect(messages.slice(start, firstCallIndex).some((message) =>
          message.type === "AGENT_STATUS" && message.payload.status === "idle")).toBe(false);
        const midTurnSummary = await getRunSummary(runId);
        await waitForMessageAfter(messages, start,
          (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle", "AGENT_STATUS idle");
        const turn = messages.slice(start);
        const calls = turn.filter((message) => message.type === "TOKEN_USAGE_UPDATED" && message.payload.run_id === runId
          && message.payload.ingestion_kind === "claude_sdk_call");
        const results = turn.filter((message) => message.type === "TOKEN_USAGE_UPDATED" && message.payload.run_id === runId
          && message.payload.ingestion_kind === "claude_sdk_result");
        const idleIndex = turn.findIndex((message) => message.type === "AGENT_STATUS" && message.payload.status === "idle");
        const resultIndex = results.length ? turn.indexOf(results[0]!) : -1;
        console.info("[claude multi-call] calls:", JSON.stringify(calls.map((call) => ({
          index: turn.indexOf(call), model: call.payload.model_identifier, input: call.payload.reported_input_tokens,
          cacheRead: call.payload.cache_read_input_tokens, cacheCreation: call.payload.cache_creation_input_tokens,
          output: call.payload.reported_output_tokens, prompt: call.payload.latest_prompt_tokens,
          window: call.payload.effective_context_window_tokens, threshold: call.payload.context_compaction_threshold_tokens,
          summary: (call.payload.run_summary_after_event as Record<string, unknown> | undefined)?.usage_report_count ?? null,
        }))), "result:", JSON.stringify(results.map((result) => ({ index: turn.indexOf(result),
          accounting: result.payload.accounting_total_tokens, flags: result.payload.quality_flags,
          modelUsage: result.payload.claude_sdk_model_usage ?? null }))), "idleIndex:", idleIndex,
          "midTurnSummary:", JSON.stringify(midTurnSummary));

        expect(calls.length).toBeGreaterThanOrEqual(3);
        for (const call of calls) {
          expect(call.payload.reports_model_call).toBe(true);
          expectRuntimeContextReading("claude_agent_sdk", call.payload);
        }
        // Every call reaches the meter before the turn's result (D-10) and before the run goes idle.
        expect(results).toHaveLength(1);
        expect(results[0]!.payload.reports_model_call).toBe(false);
        expect(Math.max(...calls.map((call) => turn.indexOf(call)))).toBeLessThan(resultIndex);
        expect(resultIndex).toBeLessThan(idleIndex);
        expect(midTurnSummary.usageReportCount).toBeGreaterThanOrEqual(1);
        expect(midTurnSummary.latestRuntimeKind).toBe("claude_agent_sdk");
        expect(midTurnSummary.latestModelIdentifier).toBeTruthy();

        const summary = await waitForPersistedRunSummary(runId);
        const lastCall = calls.at(-1)!;
        const callPrompts = calls.map((call) => asNumber(call.payload.latest_prompt_tokens)!);
        expect(summary.usageReportCount).toBe(calls.length);
        expect(summary.latestRuntimeKind).toBe("claude_agent_sdk");
        // The latest call's own context, not a sum over the turn's calls (AC-001).
        expect(summary.latestPromptTokens).toBe(asNumber(lastCall.payload.latest_prompt_tokens));
        expect(summary.latestPromptTokens!).toBeLessThan(callPrompts.reduce((a, b) => a + b, 0));
        expect(summary.contextCompactionThresholdTokens).toBe(lastCall.payload.context_compaction_threshold_tokens ?? null);
        // Totals = every call + the result's remainder (the result carries the SDK modelUsage delta).
        const callTotal = calls.reduce((total, call) => total + (asNumber(call.payload.accounting_total_tokens) ?? 0), 0);
        expect(summary.totalTokens).toBe(callTotal + (asNumber(results[0]!.payload.accounting_total_tokens) ?? 0));
        expect(results[0]!.payload.quality_flags).not.toContain("claude_sdk_live_exceeds_cumulative");
      } finally {
        socket.close();
        await app.close();
        await terminateAgentRun(runId).catch(() => undefined);
        await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId } });
      }
    },
    REAL_RUNTIME_TIMEOUT_MS,
  );
});
