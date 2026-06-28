import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
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
import { CodexThread } from "../../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.js";
import { getCodexAppServerClientManager } from "../../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { sendE2eSendMessageCommand } from "../../../../autobyteus-server-ts/tests/e2e/helpers/websocket-command-helpers.js";
import type { CodexReadyTurnTokenUsage } from "../../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.js";

const prisma = new PrismaClient();
const TIMEOUT_MS = Number(process.env.CODEX_TOKEN_ACCOUNTING_PROBE_TIMEOUT_MS || 900_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CODEX_TOKEN_ACCOUNTING_PROBE_EVENT_WAIT_TIMEOUT_MS || 300_000);
const evidenceDir = path.resolve(process.cwd(), "../tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence");

type WsMessage = { type: string; payload: Record<string, unknown> };
type RecordUsageCall = {
  index: number;
  runId: string;
  turnId: string;
  statusBefore: string | null;
  hadPendingBefore: boolean;
  readyBefore: boolean;
  usage: CodexReadyTurnTokenUsage;
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
  const preview = messages.slice(Math.max(startIndex, messages.length - 50)).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 260)}`).join(" | ");
  throw new Error(`Timed out waiting for ${label}. preview=${preview}`);
};

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) return override;
  for (const preferred of ["gpt-5.5", "gpt-5.4-mini", "gpt-5.4", "gpt-5.3-codex-spark", "gpt-5.3-codex"]) {
    if (modelIdentifiers.includes(preferred)) return preferred;
  }
  return modelIdentifiers.find((m) => m.toLowerCase().includes("codex")) ?? modelIdentifiers[0]!;
};

const totalUsage = (usage: CodexReadyTurnTokenUsage): Record<string, number | null> => {
  const rawEvent = asRecord(usage.raw_event_json);
  const tokenUsage = asRecord(rawEvent?.tokenUsage);
  const total = asRecord(tokenUsage?.total);
  return {
    inputTokens: asNumber(total?.inputTokens),
    cachedInputTokens: asNumber(total?.cachedInputTokens),
    outputTokens: asNumber(total?.outputTokens),
    reasoningOutputTokens: asNumber(total?.reasoningOutputTokens),
    totalTokens: asNumber(total?.totalTokens),
  };
};

const lastUsage = (usage: CodexReadyTurnTokenUsage): Record<string, number | null> => ({
  inputTokens: usage.reported_input_tokens,
  cachedInputTokens: usage.cache_read_input_tokens,
  outputTokens: usage.reported_output_tokens,
  reasoningOutputTokens: usage.reasoning_output_tokens,
  totalTokens: usage.reported_total_tokens,
});

const diff = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : a - b;

const summarizeRecordCalls = (calls: RecordUsageCall[]) => calls.map((call, index) => {
  const total = totalUsage(call.usage);
  const last = lastUsage(call.usage);
  const previousTotal = index > 0 ? totalUsage(calls[index - 1]!.usage) : null;
  const totalDelta = previousTotal ? {
    inputTokens: diff(total.inputTokens, previousTotal.inputTokens),
    cachedInputTokens: diff(total.cachedInputTokens, previousTotal.cachedInputTokens),
    outputTokens: diff(total.outputTokens, previousTotal.outputTokens),
    reasoningOutputTokens: diff(total.reasoningOutputTokens, previousTotal.reasoningOutputTokens),
    totalTokens: diff(total.totalTokens, previousTotal.totalTokens),
  } : null;
  const unaccountedVsLast = totalDelta ? {
    inputTokens: diff(totalDelta.inputTokens, last.inputTokens),
    cachedInputTokens: diff(totalDelta.cachedInputTokens, last.cachedInputTokens),
    outputTokens: diff(totalDelta.outputTokens, last.outputTokens),
    reasoningOutputTokens: diff(totalDelta.reasoningOutputTokens, last.reasoningOutputTokens),
    totalTokens: diff(totalDelta.totalTokens, last.totalTokens),
  } : null;
  return {
    index: call.index,
    runId: call.runId,
    turnId: call.turnId,
    statusBefore: call.statusBefore,
    hadPendingBefore: call.hadPendingBefore,
    readyBefore: call.readyBefore,
    usageScope: call.usage.usage_scope,
    idempotencyKey: call.usage.idempotency_key,
    capturedUsage: call.usage,
    last,
    total,
    totalDeltaVsPreviousRecordCall: totalDelta,
    unaccountedTotalDeltaVsLast: unaccountedVsLast,
  };
});

describe("codex token accounting live probe", () => {
  it("compares received Codex usage records with cumulative total deltas across a tool-heavy turn", async () => {
    const recordCalls: RecordUsageCall[] = [];
    const originalRecordTurnTokenUsage = CodexThread.prototype.recordTurnTokenUsage;
    CodexThread.prototype.recordTurnTokenUsage = function patchedRecordTurnTokenUsage(
      this: CodexThread,
      turnId: string,
      usage: CodexReadyTurnTokenUsage,
    ): void {
      recordCalls.push({
        index: recordCalls.length,
        runId: this.runId,
        turnId,
        statusBefore: this.currentStatus,
        hadPendingBefore: this.pendingTurnTokenUsage.has(turnId),
        readyBefore: this.readyTurnTokenUsageTurnIds.has(turnId),
        usage: cloneJson(usage),
      });
      return originalRecordTurnTokenUsage.call(this, turnId, usage);
    };

    const testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-token-accounting-probe-data-"));
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-token-accounting-probe-workspace-"));
    const createdRunIds = new Set<string>();
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let app: Awaited<ReturnType<typeof fastify>> | null = null;
    let socket: WebSocket | null = null;
    const nonce = randomUUID().replace(/-/g, "_").slice(0, 12);
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

      const fileAPath = path.join(workspaceRootPath, `probe-a-${nonce}.txt`);
      const fileBPath = path.join(workspaceRootPath, `probe-b-${nonce}.txt`);
      const markerA = `ACCOUNTING_PROBE_A_${nonce}`;
      const markerB = `ACCOUNTING_PROBE_B_${nonce}`;
      await writeFile(fileAPath, `${markerA}\n`, "utf-8");
      await writeFile(fileBPath, `${markerB}\n`, "utf-8");

      const modelsResult = await execGraphql<{ availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }> }>(`
        query Models($runtimeKind: String) {
          availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { models { modelIdentifier } }
        }
      `, { runtimeKind: "codex_app_server" });
      const modelIdentifiers = modelsResult.availableLlmProvidersWithModels.flatMap((p) => p.models.map((m) => m.modelIdentifier).filter(Boolean));
      expect(modelIdentifiers.length).toBeGreaterThan(0);
      const llmModelIdentifier = chooseCodexModelIdentifier(modelIdentifiers);

      const agentResult = await execGraphql<{ createAgentDefinition: { id: string } }>(`
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) { id }
        }
      `, { input: {
        name: `codex-token-accounting-live-probe-${nonce}`,
        role: "assistant",
        description: "codex token accounting live probe",
        instructions: [
          "You are a controlled Codex token accounting probe agent.",
          "For the baseline request, answer directly with the requested marker and do not use tools.",
          "For the tool probe request, you must use shell/run_bash commands to inspect files in the workspace.",
          "When asked to inspect two files, run exactly two separate shell commands, one for each file, and do not combine them into one command.",
          "After the shell commands, answer only with the two observed marker strings separated by one space.",
        ].join("\n"),
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
        llmConfig: { reasoning_effort: "medium" },
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

      const waitForQuiescence = async (label: string, startIndex: number, recordStart: number, stableMs = 12_000, timeoutMs = 240_000) => {
        const deadline = Date.now() + timeoutMs;
        let lastMessageCount = messages.length;
        let lastRecordCount = recordCalls.length;
        let stableSince = Date.now();
        while (Date.now() < deadline) {
          if (messages.length !== lastMessageCount || recordCalls.length !== lastRecordCount) {
            lastMessageCount = messages.length;
            lastRecordCount = recordCalls.length;
            stableSince = Date.now();
          }
          if (Date.now() - stableSince >= stableMs) return;
          await wait(500);
        }
        const preview = messages.slice(Math.max(startIndex, messages.length - 80)).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 180)}`).join(" | ");
        throw new Error(`Timed out waiting for ${label} quiescence. records=${recordCalls.length - recordStart}; preview=${preview}`);
      };

      const sendRound = async (label: string, content: string, minTokenUsageMessages = 1) => {
        const startIndex = messages.length;
        const recordStart = recordCalls.length;
        sendE2eSendMessageCommand(socket!, { content });
        await waitForMessageAfter(messages, startIndex, (m) => m.type === "AGENT_COMMAND_ACK" && m.payload.accepted === true, `${label} ack`, 30_000);
        if (minTokenUsageMessages > 0) {
          await waitForMessageAfter(
            messages,
            startIndex,
            () => messages.slice(startIndex).filter((m) => m.type === "TOKEN_USAGE_UPDATED").length >= minTokenUsageMessages,
            `${label} ${minTokenUsageMessages} TOKEN_USAGE_UPDATED message(s)`,
            240_000,
          );
        }
        await waitForQuiescence(label, startIndex, recordStart);
        return {
          label,
          websocketTokenUsageMessages: messages.slice(startIndex).filter((m) => m.type === "TOKEN_USAGE_UPDATED").map((m) => cloneJson(m.payload)),
          recordCalls: summarizeRecordCalls(recordCalls.slice(recordStart)),
          messageTypes: messages.slice(startIndex).map((m) => m.type),
        };
      };

      const baseline = await sendRound("baseline_direct", `Reply exactly: BASELINE_${nonce}`, 1);
      const toolProbe = await sendRound(
        "tool_heavy_two_shell_commands",
        [
          "Inspect the two files below using exactly two separate shell/run_bash commands.",
          "First command: read only the first file.",
          "Second command: read only the second file.",
          "Do not combine these into one command.",
          "Then answer with the two marker strings separated by one space, and nothing else.",
          `First file: ${fileAPath}`,
          `Second file: ${fileBPath}`,
        ].join("\n"),
        1,
      );

      const rows = await prisma.tokenUsageLedgerEvent.findMany({
        where: { runId },
        orderBy: [{ observedAt: "asc" }, { id: "asc" }],
      });
      const ledgerRows = rows.map((row) => ({
        observedAt: row.observedAt.toISOString(),
        usageEventId: row.usageEventId,
        idempotencyKey: row.idempotencyKey,
        turnId: row.turnId,
        usageScope: row.usageScope,
        accountingInputTokens: row.accountingInputTokens,
        cacheReadInputTokens: row.cacheReadInputTokens,
        standardInputTokens: row.standardInputTokens,
        accountingOutputTokens: row.accountingOutputTokens,
        reasoningOutputTokens: row.reasoningOutputTokens,
        rawUsageJson: row.rawUsageJson ? JSON.parse(row.rawUsageJson) : null,
        rawEventJson: row.rawEventJson ? JSON.parse(row.rawEventJson) : null,
      }));

      const allRecordSummaries = summarizeRecordCalls(recordCalls.filter((call) => call.runId === runId));
      const overwrittenPendingCalls = allRecordSummaries.filter((call) => call.hadPendingBefore);
      const unreconciledPositive = allRecordSummaries.filter((call) => {
        const gap = call.unaccountedTotalDeltaVsLast;
        return Boolean(gap && Object.values(gap).some((value) => typeof value === "number" && value > 0));
      });

      const evidence = {
        ok: true,
        probe: "codex_token_accounting_live_probe",
        model: llmModelIdentifier,
        runId,
        nonce,
        completed_at: new Date().toISOString(),
        prompt_shape: {
          baseline: "direct no-tool response",
          tool_probe: "one user turn requesting exactly two separate shell/run_bash file reads before final answer",
        },
        files: { fileAPath, fileBPath, markerA, markerB },
        rounds: [baseline, toolProbe],
        allRecordTurnTokenUsageCalls: allRecordSummaries,
        overwrittenPendingCalls,
        unreconciledPositive,
        ledgerRows,
        websocketTokenUsageCount: [baseline, toolProbe].reduce((sum, round) => sum + round.websocketTokenUsageMessages.length, 0),
        recordTurnTokenUsageCallCount: allRecordSummaries.length,
        ledgerRowCount: ledgerRows.length,
        conclusion: overwrittenPendingCalls.length > 0 || unreconciledPositive.length > 0
          ? "Potential undercount/reconciliation issue observed: either pending usage was overwritten before persistence or cumulative total deltas exceeded the accounted last payload."
          : "No overwrite or cumulative-vs-last positive gap observed in this probe run.",
      };
      await mkdir(evidenceDir, { recursive: true });
      const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-codex-token-accounting-live-probe.json`);
      await writeFile(file, JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify({ ok: true, evidence_file: file, model: llmModelIdentifier, runId, conclusion: evidence.conclusion, counts: { recordCalls: allRecordSummaries.length, ledgerRows: ledgerRows.length, wsTokenUsage: evidence.websocketTokenUsageCount, overwritten: overwrittenPendingCalls.length, unreconciled: unreconciledPositive.length }, recordSummaries: allRecordSummaries }, null, 2));

      expect(allRecordSummaries.length).toBeGreaterThan(0);
      expect(ledgerRows.length).toBeGreaterThan(0);
    } finally {
      CodexThread.prototype.recordTurnTokenUsage = originalRecordTurnTokenUsage;
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
