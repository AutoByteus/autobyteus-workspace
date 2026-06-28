import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
import { buildGraphqlSchema } from "../../../../autobyteus-server-ts/src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../../autobyteus-server-ts/src/api/websocket/agent.js";
import { appConfigProvider } from "../../../../autobyteus-server-ts/src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { sendE2eSendMessageCommand } from "../../../../autobyteus-server-ts/tests/e2e/helpers/websocket-command-helpers.js";

const prisma = new PrismaClient();
const TIMEOUT_MS = Number(process.env.CODEX_CACHE_RATE_PROBE_TIMEOUT_MS || 900_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CODEX_CACHE_RATE_PROBE_EVENT_WAIT_TIMEOUT_MS || 240_000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenceDir = path.resolve(__dirname, "../experiment-evidence");

type WsMessage = { type: string; payload: Record<string, unknown> };
type TokenUsageCapture = {
  label: string;
  marker: string;
  payload: Record<string, unknown>;
  rawUsage: Record<string, unknown> | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  standardInputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cacheRate: number | null;
  uncachedRate: number | null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString());
    if (typeof parsed.type !== "string") return null;
    const payload = parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
      ? parsed.payload as Record<string, unknown>
      : {};
    return { type: parsed.type, payload };
  } catch {
    return null;
  }
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });

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
    if (match) return match;
    await wait(250);
  }
  const preview = messages.slice(Math.max(startIndex, messages.length - 30)).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 260)}`).join(" | ");
  throw new Error(`Timed out waiting for ${label}. preview=${preview}`);
};

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) return override;
  for (const preferred of ["gpt-5.4-mini", "gpt-5.5", "gpt-5.4", "gpt-5.3-codex-spark", "gpt-5.3-codex"]) {
    if (modelIdentifiers.includes(preferred)) return preferred;
  }
  return modelIdentifiers.find((m) => m.toLowerCase().includes("codex")) ?? modelIdentifiers[0]!;
};

const sanitizePayload = (payload: Record<string, unknown>) => JSON.parse(JSON.stringify(payload));

const makeLargeStableInstructions = (nonce: string, lineCount: number): string => {
  const lines = Array.from({ length: lineCount }, (_, idx) => {
    const n = String(idx + 1).padStart(4, "0");
    return `CACHE_PROBE_STATIC_INSTRUCTION_${nonce}_${n}: Always answer with only the requested marker. This stable instruction line is intentionally repeated to create a realistic long, stable Codex prompt prefix for provider prompt-cache measurement.`;
  });
  return [
    "You are a controlled Codex app-server token-cache probe agent.",
    "Do not use tools. Do not explain. Reply with exactly the requested marker and nothing else.",
    ...lines,
  ].join("\n");
};

const makeLargeNovelUserSuffix = (nonce: string, lineCount: number): string => {
  const lines = Array.from({ length: lineCount }, (_, idx) => {
    const n = String(idx + 1).padStart(4, "0");
    return `CACHE_PROBE_NEW_USER_SUFFIX_${nonce}_${n}: This line is intentionally new in this turn only, so it should be mostly uncached on first appearance.`;
  });
  return lines.join("\n");
};

const captureTokenUsage = (label: string, marker: string, payload: Record<string, unknown>): TokenUsageCapture => {
  const rawUsage = asRecord(payload.raw_usage_json);
  const inputTokens = asNumber(payload.accounting_input_tokens) ?? asNumber(payload.reported_input_tokens) ?? asNumber(rawUsage?.inputTokens) ?? asNumber(rawUsage?.input_tokens);
  const cachedInputTokens = asNumber(payload.cache_read_input_tokens) ?? asNumber(rawUsage?.cachedInputTokens) ?? asNumber(rawUsage?.cached_input_tokens);
  const standardInputTokens = asNumber(payload.standard_input_tokens);
  const outputTokens = asNumber(payload.accounting_output_tokens) ?? asNumber(payload.reported_output_tokens) ?? asNumber(rawUsage?.outputTokens) ?? asNumber(rawUsage?.output_tokens);
  const totalTokens = asNumber(payload.accounting_total_tokens) ?? asNumber(payload.reported_total_tokens) ?? asNumber(rawUsage?.totalTokens) ?? asNumber(rawUsage?.total_tokens);
  const cacheRate = inputTokens !== null && inputTokens > 0 && cachedInputTokens !== null ? cachedInputTokens / inputTokens : null;
  const uncachedRate = inputTokens !== null && inputTokens > 0 && standardInputTokens !== null ? standardInputTokens / inputTokens : null;
  return {
    label,
    marker,
    payload: sanitizePayload(payload),
    rawUsage: rawUsage ? sanitizePayload(rawUsage) : null,
    inputTokens,
    cachedInputTokens,
    standardInputTokens,
    outputTokens,
    totalTokens,
    cacheRate,
    uncachedRate,
  };
};

describe("codex cache-rate live probe", () => {
  it("measures Codex app-server cache rates across warmup, stable-prefix, novel-suffix, and recovery turns", async () => {
    const testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-cache-rate-probe-data-"));
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-cache-rate-probe-workspace-"));
    const createdRunIds = new Set<string>();
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let app: Awaited<ReturnType<typeof fastify>> | null = null;
    let socket: WebSocket | null = null;
    const nonce = randomUUID().replace(/-/g, "_").slice(0, 18);
    try {
      await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;

      const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
        const result = await graphql({ schema, source: query, variableValues: variables });
        if (result.errors?.length) throw result.errors[0];
        return result.data as T;
      };

      const modelsResult = await execGraphql<{ availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }> }>(`
        query Models($runtimeKind: String) {
          availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { models { modelIdentifier } }
        }
      `, { runtimeKind: "codex_app_server" });
      const modelIdentifiers = modelsResult.availableLlmProvidersWithModels.flatMap((p) => p.models.map((m) => m.modelIdentifier).filter(Boolean));
      expect(modelIdentifiers.length).toBeGreaterThan(0);
      const llmModelIdentifier = chooseCodexModelIdentifier(modelIdentifiers);

      const instructionLineCount = Number(process.env.CODEX_CACHE_RATE_PROBE_INSTRUCTION_LINES || 1800);
      const novelSuffixLineCount = Number(process.env.CODEX_CACHE_RATE_PROBE_NOVEL_SUFFIX_LINES || 450);
      const instructions = makeLargeStableInstructions(nonce, instructionLineCount);

      const agentResult = await execGraphql<{ createAgentDefinition: { id: string } }>(`
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) { id }
        }
      `, { input: {
        name: `codex-cache-rate-live-probe-${nonce}`,
        role: "assistant",
        description: "codex runtime cache-rate live probe",
        instructions,
        category: "runtime-probe",
        toolNames: [],
        skillNames: [],
      }});

      const runResult = await execGraphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(`
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) { success message runId }
        }
      `, { input: {
        agentDefinitionId: agentResult.createAgentDefinition.id,
        workspaceRootPath,
        llmModelIdentifier,
        autoExecuteTools: true,
        runtimeKind: "codex_app_server",
        llmConfig: { reasoning_effort: "low" },
        skillAccessMode: "NONE",
      }});
      expect(runResult.createAgentRun.success, runResult.createAgentRun.message).toBe(true);
      const runId = runResult.createAgentRun.runId!;
      createdRunIds.add(runId);

      app = fastify();
      await app.register(websocket);
      const dummyTeamHandler = { connect: async () => null, handleMessage: async () => {}, disconnect: async () => {} } as unknown as Parameters<typeof registerAgentWebsocket>[2];
      await registerAgentWebsocket(app, undefined, dummyTeamHandler);
      const address = await app.listen({ port: 0, host: "127.0.0.1" });
      const url = new URL(address);
      socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      const messages: WsMessage[] = [];
      socket.on("message", (raw) => {
        const parsed = parseWsMessage(raw);
        if (parsed) messages.push(parsed);
      });
      await waitForSocketOpen(socket);
      await waitForMessageAfter(messages, 0, (m) => m.type === "CONNECTED", "CONNECTED", 15_000);

      const sendRound = async (label: string, marker: string, content: string): Promise<TokenUsageCapture> => {
        const startIndex = messages.length;
        sendE2eSendMessageCommand(socket!, { content });
        await waitForMessageAfter(messages, startIndex, (m) => m.type === "AGENT_COMMAND_ACK" && m.payload.accepted === true, `${label} ack`, 30_000);
        const tokenUsageMessage = await waitForMessageAfter(messages, startIndex, (m) => {
          if (m.type !== "TOKEN_USAGE_UPDATED") return false;
          if (m.payload.run_id !== runId) return false;
          if (m.payload.runtime_kind !== "codex_app_server") return false;
          const total = asNumber(m.payload.accounting_total_tokens) ?? asNumber(m.payload.reported_total_tokens);
          return total !== null && total > 0;
        }, `${label} token usage`);
        await waitForMessageAfter(messages, startIndex, (m) => m.type === "AGENT_STATUS" && m.payload.status === "idle", `${label} idle`);
        return captureTokenUsage(label, marker, tokenUsageMessage.payload);
      };

      const captures: TokenUsageCapture[] = [];
      captures.push(await sendRound("turn_1_warmup_unique_large_static_prefix", "A", "Reply exactly: A"));
      captures.push(await sendRound("turn_2_same_static_prefix_short_delta", "B", "Reply exactly: B"));
      captures.push(await sendRound("turn_3_same_static_prefix_short_delta", "C", "Reply exactly: C"));
      const novelSuffix = makeLargeNovelUserSuffix(nonce, novelSuffixLineCount);
      captures.push(await sendRound(
        "turn_4_large_new_user_suffix",
        "D",
        `Reply exactly: D\n\nThe following block is new in this turn and should not have been provider-cached before this turn:\n${novelSuffix}`,
      ));
      captures.push(await sendRound("turn_5_after_novel_suffix_recovery_short_delta", "E", "Reply exactly: E"));

      const summary = await execGraphql<{ getAgentRunTokenUsageSummary: Record<string, unknown> }>(`
        query RunTokenUsage($runId: String!) {
          getAgentRunTokenUsageSummary(runId: $runId) {
            runId grossInputTokens standardInputTokens cacheReadInputTokens outputTokens totalTokens
            cacheReadInputTokenRate standardInputTokenRate cacheState estimatedApiTotalCost currency apiCostStatus
            latestPromptTokens effectiveContextWindowTokens contextWindowUsagePercent latestModelIdentifier latestRuntimeKind usageReportCount
          }
        }
      `, { runId });

      const evidence = {
        ok: true,
        probe: "codex_cache_rate_live_probe",
        model: llmModelIdentifier,
        runId,
        nonce,
        completed_at: new Date().toISOString(),
        prompt_shape: {
          instruction_line_count: instructionLineCount,
          novel_user_suffix_line_count: novelSuffixLineCount,
          turns: captures.map((capture) => capture.label),
        },
        captures,
        derived: {
          cache_rates: captures.map((capture) => ({ label: capture.label, cacheRate: capture.cacheRate, uncachedRate: capture.uncachedRate, inputTokens: capture.inputTokens, cachedInputTokens: capture.cachedInputTokens, standardInputTokens: capture.standardInputTokens })),
          warmup_to_turn2_cache_rate_delta: captures[1]?.cacheRate !== null && captures[0]?.cacheRate !== null ? captures[1]!.cacheRate! - captures[0]!.cacheRate! : null,
          turn4_new_suffix_standard_input_delta_vs_turn3: captures[3]?.standardInputTokens !== null && captures[2]?.standardInputTokens !== null ? captures[3]!.standardInputTokens! - captures[2]!.standardInputTokens! : null,
          turn5_recovery_standard_input_delta_vs_turn4: captures[4]?.standardInputTokens !== null && captures[3]?.standardInputTokens !== null ? captures[4]!.standardInputTokens! - captures[3]!.standardInputTokens! : null,
        },
        summary: summary.getAgentRunTokenUsageSummary,
      };
      await mkdir(evidenceDir, { recursive: true });
      const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-codex-cache-rate-live-probe.json`);
      await writeFile(file, JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify({ ok: true, evidence_file: file, model: llmModelIdentifier, captures: evidence.derived.cache_rates, summary: summary.getAgentRunTokenUsageSummary }, null, 2));
    } finally {
      try { socket?.close(); } catch {}
      try { await app?.close(); } catch {}
      for (const runId of createdRunIds) {
        try { await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId } }); } catch {}
      }
      try { await getCodexAppServerClientManager().close(); } catch {}
      await rm(workspaceRootPath, { recursive: true, force: true }).catch(() => undefined);
      await rm(testDataDir, { recursive: true, force: true }).catch(() => undefined);
      await prisma.$disconnect().catch(() => undefined);
    }
  }, TIMEOUT_MS);
});
