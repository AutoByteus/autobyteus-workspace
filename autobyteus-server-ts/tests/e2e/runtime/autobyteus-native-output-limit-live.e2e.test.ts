/**
 * Live AutoByteus (native runtime) output-limit E2E, run through the real studio server (HTTP GraphQL + agent
 * WebSocket) with real providers. It enters through the same commands the desktop app sends: create an agent run
 * (optionally with a configured `max_tokens` in its model config) and send a message.
 *
 * Validation harness (test-only): `globalThis.fetch` is wrapped to record every outgoing provider POST body exactly as
 * production built it, with its status and response stop signals. Only host and path are recorded (never the query
 * string or headers, which can carry keys).
 *
 * Cases (each needs its provider key; a case whose key is missing is skipped, and a skip is not a pass):
 *   OLM-E2E-001  Anthropic, unconfigured: every streamed request carries the model's maximum output tokens
 *                (128000 for claude-opus-5-5), and one write_file call longer than 8,192 output tokens is written
 *                (the original "Anthropic content block is incomplete." failure) (AC-001, SCN-001)
 *   OLM-E2E-002  Anthropic, `max_tokens: 4096` configured on the run: sent unchanged (AC-001, BEH-004)
 *   OLM-E2E-003  Anthropic non-streaming call through the production construction path, unconfigured: 8192, accepted
 *                (AC-008, REQ-007)
 *   OLM-E2E-004..009  Unconfigured native agent turn per provider family: the request carries the catalog maximum
 *                under the provider's parameter name, or omits it for a model with no known limit (AC-013, RSK-004)
 *   OLM-E2E-010  DeepSeek and GLM, `max_tokens: 24` configured: sent as `max_tokens`, and the provider applies it
 *                (finish reason `length`) (RSK-004)
 *
 * Gate: RUN_NATIVE_OUTPUT_LIMIT_E2E=1 plus the provider keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY,
 * GLM_API_KEY, VERTEX_AI_API_KEY, DASHSCOPE_API_KEY, GROK_API_KEY), saved into the test-owned database vault and never
 * logged. Run it with a clean environment (`env -i PATH=… HOME=… TMPDIR=…`) so no live-app variable leaks in; pass
 * QWEN_BASE_URL for a regional Qwen endpoint. Uses real credits: OLM-E2E-001 generates one ~20K-token Opus answer
 * (several minutes); every other case is a one-word answer.
 * Optional: OUTPUT_LIMIT_E2E_ANTHROPIC_MODEL (default claude-opus-5-5), OUTPUT_LIMIT_E2E_<PROVIDER>_MODEL,
 * OUTPUT_LIMIT_E2E_EVIDENCE_DIR (keeps per-call summaries and case results), OUTPUT_LIMIT_E2E_STEP_TIMEOUT_MS
 * (default 1200000).
 */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { LLMUserMessage } from "autobyteus-ts/llm/user-message.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { createAvailableLlm } from "../../../src/agent-execution/backends/autobyteus/available-llm-construction.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_NATIVE_OUTPUT_LIMIT_E2E === "1";
const describeLive = ENABLED ? describe : describe.skip;
const hasKey = (alias: string) => Boolean(process.env[alias]?.trim());
const STEP_TIMEOUT_MS = Number(process.env.OUTPUT_LIMIT_E2E_STEP_TIMEOUT_MS || 1_200_000);
const EVIDENCE_DIR = process.env.OUTPUT_LIMIT_E2E_EVIDENCE_DIR?.trim() || null;
const ANTHROPIC_MODEL = process.env.OUTPUT_LIMIT_E2E_ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
/** The bounded non-streaming Claude default (REQ-007). */
const ANTHROPIC_NON_STREAMING_DEFAULT = 8192;
/** The streaming default before this change; the large write must exceed it in one response. */
const PREVIOUS_STREAMING_DEFAULT = 8192;
const LARGE_FILE = "large-output.txt";
const LARGE_FILE_LINES = 900;
const PONG = "Reply with the single word pong.";

type Json = Record<string, unknown>;
type LimitFields = {
  max_tokens?: unknown;
  max_completion_tokens?: unknown;
  max_output_tokens?: unknown;
  maxOutputTokens?: unknown;
  num_predict?: unknown;
};
type CapturedCall = {
  index: number;
  phase: string;
  host: string;
  pathname: string;
  stream: boolean;
  limits: LimitFields;
  status: number | null;
  stopSignals: string[];
  maxReportedOutputTokens: number | null;
  errorBody: string | null;
  settled: Promise<void>;
};
type WsMessage = { type: string; payload: Json };
type ProviderCase = {
  id: string;
  providerId: string;
  keyAlias: string;
  model: string;
  /** The field a known limit must be sent under; the others must be absent. */
  field: keyof LimitFields;
  geminiMode?: "VERTEX_EXPRESS";
};

