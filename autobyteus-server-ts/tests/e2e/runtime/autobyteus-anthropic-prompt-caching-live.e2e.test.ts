/**
 * Live AutoByteus (native runtime) Anthropic prompt-caching E2E, run through the real studio server
 * (HTTP GraphQL + agent WebSocket) on claude-opus-5-5. It enters through the same commands the desktop app sends:
 * send, tool approval, Stop generation, Settings → Default image model, Stop and reopen (restore).
 *
 * Validation harness (test-only, never production): every POST /v1/messages is sent with Anthropic's strict
 * preserved-thinking check (`anthropic-beta: thinking-binding-controls-2026-08-01` and
 * `thinking.block_binding.prefix_mismatch_behavior: "error"`), so any kept thinking block whose request prefix
 * changed is rejected with a 400 instead of being silently dropped. The wrapper records each request body exactly
 * as production built it, plus status and usage. APC-E2E-008 proves the harness is enforcing.
 *
 * The user's messages ask for a dependency-cycle audit over plain data files (reasoning after every read), and the run
 * uses the user-selectable `thinking_display: "summarized"`, so adaptive thinking happens at tool steps the way it does
 * in real agent work. The files hold data only, never instructions. (An arithmetic "compute the next file" chain was
 * tried first and is refused by the model's safety classifier, see the ticket's refusal probe.)
 *
 * Cases (one agent run, sequential, in this order):
 *   APC-E2E-001  two tool-cycle turns; the new turn writes only new input and keeps the earlier thinking (AC-002/004)
 *   APC-E2E-002  interrupt at a pending approval, then a new turn: system unchanged, note after history (AC-011)
 *   APC-E2E-003  run-level cache over the turns above; 2 × 1h markers; SDK 0.132.1 (AC-001/003/012)
 *   APC-E2E-007  Token Meter run summary = cost of Anthropic's raw usage at catalog prices, over T1..T4 (AC-006, REQ-006)
 *   APC-E2E-005  Stop → restore → continue with thinking in the persisted snapshot (AC-013b)
 *   APC-E2E-004  Settings → Default image model changed while waiting on the approval of a tool_use that came with
 *                thinking, i.e. between that tool_use and its continuation (AC-013a, P-005)
 *   APC-E2E-008  strict-mode control: kept thinking + a changed tool → 400 (harness validity)
 * Not included, because of two pre-existing defects (both reproduced on base 927796780, reported separately):
 *   - APC-E2E-006 (Stop while a tool approval is pending): that Stop does not return.
 *   - Meter reconciliation after a restore: a restored native run numbers turns from turn_0001 again, so its usage
 *     idempotency keys collide with earlier ones and the run summary drops them. APC-E2E-007 therefore runs before
 *     the restore.
 *
 * Gate: RUN_ANTHROPIC_CACHE_E2E=1 and ANTHROPIC_API_KEY (saved into the test-owned database vault, never logged).
 * Uses real Anthropic credits (about 40 Opus 5.5 calls; mostly cache reads). Run it with a clean environment
 * (`env -i PATH=… HOME=… TMPDIR=…`) so no live-app variable (memory/data dirs, compaction knobs) leaks in.
 * Optional: ANTHROPIC_CACHE_E2E_MODEL (default claude-opus-5-5), ANTHROPIC_CACHE_E2E_EVIDENCE_DIR (keeps the
 * per-call JSON, case results and frames), ANTHROPIC_CACHE_E2E_STEP_TIMEOUT_MS (default 600000).
 */
import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY } from "../../../src/config/media-default-model-settings.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_ANTHROPIC_CACHE_E2E === "1" && Boolean(process.env.ANTHROPIC_API_KEY?.trim());
const describeLive = ENABLED ? describe : describe.skip;
const MODEL = process.env.ANTHROPIC_CACHE_E2E_MODEL?.trim() || "claude-opus-5-5";
const STEP_TIMEOUT_MS = Number(process.env.ANTHROPIC_CACHE_E2E_STEP_TIMEOUT_MS || 600_000);
const CASE_TIMEOUT_MS = 3 * STEP_TIMEOUT_MS;
const EVIDENCE_DIR = process.env.ANTHROPIC_CACHE_E2E_EVIDENCE_DIR?.trim() || null;
const STRICT_BETA = "thinking-binding-controls-2026-08-01";
const CHANGED_IMAGE_MODEL = "imagen-4";
// claude-opus-5-5 catalog prices per MTok (input, cache read, 5m write, 1h write, output).
const OPUS_5_5_PRICE = { input: 4, read: 0.2, write5m: 5, write1h: 8, output: 20 } as const;
const CHUNK_COUNT = 30;
const AUDIT = "After each file, carefully check whether any component depends on itself directly or through components "
  + "seen in earlier files, and keep a running list of such cycles.";

