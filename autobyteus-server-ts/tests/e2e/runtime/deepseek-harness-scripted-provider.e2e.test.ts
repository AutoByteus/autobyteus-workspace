import "reflect-metadata";
import fs from "node:fs/promises";
import http from "node:http";
import type { Socket } from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getSecretVaultRuntime } from "../../../src/secret-management/secret-vault-runtime.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { fakeRuntimeState, prepareFakeRuntimes } from "../helpers/agent-runtimes-e2e-harness.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * DeepSeek Harness with a scripted DeepSeek: the real `dsh` (0.2.2-rc.1, `--profile acp`) and the product's provider
 * relay on the real Studio server, with the relay's upstream pointed at a scripted Anthropic Messages endpoint in this
 * test. No provider key and no paid inference: the server's own vault holds a synthetic key, so the suite can change and
 * remove it, and the endpoint decides usage, pacing and failures deterministically.
 *
 * Gate: RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E=1 and a working dsh command (`DEEPSEEK_HARNESS_COMMAND` or `dsh`, Node.js
 * 24.9+). Do not set AUTOBYTEUS_TEST_VAULT (the test vault is read-only; the suite skips with that reason).
 *
 * Command (clean environment, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E=1 \
 *     DEEPSEEK_HARNESS_COMMAND=<dsh> pnpm -C autobyteus-server-ts exec vitest run \
 *     tests/e2e/runtime/deepseek-harness-scripted-provider.e2e.test.ts --no-watch
 *
 * Cases: a run refused when the vault has no DeepSeek key (AC-009); the key changed and then removed while a run is
 * open, and a restore without the key (AC-009); dsh's own compaction, forced with a lowered threshold (`--patch` on the
 * dsh command), as completed provider compaction boundaries with archived raw traces, and a refused compaction call as
 * failed with no rotation (AC-010, AC-011); a model stream that sends only keep-alive events for longer than a shortened
 * idle timeout, and a stalled stream that fails with ACP_TURN_IDLE_TIMEOUT (AC-012); the memory of several concurrent
 * dsh processes (RSK-004, logged).
 */

const scripted = vi.hoisted(() => ({ origin: "", idleTimeoutMs: undefined as number | undefined }));

vi.mock("../../../src/credential-proxy/provider-relays/provider-relays.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/credential-proxy/provider-relays/provider-relays.js")>();
  /** The studio's relays with DeepSeek's origin replaced by this test's scripted endpoint. */
  class ScriptedProviderRelays extends actual.ProviderRelays {
    constructor(relays?: ConstructorParameters<typeof actual.ProviderRelays>[0]) {
      super(relays ?? [actual.createDeepSeekProviderRelay(scripted.origin)]);
    }
  }
  return { ...actual, ProviderRelays: ScriptedProviderRelays };
});

vi.mock("../../../src/agent-execution/backends/acp/session/acp-agent-session.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/agent-execution/backends/acp/session/acp-agent-session.js")>();
  /** Sessions with the test's idle timeout when one is set (AC-012 is tested "with a shortened timeout"). */
  class ShortIdleAcpAgentSession extends actual.AcpAgentSession {
    constructor(options: ConstructorParameters<typeof actual.AcpAgentSession>[0]) {
      super(scripted.idleTimeoutMs === undefined ? options : { ...options, idleTimeoutMs: scripted.idleTimeoutMs });
    }
  }
  return { ...actual, AcpAgentSession: ShortIdleAcpAgentSession };
});

