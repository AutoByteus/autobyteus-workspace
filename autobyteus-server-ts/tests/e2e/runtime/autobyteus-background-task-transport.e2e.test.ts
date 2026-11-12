/**
 * Native (AutoByteus) background tasks end to end, with a scripted model (autobyteus-338). The real studio server runs
 * in process; runs are driven through GraphQL and the agent WebSocket as the desktop app does; every `run_bash` call
 * runs real processes through the command wrapper. Only inference is scripted: an LM Studio-compatible server answers
 * each case's turns in order and records exactly what the model received (tool list, tool results, notices), so busy
 * and idle timing is deterministic and the notice text is read where the model reads it.
 *
 * Cases (the IDs of the ticket's acceptance criteria):
 *   BGT-01  run_in_background start < 2 s with pid, cwd, outputFile; `tail` while running and after; idle run woken
 *           by one notice within 5 s of the end; panel events and event-stream view; journal lines; a definition
 *           naming the four retired tools starts with run_bash only (AC-001, AC-003, AC-007, AC-008, AC-011, QR-004);
 *           autobyteus-473 AC-004: the event-stream view lists the task running, then completed
 *   BGT-02  a command that fails while the agent is busy: one notice right after the turn, naming exit code 3 (AC-002)
 *   BGT-03  three commands ending within 1 s: exactly one notice naming all three, and the one still running (AC-004)
 *   BGT-04  `npm run dev` with a child process: `kill <pid>` stops everything; the end is in the kill's own result;
 *           panel `stopped`; no notice (AC-005)
 *   BGT-05  `&` jobs: `(sleep 2; exit 7) & echo started`; kill of a job; a job with children (DEC-012); `& disown`
 *           untracked; Terminate stops what is left (AC-010)
 *   BGT-06  Terminate with a running background command: gone within 10 s, no notice, output folder removed (AC-006)
 *   BGT-07  Stop during a foreground command: the background command keeps running and its notice arrives (AC-013)
 *   BGT-08  a background command killed from outside while the agent is idle: notice names the signal (AC-002)
 *   BGT-09  a standalone agent delegates to a top-level agent; the delegated copy with a running command is not
 *           idle-shut-down; the notice wakes it; it reports and is shut down one grace period after it is quiet (AC-009)
 *
 * Gate: RUN_NATIVE_BACKGROUND_TASK_E2E=1. No credentials. macOS/Linux (process-table checks). BGT-09 takes ~3 min
 * (the 60 s minimum idle-shutdown grace period). Run with a clean environment:
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_NATIVE_BACKGROUND_TASK_E2E=1 \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts --no-watch
 * Optional BACKGROUND_TASK_E2E_EVIDENCE_DIR keeps per-case JSON (model requests, frame timeline, process checks).
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createServer, type Server } from "node:http";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BACKGROUND_TASK_NOTICE_HEADER } from "../../../src/background-task-notices/services/background-task-notice-builder.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY } from "../../../src/config/task-execution-idle-shutdown-setting.js";
import { NativeRuntimeLiveHarness, isRecord, wait, type Json, type RunSession } from "../helpers/native-runtime-live-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_NATIVE_BACKGROUND_TASK_E2E === "1" && process.platform !== "win32";
const describeGated = ENABLED ? describe : describe.skip;
const EVIDENCE_DIR = process.env.BACKGROUND_TASK_E2E_EVIDENCE_DIR?.trim() || null;
const MODEL_KEY = "background-task-fixture";
const RETIRED_TOOLS = ["start_background_process", "get_background_processes", "get_process_output", "stop_background_process"];
const NOTICE_SENDER = "system.background_task_notifier";
const GRACE_MS = 60_000;
const NODE = process.execPath;

// --- scripted model ---------------------------------------------------------------------------------------------

type ToolCall = { name: string; args: Json };
type Reply = { toolCalls?: ToolCall[]; text?: string; delayMs?: number };
type ModelRequest = {
  caseId: string;
  at: number;
  /** The `run_bash`-capable agent turn requests; others (titles, summaries) are answered with text and not scripted. */
  scripted: boolean;
  tools: string[];
  messages: Json[];
  /** Contents of the tool results this request carries after the last assistant message. */
  toolResults: string[];
  /** Text of the last user message (a notice is a user message carrying the notice header). */
  lastUser: string;
  /** The request opens a turn for a notice: its last message is the notice itself (not a tool result after it). */
  noticeTurn: boolean;
  repliedAt: number | null;
};
type Step = (request: ModelRequest) => Reply;

const textOf = (content: unknown): string => typeof content === "string" ? content
  : Array.isArray(content) ? content.map((part) => isRecord(part) && typeof part.text === "string" ? part.text : "").join("\n")
    : JSON.stringify(content ?? "");

class ScriptedModel {
  readonly requests: ModelRequest[] = [];
  private readonly scripts = new Map<string, Step[]>();
  private server: Server | null = null;
  origin = "";

  script(caseId: string, steps: Step[]): void { this.scripts.set(caseId, [...steps]); }
  of(caseId: string): ModelRequest[] { return this.requests.filter((request) => request.caseId === caseId && request.scripted); }
  notices(caseId: string): ModelRequest[] { return this.of(caseId).filter((request) => request.noticeTurn); }