type Json = Record<string, unknown>;
type Usage = {
  input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  cache_creation_5m: number;
  cache_creation_1h: number;
  output_tokens: number;
};
type CapturedCall = {
  index: number;
  phase: string;
  startedAt: string;
  body: Json;
  strictInjected: boolean;
  sdkVersion: string | null;
  status: number | null;
  errorBody: string | null;
  usage: Usage | null;
  stopReason: string | null;
  responseBlockTypes: string[];
  settled: Promise<void>;
};
type WsMessage = { type: string; payload: Json };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

/** Deep copy without any `cache_control` key: cache markers are not part of the compared prefix. */
const withoutCacheControl = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutCacheControl);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "cache_control")
    .map(([key, entry]) => [key, withoutCacheControl(entry)]));
};
const countCacheControl = (value: unknown): number => {
  if (Array.isArray(value)) return value.reduce((sum: number, entry) => sum + countCacheControl(entry), 0);
  if (!isRecord(value)) return 0;
  return Object.entries(value).reduce((sum, [key, entry]) => sum + (key === "cache_control" ? 1 : countCacheControl(entry)), 0);
};
/** Flattens messages into (role, block) entries: the unit Anthropic's prefix cache matches on. */
const blockEntries = (body: Json): string[] => {
  const messages = Array.isArray(body.messages) ? body.messages as Json[] : [];
  return messages.flatMap((message) => {
    const content = typeof message.content === "string"
      ? [{ type: "text", text: message.content }]
      : Array.isArray(message.content) ? message.content : [];
    return content.map((block) => JSON.stringify([message.role, withoutCacheControl(block)]));
  });
};
const thinkingBlockCount = (body: Json): number => (Array.isArray(body.messages) ? body.messages as Json[] : [])
  .filter((message) => message.role === "assistant" && Array.isArray(message.content))
  .reduce((sum, message) => sum + (message.content as Json[])
    .filter((block) => block.type === "thinking" || block.type === "redacted_thinking").length, 0);
const grossInput = (usage: Usage) => usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens;
const isPrefixOf = (shorter: string[], longer: string[]) =>
  shorter.length <= longer.length && shorter.every((entry, index) => entry === longer[index]);

const parseStreamUsage = (text: string) => {
  let start: Json = {};
  let delta: Json = {};
  let stopReason: string | null = null;
  const blockTypes: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    let event: Json;
    try { event = JSON.parse(line.slice(5).trim()) as Json; } catch { continue; }
    if (event.type === "message_start" && isRecord(event.message) && isRecord(event.message.usage)) start = event.message.usage;
    if (event.type === "message_delta") {
      if (isRecord(event.usage)) delta = { ...delta, ...Object.fromEntries(Object.entries(event.usage).filter(([, v]) => v !== null)) };
      if (isRecord(event.delta) && typeof event.delta.stop_reason === "string") stopReason = event.delta.stop_reason;
    }
    if (event.type === "content_block_start" && isRecord(event.content_block)) blockTypes.push(String(event.content_block.type));
  }
  const merged = { ...start, ...delta };
  const creation = isRecord(merged.cache_creation) ? merged.cache_creation : isRecord(start.cache_creation) ? start.cache_creation : {};
  const usage: Usage = {
    input_tokens: num(merged.input_tokens),
    cache_read_input_tokens: num(merged.cache_read_input_tokens),
    cache_creation_input_tokens: num(merged.cache_creation_input_tokens),
    cache_creation_5m: num(creation.ephemeral_5m_input_tokens),
    cache_creation_1h: num(creation.ephemeral_1h_input_tokens),
    output_tokens: num(merged.output_tokens),
  };
  return { usage, stopReason, blockTypes };
};

