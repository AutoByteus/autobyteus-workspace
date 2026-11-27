/**
 * A run whose runtime reaches its usage limit continues on another runtime (autobyteus-646, AC-001..AC-004), on the
 * BUILT server (`dist/app.js` as its own process on a test-owned data root), driven through GraphQL and the agent and
 * team WebSockets as the desktop app does. Nothing real is called:
 * - Codex: `tests/fixtures/codex-usage-limit-app-server.mjs` (CODEX_APP_SERVER_COMMAND) is a whole scripted app-server.
 *   While its state file says `limit`, each turn fails with the three terminal errors Codex sends for a used-up limit
 *   (`error` with codexErrorInfo usageLimitExceeded, thread status failed, turn failed), and its rate limits read shows
 *   the 5-hour window used up until RESET_AT.
 * - AutoByteus (the fallback): an LM Studio-compatible scripted model, which records what each agent's model received.
 * - Antigravity (UL-08): `tests/fixtures/agy-failure-cli.mjs`, `runtime_error`, with a scripted usage read.
 *
 *   UL-01  first-turn switch, Model Routing off: one event for the turn's three errors; the run continues on the
 *          agent's most-used runtime (agent_history); one row (the marker), no row for the continue message; the model
 *          reads the continue text; C-2 `switched`.
 *   UL-02  mid-work switch: an answered Codex turn, then the limit; the new runtime receives the earlier work.
 *   UL-03  Model Routing on: the router receives "Switch request <id>"; its turn ends without a decision (the template
 *          has no switch section until R-6), so history decides, with the router's failure recorded.
 *   UL-04  a Team member: the coordinator on Codex is switched while the Team runs; its tree holds the new launch; after a
 *          graceful restart it answers on AutoByteus and Codex gets no turn.
 *   UL-05  nothing usable (AutoByteus' model server down, every AGY model used up): the run stays on Codex with one
 *          Error notice pointing to Settings (R-18); C-2 `no_fallback`.
 *   UL-09  no history of this agent, AutoByteus usable: the node fallback (R-17), recorded as `node_fallback` (R-19).
 *   UL-06  delegation: an agent whose default is the exhausted Codex model is started from its history, with the note.
 *   UL-07  the setting off: the event is logged, nothing is switched or recorded.
 *   UL-08  Antigravity, which gives no usage-limit signal (R-16): its ERROR goes out at once (one live error row), its
 *          backend's limits read after it sends ERROR_CLASSIFIED (no client frame), and the run switches (the scripted
 *          AGY CLI `runtime_error` "quota" turn; its scripted usage read shows the run's model used up).
 *
 * Gate: RUN_USAGE_LIMIT_SWITCH_E2E=1. Prerequisite: `pnpm -C autobyteus-server-ts build` for this worktree. No
 * credentials. macOS/Linux. About 3 minutes. Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_USAGE_LIMIT_SWITCH_E2E=1 \
 *     pnpm exec vitest run tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts --no-watch
 * Optional: USAGE_LIMIT_SWITCH_E2E_EVIDENCE_DIR keeps a JSON receipt per case.
 */
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_USAGE_LIMIT_SWITCH_E2E === "1" && process.platform !== "win32";
const SERVER_DIR = path.resolve(__dirname, "../../..");
const CODEX_FAKE = path.join(SERVER_DIR, "tests", "fixtures", "codex-usage-limit-app-server.mjs");
const AGY_CLI = path.join(SERVER_DIR, "tests", "fixtures", "agy-failure-cli.mjs");
/** An AGY model the scripted usage read shows used up (the fixture names every extra model "Retiring test model"). */
const AGY_LIMITED_MODEL = "agy-limited";
const EVIDENCE_DIR = process.env.USAGE_LIMIT_SWITCH_E2E_EVIDENCE_DIR?.trim() || null;
const MODEL_KEY = "usage-limit-fixture";
const CODEX_MODEL = "gpt-e2e";
const CODEX = "codex_app_server";
const RESET_AT = new Date(Math.ceil((Date.now() + 3 * 3_600_000) / 60_000) * 60_000).toISOString();
/** The marker's and notice's time ("Nov 27, 09:00 UTC"), as the server renders it. */
const RESET_TEXT = (() => {
  const date = new Date(RESET_AT);
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${date.getUTCDate()}, ${RESET_AT.slice(11, 16)} UTC`;
})();

type Json = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async <T>(probe: () => T | undefined | null | false | Promise<T | undefined | null | false>, label: string, ms = 60_000): Promise<T> => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await probe(); if (value !== undefined && value !== null && value !== false) return value as T; } catch (error) { last = error; }
    await wait(150);
  }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}${last ? ` (${String(last)})` : ""}`);
};
const jsonLines = async (file: string): Promise<Json[]> => (await fs.readFile(file, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json);
const textOf = (content: unknown): string => typeof content === "string" ? content
  : Array.isArray(content) ? content.map((part) => typeof part?.text === "string" ? part.text : "").join("\n") : JSON.stringify(content ?? "");

// --- the scripted AutoByteus model: each request is kept with its messages -------------------------------------

type ModelRequest = { at: number; lastUser: string; all: string; toolResults: string[] };
type Reply = { toolCalls?: Array<{ name: string; args: Json }>; text?: string };

class ScriptedModel {
  readonly requests: ModelRequest[] = [];
  /** Replies by a tag the request's messages contain (`CASE:<tag>`), in order; otherwise "OK.". */
  private readonly scripts = new Map<string, Array<(request: ModelRequest) => Reply>>();
  private server: Server | null = null;
  origin = "";
  /** While true, the model list is not served: the node's AutoByteus LM Studio provider is left out (not usable). */
  down = false;
  script(tag: string, steps: Array<(request: ModelRequest) => Reply>): void { this.scripts.set(tag, [...steps]); }
  of(text: string): ModelRequest[] { return this.requests.filter((request) => request.all.includes(text)); }
  async listen(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  }
  async close(): Promise<void> { this.server?.closeAllConnections(); await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve()); }
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET") {
      if (this.down) { res.writeHead(503); res.end(); return; }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    const messages = (Array.isArray(body.messages) ? body.messages : []) as Json[];
    const lastAssistant = messages.map((message) => message.role).lastIndexOf("assistant");
    const request: ModelRequest = {
      at: Date.now(), all: messages.map((message) => textOf(message.content)).join("\n"),
      lastUser: textOf([...messages].reverse().find((message) => message.role === "user")?.content ?? ""),
      toolResults: messages.slice(lastAssistant + 1).filter((message) => message.role === "tool").map((message) => textOf(message.content)),
    };
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    if (hasTools) this.requests.push(request);
    const tag = request.all.match(/CASE:([A-Z0-9-]+)/)?.[1];
    const step = hasTools && tag ? this.scripts.get(tag)?.shift() : undefined;
    const reply: Reply = step ? step(request) : { text: "OK." };
    const toolCalls = reply.toolCalls?.map((call, index) => ({ index, id: `call-${randomUUID().slice(0, 12)}`, type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.args) } }));
    const delta = toolCalls?.length ? { role: "assistant", tool_calls: toolCalls } : { role: "assistant", content: reply.text ?? "OK." };
    const chunk = (value: Json, finish: string | null) => ({ id: `fixture-${this.requests.length}`, object: "chat.completion.chunk", created: 1,
      model: MODEL_KEY, choices: [{ index: 0, delta: value, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls?.length ? "tool_calls" : "stop"))}\n\ndata: [DONE]\n\n`);
  }
}

// --- the node ---------------------------------------------------------------------------------------------------

type Session = Readonly<{ url: string; gql: <T = any>(query: string, variables?: Json) => Promise<T>; child: ChildProcess; output: () => string }>;
const children: ChildProcess[] = [];

class TestNode {
  constructor(readonly root: string, private readonly env: Record<string, string>) {}
  static async create(env: Record<string, string>): Promise<TestNode> {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "usage-limit-e2e-")));
    for (const dir of ["home", "db", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\nLMSTUDIO_HOSTS=${env.LMSTUDIO_HOSTS ?? ""}\n`);
    return new TestNode(root, env);
  }
  get workspace(): string { return path.join(this.root, "workspace"); }
  get codexState(): string { return path.join(this.root, "codex-state.json"); }
  get codexLog(): string { return path.join(this.root, "codex-turns.jsonl"); }
  get eventLog(): string { return path.join(this.root, "run-events", "events_active.jsonl"); }
  get switchLog(): string { return path.join(this.root, "model-routing", "switches_active.jsonl"); }
  metadata(runId: string): Promise<Json> { return fs.readFile(path.join(this.root, "memory", "agents", runId, "run_metadata.json"), "utf8").then((text) => JSON.parse(text) as Json); }
  tree(teamRunId: string): Promise<Json> {
    return fs.readFile(path.join(this.root, "memory", "agent_teams", teamRunId, "team_run_execution_tree.json"), "utf8").then((text) => JSON.parse(text) as Json);
  }
  setCodex(mode: "ok" | "limit"): Promise<void> { return fs.writeFile(this.codexState, JSON.stringify({ mode })); }

  async start(): Promise<Session> {
    const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    Object.assign(env, { HOME: path.join(this.root, "home"), DATABASE_URL: `file:${path.join(this.root, "db", "production.db")}`,
      CODEX_APP_SERVER_COMMAND: CODEX_FAKE, CODEX_FAKE_STATE: this.codexState, CODEX_FAKE_LOG: this.codexLog, CODEX_FAKE_MODEL: CODEX_MODEL,
      CODEX_FAKE_RESET_AT: RESET_AT,
      // UL-08: every AGY turn fails ("Report runtime case: quota"); its usage read shows the extra model's group used up.
      ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "runtime_error", AGY_FAKE_EXTRA_MODELS: AGY_LIMITED_MODEL,
      AGY_FAKE_USAGE_FILE: path.join(this.root, "agy-usage.json"), ...this.env, ...builtServerLaunchEnvironment() });
    const child = spawn(process.execPath, [path.join(SERVER_DIR, "dist", "app.js"), "--data-dir", this.root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: SERVER_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
    children.push(child);
    let output = "";
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    for (const deadline = Date.now() + 180_000; !output.includes("Server listening on 127.0.0.1:0"); await wait(100)) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`server exited: ${output.slice(-2000)}`);
      if (Date.now() > deadline) throw new Error(`server not ready in 180 s: ${output.slice(-2000)}`);
    }
    let url = "";
    for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    if (!url) throw new Error(`no listener serves GraphQL: ${output.slice(-2000)}`);
    const gql = async <T = any>(query: string, variables: Json = {}): Promise<T> => {
      const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
      const body = await response.json() as { data?: T; errors?: unknown[] };
      if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
      return body.data;
    };
    return Object.freeze({ url, gql, child, output: () => output });
  }

  async stop(session: Session): Promise<void> {
    if (session.child.exitCode !== null || session.child.signalCode !== null) return;
    const exited = once(session.child, "exit");
    session.child.kill("SIGTERM");
    const force = setTimeout(() => session.child.kill("SIGKILL"), 20_000);
    try { await exited; } finally { clearTimeout(force); }
  }
}