  async listen(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve());
  }

  private async handle(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse): Promise<void> {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    const messages = Array.isArray(body.messages) ? body.messages as Json[] : [];
    const tools = (Array.isArray(body.tools) ? body.tools as Json[] : [])
      .map((tool) => isRecord(tool.function) ? String(tool.function.name) : "").filter(Boolean);
    const all = JSON.stringify(messages);
    const caseId = all.match(/CASE:([A-Z0-9-]+)/)?.[1] ?? "unknown";
    const lastAssistant = messages.map((message) => message.role).lastIndexOf("assistant");
    const toolResults = messages.slice(lastAssistant + 1).filter((message) => message.role === "tool").map((message) => textOf(message.content));
    const lastUser = textOf([...messages].reverse().find((message) => message.role === "user")?.content ?? "");
    const last = messages.at(-1);
    const noticeTurn = last?.role === "user" && textOf(last.content).includes(BACKGROUND_TASK_NOTICE_HEADER);
    const request: ModelRequest = { caseId, at: Date.now(), scripted: tools.includes("run_bash") || tools.includes("delegate_task"),
      tools, messages, toolResults, lastUser, noticeTurn, repliedAt: null };
    this.requests.push(request);
    const step = request.scripted ? this.scripts.get(caseId)?.shift() : undefined;
    const reply: Reply = step ? step(request) : { text: "OK." };
    if (reply.delayMs) await wait(reply.delayMs);
    const toolCalls = reply.toolCalls?.map((call, index) => ({ index, id: `call-${randomUUID().slice(0, 12)}`, type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.args) } }));
    const delta = toolCalls?.length ? { role: "assistant", tool_calls: toolCalls } : { role: "assistant", content: reply.text ?? "OK." };
    const chunk = (value: Json, finish: string | null) => ({ id: `fixture-${this.requests.length}`, object: "chat.completion.chunk", created: 1,
      model: MODEL_KEY, choices: [{ index: 0, delta: value, finish_reason: finish }] });
    request.repliedAt = Date.now();
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls?.length ? "tool_calls" : "stop"))}\n\ndata: [DONE]\n\n`);
  }
}

// --- helpers ----------------------------------------------------------------------------------------------------

const bash = (command: string, extra: Json = {}): ToolCall => ({ name: "run_bash", args: { command, ...extra } });
const background = (command: string): ToolCall => bash(command, { run_in_background: true });
const text = (value: string, delayMs?: number): Step => () => ({ text: value, delayMs });
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
/** A long-lived node process whose argv carries `tag`. */
const tagged = (tag: string, code = "setInterval(()=>{},1000)") => `${quote(NODE)} -e ${quote(code)} ${tag}`;

/** The JSON object a tool result carries (the native runtime renders results as JSON text). */
const resultJson = (content: string): Json => {
  const start = content.indexOf("{");
  if (start < 0) throw new Error(`tool result is not JSON: ${content.slice(0, 300)}`);
  return JSON.parse(content.slice(start, content.lastIndexOf("}") + 1)) as Json;
};
const tasksOf = (result: Json, key: "backgroundTasksStarted" | "backgroundTasksEnded") =>
  (Array.isArray(result[key]) ? result[key] : []) as Json[];

type Row = { pid: number; pgid: number; command: string };
const processTable = (): Row[] => execFileSync("ps", ["-ww", "-A", "-o", "pid=,pgid=,stat=,command="], { encoding: "utf8" })
  .split("\n").flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    return match && !match[3]!.includes("Z") ? [{ pid: Number(match[1]), pgid: Number(match[2]), command: match[4]! }] : [];
  });
/** The node processes `tagged` started (the wrapper shells also carry the command text in their argv). */
const withTag = (tag: string) => processTable().filter((row) => row.command.startsWith(NODE) && row.command.includes(tag));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; } };
const until = async <T>(probe: () => T | undefined | Promise<T | undefined>, label: string, ms = 60_000, every = 100): Promise<T> => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== undefined && value !== false) return value as T;
    await wait(every);
  }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}`);
};

type Timed = { type: string; payload: Json; at: number };
/** Every frame of a session with its arrival time (the harness keeps frames without times). */
const timeline = (session: RunSession): Timed[] => {
  const frames: Timed[] = [];
  session.socket.on("message", (raw) => {
    try {
      const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
      if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {}, at: Date.now() });
    } catch { /* ignore */ }
  });
  return frames;
};
const taskFrames = (frames: Timed[], taskId?: number) => frames.filter((frame) => frame.type === "BACKGROUND_TASK_UPDATED"
  && (taskId === undefined || frame.payload.task_id === String(taskId)));
const statusPath = (frames: Timed[]) => frames.map((frame) => String(frame.payload.status)).filter((status, i, all) => i === 0 || all[i - 1] !== status);

const findRunMemoryDir = async (root: string, runId: string): Promise<string | null> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (path.basename(root) === runId && entries.some((entry) => entry.name === "raw_traces_active.jsonl")) return root;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findRunMemoryDir(path.join(root, entry.name), runId);
    if (found) return found;
  }
  return null;
};

// --- suite ------------------------------------------------------------------------------------------------------