const dshCommand = process.env.DEEPSEEK_HARNESS_COMMAND?.trim() || "dsh";
const dshReady = spawnSync(dshCommand, ["--version"], { stdio: "ignore" }).status === 0;
const enabled = process.env.RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E === "1" && dshReady;
const MODEL = "deepseek-v4-flash";
const STEP_TIMEOUT_MS = 120_000;
const KEY_CONSUMER = { kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey" } as const;
const KEY_MISSING_TEXT = "The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.";
/** dsh's compaction trigger lowered as in the investigation's forced-compaction probe (RT-014). */
const COMPACTION_PATCH = [
  "- id: compaction-basic",
  "  config:",
  "    thresholdRatio: 0.007",
  "    headroomTokens: 1024",
  "    retainTokens: 800",
  "",
].join("\n");

type WsMessage = { type: string; payload: Record<string, unknown> };
type UpstreamRequest = Readonly<{
  n: number; path: string; compaction: boolean; keyLabel: string; sessionHeader: boolean; inputTokens: number; body: string;
}>;
type Mode = "answer" | "keepalive" | "stall";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (label: string, value: unknown) => process.stdout.write(`DSH_SCRIPTED ${label} ${JSON.stringify(value)}\n`);
const FILLER = Array.from({ length: 90 }, (_, index) =>
  `Filler sentence number ${index + 1} talks about warehouses, shipping routes, pallets and invoices in some detail.`).join(" ");

describe.runIf(enabled)("DeepSeek Harness with a scripted DeepSeek endpoint (real dsh, product relay, no key)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let upstream: http.Server | null = null;
  let url: URL;
  let wrapperDir = "";
  const sockets: WebSocket[] = [];
  const upstreamSockets = new Set<Socket>();
  const requests: UpstreamRequest[] = [];
  const runIds: string[] = [];
  /** The synthetic keys the suite saves, by label; the endpoint records only which label (or none) it received. */
  const keys = new Map<string, string>();
  const script = { mode: "answer" as Mode, refuseCompaction: false, keepaliveMs: 0 };
  let fakeRuntimes: ReturnType<typeof prepareFakeRuntimes> | null = null;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const saveKey = async (label: string) => {
    const value = `sk-scripted-${label}-${randomUUID()}`;
    keys.set(label, value);
    await graphql("mutation($k: String!) { saveProviderApiKey(providerId: \"DEEPSEEK\", apiKey: $k) { apiKeyConfigured } }", { k: value });
  };

  /** One Anthropic Messages SSE reply, as DeepSeek's endpoint sends it. */
  const answer = (res: http.ServerResponse, text: string) => {
    const event = (type: string, data: Record<string, unknown>) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    event("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
    event("content_block_delta", { index: 0, delta: { type: "text_delta", text } });
    event("content_block_stop", { index: 0 });
    event("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 12 } });
    event("message_stop", {});
    res.end();
  };
  const messageStart = (res: http.ServerResponse, n: number, inputTokens: number) => {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    res.write(`event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: {
      id: `msg_scripted_${n}`, type: "message", role: "assistant", model: MODEL, content: [], stop_reason: null,
      usage: { input_tokens: inputTokens, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } })}\n\n`);
  };

  const startUpstream = async () => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
      req.on("end", () => {
        const n = requests.length + 1;
        const presented = String(req.headers["x-api-key"] ?? "");
        const keyLabel = [...keys.entries()].find(([, value]) => value === presented)?.[0]
          ?? (presented.startsWith("rp_") ? "run-pass" : presented ? "other" : "none");
        const compaction = req.headers["x-deepseek-harness-compact"] === "1";
        // A rough real-model count (about four characters a token), so dsh's pressure measurement sees real-like usage.
        const inputTokens = Math.ceil(Buffer.byteLength(body) / 4);
        requests.push({ n, path: req.url ?? "", compaction, keyLabel, sessionHeader: Boolean(req.headers["x-deepseek-harness-session-id"]),
          inputTokens, body });
        if (compaction && script.refuseCompaction) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Scripted refusal of a compaction call." } }));
          return;
        }
        if (script.mode === "stall" && !compaction) {
          // Headers only, then nothing: the model neither streams nor ends (AC-012 stall).
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
          res.flushHeaders();
          return;
        }
        messageStart(res, n, inputTokens);
        if (compaction) {
          answer(res, `SUMMARY-${n}: the user gave background filler about warehouses and a code word to remember.`);
          return;
        }
        if (script.mode === "keepalive") {
          const until = Date.now() + script.keepaliveMs;
          const timer = setInterval(() => {
            if (Date.now() < until) { res.write("event: ping\ndata: {\"type\": \"ping\"}\n\n"); return; }
            clearInterval(timer);
            answer(res, `KEPT-ALIVE-${n}`);
          }, 1_000);
          res.on("close", () => clearInterval(timer));
          return;
        }
        answer(res, `SCRIPTED-REPLY-${n}`);
      });
    });
    server.on("connection", (socket) => { upstreamSockets.add(socket); socket.on("close", () => upstreamSockets.delete(socket)); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    scripted.origin = `http://127.0.0.1:${address.port}`;
    return server;
  };

  /**
   * This suite's dsh processes: `--profile acp` processes whose environment has its data root's dsh home (the product
   * sets `DSH_HOME`); a run launch also has the run's instructions file, a discovery launch has none.
   */
  const dshProcesses = () => spawnSync("pgrep", ["-f", "profile acp"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean)
    .map((pid) => ({ pid, shown: spawnSync("ps", ["eww", "-o", "rss=,command=", "-p", pid], { encoding: "utf8" }).stdout.trim() }))
    .filter((entry) => entry.shown.includes(`DSH_HOME=${dataDir}/`))
    .map((entry) => ({ pid: entry.pid, rssKb: Number(entry.shown.split(/\s+/)[0]), runLaunch: entry.shown.includes("AUTOBYTEUS_DSH_INSTRUCTIONS_FILE=") }));

  /** A dsh command that adds the test's patch file (dsh layers `--patch` over its profile and the owned home patch). */
  const dshWith = async (name: string, patch: string | null) => {
    const file = path.join(wrapperDir, name);
    const patchArgs = patch ? ` --patch '${path.join(wrapperDir, `${name}.yml`)}'` : "";
    if (patch) await fs.writeFile(path.join(wrapperDir, `${name}.yml`), patch);
    await fs.writeFile(file, `#!/bin/sh\nexec '${dshCommand}' "$@"${patchArgs}\n`, { mode: 0o755 });
    return file;
  };

  beforeAll(async () => {
    fakeRuntimes = prepareFakeRuntimes({ label: "dsh-scripted-other-runtimes", grokInstalled: false });
    fakeRuntimeState(fakeRuntimes.stateDir).set("codex-account", "signedIn");
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dsh-scripted-e2e-")));
    wrapperDir = path.join(dataDir, "dsh-wrappers");
    await fs.mkdir(wrapperDir);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const source = await initializeLiveServerVault();
    if (source.kind === "test") throw new Error("Unset AUTOBYTEUS_TEST_VAULT: this suite writes synthetic keys to its own vault.");
    upstream = await startUpstream();
    process.env.DEEPSEEK_HARNESS_COMMAND = await dshWith("dsh-plain", null);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }).catch(() => undefined);
      }
      await app.close();
    }
    for (const socket of upstreamSockets) socket.destroy();
    await new Promise<void>((resolve) => (upstream ? upstream.close(() => resolve()) : resolve()));
    await closeLiveServerVault();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    fakeRuntimes?.dispose();
    process.env.DEEPSEEK_HARNESS_COMMAND = dshCommand;
    expect(dshProcesses(), "no dsh of this suite left running").toEqual([]);
  }, 120_000);

  const createRun = async (label: string, autoExecuteTools = true) => {
    const definition = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `dsh-scripted-${label}-${randomUUID()}`, role: "assistant", description: "DeepSeek Harness scripted e2e agent",
        instructions: "You are a concise test agent.", category: "runtime-e2e", toolNames: [], skillNames: [] } });
    const workspace = path.join(dataDir, `ws-${label}`);
    await fs.mkdir(workspace, { recursive: true });
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definition.createAgentDefinition.id, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: { reasoning_effort: "low" }, autoExecuteTools, runtimeKind: "deepseek_harness" } });
    if (created.createAgentRun.runId) runIds.push(created.createAgentRun.runId);
    return created.createAgentRun;
  };
  const openSocket = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const deadline = Date.now() + 30_000;
    while (!messages.some((m) => m.type === "CONNECTED") && Date.now() < deadline) await wait(100);
    return { socket, messages };
  };
  const waitFor = async (messages: WsMessage[], from: number, predicate: (m: WsMessage) => boolean, label: string, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.slice(from).find(predicate);
      if (found) return found;
      await wait(100);
    }
    throw new Error(`Timed out waiting for ${label}: ${messages.slice(from).map((m) => m.type).join(", ")}`);
  };
  const turnEnded = (m: WsMessage) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED"
    || (m.type === "ERROR" && (m.payload.error_scope === "turn" || m.payload.error_scope === "run"));
  const turn = async (socket: WebSocket, messages: WsMessage[], runId: string, content: string) => {
    const from = messages.length;
    const startedAt = Date.now();
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (!messages.slice(from).some(turnEnded)) {
      if (Date.now() > deadline) {
        throw new Error(`Turn did not end: ${messages.slice(from).slice(-15).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`).join(" | ")}`);
      }
      await wait(100);
    }
    const events = messages.slice(from);
    const text = events.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => String(m.payload.delta ?? "")).join("");
    const terminal = events.find(turnEnded)!;
    const result = { events, text, terminal, ms: Date.now() - startedAt };
    log("TURN", { runId: runId.slice(0, 8), prompt: content.slice(0, 50), terminal: terminal.type, ms: result.ms, text: text.slice(-160),
      error: terminal.type === "ERROR" ? JSON.stringify(terminal.payload).slice(0, 400) : undefined });
    return result;
  };
  const rawTraceFiles = async (runId: string) => (await graphql<{ getAgentRunMemoryView: { rawTraceFiles: Array<{ kind: string }> | null } }>(
    `query($runId: String!) { getAgentRunMemoryView(runId: $runId, includeRawTraces: true, includeRawTraceFiles: true, includeArchive: false) {
      rawTraceFiles { kind } } }`, { runId })).getAgentRunMemoryView.rawTraceFiles ?? [];
  const terminate = (runId: string) => graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId });

  it("refuses a dsh run when the vault holds no DeepSeek key, naming the key and where to set it (AC-009)", async () => {
    const before = requests.length;
    const refused = await createRun("no-key");
    log("NO_KEY", refused);
    expect(refused.success).toBe(false);
    expect(refused.message).toContain(KEY_MISSING_TEXT);
    expect(requests.length).toBe(before);
    expect(dshProcesses().filter((entry) => entry.runLaunch), "no dsh started for the refused run").toEqual([]);
  }, 120_000);

  it("uses the key the vault holds at each call: a changed key is used by the next call, a removed key fails the next turn with the relay's text, and a restore without it fails (AC-009)", async () => {
    await saveKey("A");
    const run = await createRun("key-change");
    expect(run.success, run.message).toBe(true);
    const runId = run.runId!;
    let { socket, messages } = await openSocket(runId);
    const first = await turn(socket, messages, runId, "Say hello.");
    expect(first.terminal.type).toBe("TURN_COMPLETED");
    expect(first.text).toContain("SCRIPTED-REPLY-");
    const firstCalls = requests.filter((request) => first.text.includes(`SCRIPTED-REPLY-${request.n}`));
    expect(firstCalls.map((request) => request.keyLabel)).toEqual(["A"]);

    // The user saves another DeepSeek key in Settings → API Keys while the run is open.
    await saveKey("B");
    const second = await turn(socket, messages, runId, "Say hello again.");
    expect(second.terminal.type).toBe("TURN_COMPLETED");
    const secondCall = requests.find((request) => second.text.includes(`SCRIPTED-REPLY-${request.n}`));
    expect(secondCall?.keyLabel, "the next call carries the newly saved key").toBe("B");
    expect(requests.every((request) => request.keyLabel === "A" || request.keyLabel === "B"), "the endpoint never saw a pass or another value").toBe(true);

    // The key is removed from the vault (no product surface removes a built-in key: the vault owner does it here).
    await getSecretVaultRuntime().requireService().removeForConsumer(KEY_CONSUMER);
    const callsBefore = requests.length;
    const third = await turn(socket, messages, runId, "Say hello a third time.");
    expect(requests.length, "no upstream call without a key").toBe(callsBefore);
    const shown = JSON.stringify(third.events.filter((m) => m.type === "ERROR" || m.type === "SEGMENT_CONTENT").map((m) => m.payload));
    expect(shown, "dsh shows the relay's refusal text").toContain(KEY_MISSING_TEXT);
    log("KEY_REMOVED_TURN", { terminal: third.terminal.type, payload: JSON.stringify(third.terminal.payload).slice(0, 500) });

    socket.close();
    expect((await terminate(runId)).terminateAgentRun.success).toBe(true);
    const restored = await graphql<{ restoreAgentRun: { success: boolean; message: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message } }", { agentRunId: runId });
    log("RESTORE_NO_KEY", restored.restoreAgentRun);
    expect(restored.restoreAgentRun.success).toBe(false);
    expect(restored.restoreAgentRun.message).toContain(KEY_MISSING_TEXT);

    // With the key saved again the same run restores and continues.
    await saveKey("C");
    const again = await graphql<{ restoreAgentRun: { success: boolean; message: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message } }", { agentRunId: runId });
    expect(again.restoreAgentRun.success, again.restoreAgentRun.message).toBe(true);
    ({ socket, messages } = await openSocket(runId));
    const fourth = await turn(socket, messages, runId, "Say hello after the restore.");
    expect(fourth.terminal.type).toBe("TURN_COMPLETED");
    expect(requests.at(-1)?.keyLabel).toBe("C");
    socket.close();
    await terminate(runId);
  }, 600_000);

  it("records each dsh compaction as a completed provider compaction boundary that archives the raw traces, and the conversation continues (AC-010, AC-011)", async () => {
    if (!keys.has("C")) await saveKey("C");
    process.env.DEEPSEEK_HARNESS_COMMAND = await dshWith("dsh-compaction", COMPACTION_PATCH);
    try {
      const run = await createRun("compaction");
      expect(run.success, run.message).toBe(true);
      const runId = run.runId!;
      const { socket, messages } = await openSocket(runId);
      const from = requests.length;
      const turns = [];
      for (const prompt of [
        `The code word is PELICAN-77. Remember it. Background text follows; reply only OK. ${FILLER}`,
        `More background; reply only OK. ${FILLER}`,
        `Even more background; reply only OK. ${FILLER}`,
        "Without tools: what was the code word I gave you in my first message?",
      ]) {
        const result = await turn(socket, messages, runId, prompt);
        expect(result.terminal.type, JSON.stringify(result.terminal.payload).slice(0, 500)).toBe("TURN_COMPLETED");
        turns.push(result);
      }
      const calls = requests.slice(from);
      const compactionCalls = calls.filter((request) => request.compaction);
      const statuses = messages.filter((m) => m.type === "COMPACTION_STATUS").map((m) => m.payload);
      const usage = messages.filter((m) => m.type === "TOKEN_USAGE_UPDATED").map((m) => m.payload);
      const files = await rawTraceFiles(runId);
      log("COMPACTION", {
        calls: calls.map((request) => ({ n: request.n, compaction: request.compaction, inputTokens: request.inputTokens, key: request.keyLabel,
          session: request.sessionHeader })),
        statuses: statuses.map((status) => [status.status, status.source_surface, status.rotation_eligible]),
        usage: usage.map((entry) => [entry.ingestion_kind ?? entry.usage_kind ?? null, entry.reported_input_tokens]),
        files: files.map((file) => file.kind),
      });
      expect(compactionCalls.length, "dsh made at least one compaction call (x-deepseek-harness-compact: 1)").toBeGreaterThanOrEqual(1);
      const completed = statuses.filter((status) => status.status === "compacted");
      expect(completed.length, "one completed boundary per compaction call DeepSeek answered").toBe(compactionCalls.length);
      for (const status of completed) {
        expect(status).toMatchObject({ kind: "provider_compaction_boundary", runtime_kind: "deepseek_harness",
          source_surface: "deepseek_harness.relay_compaction_completed", rotation_eligible: true });
      }
      expect(statuses.filter((status) => status.status === "compacting").length).toBe(compactionCalls.length);
      expect(files.filter((file) => file.kind === "segment").length, "the completed compaction archived the raw traces").toBeGreaterThanOrEqual(1);
      // One usage record per model call, turn and compaction calls alike (AC-011).
      expect(usage.length).toBe(calls.length);
      // The conversation continued from dsh's summary: a request after the compaction carries the summary text.
      const firstCompaction = compactionCalls[0]!;
      expect(calls.some((request) => request.n > firstCompaction.n && !request.compaction
        && request.body.includes(`SUMMARY-${firstCompaction.n}`)), "dsh continued from its summary").toBe(true);
      expect(turns.at(-1)!.text).toContain("SCRIPTED-REPLY-");
      socket.close();
      await terminate(runId);
    } finally {
      process.env.DEEPSEEK_HARNESS_COMMAND = await dshWith("dsh-plain", null);
    }
  }, 900_000);

  it("records a refused compaction call as a failed compaction with no rotation (AC-010 failure)", async () => {
    if (!keys.has("C")) await saveKey("C");
    process.env.DEEPSEEK_HARNESS_COMMAND = await dshWith("dsh-compaction", COMPACTION_PATCH);
    script.refuseCompaction = true;
    try {
      const run = await createRun("compaction-refused");
      expect(run.success, run.message).toBe(true);
      const runId = run.runId!;
      const { socket, messages } = await openSocket(runId);
      const from = requests.length;
      const results = [];
      for (const prompt of [
        `The code word is HERON-12. Background text follows; reply only OK. ${FILLER}`,
        `More background; reply only OK. ${FILLER}`,
        `Even more background; reply only OK. ${FILLER}`,
      ]) {
        results.push(await turn(socket, messages, runId, prompt));
        if (requests.slice(from).some((request) => request.compaction)) break;
      }
      const statuses = messages.filter((m) => m.type === "COMPACTION_STATUS").map((m) => m.payload);
      const compactionCalls = requests.slice(from).filter((request) => request.compaction);
      log("COMPACTION_REFUSED", { calls: compactionCalls.length, statuses: statuses.map((status) => [status.status, status.error_message ?? null]),
        terminals: results.map((result) => result.terminal.type) });
      expect(compactionCalls.length).toBeGreaterThanOrEqual(1);
      const failed = statuses.filter((status) => status.status === "failed");
      expect(failed.length).toBe(compactionCalls.length);
      expect(failed[0]).toMatchObject({ source_surface: "deepseek_harness.relay_compaction_failed", rotation_eligible: false,
        error_message: "DeepSeek did not complete the compaction call (HTTP 400)." });
      expect(statuses.some((status) => status.status === "compacted")).toBe(false);
      expect((await rawTraceFiles(runId)).filter((file) => file.kind === "segment"), "no rotation").toHaveLength(0);
      socket.close();
      await terminate(runId);
    } finally {
      script.refuseCompaction = false;
      process.env.DEEPSEEK_HARNESS_COMMAND = await dshWith("dsh-plain", null);
    }
  }, 600_000);

  it("keeps a turn alive while the model streams only keep-alive events for longer than the idle timeout, and fails a stalled stream with ACP_TURN_IDLE_TIMEOUT (AC-012)", async () => {
    if (!keys.has("C")) await saveKey("C");
    scripted.idleTimeoutMs = 6_000;
    try {
      const run = await createRun("liveness");
      expect(run.success, run.message).toBe(true);
      const runId = run.runId!;
      const { socket, messages } = await openSocket(runId);

      script.mode = "keepalive";
      script.keepaliveMs = 15_000;
      const kept = await turn(socket, messages, runId, "Think hard, then answer.");
      log("KEEPALIVE", { terminal: kept.terminal.type, ms: kept.ms, text: kept.text, events: kept.events.map((m) => m.type) });
      expect(kept.terminal.type, JSON.stringify(kept.terminal.payload).slice(0, 400)).toBe("TURN_COMPLETED");
      expect(kept.ms).toBeGreaterThan(14_000);
      expect(kept.text).toContain("KEPT-ALIVE-");
      expect(kept.events.some((m) => m.type === "ERROR")).toBe(false);

      script.mode = "stall";
      const stalled = await turn(socket, messages, runId, "Answer now.");
      // The idle failure ends the open turn (TURN_INTERRUPTED), then fails the session with the idle code.
      const failure = await waitFor(messages, messages.indexOf(stalled.terminal), (m) => m.type === "ERROR", "the idle failure", 10_000);
      log("STALL", { terminal: stalled.terminal.type, ms: stalled.ms, failure: JSON.stringify(failure.payload).slice(0, 400) });
      expect(stalled.terminal.type).toBe("TURN_INTERRUPTED");
      expect(failure.payload).toMatchObject({ code: "ACP_TURN_IDLE_TIMEOUT", error_effect: "terminal" });
      expect(stalled.ms, "failed after the 6 s idle timeout, not before").toBeGreaterThanOrEqual(6_000);
      expect(stalled.ms).toBeLessThan(30_000);
      expect(requests.at(-1)?.compaction).toBe(false);
      socket.close();
      script.mode = "answer";
      for (const held of upstreamSockets) held.destroy();
      await terminate(runId).catch(() => undefined);
    } finally {
      script.mode = "answer";
      scripted.idleTimeoutMs = undefined;
    }
  }, 600_000);

  it("measures the memory of several concurrent dsh processes (RSK-004)", async () => {
    if (!keys.has("C")) await saveKey("C");
    const opened: Array<{ runId: string; socket: WebSocket; messages: WsMessage[] }> = [];
    for (let index = 0; index < 3; index += 1) {
      const run = await createRun(`memory-${index}`);
      expect(run.success, run.message).toBe(true);
      const connection = await openSocket(run.runId!);
      opened.push({ runId: run.runId!, ...connection });
    }
    await Promise.all(opened.map((entry) => turn(entry.socket, entry.messages, entry.runId, "Say hello.")));
    const running = dshProcesses().filter((entry) => entry.runLaunch);
    const rssMb = running.map((entry) => Math.round(entry.rssKb / 1024));
    log("MEMORY", { processes: running.length, rssMb, totalMb: rssMb.reduce((sum, value) => sum + value, 0) });
    expect(running.length, "one dsh process per open run").toBe(3);
    for (const entry of opened) {
      entry.socket.close();
      await terminate(entry.runId);
    }
    await wait(2_000);
    expect(dshProcesses(), "every dsh process ended with its run").toEqual([]);
  }, 600_000);
});
