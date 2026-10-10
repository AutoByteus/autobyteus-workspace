/**
 * Shared harness for the native-runtime (AutoByteus) live provider E2E suites. It runs the real studio server in
 * process, drives agent runs through GraphQL and the agent WebSocket as the desktop app does, and records every
 * outgoing provider POST exactly as production built it.
 *
 * The recorder never stores query strings or headers (they can carry keys). A test may install a one-shot response
 * rewrite for the next provider call to emulate a provider stream shape that real use produces but that cannot be
 * requested on demand (a network cut before `message_stop`, a refusal stop, a malformed tool-call argument). The
 * rewrite only edits the real provider response text; the request still goes to the provider.
 */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { expect } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "./live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "./studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "./websocket-command-helpers.js";

export type Json = Record<string, unknown>;
export type LimitFields = {
  max_tokens?: unknown;
  max_completion_tokens?: unknown;
  max_output_tokens?: unknown;
  maxOutputTokens?: unknown;
  num_predict?: unknown;
};
export type CapturedCall = {
  index: number;
  phase: string;
  host: string;
  pathname: string;
  stream: boolean;
  limits: LimitFields;
  body: Json;
  rewritten: boolean;
  status: number | null;
  stopSignals: string[];
  maxReportedOutputTokens: number | null;
  /** The response streamed or returned at least one tool call (Anthropic `tool_use`, OpenAI `tool_calls`, Gemini `functionCall`). */
  responseHasToolCall: boolean;
  errorBody: string | null;
  settled: Promise<void>;
};
export type WsMessage = { type: string; payload: Json };
export type RunSession = { runId: string; socket: WebSocket; frames: WsMessage[]; workspaceRootPath: string };
export type CatalogModel = { modelIdentifier: string; value: string; maxOutputTokens: number | null };
/** Edits one real provider response body; return the text unchanged when the rewrite does not apply. */
export type ResponseRewrite = (text: string) => string;

const LIMIT_FIELD_NAMES: Array<keyof LimitFields> = ["max_tokens", "max_completion_tokens", "max_output_tokens", "maxOutputTokens", "num_predict"];

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";

