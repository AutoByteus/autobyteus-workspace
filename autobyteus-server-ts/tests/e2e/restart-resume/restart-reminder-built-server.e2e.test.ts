/**
 * The restart reminder across real restarts of the BUILT server (autobyteus-448 part 1). Each case runs `dist/app.js`
 * as its own process on a test-owned data root, drives runs through GraphQL and the agent WebSocket as the desktop app
 * does, and restarts the node the ways a node ends: a graceful stop (SIGTERM, as the app's quit), a forced kill
 * (SIGKILL, as a crash), and an update (the first session runs a copy of this build stamped as the previous release,
 * `dist/release-identity.json`, the only thing the cause rule reads). Inference is scripted: an LM Studio-compatible
 * server answers each case's turns in order and records exactly what the model received, so the reminder is read where
 * the agent reads it. The Antigravity case uses the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`).
 *
 * Cases:
 *   RR-01  graceful restart: a native run idle on a running `run_bash(run_in_background)` is in the live record within
 *          the 2 s check, without `shutdownAt`; the stop adds `shutdownAt`; the next start makes it a pending reminder,
 *          wakes nothing, and the run's next input carries "reason: a restart" once. An idle run without a background
 *          task is never recorded or reminded (AC-001, REQ-001..003, REQ-005)
 *   RR-02  forced kill: the record has no `shutdownAt`; the next input carries "an unexpected stop" (AC-001)
 *   RR-03  update: the run is woken without any input, with "an update to v<this release>"; its next input carries
 *          nothing (AC-001, REQ-003)
 *   RR-04  update with a run mid-turn that also has a background task: one reminder with the interrupted-turn line
 *          (AC-002)
 *   RR-05  update, input sent the moment the node answers: exactly one reminder between the wake and the input (AC-004)
 *   RR-12  update with a native Team member idle with a background task: the member is woken once with the update
 *          notice, its next input carries nothing, its conversation shows the notice once (autobyteus-500 round 5: the
 *          member path of the restart resumer, with 526's whole notice message)
 *   RR-06  Antigravity idle with an open daemon step (its background task): recorded, reminded with its next input
 *          (AC-003)
 *   RR-10  a native run restarted twice (a background build running at each restart): every turn has its own id, in the
 *          stored traces and on the live stream, and the conversation the app loads gives each reminder and each reply its
 *          own turn (autobyteus-526 AC-002; on the base build the turns after a restart reuse `turn_0001`)
 *   RR-11  needs RESTART_REMINDER_BASE_SERVER_DIR (a build from before autobyteus-526): a run restarted twice on that
 *          build keeps its stored duplicate turn ids when this build opens it (not rewritten), and its next turn continues
 *          after the highest stored id (autobyteus-526 DEC-003; what its old turns show is recorded)
 *
 *   RR-07  (live) Claude idle with a background Bash command: recorded, reminded with its next input, and it answers
 *          knowing the command was stopped (AC-003)
 *   RR-08  (live) Codex idle with a background terminal: recorded at the graceful stop through its background-task
 *          view, reminded with its next input (AC-003)
 *   RR-09  (live) a native agent on a real model, killed while its background build runs: the build outlives the
 *          node, the reminder says it may still be running and is untracked (DEC-008), and the agent checks before
 *          answering (OpenAI gpt-5.4-mini from the test vault, override RESTART_REMINDER_NATIVE_MODEL)
 *
 * Gate: RUN_RESTART_REMINDER_E2E=1. Prerequisite: `pnpm -C autobyteus-server-ts build` for this worktree. RR-01..06
 * need no credentials. RR-07..RR-09 also need RUN_RESTART_REMINDER_LIVE_E2E=1; RR-09 the test vault (AUTOBYTEUS_TEST_VAULT,
 * TESTING.md#test-vault; the built server reads it); RR-07/RR-08 the signed-in `claude` and `codex` CLIs,
 * and the real HOME, USER and LOGNAME (TESTING.md); Codex gets a throwaway CODEX_HOME with only the login linked
 * (model gpt-6.1-terra, override RESTART_REMINDER_CODEX_MODEL; Claude haiku, override RESTART_REMINDER_CLAUDE_MODEL).
 * macOS/Linux. About 5 minutes (live cases a few more). Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_RESTART_REMINDER_E2E=1 \
 *     pnpm exec vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts --no-watch
 * Optional: RESTART_REMINDER_E2E_EVIDENCE_DIR keeps per-case JSON; RESTART_REMINDER_SERVER_DIR runs the cases against
 * another server build (for example the base build, to see the behavior before this change).
 */
import { once } from "node:events";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";

const ENABLED = process.env.RUN_RESTART_REMINDER_E2E === "1" && process.platform !== "win32";
const LIVE = ENABLED && process.env.RUN_RESTART_REMINDER_LIVE_E2E === "1";
const SERVER_DIR = path.resolve(process.env.RESTART_REMINDER_SERVER_DIR ?? path.resolve(__dirname, "../../.."));
const BASE_SERVER_DIR = process.env.RESTART_REMINDER_BASE_SERVER_DIR?.trim() ? path.resolve(process.env.RESTART_REMINDER_BASE_SERVER_DIR) : null;
const EVIDENCE_DIR = process.env.RESTART_REMINDER_E2E_EVIDENCE_DIR?.trim() || null;
const AGY_CLI = path.resolve(__dirname, "../../fixtures/agy-failure-cli.mjs");
const HEADER = "[Platform notice — application restarted]";
const BACKGROUND_LINE = "If you started any background tasks, the restart stopped them.";
/** DEC-008: after an unexpected stop the tasks may still be running, untracked. */
const UNEXPECTED_STOP_LINE = "If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop them";
const INTERRUPTED_LINE = "Your previous turn was interrupted";
const SENDER = "system.restart_resume";
const PREVIOUS_RELEASE = "0.0.0-previous";
const MODEL_KEY = "restart-reminder-fixture";
const NODE = process.execPath;