describeLive("AutoByteus native Anthropic prompt caching (live, strict preserved-thinking check)", () => {
  const calls: CapturedCall[] = [];
  const frames: WsMessage[] = [];
  const caseResults: Json[] = [];
  const workspaces = new Set<string>();
  const originalFetch = globalThis.fetch;
  let phase = "setup";
  let dataDir: string | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let agentDefinitionId = "";
  let runId = "";
  let workspaceRootPath = "";
  let modelIdentifier = "";
  let socket: WebSocket | null = null;
  let autoApprove = true;
  const pendingApprovals: string[] = [];
  const handledApprovals = new Set<string>();
  let currentCase: { id: string; details: Json } | null = null;

  // ---- strict transport wrapper (validation harness) ----
  const installStrictAnthropicTransport = () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      let pathname = "";
      try { pathname = new URL(url).pathname; } catch { /* not absolute */ }
      if (!url.startsWith("https://api.anthropic.com/") || pathname !== "/v1/messages"
        || init?.method !== "POST" || typeof init.body !== "string") {
        return originalFetch(input, init);
      }
      const body = JSON.parse(init.body) as Json;
      const sent = structuredClone(body);
      const strictInjected = isRecord(sent.thinking);
      if (strictInjected) {
        sent.thinking = { ...(sent.thinking as Json), block_binding: { prefix_mismatch_behavior: "error" } };
      }
      const headers = new Headers(init.headers);
      const beta = headers.get("anthropic-beta");
      headers.set("anthropic-beta", beta ? `${beta},${STRICT_BETA}` : STRICT_BETA);
      const record: CapturedCall = {
        index: calls.length, phase, startedAt: new Date().toISOString(), body, strictInjected,
        sdkVersion: headers.get("x-stainless-package-version"), status: null, errorBody: null, usage: null, stopReason: null, responseBlockTypes: [], settled: Promise.resolve(),
      };
      calls.push(record);
      const response = await originalFetch(url, { ...init, headers, body: JSON.stringify(sent) });
      record.status = response.status;
      const clone = response.clone();
      record.settled = clone.text().then((text) => {
        if (!response.ok) { record.errorBody = text.slice(0, 2000); return; }
        const parsed = body.stream === true ? parseStreamUsage(text) : (() => {
          const json = JSON.parse(text) as Json;
          const usage = isRecord(json.usage) ? json.usage : {};
          const creation = isRecord(usage.cache_creation) ? usage.cache_creation : {};
          return {
            usage: {
              input_tokens: num(usage.input_tokens), cache_read_input_tokens: num(usage.cache_read_input_tokens),
              cache_creation_input_tokens: num(usage.cache_creation_input_tokens),
              cache_creation_5m: num(creation.ephemeral_5m_input_tokens), cache_creation_1h: num(creation.ephemeral_1h_input_tokens),
              output_tokens: num(usage.output_tokens),
            },
            stopReason: typeof json.stop_reason === "string" ? json.stop_reason : null,
            blockTypes: Array.isArray(json.content) ? (json.content as Json[]).map((block) => String(block.type)) : [],
          };
        })();
        record.usage = parsed.usage;
        record.stopReason = parsed.stopReason;
        record.responseBlockTypes = parsed.blockTypes;
      }).catch((error: unknown) => { record.errorBody = `response read failed: ${String(error)}`; });
      return response;
    }) as typeof fetch;
  };

  const settleCalls = async () => { await Promise.all(calls.map((call) => call.settled)); };
  const callsOf = (...phases: string[]) => calls.filter((call) => phases.includes(call.phase));
  const summarizeCall = (call: CapturedCall) => ({
    index: call.index, phase: call.phase, sdkVersion: call.sdkVersion, status: call.status, stopReason: call.stopReason,
    responseBlockTypes: call.responseBlockTypes, usage: call.usage, errorBody: call.errorBody,
    systemSha: sha(withoutCacheControl(call.body.system)), toolsSha: sha(call.body.tools),
    messageCount: Array.isArray(call.body.messages) ? call.body.messages.length : 0,
    blockEntryCount: blockEntries(call.body).length, thinkingBlocksInRequest: thinkingBlockCount(call.body),
    cacheControlCount: countCacheControl(call.body), topLevelCacheControl: call.body.cache_control ?? null,
  });

  const writeEvidence = async () => {
    if (!EVIDENCE_DIR) return;
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await settleCalls();
    await writeFile(path.join(EVIDENCE_DIR, "calls-summary.json"), JSON.stringify(calls.map(summarizeCall), null, 2));
    await writeFile(path.join(EVIDENCE_DIR, "calls-full.json"), JSON.stringify(calls.map((call) => ({ ...summarizeCall(call), body: call.body })), null, 2));
    await writeFile(path.join(EVIDENCE_DIR, "case-results.json"), JSON.stringify(caseResults, null, 2));
    await writeFile(path.join(EVIDENCE_DIR, "ws-frames.json"), JSON.stringify(frames.map((frame) => ({
      type: frame.type, payload: JSON.stringify(frame.payload).slice(0, 600) })), null, 2));
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

  const approve = (invocationId: string) => {
    handledApprovals.add(invocationId);
    socket?.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: invocationId, reason: "approved by live E2E user" } }));
  };
  const invocationIdOf = (payload: Json): string | null => {
    for (const candidate of [payload.invocation_id, payload.tool_invocation_id, payload.id]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    return null;
  };

  const openSocket = async () => {
    const ws = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    const connectedFrom = frames.length;
    ws.on("message", (raw) => {
      let parsed: { type?: unknown; payload?: unknown };
      try { parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown }; } catch { return; }
      if (typeof parsed.type !== "string") return;
      const frame = { type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} };
      frames.push(frame);
      if (frame.type === "TOOL_APPROVAL_REQUESTED") {
        const invocationId = invocationIdOf(frame.payload);
        if (!invocationId || handledApprovals.has(invocationId)) return;
        if (autoApprove) approve(invocationId);
        else pendingApprovals.push(invocationId);
      }
    });
    await new Promise<void>((resolve, reject) => { ws.once("open", () => resolve()); ws.once("error", reject); });
    socket = ws;
    await waitFor(connectedFrom, (frame) => frame.type === "CONNECTED", "CONNECTED", 60_000);
  };
  const closeSocket = async () => {
    if (!socket) return;
    const ws = socket;
    socket = null;
    await new Promise<void>((resolve) => { ws.once("close", () => resolve()); ws.close(); setTimeout(resolve, 3_000); });
  };

  const waitFor = async (from: number, predicate: (frame: WsMessage) => boolean, label: string, timeoutMs = STEP_TIMEOUT_MS) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = frames.slice(from).find(predicate);
      if (found) return found;
      const refused = calls.find((call) => call.stopReason === "refusal");
      if (refused) throw new Error(`Model refused at call ${refused.index} (${refused.phase}); the scenario prompt needs revision, not the product.`);
      const failedCall = calls.find((call) => call.status !== null && call.status >= 400 && !call.phase.startsWith("control"));
      if (failedCall) {
        await failedCall.settled;
        throw new Error(`Anthropic rejected call ${failedCall.index} (${failedCall.phase}) with ${failedCall.status}: ${failedCall.errorBody}`);
      }
      await wait(300);
    }
    const tail = frames.slice(-20).map((frame) => `${frame.type}:${JSON.stringify(frame.payload).slice(0, 160)}`).join(" | ");
    throw new Error(`Timed out waiting for ${label}. Recent frames: ${tail}`);
  };

  /** Sends a user message and waits for the turn to finish (TURN_COMPLETED, then idle). */
  const runTurn = async (turnPhase: string, content: string) => {
    phase = turnPhase;
    const from = frames.length;
    sendE2eSendMessageCommand(socket!, { content });
    await waitFor(from, (frame) => frame.type === "TURN_STARTED", `${turnPhase} TURN_STARTED`);
    await waitFor(from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "ERROR", `${turnPhase} TURN_COMPLETED`);
    const error = frames.slice(from).find((frame) => frame.type === "ERROR");
    expect(error, `ERROR frame in ${turnPhase}: ${JSON.stringify(error?.payload)}`).toBeUndefined();
    await waitFor(from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", `${turnPhase} idle`);
    await settleCalls();
    return from;
  };

  const assertAccepted = (phaseCalls: CapturedCall[], label: string) => {
    expect(phaseCalls.length, `${label}: no Anthropic call captured`).toBeGreaterThan(0);
    for (const call of phaseCalls) {
      expect(call.status, `${label} call ${call.index}: ${call.errorBody}`).toBe(200);
      expect(call.strictInjected, `${label} call ${call.index} was not sent in strict mode`).toBe(true);
      expect(call.usage, `${label} call ${call.index} has no usage`).not.toBeNull();
    }
  };
  /** Consecutive calls inside one segment: tools and system identical, earlier block sequence is a prefix. */
  const assertAppendOnly = (segment: CapturedCall[], label: string) => {
    for (let i = 1; i < segment.length; i += 1) {
      const previous = segment[i - 1]!;
      const current = segment[i]!;
      expect(JSON.stringify(withoutCacheControl(current.body.system)), `${label}: system changed at call ${current.index}`)
        .toBe(JSON.stringify(withoutCacheControl(previous.body.system)));
      expect(JSON.stringify(current.body.tools), `${label}: tools changed at call ${current.index}`).toBe(JSON.stringify(previous.body.tools));
      expect(isPrefixOf(blockEntries(previous.body), blockEntries(current.body)),
        `${label}: call ${current.index} history is not an append-only extension of call ${previous.index}`).toBe(true);
    }
  };

  const snapshotHasThinking = async (): Promise<boolean> => {
    const root = path.join(dataDir!, "memory");
    const found: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name === "working_context_snapshot.json" && full.includes(runId)) found.push(full);
      }
    };
    await walk(root);
    expect(found.length, "persisted working_context_snapshot.json for the run").toBeGreaterThan(0);
    const texts = await Promise.all(found.map((file) => readFile(file, "utf-8")));
    return texts.some((text) => text.includes("\"type\":\"thinking\"") || text.includes("\"type\": \"thinking\""));
  };

  const stopRun = async () => {
    const result = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });
    expect(result.terminateAgentRun.success, result.terminateAgentRun.message).toBe(true);
    await closeSocket();
  };
  const restoreRun = async () => {
    const result = await gql<{ restoreAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message runId } }", { id: runId });
    expect(result.restoreAgentRun.success, result.restoreAgentRun.message).toBe(true);
    expect(result.restoreAgentRun.runId).toBe(runId);
    await openSocket();
  };

  const recordCase = (id: string, details: Json) => { currentCase = { id, details }; };

  beforeAll(async () => {
    installStrictAnthropicTransport();
    dataDir = await mkdtemp(path.join(os.tmpdir(), "anthropic-cache-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;

    workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "anthropic-cache-e2e-ws-"));
    workspaces.add(workspaceRootPath);
    for (let n = 1; n <= CHUNK_COUNT; n += 1) {
      const id = String(n).padStart(2, "0");
      const lines = Array.from({ length: 24 }, (_, i) =>
        `Section ${i + 1}: component C${(n * 7 + i) % 23} depends on C${(n * 11 + i) % 19} with latency budget ${(n * 13 + i * 5) % 97} ms.`);
      await writeFile(path.join(workspaceRootPath, `chunk-${id}.txt`), [`CODE: K${id}-${(n * 37) % 101}`, ...lines].join("\n"), "utf-8");
    }

    const catalog = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
      `mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }`,
      { p: "ANTHROPIC", r: "autobyteus" });
    const identifiers = catalog.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier);
    modelIdentifier = identifiers.find((identifier) => identifier === MODEL)
      ?? identifiers.find((identifier) => identifier.startsWith(`${MODEL}:`) || identifier.includes(MODEL)) ?? "";
    expect(modelIdentifier, `model ${MODEL} in ${identifiers.join(", ")}`).toBeTruthy();

    const definition = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: {
        name: `anthropic-cache-e2e-${randomUUID().slice(0, 8)}`,
        role: "engineer",
        description: "Live prompt-caching validation agent.",
        instructions: [
          "You are a careful engineering agent working through workspace files with tools.",
          "When auditing dependency data, reason carefully about what you have read before every next read_file call.",
          "Call read_file exactly once per file, one tool call per response.",
          "Never call generate_image unless the user explicitly asks for an image.",
          "After the last requested file, reply in one short sentence with exactly what was asked.",
        ].join("\n"),
        category: "runtime-e2e",
        toolNames: ["read_file", "generate_image"],
        skillNames: [],
      } });
    agentDefinitionId = definition.createAgentDefinition.id;

    const run = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: modelIdentifier, autoExecuteTools: false, runtimeKind: "autobyteus",
        llmConfig: { thinking_display: "summarized" } } });
    expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
    runId = run.createAgentRun.runId!;
    await openSocket();
  }, 300_000);

  afterEach(async (context) => {
    const state = context.task.result?.state ?? "unknown";
    const errors = (context.task.result?.errors ?? []).map((error) => String(error.message ?? error).slice(0, 1500));
    caseResults.push({ case: currentCase?.id ?? context.task.name, state, errors, details: currentCase?.details ?? null, at: new Date().toISOString() });
    currentCase = null;
    await writeEvidence().catch(() => undefined);
  });

  afterAll(async () => {
    await writeEvidence().catch(() => undefined);
    await closeSocket().catch(() => undefined);
    if (runId) {
      await Promise.race([
        gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined),
        wait(60_000),
      ]);
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId } }).catch(() => undefined);
    }
    if (agentDefinitionId) {
      await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: agentDefinitionId }).catch(() => undefined);
    }
    await app?.close();
    app = null;
    await closeLiveRuntimeSecretVault();
    globalThis.fetch = originalFetch;
    for (const workspace of workspaces) await rm(workspace, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  it("APC-E2E-001: a new turn reads the whole previous history from cache, writes only new input and keeps earlier thinking", async () => {
    await runTurn("T1", `Audit chunk-01.txt through chunk-12.txt, one file per tool call, in order. ${AUDIT} At the end, reply with the cycles in one sentence.`);
    await runTurn("T2", `Continue the audit with chunk-13.txt through chunk-24.txt, one file per tool call, in order. ${AUDIT} At the end, reply with any new cycles in one sentence.`);
    const t1 = callsOf("T1");
    const t2 = callsOf("T2");
    assertAccepted(t1, "T1");
    assertAccepted(t2, "T2");
    expect(t1.length).toBeGreaterThanOrEqual(6);
    expect(t2.length).toBeGreaterThanOrEqual(6);
    assertAppendOnly([...t1, ...t2], "T1→T2");

    const lastT1 = t1[t1.length - 1]!;
    const firstT2 = t2[0]!;
    const t1ToolCycleThinking = t1.filter((call) => call.responseBlockTypes.includes("thinking") && call.responseBlockTypes.includes("tool_use")).length;
    const prevGross = grossInput(lastT1.usage!);
    const prevCached = lastT1.usage!.cache_read_input_tokens + lastT1.usage!.cache_creation_input_tokens;
    const firstGross = grossInput(firstT2.usage!);
    const newInput = firstGross - prevGross;
    const details = {
      t1Calls: t1.length, t2Calls: t2.length, t1ToolCycleResponsesWithThinking: t1ToolCycleThinking,
      thinkingBlocksInFirstT2Request: thinkingBlockCount(firstT2.body), lastT1Usage: lastT1.usage, firstT2Usage: firstT2.usage,
      previousRequestGrossInput: prevGross, previousRequestCachedPrefix: prevCached, firstT2GrossInput: firstGross, newInputTokens: newInput,
      firstT2WrittenOrUncached: firstT2.usage!.cache_creation_input_tokens + firstT2.usage!.input_tokens,
    };
    recordCase("APC-E2E-001", details);
    // Earlier tool-cycle thinking is still in the request (AC-004 / REQ-003).
    expect(t1ToolCycleThinking, "T1 produced thinking with tool_use").toBeGreaterThan(0);
    expect(thinkingBlockCount(firstT2.body)).toBeGreaterThanOrEqual(t1ToolCycleThinking);
    // Reads the whole previous request, writes only the newly appended content (no rewrite of the previous cycle).
    // The previous request's whole cached prefix (its reads + writes) is read again, so nothing earlier is rewritten;
    // what is written or uncached is the appended content (+ the previous request's few uncached tail tokens).
    expect(firstT2.usage!.cache_read_input_tokens).toBeGreaterThanOrEqual(prevCached);
    expect(details.firstT2WrittenOrUncached).toBeLessThanOrEqual(newInput + lastT1.usage!.input_tokens);
  }, CASE_TIMEOUT_MS);

  it("APC-E2E-002: an interruption note is appended after the history and leaves the top-level system unchanged", async () => {
    phase = "T3";
    autoApprove = false;
    const from = frames.length;
    sendE2eSendMessageCommand(socket!, { content: `Continue the audit with chunk-25.txt through chunk-27.txt, one file per tool call, in order. ${AUDIT} At the end, reply with any new cycles in one sentence.` });
    await waitFor(from, (frame) => frame.type === "TOOL_APPROVAL_REQUESTED", "T3 TOOL_APPROVAL_REQUESTED");
    const commandId = `apc-interrupt-${randomUUID()}`;
    socket!.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: commandId } }));
    await waitFor(from, (frame) => frame.type === "TURN_INTERRUPTED", "T3 TURN_INTERRUPTED");
    await waitFor(from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", "T3 idle");
    pendingApprovals.length = 0;
    autoApprove = true;
    await settleCalls();

    await runTurn("T4", `Continue the audit with chunk-25.txt through chunk-27.txt, one file per tool call, in order. ${AUDIT} At the end, reply with any new cycles in one sentence.`);
    const before = callsOf("T1", "T2", "T3");
    const t4 = callsOf("T4");
    assertAccepted(callsOf("T3"), "T3");
    assertAccepted(t4, "T4");
    const firstT4 = t4[0]!;
    const entries = blockEntries(firstT4.body);
    const noteIndex = entries.findIndex((entry) => entry.includes("was interrupted before normal completion"));
    const systemText = JSON.stringify(firstT4.body.system);
    recordCase("APC-E2E-002", {
      t3Calls: callsOf("T3").length, t4Calls: t4.length, noteBlockIndex: noteIndex, blockEntries: entries.length,
      systemShaBefore: sha(withoutCacheControl(before[before.length - 1]!.body.system)), systemShaT4: sha(withoutCacheControl(firstT4.body.system)),
      firstT4Usage: firstT4.usage, systemContainsNote: systemText.includes("interrupted"),
    });
    for (const call of t4) {
      expect(JSON.stringify(withoutCacheControl(call.body.system))).toBe(JSON.stringify(withoutCacheControl(before[0]!.body.system)));
    }
    expect(systemText).not.toContain("was interrupted before normal completion");
    expect(noteIndex, "boundary note rendered in the messages").toBeGreaterThan(0);
    expect(isPrefixOf(blockEntries(before[before.length - 1]!.body), entries.slice(0, noteIndex)), "note comes after the existing history").toBe(true);
    assertAppendOnly([...before, ...t4], "T1→T4");
    expect(firstT4.usage!.cache_read_input_tokens).toBeGreaterThan(0);
  }, CASE_TIMEOUT_MS);

  it("APC-E2E-003: run-level cache hit ≥ 90% with every call after the first reading the cache; 2 × 1h markers; SDK 0.132.1", async () => {
    const segment = callsOf("T1", "T2", "T3", "T4");
    assertAccepted(segment, "T1..T4");
    const reads = segment.reduce((sum, call) => sum + call.usage!.cache_read_input_tokens, 0);
    const gross = segment.reduce((sum, call) => sum + grossInput(call.usage!), 0);
    const writes1h = segment.reduce((sum, call) => sum + call.usage!.cache_creation_1h, 0);
    const writes5m = segment.reduce((sum, call) => sum + call.usage!.cache_creation_5m, 0);
    const sdkVersions = [...new Set(calls.map((call) => call.sdkVersion))];
    const serverSdkVersion = (JSON.parse(await readFile(new URL("../../../node_modules/@anthropic-ai/sdk/package.json", import.meta.url), "utf-8")) as { version: string }).version;
    const hit = reads / gross;
    recordCase("APC-E2E-003", {
      calls: segment.length, turns: 4, cacheReadTokens: reads, grossInputTokens: gross, runLevelHit: hit,
      cacheWrite1hTokens: writes1h, cacheWrite5mTokens: writes5m, sdkVersionsSentOnLiveCalls: sdkVersions, serverSdkVersion,
      perCall: segment.map((call) => ({ index: call.index, phase: call.phase, ...call.usage })),
    });
    expect(segment.length).toBeGreaterThanOrEqual(25);
    for (const call of segment.slice(1)) {
      expect(call.usage!.cache_read_input_tokens, `call ${call.index} (${call.phase}) read no cache`).toBeGreaterThan(0);
    }
    expect(hit).toBeGreaterThanOrEqual(0.9);
    expect(writes5m).toBe(0);
    expect(writes1h).toBeGreaterThan(0);
    for (const call of segment) {
      expect(countCacheControl(call.body), `call ${call.index} breakpoints`).toBe(2);
      expect(call.body.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
      const system = call.body.system as Json[];
      expect(Array.isArray(system) && system.length === 1).toBe(true);
      expect(system[0]!.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    }
    expect(sdkVersions).toEqual(["0.132.1"]);
    expect(serverSdkVersion).toBe("0.132.1");
  }, 120_000);

  it("APC-E2E-007: the Token Meter run summary equals the cost of Anthropic's raw usage at catalog prices (calls T1..T4)", async () => {
    await settleCalls();
    const ok = calls.filter((call) => call.status === 200 && call.usage);
    const sum = (pick: (usage: Usage) => number) => ok.reduce((total, call) => total + pick(call.usage!), 0);
    const raw = {
      input: sum((u) => u.input_tokens), read: sum((u) => u.cache_read_input_tokens), write5m: sum((u) => u.cache_creation_5m),
      write1h: sum((u) => u.cache_creation_1h), writeTotal: sum((u) => u.cache_creation_input_tokens), output: sum((u) => u.output_tokens),
    };
    const expectedCost = (raw.input * OPUS_5_5_PRICE.input + raw.read * OPUS_5_5_PRICE.read + raw.write5m * OPUS_5_5_PRICE.write5m
      + raw.write1h * OPUS_5_5_PRICE.write1h + raw.output * OPUS_5_5_PRICE.output) / 1_000_000;
    type Summary = { usageReportCount: number; standardInputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number;
      cacheCreation5mInputTokens: number; cacheCreation1hInputTokens: number; outputTokens: number; grossInputTokens: number;
      estimatedApiTotalCost: number | null; estimatedApiCacheReadInputCost: number | null; estimatedApiCacheCreation1hInputCost: number | null;
      cacheState: string; apiCostStatus: string; currency: string | null };
    const query = `query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount standardInputTokens cacheReadInputTokens
      cacheCreationInputTokens cacheCreation5mInputTokens cacheCreation1hInputTokens outputTokens grossInputTokens estimatedApiTotalCost
      estimatedApiCacheReadInputCost estimatedApiCacheCreation1hInputCost cacheState apiCostStatus currency } }`;
    let summary: Summary | null = null;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      summary = (await gql<{ getAgentRunTokenUsageSummary: Summary }>(query, { id: runId })).getAgentRunTokenUsageSummary;
      if (summary.usageReportCount >= ok.length && summary.cacheReadInputTokens >= raw.read) break;
      await wait(1_000);
    }
    recordCase("APC-E2E-007", { calls: ok.length, raw, expectedCost, summary });
    expect(summary!.usageReportCount).toBe(ok.length);
    expect(summary!.standardInputTokens).toBe(raw.input);
    expect(summary!.cacheReadInputTokens).toBe(raw.read);
    expect(summary!.cacheCreation1hInputTokens).toBe(raw.write1h);
    expect(summary!.cacheCreation5mInputTokens).toBe(raw.write5m);
    expect(summary!.outputTokens).toBe(raw.output);
    expect(summary!.cacheState).toBe("positive");
    expect(summary!.apiCostStatus).toBe("estimated");
    expect(summary!.estimatedApiTotalCost!).toBeCloseTo(expectedCost, 4);
  }, 120_000);

  it("APC-E2E-005: Stop and reopen a run holding thinking: the first request strips once, is accepted, then append-only", async () => {
    await settleCalls();
    const lastBeforeStop = calls[calls.length - 1]!;
    await stopRun();
    const thinkingInSnapshot = await snapshotHasThinking();
    await restoreRun();
    await runTurn("T5", `Re-check chunk-07.txt through chunk-10.txt, one file per tool call, in order. ${AUDIT} At the end, reply with the cycles in one sentence.`);
    const t5 = callsOf("T5");
    assertAccepted(t5, "T5");
    recordCase("APC-E2E-005", {
      thinkingInPersistedSnapshot: thinkingInSnapshot, thinkingBlocksInLastRequestBeforeStop: thinkingBlockCount(lastBeforeStop.body),
      firstAfterRestore: summarizeCall(t5[0]!), t5: t5.map(summarizeCall),
    });
    expect(thinkingInSnapshot, "persisted snapshot holds thinking before restore").toBe(true);
    expect(thinkingBlockCount(t5[0]!.body), "first request after restore carries no thinking").toBe(0);
    expect(JSON.stringify(t5[0]!.body.tools)).toBe(JSON.stringify(lastBeforeStop.body.tools));
    expect(JSON.stringify(withoutCacheControl(t5[0]!.body.system))).toBe(JSON.stringify(withoutCacheControl(lastBeforeStop.body.system)));
    expect(t5[0]!.usage!.cache_read_input_tokens, "system + tools (+ history before the first thinking block) read from cache").toBeGreaterThan(0);
    assertAppendOnly(t5, "T5");
    for (const call of t5.slice(1)) expect(call.usage!.cache_read_input_tokens).toBeGreaterThan(0);
  }, CASE_TIMEOUT_MS);

  it("APC-E2E-004: a Settings media-model change while a thinking tool_use awaits approval strips thinking once and is accepted", async () => {
    phase = "T6";
    autoApprove = false;
    pendingApprovals.length = 0;
    const from = frames.length;
    sendE2eSendMessageCommand(socket!, { content: `Re-check chunk-11.txt through chunk-16.txt, one file per tool call, in order. ${AUDIT} At the end, reply with the cycles in one sentence.` });
    // Approve like a user until the agent waits on a tool_use whose response carried thinking; then change Settings.
    let waitingCall: CapturedCall | null = null;
    while (!waitingCall) {
      await waitFor(from, (frame) => pendingApprovals.length > 0 || frame.type === "TURN_COMPLETED", "T6 approval or completion");
      if (!pendingApprovals.length) break;
      await settleCalls();
      const last = callsOf("T6").at(-1)!;
      if (last.responseBlockTypes.includes("thinking") && last.responseBlockTypes.includes("tool_use")) { waitingCall = last; break; }
      while (pendingApprovals.length) approve(pendingApprovals.shift()!);
      await wait(500);
    }
    expect(waitingCall, "T6 reached a pending approval for a tool_use that came with thinking").not.toBeNull();
    const settingResult = await gql<{ updateServerSetting: string }>(
      "mutation($k: String!, $v: String!) { updateServerSetting(key: $k, value: $v) }",
      { k: DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY, v: CHANGED_IMAGE_MODEL });
    phase = "T6-after-change";
    autoApprove = true;
    while (pendingApprovals.length) approve(pendingApprovals.shift()!);
    await waitFor(from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "ERROR", "T6 TURN_COMPLETED");
    const error = frames.slice(from).find((frame) => frame.type === "ERROR");
    await waitFor(from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", "T6 idle");
    await settleCalls();
    const afterChange = callsOf("T6-after-change");
    const continuation = afterChange[0];
    recordCase("APC-E2E-004", {
      settingResult: settingResult.updateServerSetting, error: error?.payload ?? null,
      waitingCall: summarizeCall(waitingCall!),
      continuation: continuation ? summarizeCall(continuation) : null,
      continuationLastAssistantBlocks: continuation
        ? ((continuation.body.messages as Json[]).filter((message) => message.role === "assistant").at(-1)?.content as Json[] | undefined)?.map((block) => block.type)
        : null,
      continuationLastMessageRole: continuation ? (continuation.body.messages as Json[]).at(-1)?.role : null,
      toolsChanged: continuation ? JSON.stringify(continuation.body.tools) !== JSON.stringify(waitingCall!.body.tools) : null,
      afterChange: afterChange.map(summarizeCall),
    });
    expect(error, `ERROR frame in T6: ${JSON.stringify(error?.payload)}`).toBeUndefined();
    assertAccepted(afterChange, "T6 after change");
    expect(continuation, "continuation request after the change").toBeDefined();
    expect(JSON.stringify(continuation!.body.tools), "generate_image schema changed with the setting").not.toBe(JSON.stringify(waitingCall!.body.tools));
    expect(JSON.stringify(continuation!.body.tools)).toContain(CHANGED_IMAGE_MODEL);
    expect(thinkingBlockCount(continuation!.body), "every thinking block removed once, incl. the pending round's").toBe(0);
    expect((continuation!.body.messages as Json[]).at(-1)?.role, "continuation of the pending tool round").toBe("user");
    // Later requests are append-only again under the new prefix.
    assertAppendOnly(afterChange, "T6 after change");
    for (const call of afterChange.slice(1)) expect(call.usage!.cache_read_input_tokens).toBeGreaterThan(0);
  }, CASE_TIMEOUT_MS);

  it("APC-E2E-008: control — the strict harness accepts the unchanged request and rejects kept thinking under a changed tool", async () => {
    await settleCalls();
    const source = [...calls].reverse().find((call) => call.status === 200 && thinkingBlockCount(call.body) > 0);
    expect(source, "a captured request with kept thinking").toBeDefined();
    const apiKey = process.env.ANTHROPIC_API_KEY!.trim();
    const send = async (body: Json) => {
      const response = await globalThis.fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
      });
      await response.text();
      await settleCalls();
      return calls[calls.length - 1]!;
    };
    phase = "control-unchanged";
    const unchanged = await send(source!.body);
    const mutated = structuredClone(source!.body);
    const tools = mutated.tools as Json[];
    tools[0] = { ...tools[0]!, description: `${String(tools[0]!.description)} (control change)` };
    phase = "control-changed-tool";
    const changed = await send(mutated);
    recordCase("APC-E2E-008", {
      sourceCall: source!.index, thinkingBlocksKept: thinkingBlockCount(source!.body),
      unchanged: { status: unchanged.status, strict: unchanged.strictInjected, usage: unchanged.usage, errorBody: unchanged.errorBody },
      changedTool: { status: changed.status, strict: changed.strictInjected, errorBody: changed.errorBody },
    });
    expect(unchanged.strictInjected && changed.strictInjected).toBe(true);
    expect(unchanged.status, String(unchanged.errorBody)).toBe(200);
    expect(changed.status).toBe(400);
    expect(String(changed.errorBody)).toMatch(/thinking|prefix|binding|tools/i);
  }, 120_000);
});