const LIMIT_FIELD_NAMES: Array<keyof LimitFields> = ["max_tokens", "max_completion_tokens", "max_output_tokens", "maxOutputTokens", "num_predict"];
const PROVIDER_CASES: ProviderCase[] = [
  { id: "OLM-E2E-004", providerId: "OPENAI", keyAlias: "OPENAI_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_OPENAI_MODEL?.trim() || "gpt-5.4-mini", field: "max_output_tokens" },
  { id: "OLM-E2E-005", providerId: "DEEPSEEK", keyAlias: "DEEPSEEK_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash", field: "max_tokens" },
  { id: "OLM-E2E-006", providerId: "GLM", keyAlias: "GLM_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GLM_MODEL?.trim() || "glm-5.3", field: "max_tokens" },
  { id: "OLM-E2E-007", providerId: "GEMINI", keyAlias: "VERTEX_AI_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GEMINI_MODEL?.trim() || "gemini-3.8-flash", field: "maxOutputTokens", geminiMode: "VERTEX_EXPRESS" },
  { id: "OLM-E2E-008", providerId: "QWEN", keyAlias: "DASHSCOPE_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_QWEN_MODEL?.trim() || "qwen3.7-max", field: "max_completion_tokens" },
  { id: "OLM-E2E-009", providerId: "GROK", keyAlias: "GROK_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GROK_MODEL?.trim() || "grok-4.7", field: "max_completion_tokens" },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";

/** Output-limit fields wherever the provider SDKs put them (top level, Gemini `generationConfig`, Ollama `options`). */
const readLimitFields = (body: Json): LimitFields => {
  const sources = [body, isRecord(body.generationConfig) ? body.generationConfig : {}, isRecord(body.options) ? body.options : {}];
  const limits: LimitFields = {};
  for (const source of sources) {
    for (const name of LIMIT_FIELD_NAMES) {
      if (Object.hasOwn(source, name)) limits[name] = source[name];
    }
  }
  return limits;
};

/** Stop / finish reasons and the largest reported output-token count in a (streamed or plain) response. */
const readResponseSignals = (text: string) => {
  const stopSignals = new Set<string>();
  for (const match of text.matchAll(/"(?:stop_reason|finish_reason|finishReason)"\s*:\s*"([^"]+)"/g)) stopSignals.add(match[1]!);
  for (const match of text.matchAll(/"status"\s*:\s*"(incomplete|completed|failed)"/g)) stopSignals.add(`status:${match[1]}`);
  let maxTokens: number | null = null;
  for (const match of text.matchAll(/"(?:output_tokens|completion_tokens|candidatesTokenCount)"\s*:\s*(\d+)/g)) {
    maxTokens = Math.max(maxTokens ?? 0, Number(match[1]));
  }
  return { stopSignals: [...stopSignals], maxReportedOutputTokens: maxTokens };
};

describeLive("AutoByteus native runtime output limits (live, wire-level)", () => {
  const calls: CapturedCall[] = [];
  const caseResults: Json[] = [];
  const tempDirs = new Set<string>();
  const runIds = new Set<string>();
  const sockets = new Set<WebSocket>();
  const originalFetch = globalThis.fetch;
  let phase = "setup";
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let agentDefinitionId = "";
  let writerDefinitionId = "";
  let currentCase: { id: string; details: Json } | null = null;

  // ---- wire recorder (validation harness) ----
  const installRecorder = () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      let parsedUrl: URL | null = null;
      try { parsedUrl = new URL(url); } catch { /* not absolute */ }
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (!parsedUrl || isLocalHost(parsedUrl.hostname) || method !== "POST" || typeof init?.body !== "string") {
        return originalFetch(input, init);
      }
      let body: Json;
      try { body = JSON.parse(init.body) as Json; } catch { return originalFetch(input, init); }
      const record: CapturedCall = {
        index: calls.length, phase, host: parsedUrl.hostname, pathname: parsedUrl.pathname,
        stream: body.stream === true || parsedUrl.pathname.includes("streamGenerateContent"),
        limits: readLimitFields(body), status: null, stopSignals: [], maxReportedOutputTokens: null, errorBody: null,
        settled: Promise.resolve(),
      };
      calls.push(record);
      const response = await originalFetch(input, init);
      record.status = response.status;
      record.settled = response.clone().text().then((text) => {
        if (!response.ok) { record.errorBody = text.slice(0, 1500); return; }
        Object.assign(record, readResponseSignals(text));
      }).catch((error: unknown) => { record.errorBody = `response read failed: ${String(error)}`; });
      return response;
    }) as typeof fetch;
  };
  const settleCalls = async () => { await Promise.all(calls.map((call) => call.settled)); };
  const callsOf = (callPhase: string) => calls.filter((call) => call.phase === callPhase);
  const summarize = (call: CapturedCall) => ({
    index: call.index, phase: call.phase, host: call.host, pathname: call.pathname, stream: call.stream, limits: call.limits,
    status: call.status, stopSignals: call.stopSignals, maxReportedOutputTokens: call.maxReportedOutputTokens, errorBody: call.errorBody,
  });
  const writeEvidence = async () => {
    if (!EVIDENCE_DIR) return;
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await settleCalls();
    await writeFile(path.join(EVIDENCE_DIR, "calls-summary.json"), JSON.stringify(calls.map(summarize), null, 2));
    await writeFile(path.join(EVIDENCE_DIR, "case-results.json"), JSON.stringify(caseResults, null, 2));
  };

  // ---- server, GraphQL, WebSocket ----
  const gql = async <T>(query: string, variables: Json = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };

  const catalogModel = async (providerId: string, model: string) => {
    const result = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string; value: string; maxOutputTokens: number | null }> } }>(
      `mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value maxOutputTokens } } }`,
      { p: providerId, r: "autobyteus" });
    const models = result.ensureProviderModelCatalog.llmModels;
    const found = models.find((entry) => entry.value === model) ?? models.find((entry) => entry.modelIdentifier === model);
    expect(found, `${providerId} model ${model} in ${models.map((entry) => entry.value).join(", ")}`).toBeTruthy();
    return found!;
  };

  type RunSession = { runId: string; socket: WebSocket; frames: WsMessage[]; workspaceRootPath: string };
  const startRun = async (definitionId: string, modelIdentifier: string, llmConfig: Json | null): Promise<RunSession> => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "output-limit-e2e-ws-"));
    tempDirs.add(workspaceRootPath);
    const run = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus", llmConfig } });
    expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
    const runId = run.createAgentRun.runId!;
    runIds.add(runId);
    const frames: WsMessage[] = [];
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    socket.on("message", (raw) => {
      let parsed: { type?: unknown; payload?: unknown };
      try { parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown }; } catch { return; }
      if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} });
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    sockets.add(socket);
    const session = { runId, socket, frames, workspaceRootPath };
    await waitFor(session, 0, (frame) => frame.type === "CONNECTED", "CONNECTED", 60_000);
    return session;
  };

  const waitFor = async (session: RunSession, from: number, predicate: (frame: WsMessage) => boolean, label: string, timeoutMs = STEP_TIMEOUT_MS) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = session.frames.slice(from).find(predicate);
      if (found) return found;
      await wait(300);
    }
    const tail = session.frames.slice(-15).map((frame) => `${frame.type}:${JSON.stringify(frame.payload).slice(0, 160)}`).join(" | ");
    throw new Error(`Timed out waiting for ${label}. Recent frames: ${tail}`);
  };

  /** Sends one user message and waits until the turn ends and the agent is idle; returns any ERROR frame. */
  const runTurn = async (session: RunSession, turnPhase: string, content: string) => {
    phase = turnPhase;
    const from = session.frames.length;
    sendE2eSendMessageCommand(session.socket, { content });
    await waitFor(session, from, (frame) => frame.type === "TURN_STARTED" || frame.type === "ERROR", `${turnPhase} TURN_STARTED`);
    await waitFor(session, from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "ERROR", `${turnPhase} TURN_COMPLETED`);
    await waitFor(session, from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", `${turnPhase} idle`);
    await settleCalls();
    return session.frames.slice(from).find((frame) => frame.type === "ERROR") ?? null;
  };

  const stopRun = async (session: RunSession) => {
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: session.runId }).catch(() => undefined);
    runIds.delete(session.runId);
    await new Promise<void>((resolve) => { session.socket.once("close", () => resolve()); session.socket.close(); setTimeout(resolve, 3_000); });
    sockets.delete(session.socket);
  };

  const createDefinition = async (name: string, instructions: string, toolNames: string[]) => {
    const created = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID().slice(0, 8)}`, role: "engineer", description: "Live output-limit validation agent.",
        instructions, category: "runtime-e2e", toolNames, skillNames: [] } });
    return created.createAgentDefinition.id;
  };

  const assertAccepted = (phaseCalls: CapturedCall[], label: string) => {
    expect(phaseCalls.length, `${label}: no provider call captured`).toBeGreaterThan(0);
    for (const call of phaseCalls) expect(call.status, `${label} call ${call.index}: ${call.errorBody}`).toBe(200);
  };
  /** Known limit: sent under `field` with exactly that value, and no other limit field. Unknown: no limit field at all. */
  const assertLimit = (call: CapturedCall, field: keyof LimitFields, expected: number | null, label: string) => {
    if (expected === null) {
      expect(call.limits, `${label} call ${call.index}: unknown-limit model must omit every limit field`).toEqual({});
      return;
    }
    expect(call.limits, `${label} call ${call.index}`).toEqual({ [field]: expected });
  };

  const recordCase = (id: string, details: Json) => { currentCase = { id, details }; };

  beforeAll(async () => {
    installRecorder();
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "output-limit-e2e-appdata-"));
    tempDirs.add(dataDir);
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
    agentDefinitionId = await createDefinition("output-limit-e2e", "You are a concise assistant. Answer exactly what is asked.", []);
    writerDefinitionId = await createDefinition("output-limit-e2e-writer", [
      "You are a file-writing agent. When asked to create a file, call write_file exactly once with the complete content.",
      "Never abbreviate, summarize or elide file content, and never use placeholders such as '...'.",
      "After the file is written, reply with the single word done.",
    ].join("\n"), ["write_file"]);
  }, 300_000);

  afterEach(async (context) => {
    const state = context.task.result?.state ?? "unknown";
    const errors = (context.task.result?.errors ?? []).map((error) => String(error.message ?? error).slice(0, 1500));
    caseResults.push({ case: currentCase?.id ?? context.task.name, name: context.task.name, state, errors, details: currentCase?.details ?? null, at: new Date().toISOString() });
    currentCase = null;
    await writeEvidence().catch(() => undefined);
  });

  afterAll(async () => {
    await writeEvidence().catch(() => undefined);
    for (const socket of sockets) socket.close();
    for (const runId of runIds) {
      await Promise.race([
        gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined),
        wait(60_000),
      ]);
    }
    for (const id of [agentDefinitionId, writerDefinitionId].filter(Boolean)) {
      await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    }
    await app?.close();
    app = null;
    await closeLiveRuntimeSecretVault();
    globalThis.fetch = originalFetch;
    for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
    // Run memory persistence (e.g. file_changes.json) can flush once more after the runs stop; remove it again.
    await wait(3_000);
    for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
  }, 180_000);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-001: Anthropic unconfigured streams the model maximum and writes a file longer than 8,192 output tokens in one call", async () => {
    const model = await catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    expect(model.maxOutputTokens, "catalog maximum output tokens").not.toBeNull();
    if (ANTHROPIC_MODEL === "claude-opus-5-5") expect(model.maxOutputTokens).toBe(128_000);
    const session = await startRun(writerDefinitionId, model.modelIdentifier, null);
    const error = await runTurn(session, "OLM-001", [
      `Create the file ${LARGE_FILE} with write_file in one single call.`,
      `It must contain exactly ${LARGE_FILE_LINES} lines. Line N (for every N from 1 to ${LARGE_FILE_LINES}) is exactly:`,
      "\"Line N: this sentence belongs to the output-limit validation file and is written out in full with its own number N.\"",
      "Write every line in full, in order, with the real number in place of N, and no ellipsis, placeholder or omission.",
    ].join("\n"));
    const phaseCalls = callsOf("OLM-001");
    const toolCall = phaseCalls.find((call) => call.stopSignals.includes("tool_use"));
    const filePath = path.join(session.workspaceRootPath, LARGE_FILE);
    const fileStat = await stat(filePath).catch(() => null);
    const lines = fileStat ? (await readFile(filePath, "utf-8")).split("\n").filter((line) => line.trim()).length : 0;
    recordCase("OLM-E2E-001", {
      model: model.modelIdentifier, catalogMaxOutputTokens: model.maxOutputTokens, error: error?.payload ?? null,
      calls: phaseCalls.map(summarize), toolCallOutputTokens: toolCall?.maxReportedOutputTokens ?? null,
      fileBytes: fileStat?.size ?? null, fileLines: lines,
    });
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    assertAccepted(phaseCalls, "OLM-001");
    for (const call of phaseCalls) {
      expect(call.stream, `call ${call.index} streamed`).toBe(true);
      assertLimit(call, "max_tokens", model.maxOutputTokens, "OLM-001");
    }
    expect(toolCall, "a response that ended with tool_use").toBeTruthy();
    expect(toolCall!.maxReportedOutputTokens!, "the write_file response exceeded the previous 8,192 default").toBeGreaterThan(PREVIOUS_STREAMING_DEFAULT);
    expect(fileStat, `${LARGE_FILE} written`).not.toBeNull();
    // ~4 characters per token: the written content itself is larger than 8,192 tokens' worth of text.
    expect(fileStat!.size).toBeGreaterThan(PREVIOUS_STREAMING_DEFAULT * 4);
    await stopRun(session);
  }, STEP_TIMEOUT_MS + 120_000);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-002: Anthropic run with max_tokens 4096 configured sends 4096 unchanged", async () => {
    const model = await catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    const session = await startRun(agentDefinitionId, model.modelIdentifier, { max_tokens: 4096 });
    const error = await runTurn(session, "OLM-002", PONG);
    const phaseCalls = callsOf("OLM-002");
    recordCase("OLM-E2E-002", { model: model.modelIdentifier, error: error?.payload ?? null, calls: phaseCalls.map(summarize) });
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    assertAccepted(phaseCalls, "OLM-002");
    for (const call of phaseCalls) assertLimit(call, "max_tokens", 4096, "OLM-002");
    await stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-003: Anthropic non-streaming call without a configured limit sends the bounded 8192 and succeeds", async () => {
    const model = await catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    phase = "OLM-003";
    const llm = await createAvailableLlm(model.modelIdentifier);
    let content = "";
    try {
      const response = await llm.sendUserMessage(new LLMUserMessage({ content: PONG }));
      content = response.content ?? "";
    } finally {
      await llm.cleanup();
    }
    await settleCalls();
    const phaseCalls = callsOf("OLM-003");
    recordCase("OLM-E2E-003", { model: model.modelIdentifier, contentLength: content.length, calls: phaseCalls.map(summarize) });
    assertAccepted(phaseCalls, "OLM-003");
    for (const call of phaseCalls) {
      expect(call.stream, `call ${call.index} is non-streaming`).toBe(false);
      assertLimit(call, "max_tokens", ANTHROPIC_NON_STREAMING_DEFAULT, "OLM-003");
    }
    expect(content.trim().length).toBeGreaterThan(0);
  }, STEP_TIMEOUT_MS);

  for (const providerCase of PROVIDER_CASES) {
    it.skipIf(!hasKey(providerCase.keyAlias))(`${providerCase.id}: ${providerCase.providerId} ${providerCase.model} unconfigured sends the catalog maximum as ${providerCase.field} (or omits an unknown limit)`, async () => {
      if (providerCase.geminiMode) {
        await gql("mutation($mode: GeminiSetupMode!) { useGeminiMode(mode: $mode) { setup { activeMode } } }", { mode: providerCase.geminiMode });
      }
      const model = await catalogModel(providerCase.providerId, providerCase.model);
      const session = await startRun(agentDefinitionId, model.modelIdentifier, null);
      const error = await runTurn(session, providerCase.id, PONG);
      const phaseCalls = callsOf(providerCase.id);
      recordCase(providerCase.id, { model: model.modelIdentifier, catalogMaxOutputTokens: model.maxOutputTokens, error: error?.payload ?? null, calls: phaseCalls.map(summarize) });
      expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
      assertAccepted(phaseCalls, providerCase.id);
      for (const call of phaseCalls) assertLimit(call, providerCase.field, model.maxOutputTokens, providerCase.id);
      await stopRun(session);
    }, STEP_TIMEOUT_MS);
  }

  for (const providerCase of PROVIDER_CASES.filter((entry) => entry.field === "max_tokens")) {
    it.skipIf(!hasKey(providerCase.keyAlias))(`OLM-E2E-010 (${providerCase.providerId}): a configured max_tokens 24 is sent as max_tokens and the provider applies it`, async () => {
      const model = await catalogModel(providerCase.providerId, providerCase.model);
      const session = await startRun(agentDefinitionId, model.modelIdentifier, { max_tokens: 24 });
      const casePhase = `OLM-010-${providerCase.providerId}`;
      const error = await runTurn(session, casePhase, "Count from 1 to 300, separated by single spaces. Output only the numbers.");
      const phaseCalls = callsOf(casePhase);
      recordCase(`OLM-E2E-010-${providerCase.providerId}`, { model: model.modelIdentifier, error: error?.payload ?? null, calls: phaseCalls.map(summarize) });
      assertAccepted(phaseCalls, casePhase);
      for (const call of phaseCalls) assertLimit(call, "max_tokens", 24, casePhase);
      // A counted 1..300 answer is ~600 tokens; finish reason `length` shows the provider applied the 24-token field.
      expect(phaseCalls[0]!.stopSignals, "provider finish reasons").toContain("length");
      await stopRun(session);
    }, STEP_TIMEOUT_MS);
  }
});