/** Output-limit fields wherever the provider SDKs put them (top level, Gemini `generationConfig`, Ollama `options`). */
export const readLimitFields = (body: Json): LimitFields => {
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
export const readResponseSignals = (text: string) => {
  const stopSignals = new Set<string>();
  for (const match of text.matchAll(/"(?:stop_reason|finish_reason|finishReason)"\s*:\s*"([^"]+)"/g)) stopSignals.add(match[1]!);
  for (const match of text.matchAll(/"status"\s*:\s*"(incomplete|completed|failed)"/g)) stopSignals.add(`status:${match[1]}`);
  let maxTokens: number | null = null;
  for (const match of text.matchAll(/"(?:output_tokens|completion_tokens|candidatesTokenCount)"\s*:\s*(\d+)/g)) {
    maxTokens = Math.max(maxTokens ?? 0, Number(match[1]));
  }
  const responseHasToolCall = /"type"\s*:\s*"tool_use"|"tool_calls"\s*:\s*\[\s*\{|"functionCall"\s*:|"type"\s*:\s*"function_call"/.test(text);
  return { stopSignals: [...stopSignals], maxReportedOutputTokens: maxTokens, responseHasToolCall };
};

/** The text of every content block / message content in a chat request, flattened per message (Anthropic and OpenAI shapes). */
export const requestMessages = (body: Json): Array<{ role: string; text: string; toolUses: number; toolResults: string[] }> => {
  const messages = Array.isArray(body.messages) ? body.messages as Json[] : [];
  return messages.map((message) => {
    const role = String(message.role);
    const blocks = typeof message.content === "string" ? [{ type: "text", text: message.content }]
      : Array.isArray(message.content) ? message.content as Json[] : [];
    const text = blocks.filter((block) => block.type === "text" || typeof block.text === "string").map((block) => String(block.text ?? "")).join("\n");
    const anthropicToolUses = blocks.filter((block) => block.type === "tool_use").length;
    const openAiToolUses = Array.isArray(message.tool_calls) ? message.tool_calls.length : 0;
    const toolResults = [
      ...blocks.filter((block) => block.type === "tool_result").map((block) => JSON.stringify(block.content ?? "")),
      ...(role === "tool" ? [typeof message.content === "string" ? message.content : JSON.stringify(message.content)] : []),
    ];
    return { role, text, toolUses: anthropicToolUses + openAiToolUses, toolResults };
  });
};

/** A compact, value-safe view of WebSocket frames for evidence and assertions. */
export const frameDigest = (frames: WsMessage[]) => frames
  .filter((frame) => !["SEGMENT_CONTENT", "AGENT_INPUT_STATE"].includes(frame.type))
  .map((frame) => {
    const pick: Json = { type: frame.type };
    for (const key of ["segment_type", "status", "code", "failed", "error", "message", "tool_name", "completion_status", "completion_reason", "outcome", "phase", "state"]) {
      const value = frame.payload[key];
      if (value !== undefined && value !== null && value !== false) pick[key] = typeof value === "string" ? value.slice(0, 300) : value;
    }
    return pick;
  });

export class NativeRuntimeLiveHarness {
  readonly calls: CapturedCall[] = [];
  readonly caseResults: Json[] = [];
  private readonly tempDirs = new Set<string>();
  private readonly runIds = new Set<string>();
  private readonly sockets = new Set<WebSocket>();
  private readonly definitionIds = new Set<string>();
  private readonly originalFetch = globalThis.fetch;
  private pendingRewrite: ResponseRewrite | null = null;
  private app: FastifyInstance | null = null;
  private mainUrl!: URL;
  phase = "setup";
  private currentCase: { id: string; details: Json } | null = null;

  constructor(private readonly options: { evidenceDir: string | null; stepTimeoutMs: number; tempPrefix: string }) {}

  async start(): Promise<void> {
    this.installRecorder();
    const dataDir = await mkdtemp(path.join(os.tmpdir(), `${this.options.tempPrefix}-appdata-`));
    this.tempDirs.add(dataDir);
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    this.app = started.fastify;
    this.mainUrl = started.mainUrl;
  }

  async stop(): Promise<void> {
    await this.writeEvidence().catch(() => undefined);
    for (const socket of this.sockets) socket.close();
    for (const runId of this.runIds) {
      await Promise.race([
        this.gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined),
        wait(60_000),
      ]);
    }
    for (const id of this.definitionIds) {
      await this.gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    }
    await this.app?.close();
    this.app = null;
    await closeLiveRuntimeSecretVault();
    globalThis.fetch = this.originalFetch;
    for (const dir of this.tempDirs) await rm(dir, { recursive: true, force: true });
    // Run memory persistence (e.g. file_changes.json) can flush once more after the runs stop; remove it again.
    await wait(3_000);
    for (const dir of this.tempDirs) await rm(dir, { recursive: true, force: true });
  }

  /** Applies `rewrite` to the next provider response only. */
  rewriteNextResponse(rewrite: ResponseRewrite): void {
    this.pendingRewrite = rewrite;
  }

  private installRecorder(): void {
    const originalFetch = this.originalFetch;
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
      const rewrite = this.pendingRewrite;
      this.pendingRewrite = null;
      const record: CapturedCall = {
        index: this.calls.length, phase: this.phase, host: parsedUrl.hostname, pathname: parsedUrl.pathname,
        stream: body.stream === true || parsedUrl.pathname.includes("streamGenerateContent"),
        limits: readLimitFields(body), body, rewritten: false, status: null, stopSignals: [], maxReportedOutputTokens: null, responseHasToolCall: false,
        errorBody: null, settled: Promise.resolve(),
      };
      this.calls.push(record);
      let response = await originalFetch(input, init);
      if (rewrite && response.ok) {
        const original = await response.text();
        const edited = rewrite(original);
        record.rewritten = edited !== original;
        response = new Response(edited, { status: response.status, statusText: response.statusText, headers: response.headers });
      }
      record.status = response.status;
      const finalResponse = response;
      record.settled = finalResponse.clone().text().then((text) => {
        if (!finalResponse.ok) { record.errorBody = text.slice(0, 1500); return; }
        Object.assign(record, readResponseSignals(text));
      }).catch((error: unknown) => { record.errorBody = `response read failed: ${String(error)}`; });
      return finalResponse;
    }) as typeof fetch;
  }

  async settleCalls(): Promise<void> { await Promise.all(this.calls.map((call) => call.settled)); }
  callsOf(callPhase: string): CapturedCall[] { return this.calls.filter((call) => call.phase === callPhase); }

  summarize(call: CapturedCall) {
    return {
      index: call.index, phase: call.phase, host: call.host, pathname: call.pathname, stream: call.stream, limits: call.limits,
      rewritten: call.rewritten, status: call.status, stopSignals: call.stopSignals, maxReportedOutputTokens: call.maxReportedOutputTokens,
      responseHasToolCall: call.responseHasToolCall,
      errorBody: call.errorBody,
    };
  }

  recordCase(id: string, details: Json): void { this.currentCase = { id, details }; }

  /** Call from `afterEach`: stores the case result and refreshes the evidence files. */
  async finishCase(context: { task: { name: string; result?: { state?: string; errors?: Array<{ message?: string }> } } }): Promise<void> {
    const state = context.task.result?.state ?? "unknown";
    const errors = (context.task.result?.errors ?? []).map((error) => String(error.message ?? error).slice(0, 1500));
    this.caseResults.push({ case: this.currentCase?.id ?? context.task.name, name: context.task.name, state, errors, details: this.currentCase?.details ?? null, at: new Date().toISOString() });
    this.currentCase = null;
    await this.writeEvidence().catch(() => undefined);
  }

  private async writeEvidence(): Promise<void> {
    const dir = this.options.evidenceDir;
    if (!dir) return;
    await mkdir(dir, { recursive: true });
    await this.settleCalls();
    await writeFile(path.join(dir, "calls-summary.json"), JSON.stringify(this.calls.map((call) => this.summarize(call)), null, 2));
    await writeFile(path.join(dir, "case-results.json"), JSON.stringify(this.caseResults, null, 2));
  }

  async gql<T>(query: string, variables: Json = {}): Promise<T> {
    const response = await this.originalFetch(new URL("/graphql", this.mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  }

  async catalogModel(providerId: string, model: string): Promise<CatalogModel> {
    const result = await this.gql<{ ensureProviderModelCatalog: { llmModels: CatalogModel[] } }>(
      `mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value maxOutputTokens } } }`,
      { p: providerId, r: "autobyteus" });
    const models = result.ensureProviderModelCatalog.llmModels;
    const found = models.find((entry) => entry.value === model) ?? models.find((entry) => entry.modelIdentifier === model);
    expect(found, `${providerId} model ${model} in ${models.map((entry) => entry.value).join(", ")}`).toBeTruthy();
    return found!;
  }

  async createDefinition(name: string, instructions: string, toolNames: string[]): Promise<string> {
    const created = await this.gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID().slice(0, 8)}`, role: "engineer", description: "Live native-runtime validation agent.",
        instructions, category: "runtime-e2e", toolNames, skillNames: [] } });
    const id = created.createAgentDefinition.id;
    this.definitionIds.add(id);
    return id;
  }

  async makeWorkspace(files: Record<string, string> = {}): Promise<string> {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), `${this.options.tempPrefix}-ws-`));
    this.tempDirs.add(workspaceRootPath);
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(workspaceRootPath, name), content, "utf-8");
    return workspaceRootPath;
  }

  async startRun(definitionId: string, modelIdentifier: string, llmConfig: Json | null, workspaceRootPath?: string): Promise<RunSession> {
    const workspace = workspaceRootPath ?? await this.makeWorkspace();
    const run = await this.gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus", llmConfig } });
    expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
    const runId = run.createAgentRun.runId!;
    this.runIds.add(runId);
    const frames: WsMessage[] = [];
    const socket = new WebSocket(`ws://${this.mainUrl.hostname}:${this.mainUrl.port}/ws/agent/${runId}`);
    socket.on("message", (raw) => {
      let parsed: { type?: unknown; payload?: unknown };
      try { parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown }; } catch { return; }
      if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} });
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    this.sockets.add(socket);
    const session = { runId, socket, frames, workspaceRootPath: workspace };
    await this.waitFor(session, 0, (frame) => frame.type === "CONNECTED", "CONNECTED", 60_000);
    return session;
  }

  async waitFor(session: RunSession, from: number, predicate: (frame: WsMessage) => boolean, label: string, timeoutMs = this.options.stepTimeoutMs): Promise<WsMessage> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = session.frames.slice(from).find(predicate);
      if (found) return found;
      await wait(300);
    }
    const tail = session.frames.slice(-15).map((frame) => `${frame.type}:${JSON.stringify(frame.payload).slice(0, 160)}`).join(" | ");
    throw new Error(`Timed out waiting for ${label}. Recent frames: ${tail}`);
  }

  /** Sends one user message and waits until the turn ends and the agent is idle; returns the turn's frames and any ERROR frame. */
  async runTurn(session: RunSession, turnPhase: string, content: string): Promise<{ error: WsMessage | null; frames: WsMessage[] }> {
    this.phase = turnPhase;
    const from = session.frames.length;
    sendE2eSendMessageCommand(session.socket, { content });
    await this.waitFor(session, from, (frame) => frame.type === "TURN_STARTED" || frame.type === "ERROR", `${turnPhase} TURN_STARTED`);
    await this.waitFor(session, from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "ERROR", `${turnPhase} TURN_COMPLETED`);
    await this.waitFor(session, from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", `${turnPhase} idle`);
    await this.settleCalls();
    const frames = session.frames.slice(from);
    return { error: frames.find((frame) => frame.type === "ERROR") ?? null, frames };
  }

  /** Sends one user message and waits until `done` matches a frame of this send; returns the send's frames. */
  async sendAndWaitFor(session: RunSession, turnPhase: string, content: string, done: (frame: WsMessage) => boolean, label: string): Promise<WsMessage[]> {
    this.phase = turnPhase;
    const from = session.frames.length;
    sendE2eSendMessageCommand(session.socket, { content });
    await this.waitFor(session, from, done, label);
    await this.settleCalls();
    return session.frames.slice(from);
  }

  async stopRun(session: RunSession): Promise<void> {
    await this.gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: session.runId }).catch(() => undefined);
    this.runIds.delete(session.runId);
    await new Promise<void>((resolve) => { session.socket.once("close", () => resolve()); session.socket.close(); setTimeout(resolve, 3_000); });
    this.sockets.delete(session.socket);
  }

  /** The reloaded conversation, exactly as the app's history view reads it. */
  async projection(runId: string): Promise<unknown[]> {
    const result = await this.gql<{ getRunProjection: { conversation: unknown[] } }>(
      "query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: runId });
    return result.getRunProjection.conversation;
  }

  async updateServerSetting(key: string, value: string): Promise<string> {
    const result = await this.gql<{ updateServerSetting: string }>(
      "mutation($k: String!, $v: String!) { updateServerSetting(key: $k, value: $v) }", { k: key, v: value });
    return result.updateServerSetting;
  }

  async deleteServerSetting(key: string): Promise<void> {
    await this.gql("mutation($k: String!) { deleteServerSetting(key: $k) }", { k: key }).catch(() => undefined);
  }

  assertAccepted(phaseCalls: CapturedCall[], label: string): void {
    expect(phaseCalls.length, `${label}: no provider call captured`).toBeGreaterThan(0);
    for (const call of phaseCalls) expect(call.status, `${label} call ${call.index}: ${call.errorBody}`).toBe(200);
  }

  /** Known limit: sent under `field` with exactly that value, and no other limit field. Unknown: no limit field at all. */
  assertLimit(call: CapturedCall, field: keyof LimitFields, expected: number | null, label: string): void {
    if (expected === null) {
      expect(call.limits, `${label} call ${call.index}: unknown-limit model must omit every limit field`).toEqual({});
      return;
    }
    expect(call.limits, `${label} call ${call.index}`).toEqual({ [field]: expected });
  }
}