describeGated("Native background tasks through the real server (scripted model)", () => {
  const model = new ScriptedModel();
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: null, stepTimeoutMs: 120_000, tempPrefix: "native-bgt-e2e" });
  const cleanupTags: string[] = [];
  const evidence: Json = {};
  let modelIdentifier = "";
  let definitionId = "";
  let dataDir = "";

  const record = async (caseId: string, value: Json) => {
    evidence[caseId] = value;
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify(value, null, 2));
  };
  const requestDigest = (caseId: string) => model.requests.filter((request) => request.caseId === caseId).map((request) => ({
    at: request.at, repliedAt: request.repliedAt, scripted: request.scripted, noticeTurn: request.noticeTurn, tools: request.tools,
    toolResults: request.toolResults, lastUser: request.lastUser.slice(0, 4000),
  }));
  const frameDigest = (frames: Timed[]) => frames.filter((frame) => !["SEGMENT_CONTENT", "AGENT_INPUT_STATE"].includes(frame.type))
    .map((frame) => ({ type: frame.type, at: frame.at, payload: JSON.stringify(frame.payload).slice(0, 600) }));

  beforeAll(async () => {
    await model.listen();
    vi.stubEnv("LMSTUDIO_HOSTS", model.origin);
    vi.stubEnv(TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY, String(GRACE_MS));
    await harness.start();
    dataDir = appConfigProvider.config.getAppDataDir();
    const catalog = await harness.gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string; value: string }> } }>(
      "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value } } }",
      { p: "LMSTUDIO", r: "autobyteus" });
    modelIdentifier = catalog.ensureProviderModelCatalog.llmModels.find((entry) => entry.value === MODEL_KEY || entry.modelIdentifier.startsWith(MODEL_KEY))?.modelIdentifier ?? "";
    expect(modelIdentifier, JSON.stringify(catalog)).not.toBe("");
    definitionId = await harness.createDefinition("native-bgt", "Run the shell commands you are asked to run.", ["run_bash"]);
  }, 180_000);

  afterEach(() => {
    for (const tag of cleanupTags.splice(0)) for (const row of withTag(tag)) { try { process.kill(row.pid, "SIGKILL"); } catch { /* gone */ } }
  });

  afterAll(async () => {
    await harness.stop();
    await model.close();
    vi.unstubAllEnvs();
  }, 180_000);

  const start = async (caseId: string, steps: Step[], files: Record<string, string> = {}, definition = definitionId) => {
    model.script(caseId, steps);
    const workspace = await fs.realpath(await harness.makeWorkspace(files));
    const session = await harness.startRun(definition, modelIdentifier, null, workspace);
    return { session, frames: timeline(session), workspace };
  };
  /** Waits for the scripted turn requests of a case to reach `count`. */
  const requests = (caseId: string, count: number, ms = 60_000) => until(() => model.of(caseId).length >= count ? model.of(caseId) : undefined,
    `${caseId}: ${count} model requests`, ms);
  const turnEnd = (frames: Timed[], after: number, ms = 60_000) => until(() => frames.find((frame) => frame.at >= after
    && (frame.type === "TURN_COMPLETED" || frame.type === "TURN_INTERRUPTED")), "turn end", ms);
  const idleAfter = (frames: Timed[], after: number, ms = 60_000) => until(() => frames.find((frame) => frame.at >= after
    && frame.type === "AGENT_STATUS" && frame.payload.status === "idle"), "idle", ms);

  it("BGT-01: background start, tail, idle wake by one notice, panel and journal; retired tool names skipped (AC-001/003/007/008/011)", async () => {
    const warnings: string[] = [];
    const warn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
    const legacyDefinition = await harness.createDefinition("native-bgt-legacy", "Run the shell commands you are asked to run.", ["run_bash", ...RETIRED_TOOLS]);
    const command = "echo first-line; sleep 5; echo done-line";
    let startResult: Json = {};
    let aliveAtStartResult = false;
    const { session, frames, workspace } = await start("BGT-01", [
      () => ({ toolCalls: [background(command)] }),
      (request) => {
        startResult = resultJson(request.toolResults[0]!);
        aliveAtStartResult = alive(Number(startResult.pid));
        return { toolCalls: [bash(`tail -n 5 ${quote(String(startResult.outputFile))}`)] };
      },
      text("Waiting for the build."),
      () => ({ toolCalls: [bash(`tail -n 5 ${quote(String(startResult.outputFile))}`)] }),
      text("The build finished."),
    ], {}, legacyDefinition);
    try {
      await harness.runTurn(session, "BGT-01", "CASE:BGT-01 Start the build in the background.");
      warn.mockRestore();
      const firstTurnEnd = frames.find((frame) => frame.type === "TURN_COMPLETED")!;
      const [first, second, third] = model.of("BGT-01");
      const pid = Number(startResult.pid);

      // AC-008: the definition names the retired tools; the run starts, the model sees run_bash only, and each skip is named.
      expect(first!.tools).toContain("run_bash");
      for (const name of RETIRED_TOOLS) {
        expect(first!.tools).not.toContain(name);
        expect(warnings.some((line) => line.includes(`Tool '${name}'`) && line.includes("Skipping")), name).toBe(true);
      }
      const stored = await harness.gql<{ agentDefinition: { toolNames: string[] } }>("query($id: String!) { agentDefinition(id: $id) { toolNames } }", { id: legacyDefinition });
      expect(stored.agentDefinition.toolNames).toEqual(["run_bash", ...RETIRED_TOOLS]);

      // AC-001: the start returns in < 2 s with pid, effective cwd and output file; the command still runs.
      expect(startResult).toMatchObject({ pid: expect.any(Number), status: "running", effectiveCwd: workspace });
      expect(second!.at - first!.repliedAt!).toBeLessThan(2_000);
      expect(aliveAtStartResult).toBe(true);
      // QR-004: the output file is in the OS temp area of this node, not the memory folder.
      expect(String(startResult.outputFile).startsWith(path.join(os.tmpdir(), "autobyteus-background-tasks") + path.sep)).toBe(true);
      // AC-007 while running.
      expect(third!.toolResults[0]).toContain("first-line");
      expect(third!.toolResults[0]).not.toContain("done-line");
      // autobyteus-473 AC-004: a viewer that opens the run now gets the running task in the event-stream view.
      const runningView = await harness.gql<{ agentBackgroundTaskView: { __typename: string; currentTasks: Array<Record<string, unknown>> } }>(
        `query($id: String!) { agentBackgroundTaskView(agentRunId: $id) { __typename
          ... on AgentBackgroundTaskEventStream { currentTasks: tasks { taskId kind command status summary startedAt } } } }`, { id: session.runId });
      expect(runningView.agentBackgroundTaskView.currentTasks).toContainEqual(expect.objectContaining({
        taskId: String(pid), kind: "shell", command, status: "running", summary: null }));

      // AC-003 / QR-002: the idle run is woken by one notice within 5 s of the end.
      const notice = (await requests("BGT-01", 4, 30_000))[3]!;
      const completed = taskFrames(frames, pid).find((frame) => frame.payload.status === "completed")!;
      expect(completed.at).toBeGreaterThan(firstTurnEnd.at);
      expect(notice.lastUser).toContain(BACKGROUND_TASK_NOTICE_HEADER);
      expect(notice.lastUser).toMatch(new RegExp(`- pid ${pid} \`${command}\`: exit code 0 after \\d+s\\. Output: ${String(startResult.outputFile).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\. Last lines:`));
      expect(notice.lastUser).toMatch(/ {4}first-line\n {4}done-line/);
      expect(notice.at - completed.at).toBeLessThanOrEqual(5_000);
      // Panel contract: running → completed with the exit code; the panel reads the native run as an event stream.
      expect(statusPath(taskFrames(frames, pid))).toEqual(["running", "completed"]);
      expect(completed.payload).toMatchObject({ task_id: String(pid), kind: "shell", command, summary: "exit code 0" });
      const view = await harness.gql<{ agentBackgroundTaskView: { __typename: string; currentTasks: Array<Record<string, unknown>> } }>(
        `query($id: String!) { agentBackgroundTaskView(agentRunId: $id) { __typename
          ... on AgentBackgroundTaskEventStream { currentTasks: tasks { taskId status summary } } } }`, { id: session.runId });
      expect(view.agentBackgroundTaskView.__typename).toBe("AgentBackgroundTaskEventStream");
      // autobyteus-473 AC-004: the ended task stays in the view with its end.
      expect(view.agentBackgroundTaskView.currentTasks).toContainEqual({ taskId: String(pid), status: "completed", summary: "exit code 0" });
      const systemNotice = await until(() => frames.find((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === NOTICE_SENDER), "SYSTEM_TASK_NOTIFICATION");
      expect(String(systemNotice.payload.content)).toBe(notice.lastUser.slice(notice.lastUser.indexOf(BACKGROUND_TASK_NOTICE_HEADER)));

      // AC-007 after the end, in the woken turn.
      const fifth = (await requests("BGT-01", 5, 30_000))[4]!;
      expect(fifth.toolResults[0]).toContain("done-line");
      await idleAfter(frames, fifth.at);
      await wait(4_000);
      expect(model.notices("BGT-01")).toHaveLength(1);

      // AC-011: the journal shows the background command and the notice.
      const memoryDir = await until(() => findRunMemoryDir(path.join(dataDir, "memory"), session.runId).then((dir) => dir ?? undefined), "memory dir", 30_000);
      const journal = await until(async () => {
        const content = await fs.readFile(path.join(memoryDir, "work_journal", "work_journal_active.md"), "utf8").catch(() => "");
        return content.includes("Notice:") ? content : undefined;
      }, "journal with the notice", 30_000);
      const journalLines = journal.split("\n").filter((line) => line.includes("Command:") || line.includes("Notice:"));
      expect(journalLines.some((line) => line.includes(`Command: ${command}`) && line.includes("background"))).toBe(true);
      expect(journalLines.some((line) => line.includes("Notice:"))).toBe(true);
      await record("BGT-01", { startResult, aliveAtStartResult, startToResultMs: second!.at - first!.repliedAt!, noticeAfterEndMs: notice.at - completed.at,
        retiredWarnings: warnings.filter((line) => line.includes("Skipping")), storedToolNames: stored.agentDefinition.toolNames,
        view: view.agentBackgroundTaskView, journalLines, requests: requestDigest("BGT-01"), frames: frameDigest(frames) });
    } finally {
      warn.mockRestore();
      await harness.stopRun(session);
    }
  }, 180_000);

  it("BGT-02: a command failing while the agent is busy is told in one notice right after the turn (AC-002)", async () => {
    const command = "sleep 2; echo failing; exit 3";
    let pid = 0;
    const { session, frames } = await start("BGT-02", [
      () => ({ toolCalls: [background(command)] }),
      (request) => { pid = Number(resultJson(request.toolResults[0]!).pid); return { text: "Still working on the answer.", delayMs: 5_000 }; },
      text("Noted the failure."),
    ]);
    try {
      sendE2eSendMessageCommand(session.socket, { content: "CASE:BGT-02 Start the check in the background, then answer." });
      const turnCompleted = await turnEnd(frames, 0);
      const failed = taskFrames(frames, pid).find((frame) => frame.payload.status === "failed");
      // The command ended while the turn ran (the model was still answering).
      expect(failed, "the command ended during the turn").toBeDefined();
      expect(failed!.at).toBeLessThan(turnCompleted.at);
      expect(failed!.payload.summary).toBe("exit code 3");
      const notice = (await requests("BGT-02", 3, 30_000))[2]!;
      expect(notice.at).toBeGreaterThan(turnCompleted.at);
      expect(notice.at - turnCompleted.at).toBeLessThan(5_000);
      expect(notice.lastUser).toContain(`- pid ${pid} \`${command}\`: exit code 3 after`);
      expect(notice.lastUser).toMatch(/Last lines:\n {4}failing/);
      await idleAfter(frames, notice.at);
      await wait(3_000);
      expect(model.notices("BGT-02")).toHaveLength(1);
      await record("BGT-02", { pid, endedBeforeTurnEndMs: turnCompleted.at - failed!.at, noticeAfterTurnMs: notice.at - turnCompleted.at,
        requests: requestDigest("BGT-02"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 120_000);

  it("BGT-03: three commands ending within 1 s arrive in exactly one notice that also lists the one still running (AC-004)", async () => {
    const tag = `BGT03_${randomUUID().slice(0, 8)}`;
    cleanupTags.push(tag);
    const commands = ["sleep 3; echo alpha", "sleep 3.2; echo beta", "sleep 3.4; echo gamma", `${tagged(tag)}`];
    let pids: number[] = [];
    const { session, frames } = await start("BGT-03", [
      () => ({ toolCalls: commands.map(background) }),
      (request) => { pids = request.toolResults.map((content) => Number(resultJson(content).pid)); return { text: "Waiting." }; },
      text("All three finished."),
    ]);
    try {
      await harness.runTurn(session, "BGT-03", "CASE:BGT-03 Start the four commands in the background.");
      const notice = (await requests("BGT-03", 3, 30_000))[2]!;
      const ends = pids.slice(0, 3).map((pid) => taskFrames(frames, pid).find((frame) => frame.payload.status === "completed")!);
      const spread = Math.max(...ends.map((end) => end.at)) - Math.min(...ends.map((end) => end.at));
      expect(spread, "precondition: the three ends fall within 1 s").toBeLessThanOrEqual(1_000);
      for (const [index, word] of ["alpha", "beta", "gamma"].entries()) {
        expect(notice.lastUser).toContain(`- pid ${pids[index]} \`${commands[index]}\`: exit code 0 after`);
        expect(notice.lastUser).toContain(`    ${word}`);
      }
      expect(notice.lastUser).toMatch(new RegExp(`Still running: pid ${pids[3]} \`[^\\n]*${tag}\` \\(started \\d\\d:\\d\\d:\\d\\d UTC\\)`));
      await idleAfter(frames, notice.at);
      await wait(4_000);
      expect(model.notices("BGT-03")).toHaveLength(1);
      expect(frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION")).toHaveLength(1);
      await record("BGT-03", { pids, endSpreadMs: spread, requests: requestDigest("BGT-03"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 120_000);

  it("BGT-04: kill <pid> of an `npm run dev` stops everything it started, reported in the kill's own result, no notice (AC-005)", async () => {
    const receipt = "dev-receipt.json";
    const files = {
      "package.json": JSON.stringify({ name: "devapp", version: "1.0.0", private: true, scripts: { dev: "node server.js" } }),
      "server.js": [
        "const http = require('http'); const { spawn } = require('child_process'); const fs = require('fs');",
        "const worker = spawn(process.execPath, ['worker.js'], { stdio: 'inherit' });",
        "const server = http.createServer((q, r) => r.end('ok'));",
        `server.listen(0, '127.0.0.1', () => { fs.writeFileSync('${receipt}', JSON.stringify({ server: process.pid, worker: worker.pid, port: server.address().port })); console.log('listening on ' + server.address().port); });`,
      ].join("\n"),
      "worker.js": "console.log('worker ready'); setInterval(() => {}, 1000);",
    };
    let startResult: Json = {};
    let killResult: Json = {};
    const { session, frames, workspace } = await start("BGT-04", [
      () => ({ toolCalls: [background("npm run dev")] }),
      (request) => { startResult = resultJson(request.toolResults[0]!); return { text: "The dev server is starting." }; },
      () => ({ toolCalls: [bash(`kill ${String(startResult.pid)}`)] }),
      (request) => { killResult = resultJson(request.toolResults[0]!); return { text: "Stopped the dev server." }; },
    ], files);
    try {
      await harness.runTurn(session, "BGT-04", "CASE:BGT-04 Start the dev server in the background.");
      const pids = await until(async () => JSON.parse(await fs.readFile(path.join(workspace, receipt), "utf8").catch(() => "null")) as { server: number; worker: number } | null ?? undefined, "dev server receipt", 30_000);
      const group = processTable().filter((row) => row.pgid === processTable().find((r) => r.pid === Number(startResult.pid))?.pgid);
      expect(group.length, "npm, its shell, the server and the worker run in the command's group").toBeGreaterThanOrEqual(3);
      expect(alive(pids.server) && alive(pids.worker)).toBe(true);
      await until(async () => (await fs.readFile(String(startResult.outputFile), "utf8").catch(() => "")).includes("listening on") || undefined, "dev output", 15_000);

      const from = Date.now();
      await harness.runTurn(session, "BGT-04-stop", "CASE:BGT-04 Stop the dev server now.");
      const ended = tasksOf(killResult, "backgroundTasksEnded");
      expect(ended).toHaveLength(1);
      expect(ended[0]).toMatchObject({ pid: Number(startResult.pid), command: "npm run dev", outcome: { signal: "SIGTERM" }, outputFile: startResult.outputFile });
      expect(String(ended[0]!.lastLines)).toContain("listening on");
      const survivors = await until(() => group.some((row) => alive(row.pid)) ? undefined : [], "every process of the command gone", 2_000).catch(() => group.filter((row) => alive(row.pid)));
      expect(survivors).toEqual([]);
      expect(alive(pids.server) || alive(pids.worker)).toBe(false);
      const stopped = taskFrames(frames, Number(startResult.pid)).at(-1)!;
      expect(stopped.payload).toMatchObject({ status: "stopped", summary: "signal SIGTERM" });
      await wait(5_000);
      expect(model.notices("BGT-04")).toHaveLength(0);
      expect(frames.filter((frame) => frame.at >= from && frame.type === "SYSTEM_TASK_NOTIFICATION")).toHaveLength(0);
      await record("BGT-04", { startResult, killResult, group, receiptPids: pids, survivors, requests: requestDigest("BGT-04"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 180_000);

  it("BGT-05: & jobs of a foreground call are background tasks; kill, children (DEC-012), disown, Terminate (AC-010)", async () => {
    const child = `BGT05C_${randomUUID().slice(0, 8)}`;
    const detached = `BGT05D_${randomUUID().slice(0, 8)}`;
    cleanupTags.push(child, detached);
    const results: Json[] = [];
    const keep = (request: ModelRequest) => { const result = resultJson(request.toolResults[0]!); results.push(result); return result; };
    const firstJob = () => Number(tasksOf(results.at(-1)!, "backgroundTasksStarted")[0]?.pid);
    const { session, frames } = await start("BGT-05", [
      () => ({ toolCalls: [bash("(sleep 2; exit 7) & echo started")] }),
      (request) => { keep(request); return { text: "The job runs." }; },
      text("The job ended with 7."),
      () => ({ toolCalls: [bash("(sleep 30; exit 7) & echo started2")] }),
      (request) => { keep(request); return { toolCalls: [bash(`kill ${firstJob()}`)] }; },
      (request) => { keep(request); return { toolCalls: [bash(`(${tagged(child)} & wait) & echo started3`)] }; },
      (request) => { keep(request); return { toolCalls: [bash(`kill ${firstJob()}`)] }; },
      (request) => { keep(request); return { toolCalls: [bash(`${tagged(detached)} >/dev/null 2>&1 & disown; echo detached`)] }; },
      (request) => { keep(request); return { text: "Done." }; },
    ]);
    try {
      await harness.runTurn(session, "BGT-05", "CASE:BGT-05 Run the job.");
      const [first, second] = model.of("BGT-05");
      const started = results[0]!;
      expect(started).toMatchObject({ exitCode: 0, stdout: "started\n" });
      const jobs = tasksOf(started, "backgroundTasksStarted");
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({ pid: expect.any(Number), command: "(sleep 2; exit 7) & echo started", outputFile: expect.any(String) });
      expect(second!.at - first!.repliedAt!).toBeLessThan(2_000);
      const jobPid = Number(jobs[0]!.pid);
      const notice = (await requests("BGT-05", 3, 30_000))[2]!;
      expect(notice.lastUser).toContain(`- pid ${jobPid} \`(sleep 2; exit 7) & echo started\`: exit code 7 after 2s`);
      expect(taskFrames(frames, jobPid).at(-1)!.payload).toMatchObject({ status: "failed", summary: "exit code 7" });
      await idleAfter(frames, notice.at);

      const from = Date.now();
      await harness.runTurn(session, "BGT-05-more", "CASE:BGT-05 Now the other jobs.");
      const [, killJob, , killParent, disowned] = results.slice(1);
      const killedPid = Number(tasksOf(results[1]!, "backgroundTasksStarted")[0]!.pid);
      expect(tasksOf(killJob!, "backgroundTasksEnded")).toEqual([expect.objectContaining({ pid: killedPid, outcome: { signal: "SIGTERM" } })]);
      const parentPid = Number(tasksOf(results[3]!, "backgroundTasksStarted")[0]!.pid);
      expect(tasksOf(killParent!, "backgroundTasksEnded")).toEqual([expect.objectContaining({ pid: parentPid, outcome: { signal: "SIGTERM" } })]);
      // DEC-012: kill <pid> on a plain & job stops that process only; its child stays until run end.
      expect(withTag(child)).toHaveLength(1);
      // Detached processes are not tracked: no task listed, no notice; they still run until run end.
      expect(disowned).toMatchObject({ exitCode: 0, stdout: "detached\n" });
      expect(tasksOf(disowned!, "backgroundTasksStarted")).toEqual([]);
      expect(withTag(detached)).toHaveLength(1);
      await wait(4_000);
      expect(model.notices("BGT-05").filter((request) => request.at >= from)).toHaveLength(0);

      // Run Terminate stops what is left in the command groups, the child and the disowned process included.
      const terminatedAt = Date.now();
      await harness.stopRun(session);
      const goneMs = await until(() => withTag(child).length + withTag(detached).length === 0 ? Date.now() - terminatedAt : undefined, "child and disowned gone", 10_000);
      await record("BGT-05", { results, notice: notice.lastUser, goneAfterTerminateMs: goneMs, requests: requestDigest("BGT-05"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 180_000);

  it("BGT-06: Terminate stops a running background command within 10 s, with no notice, and removes its output (AC-006)", async () => {
    const tag = `BGT06_${randomUUID().slice(0, 8)}`;
    cleanupTags.push(tag);
    let startResult: Json = {};
    const { session } = await start("BGT-06", [
      () => ({ toolCalls: [background(`echo serving; ${tagged(tag)}`)] }),
      (request) => { startResult = resultJson(request.toolResults[0]!); return { text: "Started." }; },
    ]);
    await harness.runTurn(session, "BGT-06", "CASE:BGT-06 Start the server in the background.");
    const pid = Number(startResult.pid);
    const pgid = processTable().find((row) => row.pid === pid)!.pgid;
    expect(withTag(tag)).toHaveLength(1);
    expect(existsSync(String(startResult.outputFile))).toBe(true);
    const terminatedAt = Date.now();
    await harness.stopRun(session);
    const goneMs = await until(() => processTable().some((row) => row.pgid === pgid) ? undefined : Date.now() - terminatedAt, "process group gone", 10_000);
    expect(withTag(tag)).toEqual([]);
    expect(existsSync(path.dirname(String(startResult.outputFile)))).toBe(false);
    await wait(5_000);
    expect(model.notices("BGT-06")).toHaveLength(0);
    expect(model.of("BGT-06")).toHaveLength(2);
    await record("BGT-06", { startResult, pgid, goneAfterTerminateMs: goneMs, requests: requestDigest("BGT-06") });
  }, 120_000);

  it("BGT-07: Stop during a foreground command leaves the background command running; its notice still arrives (AC-013)", async () => {
    const fg = `BGT07F_${randomUUID().slice(0, 8)}`;
    cleanupTags.push(fg);
    let pid = 0;
    const { session, frames } = await start("BGT-07", [
      () => ({ toolCalls: [background("sleep 8; echo bg-done")] }),
      (request) => { pid = Number(resultJson(request.toolResults[0]!).pid); return { toolCalls: [bash(tagged(fg, "setTimeout(()=>{},60000)"), { timeout_seconds: 120 })] }; },
      text("The background command finished after the stop."),
    ]);
    try {
      sendE2eSendMessageCommand(session.socket, { content: "CASE:BGT-07 Start the background job, then run the long command." });
      await until(() => withTag(fg).length > 0 || undefined, "foreground command running", 30_000);
      const stopAt = Date.now();
      session.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `client_interrupt_${randomUUID()}` } }));
      await until(() => frames.find((frame) => frame.at >= stopAt && frame.type === "TURN_INTERRUPTED"), "TURN_INTERRUPTED", 30_000);
      await until(() => withTag(fg).length === 0 || undefined, "foreground command stopped", 10_000);
      expect(alive(pid), "the background command keeps running after Stop").toBe(true);
      expect(taskFrames(frames, pid).at(-1)!.payload.status).toBe("running");
      const notice = (await requests("BGT-07", 3, 30_000))[2]!;
      expect(notice.lastUser).toContain(`- pid ${pid} \`sleep 8; echo bg-done\`: exit code 0 after 8s`);
      expect(notice.lastUser).toContain("    bg-done");
      await idleAfter(frames, notice.at);
      await record("BGT-07", { pid, stopAt, noticeAt: notice.at, requests: requestDigest("BGT-07"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 120_000);

  it("BGT-08: a background command killed from outside while the agent is idle is told as a signal in a notice (AC-002)", async () => {
    const tag = `BGT08_${randomUUID().slice(0, 8)}`;
    cleanupTags.push(tag);
    let pid = 0;
    const { session, frames } = await start("BGT-08", [
      () => ({ toolCalls: [background(`echo up; ${tagged(tag)}`)] }),
      (request) => { pid = Number(resultJson(request.toolResults[0]!).pid); return { text: "Started." }; },
      text("Noted the kill."),
    ]);
    try {
      await harness.runTurn(session, "BGT-08", "CASE:BGT-08 Start it in the background.");
      await until(() => withTag(tag).length > 0 || undefined, "command running", 10_000);
      process.kill(pid, "SIGTERM");
      const notice = (await requests("BGT-08", 3, 30_000))[2]!;
      expect(notice.lastUser).toMatch(new RegExp(`- pid ${pid} \`echo up; [^\\n]*${tag}\`: killed by SIGTERM after \\d+s`));
      expect(taskFrames(frames, pid).at(-1)!.payload).toMatchObject({ status: "stopped", summary: "signal SIGTERM" });
      expect(withTag(tag)).toEqual([]);
      await idleAfter(frames, notice.at);
      await record("BGT-08", { pid, requests: requestDigest("BGT-08"), frames: frameDigest(frames) });
    } finally {
      await harness.stopRun(session);
    }
  }, 120_000);

  it("BGT-09: a delegated copy with a running command is not idle-shut-down; the notice wakes it; shut down one grace after quiet (AC-009)", async () => {
    const report = `BUILD_DONE_${randomUUID().slice(0, 8)}`;
    const sleepSeconds = Math.round(GRACE_MS / 1000) + 15;
    const coordinator = await harness.createDefinition("native-bgt-coordinator", "Coordinate.", ["delegate_task", "send_message_to"]);
    const worker = await harness.createDefinition("native-bgt-worker", "Do the delegated work.", ["run_bash", "send_message_to"]);
    const workerName = (await harness.gql<{ agentDefinition: { name: string } }>("query($id: String!) { agentDefinition(id: $id) { name } }", { id: worker })).agentDefinition.name;
    const workerAddress = `/${workerName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
    let coordinatorRunId = "";
    let delegated: Json = {};
    const coordinatorSteps: Step[] = [
      () => ({ toolCalls: [{ name: "delegate_task", args: { recipient_address: workerAddress,
        description: "CASE:BGT-09W Run the build in the background, end your turn, and report to your delegator when it finished." } }] }),
      (request) => { delegated = resultJson(request.toolResults[0]!); return { text: "DONE" }; },
      text("NOTED"),
    ];
    model.script("BGT-09W", [
      () => ({ toolCalls: [background(`sleep ${sleepSeconds}; echo built`)] }),
      text("STARTED"),
      () => ({ toolCalls: [{ name: "send_message_to", args: { target_agent_run_id: coordinatorRunId, content: report } }] }),
      text("DONE"),
    ]);
    const { session } = await start("BGT-09C", coordinatorSteps, {}, coordinator);
    coordinatorRunId = session.runId;
    // The root's execution view: statuses and background tasks of the delegated copy (agent_presentation events).
    const view = new WebSocket(`ws://${harness.url.hostname}:${harness.url.port}/ws/agent-collaboration/${coordinatorRunId}`);
    const viewFrames: Timed[] = [];
    view.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") viewFrames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {}, at: Date.now() });
      } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { view.once("open", () => resolve()); view.once("error", reject); });
    await until(() => viewFrames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT") || undefined, "root view snapshot", 30_000);
    type Signal = { agentRunId: string; kind: "status" | "background"; status: string; at: number };
    const objectsIn = (value: unknown): Json[] => Array.isArray(value) ? value.flatMap(objectsIn)
      : isRecord(value) ? [value, ...Object.values(value).flatMap(objectsIn)] : [];
    const signals = (): Signal[] => viewFrames.flatMap((frame) => objectsIn(frame.payload).flatMap((record) => {
      const message = isRecord(record.message) ? record.message : null;
      const kind = message?.type === "AGENT_STATUS" ? "status" as const : message?.type === "BACKGROUND_TASK_UPDATED" ? "background" as const : null;
      const status = isRecord(message?.payload) ? message.payload.status : null;
      return kind && typeof record.agent_run_id === "string" && typeof status === "string" ? [{ agentRunId: record.agent_run_id, kind, status, at: frame.at }] : [];
    }));
    try {
      sendE2eSendMessageCommand(session.socket, { content: "CASE:BGT-09C Delegate the build." });
      const childRunId = await until(() => typeof delegated.target_agent_run_id === "string" ? delegated.target_agent_run_id : undefined, "delegation result", 60_000);
      expect(delegated).toMatchObject({ delegated: true, target_kind: "agent" });
      const of = (kind: Signal["kind"]) => signals().filter((signal) => signal.agentRunId === childRunId && signal.kind === kind);
      const running = await until(() => of("background").find((signal) => signal.status === "running"), "copy's running task", 60_000);
      const idle = await until(() => of("status").find((signal) => signal.at >= running.at && signal.status === "idle"), "copy idle", 60_000);
      const reportedAt = () => model.of("BGT-09C").find((request) => request.lastUser.includes(report))?.at;
      const outcome = await until(() => {
        const offline = of("status").find((signal) => signal.at >= idle.at && signal.status === "offline");
        if (offline) return { kind: "offline", at: offline.at };
        const at = reportedAt();
        return at ? { kind: "report", at } : undefined;
      }, "report or shutdown", (sleepSeconds + 90) * 1_000, 250);
      const offline = outcome.kind === "report"
        ? await until(() => of("status").find((signal) => signal.at > outcome.at && signal.status === "offline"), "copy shut down after quiet", GRACE_MS + 120_000, 250)
        : null;
      const before = offline ? of("status").filter((signal) => signal.at <= offline.at && signal !== offline) : [];
      const lastBusy = before.reduce((last, signal, index) => signal.status === "running" || signal.status === "initializing" ? index : last, -1);
      const quietStart = before.slice(lastBusy + 1).find((signal) => signal.status === "idle");
      const result = {
        childRunId, workerAddress, delegated, outcome: outcome.kind, idleToOutcomeMs: outcome.at - idle.at,
        quietToOfflineMs: offline && quietStart ? offline.at - quietStart.at : null,
        task: of("background").map((signal) => `${signal.status}@${signal.at - idle.at}`), statuses: of("status").map((signal) => `${signal.status}@${signal.at - idle.at}`),
        workerNotices: model.notices("BGT-09W").length, requests: { coordinator: requestDigest("BGT-09C"), worker: requestDigest("BGT-09W") },
      };
      await record("BGT-09", result);
      expect(outcome.kind, JSON.stringify(result)).toBe("report");
      expect(result.idleToOutcomeMs).toBeGreaterThanOrEqual(GRACE_MS);
      expect(of("background").some((signal) => signal.status === "completed")).toBe(true);
      expect(model.notices("BGT-09W")).toHaveLength(1);
      expect(result.quietToOfflineMs).not.toBeNull();
      expect(result.quietToOfflineMs!).toBeGreaterThanOrEqual(GRACE_MS - 2_000);
    } catch (error) {
      if (!evidence["BGT-09"]) await record("BGT-09", { error: String(error), requests: { coordinator: requestDigest("BGT-09C"), worker: requestDigest("BGT-09W") },
        signals: signals(), frames: frameDigest(viewFrames) });
      throw error;
    } finally {
      view.close();
      await harness.stopRun(session);
    }
  }, 420_000);
});