type Json = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async <T>(probe: () => T | undefined | null | false | Promise<T | undefined | null | false>, label: string, ms = 60_000): Promise<T> => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await probe(); if (value !== undefined && value !== null && value !== false) return value as T; } catch (error) { last = error; }
    await wait(100);
  }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}${last ? ` (${String(last)})` : ""}`);
};
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const tagged = (tag: string) => `${quote(NODE)} -e ${quote("setInterval(()=>{},1000)")} ${tag}`;
const withTag = (tag: string) => execFileSync("ps", ["-ww", "-A", "-o", "pid=,command="], { encoding: "utf8" })
  .split("\n").filter((line) => line.includes(tag) && line.trim().split(/\s+/)[1] === NODE).map((line) => Number(line.trim().split(/\s+/)[0]));
/** A wait whose outcome the case asserts at its end (so a build without the behavior still runs the whole restart). */
const orNull = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);
const readJson = async (file: string): Promise<Json | null> => JSON.parse(await fs.readFile(file, "utf8").catch(() => "null")) as Json | null;

// --- scripted model ---------------------------------------------------------------------------------------------

type ModelRequest = { caseId: string; at: number; lastUser: string; lastRole: string; toolResults: string[] };
type Reply = { toolCalls?: Array<{ name: string; args: Json }>; text?: string };
type Step = (request: ModelRequest) => Reply;
const textOf = (content: unknown): string => typeof content === "string" ? content
  : Array.isArray(content) ? content.map((part) => typeof part?.text === "string" ? part.text : "").join("\n") : JSON.stringify(content ?? "");

class ScriptedModel {
  readonly requests: ModelRequest[] = [];
  private readonly scripts = new Map<string, Step[]>();
  private server: Server | null = null;
  origin = "";
  script(caseId: string, steps: Step[]): void { this.scripts.set(caseId, [...steps]); }
  of(caseId: string): ModelRequest[] { return this.requests.filter((request) => request.caseId === caseId); }
  /** Requests whose newest user message carries the reminder (a wake, or an input with the reminder as its preface). */
  reminded(caseId: string): ModelRequest[] { return this.of(caseId).filter((request) => request.lastRole === "user" && request.lastUser.includes(HEADER)); }
  async listen(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  }
  async close(): Promise<void> { this.server?.closeAllConnections(); await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve()); }
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET") {
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
      caseId: JSON.stringify(messages).match(/CASE:([A-Z0-9-]+)/)?.[1] ?? "unknown", at: Date.now(),
      lastUser: textOf([...messages].reverse().find((message) => message.role === "user")?.content ?? ""),
      lastRole: String(messages.at(-1)?.role ?? ""),
      toolResults: messages.slice(lastAssistant + 1).filter((message) => message.role === "tool").map((message) => textOf(message.content)),
    };
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    if (hasTools) this.requests.push(request);
    const step = hasTools ? this.scripts.get(request.caseId)?.shift() : undefined;
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
const background = (command: string) => ({ name: "run_bash", args: { command, run_in_background: true } });
const text = (value: string): Step => () => ({ text: value });

// --- the node ---------------------------------------------------------------------------------------------------

type Session = Readonly<{ url: string; gql: <T = any>(query: string, variables?: Json) => Promise<T>; child: ChildProcess; output: () => string }>;
const children: ChildProcess[] = [];

/** One test node: its data root, and the server build it runs (a restart is a new session on the same root). */
class TestNode {
  readonly root: string;
  constructor(root: string, private readonly env: Record<string, string>) { this.root = root; }
  static async create(env: Record<string, string>): Promise<TestNode> {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "restart-reminder-e2e-")));
    for (const dir of ["home", "db", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\nLMSTUDIO_HOSTS=${env.LMSTUDIO_HOSTS ?? ""}\n`);
    return new TestNode(root, env);
  }
  get busyRuns(): string { return path.join(this.root, "restart-resume", "busy-runs.json"); }
  get reminders(): string { return path.join(this.root, "restart-resume", "restart-reminders.json"); }
  get workspace(): string { return path.join(this.root, "workspace"); }

  async start(serverDir = SERVER_DIR): Promise<Session> {
    const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    Object.assign(env, { HOME: path.join(this.root, "home"), DATABASE_URL: `file:${path.join(this.root, "db", "production.db")}`, ...this.env, ...builtServerLaunchEnvironment() });
    const child = spawn(NODE, [path.join(serverDir, "dist", "app.js"), "--data-dir", this.root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
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

  /** Ends a session: SIGTERM is the graceful stop the app's quit sends; SIGKILL leaves no graceful end (a crash). */
  async stop(session: Session, signal: "SIGTERM" | "SIGKILL"): Promise<void> {
    if (session.child.exitCode !== null || session.child.signalCode !== null) return;
    const exited = once(session.child, "exit");
    session.child.kill(signal);
    const force = setTimeout(() => session.child.kill("SIGKILL"), 20_000);
    try { await exited; } finally { clearTimeout(force); }
  }
}

/**
 * The previous release: a copy of this build whose release stamp names another version, inside the server package so
 * its imports resolve as the build's own (`node_modules` of the package). Everything but the stamp is this build.
 */
const previousReleaseOf = async (serverDir: string): Promise<string> => {
  const dir = path.join(serverDir, `.restart-reminder-e2e-previous-${randomUUID().slice(0, 8)}`);
  await fs.mkdir(dir);
  await fs.cp(path.join(serverDir, "dist"), path.join(dir, "dist"), { recursive: true });
  await fs.copyFile(path.join(serverDir, "package.json"), path.join(dir, "package.json"));
  // The build's own dependencies and schema (the server runs `pnpm exec prisma migrate deploy` from its package).
  for (const entry of ["node_modules", "prisma"]) await fs.symlink(path.join(serverDir, entry), path.join(dir, entry));
  await fs.writeFile(path.join(dir, "dist", "release-identity.json"), `${JSON.stringify({ version: PREVIOUS_RELEASE }, null, 2)}\n`);
  return dir;
};

/** One item of the conversation the app loads (`getRunProjection`). */
type ConversationItem = { kind: string; role: string | null; turnId: string | null; content: string };
type Channel = { frames: Array<{ type: string; payload: Json; at: number }>; send: (content: string) => void; close: () => void };
const channelOf = async (session: Session, runId: string): Promise<Channel> => {
  const socket = new WebSocket(`${session.url.replace(/^http/, "ws")}/ws/agent/${runId}`);
  const frames: Channel["frames"] = [];
  socket.on("message", (raw: unknown) => {
    try { const parsed = JSON.parse(String(raw)) as Json; if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: parsed.payload ?? {}, at: Date.now() }); } catch { /* ignore */ }
  });
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  await until(() => frames.some((frame) => frame.type === "CONNECTED"), "CONNECTED", 30_000);
  const send = (content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
    agent_run_id: runId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
  return { frames, send, close: () => socket.terminate() };
};
const idleAfter = (channel: Channel, from: number, ms = 60_000) => until(() => channel.frames.slice(from).find((frame) =>
  frame.type === "AGENT_STATUS" && frame.payload.status === "idle" && channel.frames.slice(from).some((f) => f.type === "TURN_COMPLETED")), "idle after the turn", ms);

describe.skipIf(!ENABLED)("Restart reminder across real restarts of the built server", () => {
  const model = new ScriptedModel();
  const cleanups: Array<() => Promise<unknown>> = [];
  const tags: string[] = [];

  const record = async (caseId: string, value: Json) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify(value, null, 2));
  };
  const digest = (caseId: string) => model.of(caseId).map(({ at, lastRole, lastUser, toolResults }) => ({ at, lastRole, lastUser: lastUser.slice(0, 1500), toolResults: toolResults.map((r) => r.slice(0, 400)) }));

  beforeAll(async () => {
    await fs.access(path.join(SERVER_DIR, "dist", "app.js"));
    await model.listen();
  });
  afterAll(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    for (const tag of tags) for (const pid of withTag(tag)) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
    for (const cleanup of cleanups.reverse()) await cleanup().catch(() => undefined);
    await model.close();
  }, 60_000);

  const newNode = async (env: Record<string, string> = {}) => {
    const node = await TestNode.create({ LMSTUDIO_HOSTS: model.origin, ...env });
    cleanups.push(() => fs.rm(node.root, { recursive: true, force: true }));
    return node;
  };
  const nativeRun = async (session: Session, node: TestNode) => {
    const models = (await session.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
      .reloadProviderModelCatalog.llmModels.map((entry: Json) => entry.modelIdentifier as string);
    const modelIdentifier = models.find((id: string) => id.startsWith(MODEL_KEY));
    expect(modelIdentifier, models.join(", ")).toBeTruthy();
    const definitionId = (await session.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-${randomUUID().slice(0, 8)}`, role: "engineer", description: "restart reminder E2E",
        instructions: "Run the commands you are asked to run.", toolNames: ["run_bash"], skillNames: [] } })).createAgentDefinition.id;
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  const restore = async (session: Session, runId: string) => {
    const restored = (await session.gql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`, { id: runId })).restoreAgentRun;
    expect(restored.success, restored.message).toBe(true);
  };
  /** Starts a native run on its scripted steps (a background command, then idle or a long foreground command). */
  const busyNativeRun = async (caseId: string, session: Session, node: TestNode, steps: Step[]) => {
    model.script(caseId, steps);
    const runId = await nativeRun(session, node);
    const channel = await channelOf(session, runId);
    channel.send(`CASE:${caseId} Start the build in the background.`);
    return { runId, channel };
  };
  /**
   * Precondition of every native case: the background command started (its start result is in the model's second request).
   * Under heavy machine load a start can miss its deadline (`Command did not start`, FU-003 of autobyteus-333); the run then
   * has no task, so nothing is recorded, which is correct and not what the case is about.
   */
  const expectBackgroundStarted = async (caseId: string) => {
    const result = await until(() => model.of(caseId)[1]?.toolResults[0], `${caseId}: the background start result`, 60_000);
    expect(result, `${caseId} precondition: the background command started`).toContain('"status":"running"');
  };
  /** The run's live entry once it shows the run idle with its background task (the check runs every 2 s). */
  const recordEntry = (node: TestNode, runId: string) => until(async () => (await readJson(node.busyRuns))?.entries?.find((entry: Json) =>
    entry.agentRunId === runId && entry.status === "idle" && entry.backgroundTasks === true) ?? null, `${runId} idle with a task in the busy-run record`, 15_000);

  it("RR-01: graceful restart: recorded live, reminded once with the next input as 'a restart', nothing woken; an idle run without a task gets nothing", async () => {
    const tag = `RR01_${randomUUID().slice(0, 8)}`;
    tags.push(tag);
    const node = await newNode();
    let session = await node.start();
    const { runId, channel } = await busyNativeRun("RR-01", session, node, [() => ({ toolCalls: [background(tagged(tag))] }), text("Started."),
      text("Restarting what I need."), text("Fine.")]);
    await idleAfter(channel, 0);
    await expectBackgroundStarted("RR-01");
    const startedAt = channel.frames.find((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status === "running")!.at;
    const live = await orNull(recordEntry(node, runId));
    const recordedAfterMs = Date.now() - startedAt;
    const liveRecord = await readJson(node.busyRuns);
    // A control run: idle with no background task.
    model.script("RR-01C", [text("Done.")]);
    const quietRunId = await nativeRun(session, node);
    const quiet = await channelOf(session, quietRunId);
    quiet.send("CASE:RR-01C Say done.");
    await idleAfter(quiet, 0);
    await wait(2_500);
    const liveAfterQuiet = await readJson(node.busyRuns);

    await node.stop(session, "SIGTERM");
    const stopped = await readJson(node.busyRuns);
    const leftAfterStop = withTag(tag);
    session = await node.start();
    const afterTake = { busyRuns: await readJson(node.busyRuns), reminders: await readJson(node.reminders) };
    await wait(8_000);
    const requestsBeforeInput = model.of("RR-01").length;

    await restore(session, runId);
    const next = await channelOf(session, runId);
    next.send("CASE:RR-01 How is the build going?");
    const reminded = await until(() => model.of("RR-01").find((request) => request.lastUser.includes("How is the build going?")), "the next input reaches the model", 60_000);
    await idleAfter(next, 0);
    const systemNotice = next.frames.find((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === SENDER) ?? null;
    const before = next.frames.length;
    next.send("CASE:RR-01 And now?");
    const second = await until(() => model.of("RR-01").find((request) => request.lastUser.includes("And now?")), "the second input reaches the model", 60_000);
    await idleAfter(next, before);
    await restore(session, quietRunId).catch(() => undefined);
    const quietNext = await channelOf(session, quietRunId);
    model.script("RR-01C", [text("Still fine.")]);
    quietNext.send("CASE:RR-01C Anything new?");
    const quietReply = await until(() => model.of("RR-01C")[1], "the control run's input", 60_000);
    const remindersAfter = await readJson(node.reminders);
    // Recorded, not asserted: the conversation as the app reloads it, and the turn ids the run recorded across the restart.
    const conversation = ((await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? [])
      .map((item: Json) => ({ kind: item.kind, role: item.role ?? null, turnId: item.turnId ?? null, content: String(item.content ?? "").slice(0, 80) }));
    const traceFile = execFileSync("find", [node.root, "-path", `*${runId}/raw_traces_active.jsonl`], { encoding: "utf8" }).trim().split("\n")[0] ?? "";
    const traces = traceFile ? (await fs.readFile(traceFile, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json)
      .map((trace) => ({ turnId: trace.turn_id ?? null, type: trace.trace_type ?? null, content: String(trace.content ?? "").slice(0, 60) })) : [];
    await record("RR-01", { runId, quietRunId, live, liveRecord, recordedAfterMs, liveAfterQuiet, stopped, leftAfterStop, afterTake, requestsBeforeInput,
      systemNotice, remindersAfter, conversation, traces, requests: digest("RR-01"), control: digest("RR-01C") });
    next.close(); quietNext.close(); channel.close(); quiet.close();
    await node.stop(session, "SIGTERM");

    // REQ-001 / crash timing: in the live record within one 2 s check, as an idle run with a background task, no shutdownAt.
    expect(live).toMatchObject({ agentRunId: runId, status: "idle", backgroundTasks: true, place: "host" });
    expect(liveRecord?.shutdownAt ?? null).toBeNull();
    expect(recordedAfterMs).toBeLessThanOrEqual(3_000);
    expect((liveAfterQuiet?.entries ?? []).map((entry: Json) => entry.agentRunId)).toEqual([runId]);
    // The graceful stop adds shutdownAt; the app quit stops the command.
    expect(stopped?.shutdownAt).toEqual(expect.any(String));
    expect(leftAfterStop).toEqual([]);
    // The take: the record is gone, one pending reminder; nothing is woken.
    expect(afterTake.busyRuns).toBeNull();
    expect(afterTake.reminders?.reminders).toEqual([expect.objectContaining({ agentRunId: runId, cause: "restart", interruptedTurn: false })]);
    expect(requestsBeforeInput).toBe(2);
    // The next input carries the reminder once.
    expect(reminded.lastUser).toContain(HEADER);
    expect(reminded.lastUser).toMatch(/The application restarted at \d{4}-\d\d-\d\d \d\d:\d\d UTC \(reason: a restart\)\./);
    expect(reminded.lastUser).toContain(BACKGROUND_LINE);
    expect(reminded.lastUser).not.toContain(INTERRUPTED_LINE);
    expect(reminded.lastUser).toContain("How is the build going?");
    expect(systemNotice?.payload.content).toEqual(expect.stringContaining(HEADER));
    expect(second.lastUser).not.toContain(HEADER);
    expect(model.reminded("RR-01")).toHaveLength(1);
    expect(remindersAfter?.reminders ?? []).toEqual([]);
    // The control run is told nothing.
    expect(quietReply.lastUser).not.toContain(HEADER);
  }, 300_000);

  it("RR-02: forced kill: no shutdownAt; the next input carries 'an unexpected stop'", async () => {
    const tag = `RR02_${randomUUID().slice(0, 8)}`;
    tags.push(tag);
    const node = await newNode();
    let session = await node.start();
    const { runId, channel } = await busyNativeRun("RR-02", session, node, [() => ({ toolCalls: [background(tagged(tag))] }), text("Started."), text("Checking.")]);
    await idleAfter(channel, 0);
    await expectBackgroundStarted("RR-02");
    await orNull(recordEntry(node, runId));
    channel.close();
    await node.stop(session, "SIGKILL");
    const killed = await readJson(node.busyRuns);
    await wait(1_000);
    const leftAfterKill = withTag(tag);
    session = await node.start();
    const afterTake = await readJson(node.reminders);
    await wait(5_000);
    const requestsBeforeInput = model.of("RR-02").length;
    await restore(session, runId);
    const next = await channelOf(session, runId);
    next.send("CASE:RR-02 How is the build going?");
    const reminded = await until(() => model.of("RR-02").find((request) => request.lastUser.includes("How is the build going?")), "the next input", 60_000);
    await idleAfter(next, 0);
    // Recorded, not asserted: whether the background command outlives the killed node (DEC-008: the reminder says it may).
    const stillRunningWhenReminded = withTag(tag).map((pid) => execFileSync("ps", ["-o", "pid=,ppid=,pgid=,etime=,command=", "-p", String(pid)], { encoding: "utf8" }).trim());
    await record("RR-02", { runId, killed, leftAfterKill, stillRunningWhenReminded, afterTake, requestsBeforeInput, requests: digest("RR-02") });
    next.close();
    await node.stop(session, "SIGTERM");

    expect(killed?.shutdownAt ?? null).toBeNull();
    expect(killed?.entries).toEqual([expect.objectContaining({ agentRunId: runId, status: "idle", backgroundTasks: true })]);
    expect(afterTake?.reminders).toEqual([expect.objectContaining({ agentRunId: runId, cause: "unexpected_stop" })]);
    expect(requestsBeforeInput).toBe(2);
    expect(reminded.lastUser).toContain("(reason: an unexpected stop (a crash, a forced quit or a power loss)).");
    expect(reminded.lastUser).toContain(UNEXPECTED_STOP_LINE);
    expect(reminded.lastUser).not.toContain(BACKGROUND_LINE);
    expect(model.reminded("RR-02")).toHaveLength(1);
  }, 300_000);

  /** An update restart: the first session runs the previous release; `stepsFor(tag)` scripts the run (tag names its commands). */
  const updateCase = async (caseId: string, stepsFor: (tag: string) => Step[], midTurn: boolean, inputAtOnce: boolean) => {
    const tag = `${caseId.replace("-", "")}_${randomUUID().slice(0, 8)}`;
    tags.push(tag);
    const previous = await previousReleaseOf(SERVER_DIR);
    cleanups.push(() => fs.rm(previous, { recursive: true, force: true }));
    const node = await newNode();
    let session = await node.start(previous);
    const { runId, channel } = await busyNativeRun(caseId, session, node, stepsFor(tag));
    await expectBackgroundStarted(caseId);
    if (midTurn) await until(() => withTag(`${tag}_FG`).length > 0, "the foreground command runs", 30_000);
    else await idleAfter(channel, 0);
    const entry = await orNull(until(async () => {
      const found = (await readJson(node.busyRuns))?.entries?.find((item: Json) => item.agentRunId === runId);
      return found && found.backgroundTasks === true && (!midTurn || found.status === "running") ? found : null;
    }, "the live entry", 15_000));
    channel.close();
    await node.stop(session, "SIGTERM");
    const stopped = await readJson(node.busyRuns);
    const requestsBeforeRestart = model.of(caseId).length;
    session = await node.start();
    let inputSentAt: number | null = null;
    if (inputAtOnce) {
      await restore(session, runId).catch(() => undefined);
      const early = await channelOf(session, runId);
      inputSentAt = Date.now();
      early.send(`CASE:${caseId} Status?`);
      cleanups.push(async () => early.close());
    }
    const woken = await orNull(until(() => model.reminded(caseId)[0], "the reminder reaches the model", inputAtOnce ? 90_000 : 45_000));
    await wait(8_000);
    const reminders = await readJson(node.reminders);
    const result = { runId, entry, stopped, requestsBeforeRestart, inputSentAt, reminders, requests: digest(caseId) };
    return { node, session, runId, woken, result };
  };

  it("RR-03: update: the idle run is woken with 'an update to' this release, and its next input carries nothing", async () => {
    const { node, session, runId, woken, result } = await updateCase("RR-03", (tag) => [() => ({ toolCalls: [background(tagged(tag))] }),
      text("Started."), text("Restarting the build."), text("Fine.")], false, false);
    const version = (await readJson(path.join(SERVER_DIR, "dist", "release-identity.json")))?.version as string;
    await restore(session, runId).catch(() => undefined); // woken runs are live already; a run nobody woke is restored as the app does
    const next = await channelOf(session, runId);
    next.send("CASE:RR-03 And now?");
    const after = await until(() => model.of("RR-03").find((request) => request.lastUser.includes("And now?")), "the next input", 60_000);
    await idleAfter(next, 0);
    await record("RR-03", { ...result, version, requests: digest("RR-03") });
    next.close();
    await node.stop(session, "SIGTERM");

    expect(result.entry).toMatchObject({ status: "idle", backgroundTasks: true, version: PREVIOUS_RELEASE });
    expect(result.stopped?.shutdownAt).toEqual(expect.any(String));
    expect(woken?.lastRole).toBe("user");
    expect(woken?.lastUser.startsWith(HEADER)).toBe(true);
    expect(woken?.lastUser).toContain(`(reason: an update to v${version.replace(/^v/, "")}).`);
    expect(woken?.lastUser).toContain(BACKGROUND_LINE);
    expect(woken?.lastUser).not.toContain(INTERRUPTED_LINE);
    expect(after.lastUser).not.toContain(HEADER);
    expect(model.reminded("RR-03")).toHaveLength(1);
    expect(result.reminders?.reminders ?? []).toEqual([]);
  }, 300_000);

  it("RR-04: update with a run mid-turn that also has a background task: one reminder with the interrupted-turn line", async () => {
    const { node, session, woken, result } = await updateCase("RR-04", (tag) => [
      () => ({ toolCalls: [background(tagged(tag))] }),
      () => ({ toolCalls: [{ name: "run_bash", args: { command: tagged(`${tag}_FG`), timeout_seconds: 600 } }] }),
      text("Resuming after the update."),
    ], true, false);
    // The notice alone does not prove that the interrupted run can accept another user turn.
    const next = await channelOf(session, result.runId);
    try {
      const reply = "The follow-up after the update is complete.";
      model.script("RR-04", [text(reply)]);
      next.send("CASE:RR-04 Continue after the update.");
      await idleAfter(next, 0);
      const followUp = model.of("RR-04").find((request) => request.lastUser.includes("Continue after the update."));
      expect(followUp?.lastUser).toBe("CASE:RR-04 Continue after the update.");
      const projection = await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: result.runId });
      expect(projection.getRunProjection.conversation).toEqual(expect.arrayContaining([
        expect.objectContaining({ role: "assistant", content: reply }),
      ]));
      await record("RR-04", { ...result, followUp: followUp?.lastUser, reply });
    } finally { next.close(); }
    await node.stop(session, "SIGTERM");

    expect(result.entry).toMatchObject({ status: "running", backgroundTasks: true });
    expect(woken?.lastUser).toContain(INTERRUPTED_LINE);
    expect(woken?.lastUser).toContain(BACKGROUND_LINE);
    expect(woken?.lastUser).toContain("(reason: an update to v");
    expect(model.reminded("RR-04")).toHaveLength(1);
  }, 300_000);

  it("RR-05: update with input sent the moment the node answers: exactly one reminder between the wake and the input", async () => {
    const { node, session, woken, result } = await updateCase("RR-05", (tag) => [() => ({ toolCalls: [background(tagged(tag))] }),
      text("Started."), text("Answered."), text("Answered again.")], false, true);
    await wait(5_000);
    const reminded = model.reminded("RR-05");
    const carriedBy = !woken ? "none" : woken.lastUser.includes("Status?") ? "input" : "wake";
    await record("RR-05", { ...result, carriedBy, requests: digest("RR-05") });
    await node.stop(session, "SIGTERM");

    expect(reminded).toHaveLength(1);
    expect(model.of("RR-05").slice(2).filter((request) => request.lastUser.includes("Status?")).length).toBe(1);
    expect(result.reminders?.reminders ?? []).toEqual([]);
  }, 300_000);

  /** A Team run whose one member (its coordinator) is a native agent on the scripted model; returns the team and member runs. */
  const nativeTeamMember = async (session: Session, node: TestNode) => {
    const models = (await session.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
      .reloadProviderModelCatalog.llmModels.map((entry: Json) => entry.modelIdentifier as string);
    const modelIdentifier = models.find((id: string) => id.startsWith(MODEL_KEY));
    expect(modelIdentifier, models.join(", ")).toBeTruthy();
    const unique = randomUUID().slice(0, 8);
    const definitionId = (await session.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-member-${unique}`, role: "engineer", description: "restart reminder E2E member",
        instructions: "Run the commands you are asked to run.", toolNames: ["run_bash"], skillNames: [] } })).createAgentDefinition.id;
    const teamDefinitionId = (await session.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-team-${unique}`, description: "restart reminder E2E team", instructions: "Work.", coordinatorMemberName: "builder",
        nodes: [{ memberName: "builder", ref: definitionId, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    const config = { workspaceRootPath: node.workspace, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus" };
    const created = (await session.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [{ memberAddress: "/builder", agentDefinitionId: definitionId, ...config }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const tree = (await session.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: created.teamRunId })).getTeamRunResumeConfig.executionTree as Json;
    return { teamRunId: created.teamRunId as string, memberRunId: (tree.root_team.members as Json[]).find((member) => member.address === "/builder")!.agent_run_id as string };
  };
  /** The user's input to a Team member, on the Team's stream (after its CONNECTED). */
  const teamChannelOf = async (session: Session, teamRunId: string, memberRunId: string) => {
    const socket = new WebSocket(`${session.url.replace(/^http/, "ws")}/ws/agent-team/${teamRunId}`);
    const frames: Channel["frames"] = [];
    socket.on("message", (raw: unknown) => {
      try { const parsed = JSON.parse(String(raw)) as Json; if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: parsed.payload ?? {}, at: Date.now() }); } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "the Team stream's CONNECTED", 30_000);
    const send = (content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
      agent_run_id: memberRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
    return { frames, send, close: () => socket.terminate() };
  };

  it("RR-12: update: a Team member idle with a background task is woken once with 'an update to' this release; its next input carries nothing (autobyteus-500 round 5, the member path of the merged restart resumer)", async () => {
    const tag = `RR12_${randomUUID().slice(0, 8)}`;
    tags.push(tag);
    const previous = await previousReleaseOf(SERVER_DIR);
    cleanups.push(() => fs.rm(previous, { recursive: true, force: true }));
    const node = await newNode();
    let session = await node.start(previous);
    model.script("RR-12", [() => ({ toolCalls: [background(tagged(tag))] }), text("Started."), text("Restarting the build."), text("Fine.")]);
    const { teamRunId, memberRunId } = await nativeTeamMember(session, node);
    const channel = await teamChannelOf(session, teamRunId, memberRunId);
    channel.send("CASE:RR-12 Start the build in the background.");
    await expectBackgroundStarted("RR-12");
    const entry = await orNull(recordEntry(node, memberRunId));
    channel.close();
    await node.stop(session, "SIGTERM");
    const stopped = await readJson(node.busyRuns);
    session = await node.start();
    const woken = await orNull(until(() => model.reminded("RR-12")[0], "the reminder reaches the member's model", 45_000));
    await wait(8_000);
    const reminders = await readJson(node.reminders);
    const version = (await readJson(path.join(SERVER_DIR, "dist", "release-identity.json")))?.version as string;
    const next = await teamChannelOf(session, teamRunId, memberRunId);
    next.send("CASE:RR-12 And now?");
    const after = await until(() => model.of("RR-12").find((request) => request.lastUser.includes("And now?")), "the member's next input", 60_000);
    const conversation = ((await session.gql(`query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}`,
      { t: teamRunId, a: memberRunId })).getTeamMemberRunProjection?.conversation ?? []) as Json[];
    const noticesShown = conversation.filter((item) => String(item.content ?? "").includes(HEADER)).length;
    await record("RR-12", { teamRunId, memberRunId, entry, stopped, reminders, version, noticesShown, requests: digest("RR-12") });
    next.close();
    await node.stop(session, "SIGTERM");

    expect(entry).toMatchObject({ agentRunId: memberRunId, status: "idle", backgroundTasks: true });
    expect(stopped?.shutdownAt).toEqual(expect.any(String));
    expect(woken?.lastRole).toBe("user");
    expect(woken?.lastUser.startsWith(HEADER)).toBe(true);
    expect(woken?.lastUser).toContain(`(reason: an update to v${version.replace(/^v/, "")}).`);
    expect(woken?.lastUser).toContain(BACKGROUND_LINE);
    expect(after.lastUser).not.toContain(HEADER);
    expect(model.reminded("RR-12")).toHaveLength(1);
    expect(reminders?.reminders ?? []).toEqual([]);
    expect(noticesShown, "the member's conversation shows the notice once").toBe(1);
  }, 300_000);

  it("RR-06: Antigravity idle with an open daemon step is recorded and reminded with its next input", async () => {
    const node = await newNode({ ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills" });
    let session = await node.start();
    const definitionId = (await session.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-agy-${randomUUID().slice(0, 8)}`, role: "engineer", description: "restart reminder E2E",
        instructions: "Follow the request.", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier: "gemini-3.8-flash-low", autoExecuteTools: true,
        runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const channel = await channelOf(session, runId);
    channel.send('BACKGROUND_STEP:{"seconds":600}');
    await idleAfter(channel, 0, 90_000);
    const entry = await recordEntry(node, runId);
    channel.close();
    await node.stop(session, "SIGTERM");
    session = await node.start();
    const afterTake = await readJson(node.reminders);
    await restore(session, runId);
    const next = await channelOf(session, runId);
    next.send("ECHO_INPUT what is the status?");
    // The scripted AGY answers `ECHO:<the exact input it received>`; read it where the app reads the conversation.
    const echoed = await until(async () => {
      const conversation = JSON.stringify((await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []);
      const at = conversation.indexOf("ECHO:");
      return at >= 0 ? conversation.slice(at, at + 3000) : null;
    }, "the echoed input", 90_000);
    const remindersAfter = await readJson(node.reminders);
    await record("RR-06", { runId, entry, afterTake, echoed: echoed.slice(0, 3000), remindersAfter });
    next.close();
    await node.stop(session, "SIGTERM");

    expect(entry).toMatchObject({ status: "idle", backgroundTasks: true });
    expect(afterTake?.reminders).toEqual([expect.objectContaining({ agentRunId: runId, cause: "restart" })]);
    expect(echoed).toContain("application restarted");
    expect(echoed).toContain("reason: a restart");
    expect(echoed).toContain("what is the status?");
    expect(remindersAfter?.reminders ?? []).toEqual([]);
  }, 300_000);
  /** A run of another runtime on the node (live cases); returns its id and channel. */
  /** The run's stored raw traces in order (archived segments, then the active file): turn id, type, content start. */
  const tracesOf = async (node: TestNode, runId: string) => {
    const files = execFileSync("find", [node.root, "-path", `*${runId}*`, "-name", "raw_traces*.jsonl"], { encoding: "utf8" }).trim().split("\n").filter(Boolean)
      .sort((left, right) => Number(left.endsWith("raw_traces_active.jsonl")) - Number(right.endsWith("raw_traces_active.jsonl")) || left.localeCompare(right));
    const lines = (await Promise.all(files.map((file) => fs.readFile(file, "utf8")))).flatMap((body) => body.split("\n").filter(Boolean));
    return { files: files.map((file) => path.relative(node.root, file)), lines,
      traces: lines.map((line) => JSON.parse(line) as Json).map((trace) => ({ turnId: (trace.turn_id ?? null) as string | null, type: String(trace.trace_type ?? ""), content: String(trace.content ?? "").slice(0, 80) })) };
  };
  /** The conversation as the app loads it (a reload, the phone opening the run). */
  const conversationOf = async (session: Session, runId: string): Promise<ConversationItem[]> => ((await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId }))
    .getRunProjection?.conversation ?? []).map((item: Json) => ({ kind: String(item.kind ?? ""), role: (item.role ?? null) as string | null, turnId: (item.turnId ?? null) as string | null,
    content: String(item.content ?? "") }));
  /** The conversation as a reader sees it: inputs, reminders and the agent's text replies (with their turn), in order. */
  const shownOf = (conversation: ConversationItem[]) => conversation.flatMap((item) =>
    item.content.includes(HEADER) ? ["reminder"]
      : item.kind === "message" && item.role === "user" ? [`user:${item.content.replace(/^CASE:[A-Z0-9-]+ /, "")}`]
        : item.kind === "message" && item.role === "assistant" && item.content ? [`assistant:${item.content}@${item.turnId}`] : []);
  const turnsStarted = (channel: Channel) => [...new Set(channel.frames.filter((frame) => frame.type === "TURN_STARTED").map((frame) => String(frame.payload.turn_id ?? "")))];
  /**
   * A native run on `serverDir`: a first turn starts a background build; two graceful restarts follow, each with the build
   * running (the second turn starts it again), and the input after each restart carries the reminder. Returns each
   * session's live turn ids; the node is left stopped.
   */
  const restartedTwice = async (caseId: string, node: TestNode, serverDir: string) => {
    const tag = `${caseId.replace("-", "")}_${randomUUID().slice(0, 8)}`;
    tags.push(tag);
    let session = await node.start(serverDir);
    const { runId, channel } = await busyNativeRun(caseId, session, node, [() => ({ toolCalls: [background(tagged(tag))] }), text("REPLY_ONE"),
      () => ({ toolCalls: [background(tagged(tag))] }), text("REPLY_TWO"), text("REPLY_THREE")]);
    await idleAfter(channel, 0);
    await expectBackgroundStarted(caseId);
    await recordEntry(node, runId);
    const live = [turnsStarted(channel)];
    channel.close();
    for (const input of [`CASE:${caseId} Start the build again.`, `CASE:${caseId} And now?`]) {
      await node.stop(session, "SIGTERM");
      session = await node.start(serverDir);
      await restore(session, runId);
      const next = await channelOf(session, runId);
      next.send(input);
      await idleAfter(next, 0);
      if (input.includes("again")) {
        const started = await until(() => model.of(caseId)[3]?.toolResults[0], `${caseId}: the second background start result`, 60_000);
        expect(started, `${caseId} precondition: the second background command started`).toContain('"status":"running"');
        await recordEntry(node, runId);
      }
      live.push(turnsStarted(next));
      next.close();
    }
    await node.stop(session, "SIGTERM");
    return { runId, live };
  };

  it("RR-10: a native run restarted twice keeps one id per turn; each reminder and each reply has its own turn in the conversation (autobyteus-526)", async () => {
    const node = await newNode();
    const { runId, live } = await restartedTwice("RR-10", node, SERVER_DIR);
    const session = await node.start();
    const { traces, files } = await tracesOf(node, runId);
    const conversation = await conversationOf(session, runId);
    await node.stop(session, "SIGTERM");
    const shown = shownOf(conversation);
    await record("RR-10", { serverDir: SERVER_DIR, runId, live, files, traces, shown,
      conversation: conversation.map((item) => ({ ...item, content: item.content.slice(0, 80) })), requests: digest("RR-10") });

    // The stored traces: the three inputs are turns 1, 2, 3; each reminder is stored once, in the turn of the input it came with.
    expect(traces.filter((trace) => trace.type === "user").map((trace) => trace.turnId)).toEqual(["turn_0001", "turn_0002", "turn_0003"]);
    expect(traces.filter((trace) => trace.type === "system_task_notification" && trace.content.includes(HEADER)).map((trace) => trace.turnId)).toEqual(["turn_0002", "turn_0003"]);
    // Live: each session's turn is new, not an id an earlier session used.
    expect(live).toEqual([["turn_0001"], ["turn_0002"], ["turn_0003"]]);
    // As the app loads it (inputs and notices carry no turn id there; the agent's items do): each input, reminder and reply
    // once, in order, and each reply in its own turn, so a view grouping by turn shows them apart.
    expect(shown).toEqual(["user:Start the build in the background.", "assistant:REPLY_ONE@turn_0001", "reminder", "user:Start the build again.",
      "assistant:REPLY_TWO@turn_0002", "reminder", "user:And now?", "assistant:REPLY_THREE@turn_0003"]);
  }, 600_000);

  it.skipIf(!BASE_SERVER_DIR)("RR-11: a run restored twice before the fix keeps its stored ids; its next turn continues after the highest (autobyteus-526 DEC-003)", async () => {
    const node = await newNode();
    const { runId, live } = await restartedTwice("RR-11", node, BASE_SERVER_DIR!);
    const before = await tracesOf(node, runId);
    const session = await node.start();
    const oldConversation = await conversationOf(session, runId);
    model.script("RR-11", [text("REPLY_AFTER_FIX")]);
    await restore(session, runId);
    const next = await channelOf(session, runId);
    next.send("CASE:RR-11 After the fix?");
    await idleAfter(next, 0);
    const newLive = turnsStarted(next);
    next.close();
    const after = await tracesOf(node, runId);
    const conversation = await conversationOf(session, runId);
    await node.stop(session, "SIGTERM");
    const highest = Math.max(...before.traces.flatMap((trace) => /^turn_(\d+)$/.exec(trace.turnId ?? "") ? [Number(/^turn_(\d+)$/.exec(trace.turnId!)![1])] : []));
    await record("RR-11", { baseServerDir: BASE_SERVER_DIR, runId, liveOnBase: live, tracesBefore: before.traces, highest, newLive,
      oldShown: shownOf(oldConversation), shown: shownOf(conversation),
      tracesAfter: after.traces, conversation: conversation.map((item) => ({ ...item, content: item.content.slice(0, 80) })) });

    // The base build reused ids after its restarts: that is the stored history this build opens.
    expect(new Set(before.traces.filter((trace) => trace.type === "user").map((trace) => trace.turnId)).size).toBeLessThan(3);
    // Opening and continuing it rewrites nothing: the stored lines are kept as they were, the new turn is appended.
    expect(after.lines.slice(0, before.lines.length)).toEqual(before.lines);
    // The next turn continues after the highest stored id, live and stored, and is its own turn as the app loads it.
    const expected = `turn_${String(highest + 1).padStart(4, "0")}`;
    expect(newLive).toEqual([expected]);
    expect(after.traces.slice(before.traces.length).filter((trace) => trace.type === "user").map((trace) => trace.turnId)).toEqual([expected]);
    expect(shownOf(conversation).at(-1)).toBe(`assistant:REPLY_AFTER_FIX@${expected}`);
  }, 600_000);

  const runtimeRun = async (session: Session, node: TestNode, runtimeKind: string, llmModelIdentifier: string) => {
    const definitionId = (await session.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-${runtimeKind}-${randomUUID().slice(0, 8)}`, role: "engineer", description: "restart reminder E2E",
        instructions: "Keep replies to one short sentence.", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier, autoExecuteTools: true, runtimeKind } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  /** What the run answered after `question`, read where the app reads the conversation. */
  const replyAfter = async (session: Session, runId: string, question: string): Promise<string> => {
    const conversation = JSON.stringify((await session.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []);
    return conversation.slice(conversation.lastIndexOf(question) + question.length);
  };
  /** Starts the run's background command, restarts the node gracefully, and sends the next input. */
  const liveRestart = async (caseId: string, node: TestNode, runtimeKind: string, modelId: string, startPrompt: string) => {
    let session = await node.start();
    const runId = await runtimeRun(session, node, runtimeKind, modelId);
    const channel = await channelOf(session, runId);
    channel.send(startPrompt);
    await idleAfter(channel, 0, 300_000);
    // Codex publishes no task events (its view is a snapshot); the others announce the running task.
    const running = channel.frames.find((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status === "running") ?? null;
    await wait(3_000);
    const live = await readJson(node.busyRuns);
    channel.close();
    await node.stop(session, "SIGTERM");
    const stopped = await readJson(node.busyRuns);
    session = await node.start();
    const afterTake = await readJson(node.reminders);
    await restore(session, runId);
    const next = await channelOf(session, runId);
    const question = "What happened to the command you started? Answer in one short sentence.";
    next.send(question);
    await idleAfter(next, 0, 300_000);
    const notice = next.frames.find((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === SENDER) ?? null;
    const reply = (await replyAfter(session, runId, question)).slice(0, 2000);
    const remindersAfter = await readJson(node.reminders);
    const result = { runId, runtimeKind, modelId, runningTask: running?.payload ?? null, live, stopped, afterTake, notice: notice?.payload ?? null, reply, remindersAfter };
    await record(caseId, result);
    next.close();
    await node.stop(session, "SIGTERM");
    return result;
  };

  it.skipIf(!LIVE)("RR-07 (live): Claude idle with a background Bash command is recorded and reminded with its next input", async () => {
    const { resolveClaudeCliExecutableCandidates } = await import("../../helpers/claude-cli-executable-candidates.js");
    const cli = resolveClaudeCliExecutableCandidates()[0];
    expect(cli, "a claude CLI").toBeDefined();
    const realHome = os.userInfo().homedir;
    const node = await newNode({ HOME: realHome, USER: os.userInfo().username, LOGNAME: os.userInfo().username, CLAUDE_CODE_EXECUTABLE_PATH: cli!.executablePath });
    const result = await liveRestart("RR-07", node, "claude_agent_sdk", process.env.RESTART_REMINDER_CLAUDE_MODEL?.trim() || "haiku",
      "Use the Bash tool with run_in_background set to true to run exactly: sleep 600\nDo not wait for it. Reply only STARTED and end your turn.");
    expect(result.runningTask).not.toBeNull();
    expect(result.stopped?.entries).toEqual([expect.objectContaining({ agentRunId: result.runId, status: "idle", backgroundTasks: true })]);
    expect(result.afterTake?.reminders).toEqual([expect.objectContaining({ agentRunId: result.runId, cause: "restart" })]);
    expect(String(result.notice?.content ?? "")).toContain(HEADER);
    expect(result.reply).toMatch(/restart|stopp|terminat|kill|no longer/i);
    expect(result.remindersAfter?.reminders ?? []).toEqual([]);
  }, 900_000);

  it.skipIf(!LIVE)("RR-08 (live): Codex idle with a background terminal is recorded at the graceful stop and reminded with its next input", async () => {
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "restart-reminder-codex-home-"));
    cleanups.push(() => fs.rm(codexHome, { recursive: true, force: true }));
    await fs.symlink(path.join(os.userInfo().homedir, ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    await fs.writeFile(path.join(codexHome, "config.toml"), 'model_reasoning_effort = "medium"\n');
    const node = await newNode({ CODEX_HOME: codexHome, USER: os.userInfo().username, LOGNAME: os.userInfo().username });
    const result = await liveRestart("RR-08", node, "codex_app_server", process.env.RESTART_REMINDER_CODEX_MODEL?.trim() || "gpt-6.1-terra",
      "Start the command `sleep 600` so that it keeps running in a background terminal after you reply, and do not wait for it. Then reply only STARTED.");
    expect(result.live?.entries ?? [], "Codex idle runs are not in the live record (their view is asked only at the graceful stop)").toEqual([]);
    expect(result.stopped?.entries).toEqual([expect.objectContaining({ agentRunId: result.runId, status: "idle", backgroundTasks: true })]);
    expect(String(result.notice?.content ?? "")).toContain(HEADER);
    expect(result.remindersAfter?.reminders ?? []).toEqual([]);
  }, 900_000);
  it.skipIf(!LIVE || !capturedTestVaultSetting())("RR-09 (live): a native agent killed while its build runs is told the build may still run untracked, and checks it", async () => {
    const tag = `NIGHTLY_${randomUUID().slice(0, 8)}`;
    const groupsOf = () => execFileSync("ps", ["-ww", "-A", "-o", "pgid=,command="], { encoding: "utf8" }).split("\n")
      .filter((line) => line.includes(tag) && !line.includes("ps -ww")).map((line) => Number(line.trim().split(/\s+/)[0]));
    cleanups.push(async () => { for (const pgid of new Set(groupsOf())) { try { process.kill(-pgid, "SIGKILL"); } catch { /* gone */ } } });
    const node = await newNode({ AUTOBYTEUS_TEST_VAULT: path.resolve(capturedTestVaultSetting()!.replace(/^~(?=\/)/, os.userInfo().homedir)) });
    let session = await node.start();
    const modelName = process.env.RESTART_REMINDER_NATIVE_MODEL?.trim() || "gpt-5.4-mini";
    const models = (await session.gql(`mutation{ensureProviderModelCatalog(providerId:"OPENAI",runtimeKind:"autobyteus"){llmModels{modelIdentifier value}}}`))
      .ensureProviderModelCatalog.llmModels as Json[];
    const modelIdentifier = String(models.find((entry) => entry.value === modelName || entry.modelIdentifier === modelName)?.modelIdentifier ?? "");
    expect(modelIdentifier, models.map((entry) => entry.value).join(", ")).not.toBe("");
    const definitionId = (await session.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `restart-reminder-native-live-${randomUUID().slice(0, 8)}`, role: "engineer", description: "restart reminder E2E",
        instructions: "You are a build assistant. Use run_bash for shell work. Keep replies short.", toolNames: ["run_bash"], skillNames: [] } })).createAgentDefinition.id;
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const channel = await channelOf(session, runId);
    channel.send(`Start my nightly build in the background with run_bash (run_in_background): \`sleep 600; echo ${tag}\`. Do not wait for it; reply STARTED.`);
    await idleAfter(channel, 0, 300_000);
    const entry = await orNull(recordEntry(node, runId));
    channel.close();
    await node.stop(session, "SIGKILL");
    await wait(1_000);
    const survivorsAfterKill = groupsOf();
    session = await node.start();
    await restore(session, runId);
    const next = await channelOf(session, runId);
    const question = "Is my nightly build still running?";
    next.send(question);
    await idleAfter(next, 0, 300_000);
    const notice = next.frames.find((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === SENDER) ?? null;
    const checks = next.frames.filter((frame) => frame.type === "TOOL_EXECUTION_STARTED").map((frame) => String((frame.payload.arguments as Json | undefined)?.command ?? ""));
    const reply = (await replyAfter(session, runId, question)).slice(0, 3000);
    const answer = [...reply.matchAll(/"role":"assistant"[^}]*?"content":"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]).filter(Boolean).join(" | ");
    const survivorsWhenAnswered = groupsOf();
    await record("RR-09", { runId, modelIdentifier, entry, survivorsAfterKill, notice: notice?.payload ?? null, checks, answer, survivorsWhenAnswered });
    next.close();
    await node.stop(session, "SIGTERM");

    expect(entry).toMatchObject({ status: "idle", backgroundTasks: true });
    expect(survivorsAfterKill.length, "the build outlives the killed node").toBeGreaterThan(0);
    expect(String(notice?.payload.content ?? "")).toContain(UNEXPECTED_STOP_LINE);
    expect(checks.some((command) => /\bps\b|pgrep|kill -0|\/proc\//.test(command)), `the agent checks the build: ${JSON.stringify(checks)}`).toBe(true);
    // The build is running (it outlived the node): the answer says so and does not claim it stopped.
    expect(answer).toMatch(/running/i);
    expect(answer).not.toMatch(/\bnot (currently )?running|isn.t running|was stopped|stopped by the restart/i);
  }, 900_000);
});