type Frame = { type: string; payload: Json };
const openStream = async (session: Session, kind: "agent" | "agent-team", runId: string) => {
  const socket = new WebSocket(`${session.url.replace(/^http/, "ws")}/ws/${kind}/${runId}`);
  const frames: Frame[] = [];
  socket.on("message", (raw: unknown) => { try { frames.push(JSON.parse(String(raw)) as Frame); } catch { /* ignore */ } });
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  await until(() => frames.some((frame) => frame.type === "CONNECTED" || frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), `${kind} stream ${runId}`, 30_000);
  return { frames, send: (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }), close: () => socket.terminate() };
};

describe.skipIf(!ENABLED)("A usage limit switches the run's runtime (built server, scripted Codex and AutoByteus)", () => {
  const model = new ScriptedModel();
  const evidence: Record<string, unknown> = {};
  let node!: TestNode;
  let session!: Session;
  let autobyteusModel = "";

  const definition = async (label: string, toolNames: string[] = [], defaultLaunchConfig: Json | null = null) => (await session.gql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name: `${label}-${randomUUID().slice(0, 6)}`, role: label, description: `${label} (usage limit E2E)`,
      instructions: "Answer briefly.", toolNames, skillNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id as string;
  const agentRun = async (definitionId: string, runtimeKind: string, llmModelIdentifier: string) => {
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier, autoExecuteTools: true, runtimeKind } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  const conversation = async (runId: string) => (await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
  /** One AutoByteus run of the definition, answered once: its history (C-8). */
  const history = async (definitionId: string, tag: string) => {
    const runId = await agentRun(definitionId, "autobyteus", autobyteusModel);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, `CASE:${tag} Earlier work.`);
    await until(() => model.of(`CASE:${tag}`).length >= 1, `${tag} history run answered`);
    await wait(500);
    stream.close();
  };
  const eventsOf = async (runId: string) => (await jsonLines(node.eventLog)).filter((event) => event.agentRunId === runId);
  const switchesOf = async (runId: string) => (await jsonLines(node.switchLog)).filter((record) => record.agentRunId === runId);
  const marker = (chosen: string) => `Codex App Server usage limit reached (resets ${RESET_TEXT}) — switched to AutoByteus (${autobyteusModel}). ${chosen}`;
  /** The previous agent's journal the hand-over names in the new runtime's request (its most recent work file). */
  const handedOverJournal = (request: ModelRequest) => {
    const file = /read (\/\S+\/work_journal\/work_journal_\d+\.md) completely/.exec(request.all)?.[1];
    expect(file, "the hand-over names the previous agent's journal").toBeTruthy();
    return fs.readFile(file!, "utf8");
  };
  /** R-10: the continue message, an input presented as a notice; the hand-over preface combines into it on the same turn. */
  const CONTINUE = "Continue the task where you left off.";
  /** The continue turn's request: its last user message carries the hand-over and the continue text together. */
  const continueTurnOf = (runId: string) => model.requests.find((entry) => entry.lastUser.includes(CONTINUE) && entry.all.includes(runId));

  /** The scripted AGY usage read: the named models' group used up until RESET_AT. */
  const agyUsage = (models: string) => fs.writeFile(path.join(node.root, "agy-usage.json"), JSON.stringify({ status: "SUCCESS", response: "",
    usage: { total_tokens: 0 }, command: { name: "usage", data: { groups: [{ name: "Retiring", description: `Models within this group: ${models}`,
      buckets: [{ id: "r-weekly", name: "Weekly", window: "weekly", remaining_fraction: 0, reset_time: RESET_AT }] }] } } }));

  beforeAll(async () => {
    await fs.access(path.join(SERVER_DIR, "dist", "app.js"));
    await model.listen();
    node = await TestNode.create({ LMSTUDIO_HOSTS: model.origin });
    await agyUsage("Retiring test model");
    await node.setCodex("ok");
    session = await node.start();
    const models = (await session.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
      .reloadProviderModelCatalog.llmModels.map((entry: Json) => entry.modelIdentifier as string);
    autobyteusModel = models.find((id: string) => id.startsWith(MODEL_KEY)) ?? "";
    expect(autobyteusModel, models.join(", ")).toBeTruthy();
  }, 240_000);

  afterAll(async () => {
    if (EVIDENCE_DIR) {
      await fs.mkdir(EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(EVIDENCE_DIR, "usage-limit-switch-built-server.json"), `${JSON.stringify({ resetAt: RESET_AT, ...evidence,
        events: await jsonLines(node.eventLog), switches: await jsonLines(node.switchLog), codexTurns: await jsonLines(node.codexLog) }, null, 2)}\n`);
    }
    if (session) await node.stop(session).catch(() => undefined);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await model.close();
    if (node) await fs.rm(node.root, { recursive: true, force: true });
  }, 60_000);

  it("UL-01 first-turn switch with Model Routing off: one event for three errors, the history runtime, the marker and continue notice rows, the hand-over in the continue turn, C-2", async () => {
    const operator = await definition("operator");
    await history(operator, "UL-01H");
    await node.setCodex("limit");
    const runId = await agentRun(operator, CODEX, CODEX_MODEL);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, "CASE:UL-01 Book the flight.");
    const request = await until(() => continueTurnOf(runId), "the continue message reached AutoByteus", 90_000);
    expect(request.lastUser, "the hand-over is in the continue turn's own message").toMatch(/^\[System: runtime hand-over\][\s\S]*\n\nContinue the task where you left off\.$/);
    expect(await handedOverJournal(request), "the hand-over carries the failed input").toContain("CASE:UL-01 Book the flight.");
    expect((await jsonLines(node.codexLog)).filter((turn) => turn.text.includes("CASE:UL-01")), "one Codex turn").toHaveLength(1);
    const events = await eventsOf(runId);
    expect(events, "one event for the turn's three terminal errors").toEqual([{ at: expect.any(String), kind: "usage_limit_reached", agentRunId: runId,
      data: { runtimeKind: CODEX, llmModelIdentifier: CODEX_MODEL, blockedModels: [CODEX_MODEL], resetAt: RESET_AT } }]);
    const switches = await until(async () => (await switchesOf(runId)).length ? switchesOf(runId) : null, "the switch record");
    expect(switches).toEqual([{ at: expect.any(String), agentRunId: runId, agentDefinitionId: operator, from: { runtimeKind: CODEX, llmModelIdentifier: CODEX_MODEL },
      to: { runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel }, chosenBy: "agent_history", reason: "most used by this agent in the last 30 days",
      routerFailure: "Model Routing is off", outcome: "switched" }]);
    // R-19: the run's launch records who chose it.
    expect(await node.metadata(runId)).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel,
      launchSource: { origin: "agent_history", fallbacks: [] } });
    // The rows of the switch, after the failed input (R-7, R-10): the marker and the continue notice, both labelled notices;
    // no user row. On AutoByteus the hand-over preface is stored as a notice too, which a reload shows (FU-646-02, pre-existing).
    const rows = await until(async () => {
      const all = (await conversation(runId)) as Json[];
      return all.some((row) => row.kind === "system_task_notification" && row.senderId === "system.usage_limit") ? all : null;
    }, "the continue notice row");
    const afterInput = rows.slice(rows.findIndex((row) => row.content === "CASE:UL-01 Book the flight.") + 1)
      .filter((row) => row.role !== "assistant").map((row) => [row.kind, row.role ?? null, row.senderId ?? null, String(row.content).split("\n")[0]]);
    expect(afterInput).toEqual([
      ["system_task_notification", null, "system.runtime_handover", marker("Chosen from this agent's history.")],
      // FU-646-02 (pre-existing on AutoByteus): the hand-over preface, stored as a notice before its input, as the model read it.
      ["system_task_notification", null, "system.runtime_handover", "[System: runtime hand-over]"],
      ["system_task_notification", null, "system.usage_limit", CONTINUE],
    ]);
    expect(rows.filter((row) => row.role === "user" && String(row.content).includes(CONTINUE)), "never a user row").toEqual([]);
    expect(stream.frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === "system.usage_limit"
      && frame.payload.content === CONTINUE), "the continue notice live, once").toHaveLength(1);
    stream.close();
    evidence["UL-01"] = { runId, events, switches, continueRequest: request.lastUser, rows: afterInput };
  }, 180_000);

  it("UL-02 mid-work switch: an answered Codex turn, then the limit; the new runtime receives the earlier work", async () => {
    const writer = await definition("writer");
    await history(writer, "UL-02H");
    await node.setCodex("ok");
    const runId = await agentRun(writer, CODEX, CODEX_MODEL);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, "CASE:UL-02 Draft the outline.");
    const firstTurn = await until(async () => (await jsonLines(node.codexLog)).find((turn) => turn.text.includes("CASE:UL-02 Draft")), "the first Codex turn");
    await until(() => stream.frames.some((frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle"), "the first turn ended", 30_000);
    await node.setCodex("limit");
    stream.send(runId, "CASE:UL-02 Now write section two.");
    const request = await until(() => continueTurnOf(runId), "the continue message after mid-work", 90_000);
    expect(request.lastUser).toContain("[System: runtime hand-over]");
    const journal = await handedOverJournal(request);
    expect(journal, "the earlier work is in the hand-over").toContain(`CODEX_OK ${firstTurn.turnId}`);
    expect(journal).toContain("CASE:UL-02 Draft the outline.");
    expect(journal).toContain("CASE:UL-02 Now write section two.");
    expect(await switchesOf(runId)).toMatchObject([{ outcome: "switched", chosenBy: "agent_history" }]);
    stream.close();
    evidence["UL-02"] = { runId, continueRequest: request.lastUser };
  }, 180_000);

  it("UL-03 Model Routing on: the router gets the switch request; its turn ends without a decision (R-6 pending), so history decides", async () => {
    await session.gql(`mutation($r:String!,$m:String!){setModelRouterLaunch(runtimeKind:$r, llmModelIdentifier:$m)}`, { r: "autobyteus", m: autobyteusModel });
    expect((await session.gql(`mutation{setModelRoutingEnabled(enabled:true)}`)).setModelRoutingEnabled).toMatchObject({ enabled: true, active: true });
    try {
      const planner = await definition("planner");
      await history(planner, "UL-03H");
      await node.setCodex("limit");
      const runId = await agentRun(planner, CODEX, CODEX_MODEL);
      const stream = await openStream(session, "agent", runId);
      stream.send(runId, "CASE:UL-03 Plan the trip.");
      const records = await until(async () => (await switchesOf(runId)).length ? switchesOf(runId) : null, "the switch record", 120_000);
      expect(records).toMatchObject([{ outcome: "switched", chosenBy: "agent_history", routerFailure: "the Model Router's turn ended without a decision" }]);
      const routerRequest = model.requests.find((entry) => /^Switch request sw_\w+\./.test(entry.lastUser));
      expect(routerRequest?.lastUser, "the router read the switch request").toContain(`Why: its usage limit was reached on ${CODEX} / ${CODEX_MODEL}`);
      expect(routerRequest?.lastUser).toContain(`- autobyteus: ${autobyteusModel}`);
      stream.close();
      evidence["UL-03"] = { runId, records, routerRequest: routerRequest?.lastUser };
    } finally {
      await session.gql(`mutation{setModelRoutingEnabled(enabled:false)}`);
    }
  }, 180_000);

  it("UL-04 a Team member is switched while the Team runs, and after a graceful restart it answers on AutoByteus", async () => {
    const lead = await definition("lead");
    const helper = await definition("helper");
    await history(lead, "UL-04H");
    const teamDefinitionId = (await session.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `usage-limit-team-${randomUUID().slice(0, 6)}`, description: "usage limit E2E team", instructions: "Answer briefly.",
        coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "helper", ref: helper, refScope: "SHARED" }] } }))
      .createAgentTeamDefinition.id as string;
    const codexLaunch = { runtimeKind: CODEX, llmModelIdentifier: CODEX_MODEL, autoExecuteTools: true, workspaceRootPath: node.workspace };
    const autoLaunch = { runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel, autoExecuteTools: true, workspaceRootPath: node.workspace };
    const created = (await session.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...codexLaunch }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: lead, ...codexLaunch }, { memberAddress: "/helper", agentDefinitionId: helper, ...autoLaunch }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const coordinatorOf = (tree: Json) => (tree.rootTeam.members as Json[]).find((member) => member.address === tree.rootTeam.coordinatorAddress)!;
    const coordinator = coordinatorOf(await node.tree(teamRunId)).agentRunId as string;
    await node.setCodex("limit");
    const stream = await openStream(session, "agent-team", teamRunId);
    stream.send(coordinator, "CASE:UL-04 Coordinate the release.");
    const continued = await until(() => continueTurnOf(coordinator), "the member continued", 120_000);
    expect(continued.lastUser).toContain("[System: runtime hand-over]");
    expect(await handedOverJournal(continued)).toContain("CASE:UL-04 Coordinate the release.");
    const switched = coordinatorOf(await node.tree(teamRunId));
    expect(switched.launchConfiguration, "the Team tree holds the member's new launch").toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel });
    expect(await switchesOf(coordinator)).toMatchObject([{ outcome: "switched", chosenBy: "agent_history" }]);
    await wait(1_500);
    stream.close();

    await node.stop(session);
    session = await node.start();
    const codexTurnsBefore = (await jsonLines(node.codexLog)).length;
    await until(async () => (await session.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}`, { id: teamRunId })).getTeamRunResumeConfig.isActive,
      "the Team is running again", 90_000).catch(() => undefined);
    const after = await openStream(session, "agent-team", teamRunId);
    after.send(coordinator, "CASE:UL-04 After the restart, report status.");
    await until(() => model.of("CASE:UL-04 After the restart").length >= 1, "the member answered on AutoByteus after the restart", 90_000);
    expect((await jsonLines(node.codexLog)).length, "no Codex turn after the restart").toBe(codexTurnsBefore);
    after.close();
    evidence["UL-04"] = { teamRunId, coordinator, launch: switched.launchConfiguration };
  }, 360_000);

  it("UL-05 nothing usable (R-17, R-18): the run stays on Codex with one Error notice that points to Settings; C-2 no_fallback", async () => {
    const lonely = await definition("lonely");
    await node.setCodex("limit");
    const runId = await agentRun(lonely, CODEX, CODEX_MODEL);
    // Nothing else can run: AutoByteus' LM Studio stops answering and every AGY model shows used up.
    model.down = true;
    await agyUsage("Gemini test, Retiring test model");
    try {
      const stream = await openStream(session, "agent", runId);
      stream.send(runId, "CASE:UL-05 Do the work.");
      const records = await until(async () => (await switchesOf(runId)).length ? switchesOf(runId) : null, "the no-fallback record", 90_000);
      expect(records).toEqual([expect.objectContaining({ to: null, chosenBy: null, reason: null, routerFailure: null, outcome: "no_fallback" })]);
      const notice = `Usage limits reached: Codex App Server until ${RESET_TEXT}. No other runtime can run now. Choose one in the run's Settings to continue.`;
      await until(() => stream.frames.some((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.content === notice), "the Error notice");
      expect(stream.frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.content === notice), "one notice").toHaveLength(1);
      expect(await node.metadata(runId)).toMatchObject({ runtimeKind: CODEX, llmModelIdentifier: CODEX_MODEL });
      stream.close();
      evidence["UL-05"] = { runId, records, notice };
    } finally {
      model.down = false;
      await agyUsage("Retiring test model");
    }
  }, 180_000);

  it("UL-09 the agent has no history but AutoByteus is usable (R-17, R-19): it switches by the node fallback, recorded as chosen by the node", async () => {
    const newcomer = await definition("newcomer");
    await node.setCodex("limit");
    const runId = await agentRun(newcomer, CODEX, CODEX_MODEL);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, "CASE:UL-09 Start the work.");
    const records = await until(async () => (await switchesOf(runId)).length ? switchesOf(runId) : null, "the switch record", 90_000);
    expect(records).toEqual([expect.objectContaining({ to: { runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel }, chosenBy: "node_fallback",
      reason: "most used on this node in the last 30 days", routerFailure: "Model Routing is off", outcome: "switched" })]);
    await until(() => continueTurnOf(runId), "the continue message reached AutoByteus", 90_000);
    expect(await node.metadata(runId)).toMatchObject({ runtimeKind: "autobyteus", launchSource: { origin: "node_fallback", fallbacks: [] } });
    const rows = (await conversation(runId)) as Json[];
    expect(rows.filter((row) => row.content === marker("Chosen by the node.")), "the marker names the node").toHaveLength(1);
    stream.close();
    evidence["UL-09"] = { runId, records };
  }, 180_000);

  it("UL-06 delegation: a default on the exhausted Codex model is skipped; the agent starts from its history with the note", async () => {
    const coder = await definition("coder", [], { runtimeKind: CODEX, llmModelIdentifier: CODEX_MODEL, llmConfig: null });
    await history(coder, "UL-06H");
    const manager = await definition("manager", ["delegate_task"]);
    const managerRun = await agentRun(manager, "autobyteus", autobyteusModel);
    const coderName = (await session.gql(`query($id:String!){agentDefinition(id:$id){name}}`, { id: coder })).agentDefinition.name as string;
    const address = `/${coderName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
    model.script("UL-06", [
      () => ({ toolCalls: [{ name: "delegate_task", args: { recipient_address: address, description: "CASE:UL-06C Write the parser." } }] }),
      () => ({ text: "Delegated." }),
    ]);
    const stream = await openStream(session, "agent", managerRun);
    stream.send(managerRun, "CASE:UL-06 Delegate the parser to the coder.");
    const answer = await until(() => model.requests.find((entry) => entry.all.includes("CASE:UL-06 Delegate") && entry.toolResults.length > 0), "the delegation result", 120_000);
    const result = answer.toolResults.join("\n");
    expect(result, result).toContain(`could not be used (${CODEX_MODEL} is exhausted until ${RESET_AT.slice(0, 16).replace("T", " ")} UTC); it runs on AutoByteus / ${autobyteusModel} (chosen from its history).`);
    expect((await jsonLines(node.codexLog)).filter((turn) => turn.text.includes("CASE:UL-06C")), "the copy never started on Codex").toEqual([]);
    stream.close();
    evidence["UL-06"] = { result };
  }, 180_000);

  it("UL-07 the setting off: the event is logged, nothing is switched or recorded", async () => {
    expect((await session.gql(`mutation{setUsageLimitSwitchEnabled(enabled:false)}`)).setUsageLimitSwitchEnabled).toMatchObject({ usageLimitSwitchEnabled: false });
    const idle = await definition("idle");
    await history(idle, "UL-07H");
    await node.setCodex("limit");
    const runId = await agentRun(idle, CODEX, CODEX_MODEL);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, "CASE:UL-07 Try it.");
    await until(async () => (await eventsOf(runId)).length === 1, "the event", 60_000);
    await wait(3_000);
    expect(await switchesOf(runId)).toEqual([]);
    expect(await node.metadata(runId)).toMatchObject({ runtimeKind: CODEX });
    await session.gql(`mutation{setUsageLimitSwitchEnabled(enabled:true)}`);
    stream.close();
  }, 120_000);

  it("UL-08 Antigravity (no usage-limit signal): the ERROR at once, ERROR_CLASSIFIED after its limits read; exactly one error row, then the switch rows", async () => {
    const researcher = await definition("researcher");
    await history(researcher, "UL-08H");
    const runId = await agentRun(researcher, "antigravity_cli", AGY_LIMITED_MODEL);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, "Report runtime case: quota");
    const records = await until(async () => (await switchesOf(runId)).length ? switchesOf(runId) : null, "the switch record", 90_000);
    expect(records).toEqual([expect.objectContaining({ from: { runtimeKind: "antigravity_cli", llmModelIdentifier: AGY_LIMITED_MODEL },
      to: { runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel }, chosenBy: "agent_history", outcome: "switched" })]);
    expect(await eventsOf(runId)).toEqual([expect.objectContaining({ data: { runtimeKind: "antigravity_cli", llmModelIdentifier: AGY_LIMITED_MODEL,
      blockedModels: [AGY_LIMITED_MODEL], resetAt: RESET_AT } })]);
    await until(() => continueTurnOf(runId), "the continue message reached AutoByteus", 90_000);
    const rows = await until(async () => {
      const all = (await conversation(runId)) as Json[];
      return all.some((row) => row.senderId === "system.usage_limit") ? all : null;
    }, "the continue notice row");
    // Live: exactly one error row (the ERROR at once), and no frame for the late classification, then the switch.
    const errorFrames = stream.frames.filter((frame) => frame.type === "ERROR");
    expect(errorFrames, "one live error row").toHaveLength(1);
    expect(errorFrames[0]!.payload).toMatchObject({ code: "AGY_TURN_ERROR", error_effect: "terminal" });
    expect(stream.frames.filter((frame) => JSON.stringify(frame).includes("ERROR_CLASSIFIED") || JSON.stringify(frame).includes("Unmapped AgentRunEvent")),
      "no client frame for the late classification").toEqual([]);
    const continueFrame = stream.frames.findIndex((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === "system.usage_limit");
    expect(continueFrame, "the continue notice after the error").toBeGreaterThan(stream.frames.indexOf(errorFrames[0]!));
    // Stored (the reload): the switch rows after the failed turn's work. An error is a live row only, as for every run.
    const shown = rows.slice(rows.findIndex((row) => row.content === "Report runtime case: quota") + 1)
      .filter((row) => row.kind !== "message" && row.kind !== "tool_call")
      .map((row) => [row.kind, row.senderId ?? null, String(row.content).split("\n")[0]]);
    expect(shown).toEqual([
      ["system_task_notification", "system.runtime_handover", `Antigravity CLI usage limit reached (resets ${RESET_TEXT}) — switched to AutoByteus (${autobyteusModel}). Chosen from this agent's history.`],
      // FU-646-02 (pre-existing on AutoByteus): the hand-over preface stored as a notice before its input.
      ["system_task_notification", "system.runtime_handover", "[System: runtime hand-over]"],
      ["system_task_notification", "system.usage_limit", "Continue the task where you left off."],
    ]);
    stream.close();
    evidence["UL-08"] = { runId, records, shown };
  }, 180_000);
});
