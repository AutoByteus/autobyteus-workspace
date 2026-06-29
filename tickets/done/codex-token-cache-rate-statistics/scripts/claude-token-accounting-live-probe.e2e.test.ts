import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const prisma = new PrismaClient();
const TIMEOUT_MS = Number(process.env.CLAUDE_TOKEN_ACCOUNTING_PROBE_TIMEOUT_MS || 300_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CLAUDE_TOKEN_ACCOUNTING_PROBE_EVENT_TIMEOUT_MS || 180_000);
const GRAPHQL_WAIT_TIMEOUT_MS = Number(process.env.CLAUDE_TOKEN_ACCOUNTING_PROBE_GRAPHQL_TIMEOUT_MS || 60_000);
const ARTIFACT_ROOT = path.resolve(process.cwd(), "../tickets/in-progress/codex-token-cache-rate-statistics");
const EVIDENCE_DIR = path.join(ARTIFACT_ROOT, "experiment-evidence");
const SCRIPT_COPY_PATH = path.join(ARTIFACT_ROOT, "scripts/claude-token-accounting-live-probe.e2e.test.ts");

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const parseWsMessage = (raw: WebSocket.RawData): { type: string; payload: Record<string, unknown> } | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
    if (typeof parsed.type !== "string") return null;
    return {
      type: parsed.type,
      payload: asRecord(parsed.payload) ?? {},
    };
  } catch {
    return null;
  }
};

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
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}.${lastError ? ` Last error: ${String(lastError)}` : ""}`);
};

const waitForMessageAfter = async (
  messages: Array<{ type: string; payload: Record<string, unknown> }>,
  startIndex: number,
  predicate: (message: { type: string; payload: Record<string, unknown> }) => boolean,
  label: string,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<{ type: string; payload: Record<string, unknown> }> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) return match;
    await wait(250);
  }
  const preview = messages
    .slice(Math.max(startIndex, messages.length - 30))
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 240)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const chooseClaudeModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CLAUDE_E2E_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) return override;
  const preferredOrder = ["sonnet", "default", "opus", "haiku"];
  for (const preferred of preferredOrder) {
    const exact = modelIdentifiers.find((modelIdentifier) => modelIdentifier === preferred);
    if (exact) return exact;
    const contains = modelIdentifiers.find((modelIdentifier) => modelIdentifier.toLowerCase().includes(preferred));
    if (contains) return contains;
  }
  return modelIdentifiers[0]!;
};

const summarizeModelUsage = (modelUsage: unknown): Record<string, unknown> | null => {
  const record = asRecord(modelUsage);
  if (!record) return null;
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0,
    models: [] as string[],
  };
  let saw = false;
  for (const [model, usageValue] of Object.entries(record)) {
    const usage = asRecord(usageValue);
    if (!usage) continue;
    totals.models.push(model);
    for (const key of ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens", "costUSD"] as const) {
      const value = asNumber(usage[key]);
      if (value !== null) {
        saw = true;
        totals[key] += value;
      }
    }
  }
  return saw ? totals : null;
};

const usageSubset = (usage: unknown): Record<string, unknown> | null => {
  const record = asRecord(usage);
  if (!record) return null;
  const keys = [
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "cache_creation_5m_input_tokens",
    "cache_creation_1h_input_tokens",
    "cache_creation",
    "output_tokens_details",
    "thinking_tokens",
    "reasoning_tokens",
    "iterations",
    "server_tool_use",
    "service_tier",
    "speed",
  ];
  return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
};

const parseJsonMaybe = (value: unknown): unknown => {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

describe("live Claude Agent SDK token accounting probe", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  let rawLogDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();
  const createdRunIds = new Set<string>();

  beforeAll(async () => {
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await mkdir(path.dirname(SCRIPT_COPY_PATH), { recursive: true });
    await copyFile(new URL(import.meta.url), SCRIPT_COPY_PATH);
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-token-accounting-probe-data-"));
    rawLogDir = await mkdtemp(path.join(os.tmpdir(), "claude-token-accounting-raw-events-"));
    process.env.CLAUDE_SESSION_RAW_EVENT_LOG_DIR = rawLogDir;
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
  }, TIMEOUT_MS);

  afterAll(async () => {
    const runIds = Array.from(createdRunIds);
    if (runIds.length > 0) {
      await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
    }
    for (const workspaceRoot of createdWorkspaceRoots) {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
    if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
    if (rawLogDir) await rm(rawLogDir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const fetchClaudeModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models { modelIdentifier }
        }
      }
    `;
    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }>;
    }>(query, { runtimeKind: "claude_agent_sdk" });
    const models = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models.map((model) => model.modelIdentifier).filter(Boolean),
    );
    if (models.length === 0) throw new Error("No Claude Agent SDK model identifiers discovered.");
    return chooseClaudeModelIdentifier(models);
  };

  const createAgentDefinition = async (): Promise<string> => {
    const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) { id }
      }
    `;
    const result = await execGraphql<{ createAgentDefinition: { id: string } }>(mutation, {
      input: {
        name: `claude-token-accounting-probe-${randomUUID()}`,
        role: "assistant",
        description: "Claude token accounting probe agent",
        instructions: [
          "Reply directly and briefly.",
          "Do not use tools unless explicitly asked and available.",
          "When asked for a sentinel token, output that token plainly.",
        ].join(" "),
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
        createAgentRun(input: $input) { success message runId }
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
        runtimeKind: "claude_agent_sdk",
        llmConfig: null,
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
    const mutation = `mutation TerminateAgentRun($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }`;
    await execGraphql(mutation, { agentRunId: runId });
  };

  const openAgentSocket = async (runId: string): Promise<{
    app: Awaited<ReturnType<typeof fastify>>;
    socket: WebSocket;
    messages: Array<{ type: string; payload: Record<string, unknown> }>;
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
    const messages: Array<{ type: string; payload: Record<string, unknown> }> = [];
    socket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) messages.push(parsed);
    });
    await waitForSocketOpen(socket);
    await waitForMessageAfter(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { app, socket, messages };
  };

  const waitForPersistedRows = async (runId: string, expectedMinimum: number) =>
    waitForCondition(
      async () => {
        const rows = await prisma.tokenUsageLedgerEvent.findMany({
          where: { runId },
          orderBy: { observedAt: "asc" },
        });
        return rows.length >= expectedMinimum ? rows : null;
      },
      `at least ${expectedMinimum} persisted Claude token usage rows`,
      GRAPHQL_WAIT_TIMEOUT_MS,
      500,
    );

  const readRawLogRecords = async (runId: string): Promise<Array<Record<string, unknown>>> => {
    if (!rawLogDir) return [];
    await wait(2_000);
    const files = await readdir(rawLogDir).catch(() => []);
    const matching = files.filter((file) => file.includes(runId));
    const records: Array<Record<string, unknown>> = [];
    for (const file of matching) {
      const content = await readFile(path.join(rawLogDir, file), "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        records.push(JSON.parse(line) as Record<string, unknown>);
      }
    }
    records.sort((a, b) => (asNumber(a.sequence) ?? 0) - (asNumber(b.sequence) ?? 0));
    return records;
  };

  it("captures real Claude SDK result usage/modelUsage and verifies per-turn accounting shape", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-token-accounting-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const llmModelIdentifier = await fetchClaudeModelIdentifier();
    const agentDefinitionId = await createAgentDefinition();
    const runId = await createAgentRun({ agentDefinitionId, llmModelIdentifier, workspaceRootPath });
    const { app, socket, messages } = await openAgentSocket(runId);
    const turns: Array<Record<string, unknown>> = [];

    try {
      for (const prompt of [
        `Reply with exactly CLAUDE_PROBE_${randomUUID().slice(0, 8)} and no other words.`,
        `Use the Bash tool twice if it is available. Run only harmless commands: first printf CLAUDE_TOOL_ALPHA, then printf CLAUDE_TOOL_BETA. After using the commands, answer exactly CLAUDE_TOOL_PROBE_DONE.`,
        `Now reply with exactly CLAUDE_PROBE_SECOND_${randomUUID().slice(0, 8)} and no other words.`,
      ]) {
        const startIndex = messages.length;
        sendE2eSendMessageCommand(socket, { content: prompt });
        await waitForMessageAfter(
          messages,
          startIndex,
          (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.accepted === true,
          "SEND_MESSAGE accepted",
          30_000,
        );
        const usageMessage = await waitForMessageAfter(
          messages,
          startIndex,
          (message) =>
            message.type === "TOKEN_USAGE_UPDATED" &&
            message.payload.run_id === runId &&
            message.payload.runtime_kind === "claude_agent_sdk" &&
            message.payload.ingestion_kind === "claude_sdk_result" &&
            (asNumber(message.payload.accounting_total_tokens) ?? asNumber(message.payload.reported_total_tokens) ?? 0) > 0,
          "Claude TOKEN_USAGE_UPDATED",
        );
        await waitForMessageAfter(
          messages,
          startIndex,
          (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle",
          "Claude idle",
        );
        turns.push({ prompt, usageMessage: usageMessage.payload });
      }

      const rows = await waitForPersistedRows(runId, 2);
      const rawLogRecords = await readRawLogRecords(runId);
      const resultRecords = rawLogRecords.filter((record) => {
        const payload = asRecord(record.payload);
        return payload?.type === "result";
      });
      const usageBearingRecords = rawLogRecords.filter((record) => {
        const payload = asRecord(record.payload);
        return Boolean(asRecord(payload?.usage) || asRecord(payload?.modelUsage) || asRecord(payload?.model_usage));
      });
      const rawResultSummaries = resultRecords.map((record) => {
        const payload = asRecord(record.payload) ?? {};
        const usage = asRecord(payload.usage);
        const modelUsage = payload.modelUsage ?? payload.model_usage;
        const modelUsageTotals = summarizeModelUsage(modelUsage);
        return {
          sequence: record.sequence,
          eventName: record.eventName,
          type: payload.type,
          subtype: payload.subtype,
          session_id: payload.session_id,
          stop_reason: payload.stop_reason,
          num_turns: payload.num_turns,
          total_cost_usd: payload.total_cost_usd,
          usage: usageSubset(usage),
          modelUsage,
          modelUsageTotals,
          usageVsModelUsageDelta: usage && modelUsageTotals ? {
            input: (modelUsageTotals.inputTokens as number) - (asNumber(usage.input_tokens) ?? 0),
            output: (modelUsageTotals.outputTokens as number) - (asNumber(usage.output_tokens) ?? 0),
            cacheRead: (modelUsageTotals.cacheReadInputTokens as number) - (asNumber(usage.cache_read_input_tokens) ?? 0),
            cacheCreation: (modelUsageTotals.cacheCreationInputTokens as number) - (asNumber(usage.cache_creation_input_tokens) ?? 0),
          } : null,
        };
      });
      const ledgerRows = rows.map((row) => ({
        usageEventId: row.usageEventId,
        idempotencyKey: row.idempotencyKey,
        observedAt: row.observedAt.toISOString(),
        runId: row.runId,
        turnId: row.turnId,
        runtimeKind: row.runtimeKind,
        ingestionKind: row.ingestionKind,
        usageScope: row.usageScope,
        modelIdentifier: row.modelIdentifier,
        reportedInputTokens: row.reportedInputTokens,
        reportedOutputTokens: row.reportedOutputTokens,
        reportedTotalTokens: row.reportedTotalTokens,
        accountingInputTokens: row.accountingInputTokens,
        accountingOutputTokens: row.accountingOutputTokens,
        accountingTotalTokens: row.accountingTotalTokens,
        standardInputTokens: row.standardInputTokens,
        cacheReadInputTokens: row.cacheReadInputTokens,
        cacheCreationInputTokens: row.cacheCreationInputTokens,
        cacheCreation5mInputTokens: row.cacheCreation5mInputTokens,
        cacheCreation1hInputTokens: row.cacheCreation1hInputTokens,
        reasoningOutputTokens: row.reasoningOutputTokens,
        latestPromptTokens: row.latestPromptTokens,
        effectiveContextWindowTokens: row.effectiveContextWindowTokens,
        contextWindowUsagePercent: row.contextWindowUsagePercent,
        qualityFlags: parseJsonMaybe(row.qualityFlagsJson),
        rawUsageJson: parseJsonMaybe(row.rawUsageJson),
        rawEventJson: parseJsonMaybe(row.rawEventJson),
      }));
      const tokenUsageMessages = messages
        .filter((message) => message.type === "TOKEN_USAGE_UPDATED" && message.payload.run_id === runId)
        .map((message) => message.payload);
      const evidence = {
        generatedAt: new Date().toISOString(),
        runId,
        llmModelIdentifier,
        workspaceRootPath,
        rawLogDir,
        counts: {
          rawChunkRecords: rawLogRecords.length,
          resultRecords: resultRecords.length,
          usageBearingRawRecords: usageBearingRecords.length,
          tokenUsageMessages: tokenUsageMessages.length,
          ledgerRows: ledgerRows.length,
          turns: turns.length,
        },
        conclusion: {
          hasMultipleUsageBearingChunksPerTurn: usageBearingRecords.length > resultRecords.length,
          usageEventsEqualTerminalResults: tokenUsageMessages.length === resultRecords.length,
          ledgerRowsEqualTokenUsageMessages: ledgerRows.length === tokenUsageMessages.length,
          allTokenUsageScopes: [...new Set(ledgerRows.map((row) => row.usageScope))],
          rawResultUsageDiffersFromModelUsage: rawResultSummaries.some((summary) => {
            const delta = asRecord(summary.usageVsModelUsageDelta);
            return Boolean(delta && Object.values(delta).some((value) => typeof value === "number" && value !== 0));
          }),
        },
        turns,
        tokenUsageMessages,
        ledgerRows,
        rawResultSummaries,
        rawChunkIndex: rawLogRecords.map((record) => {
          const payload = asRecord(record.payload) ?? {};
          return {
            sequence: record.sequence,
            eventName: record.eventName,
            payloadKeys: Object.keys(payload),
            type: payload.type,
            subtype: payload.subtype,
            hasUsage: Boolean(asRecord(payload.usage)),
            hasModelUsage: Boolean(asRecord(payload.modelUsage) || asRecord(payload.model_usage)),
          };
        }),
      };
      const evidencePath = path.join(EVIDENCE_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-claude-token-accounting-live-probe.json`);
      await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf-8");
      await writeFile(
        path.join(ARTIFACT_ROOT, "live-claude-token-accounting-experiment-summary.json"),
        `${JSON.stringify({
          evidencePath,
          runId,
          llmModelIdentifier,
          counts: evidence.counts,
          conclusion: evidence.conclusion,
          resultUsageVsModelUsageDeltas: rawResultSummaries.map((summary) => summary.usageVsModelUsageDelta),
        }, null, 2)}\n`,
        "utf-8",
      );
      console.log(`[claude-token-accounting-live-probe] evidence=${evidencePath}`);

      expect(resultRecords.length).toBeGreaterThanOrEqual(2);
      expect(tokenUsageMessages.length).toBe(resultRecords.length);
      expect(ledgerRows.length).toBe(tokenUsageMessages.length);
      expect(ledgerRows.every((row) => row.usageScope === "per_turn")).toBe(true);
    } finally {
      socket.close();
      await app.close();
      await terminateAgentRun(runId).catch(() => undefined);
    }
  }, TIMEOUT_MS);
});
