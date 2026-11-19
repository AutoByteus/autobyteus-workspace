/**
 * A run's running background task count on every status route (autobyteus-448 part 2, REQ-006/REQ-007, DEC-004/005),
 * through the real studio server in process, driven as the desktop app drives it (GraphQL, the agent and team
 * WebSockets, the run-status feed `/ws/run-status`). Every feed message is parsed with the contract's strict parser.
 *
 * Cases:
 *   BTS-01  native (scripted LM Studio model, real `run_bash`): the example sequence: running 0 → running 1 when the task
 *           starts in the turn (the turn wins) → idle 1 at the turn end; the feed's snapshot and changes carry the count;
 *           a reconnecting socket's first status is idle 1 (the snapshot); a message to the run is delivered at once
 *           (AC-006) and its turn reads running 1; a second task gives 2; the ends bring it to 1, then 0
 *   BTS-02  native Team: one member idle with a task, one idle without: each member's team-stream status carries its own
 *           count; the feed's Team run state carries the sum (1), then 0
 *   BTS-03  Antigravity (scripted CLI, an open daemon step): idle 1, then idle 0 when the step exits (code 3); the view
 *           then still lists the task, failed with exit code 3 (autobyteus-517 FU-003)
 *   BTS-04  (live) Claude idle with a background Bash command: idle 1, then 0
 *   BTS-05  (live) Codex idle with a background terminal: its view is a snapshot, so the count stays 0 (Idle; design risk)
 *   BTS-06  native, autobyteus-483's ends beside the count: of three tasks, one exits with code 3, one is killed from
 *           outside (SIGTERM) and one is stopped by the run's end (run_ended); each end brings the count down (3, 2, 1, 0),
 *           (each notice's turn reads running with the tasks still running), the stream, the view and the notices keep
 *           each end's reason, and the feed reads the run offline 0
 *
 * Gate: RUN_BACKGROUND_TASK_STATUS_E2E=1 (BTS-01..03: no credentials; BTS-03 also needs the scripted AGY CLI as the node's
 * CLI: ANTIGRAVITY_CLI_COMMAND=<absolute path to tests/fixtures/agy-failure-cli.mjs> AGY_FAKE_CASE=linked_skills). BTS-04 also needs RUN_CLAUDE_E2E=1 and the
 * signed-in `claude` CLI with the real HOME, USER and LOGNAME; BTS-05 RUN_CODEX_E2E=1 and the `codex` login (a
 * throwaway CODEX_HOME links only `auth.json`; model gpt-6.1-terra). Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_BACKGROUND_TASK_STATUS_E2E=1 \
 *     pnpm exec vitest run tests/e2e/runtime/background-task-status-count.e2e.test.ts --no-watch
 * Optional BACKGROUND_TASK_STATUS_E2E_EVIDENCE_DIR keeps per-case JSON.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parseRunStatusServerMessage, type RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { NativeRuntimeLiveHarness, isRecord, wait, type Json } from "../helpers/native-runtime-live-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";

const ENABLED = process.env.RUN_BACKGROUND_TASK_STATUS_E2E === "1" && process.platform !== "win32";
const CLAUDE = ENABLED && process.env.RUN_CLAUDE_E2E === "1" && resolveClaudeCliExecutableCandidates().length > 0;
const CODEX = ENABLED && process.env.RUN_CODEX_E2E === "1";
/** The scripted AGY CLI must be the node's CLI from the start (set in the environment, as the other AGY suites do). */
const SCRIPTED_AGY = ENABLED && process.env.ANTIGRAVITY_CLI_COMMAND?.endsWith("agy-failure-cli.mjs") === true && process.env.AGY_FAKE_CASE === "linked_skills";
const EVIDENCE_DIR = process.env.BACKGROUND_TASK_STATUS_E2E_EVIDENCE_DIR?.trim() || null;
const MODEL_KEY = "background-status-fixture";

type Frame = { type: string; payload: Json; at: number };
type Status = { status: string; count: number; at: number };
const until = async <T>(probe: () => T | undefined | null | false, label: string, ms = 60_000): Promise<T> => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const value = probe(); if (value !== undefined && value !== null && value !== false) return value as T; await wait(100); }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}`);
};

// --- scripted model (answers each case's turns in order; records when each request arrived) ---------------------

type Reply = { toolCalls?: Array<{ name: string; args: Json }>; text?: string };
type Step = () => Reply;
class ScriptedModel {
  readonly requests: Array<{ caseId: string; at: number; lastUser: string }> = [];
  private readonly scripts = new Map<string, Step[]>();
  private server: Server | null = null;
  origin = "";
  script(caseId: string, steps: Step[]): void { this.scripts.set(caseId, [...steps]); }
  of(caseId: string) { return this.requests.filter((request) => request.caseId === caseId); }
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
    const userTexts = messages.filter((message) => message.role === "user").map((message) => JSON.stringify(message.content));
    const caseId = JSON.stringify(messages).match(/CASE:([A-Z0-9-]+)/)?.[1] ?? "unknown";
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    if (hasTools) this.requests.push({ caseId, at: Date.now(), lastUser: userTexts.at(-1) ?? "" });
    const reply: Reply = (hasTools ? this.scripts.get(caseId)?.shift()?.() : undefined) ?? { text: "OK." };
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

describe.skipIf(!ENABLED)("Running background task count on every status route", () => {
  const model = new ScriptedModel();
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: null, stepTimeoutMs: 300_000, tempPrefix: "bts-e2e" });
  const sockets: WebSocket[] = [];
  let modelIdentifier = "";

  const record = async (caseId: string, value: Json) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify(value, null, 2));
  };
  const open = async (route: string): Promise<Frame[]> => {
    const socket = new WebSocket(`ws://${harness.url.hostname}:${harness.url.port}${route}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => {
      try { const parsed = JSON.parse(String(raw)) as Json; if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {}, at: Date.now() }); } catch { /* ignore */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    (frames as Frame[] & { socket?: WebSocket }).socket = socket;
    return frames;
  };
  const socketOf = (frames: Frame[]) => (frames as Frame[] & { socket?: WebSocket }).socket!;
  /** The run-status feed for these runs; every message parsed with the contract's strict parser. */
  const feed = async (runs: Array<{ kind: "agent" | "agent_team"; runId: string }>) => {
    const socket = new WebSocket(`ws://${harness.url.hostname}:${harness.url.port}/ws/run-status`);
    sockets.push(socket);
    const messages: Array<RunStatusServerMessage & { at: number }> = [];
    socket.on("message", (raw: unknown) => { messages.push({ ...parseRunStatusServerMessage(JSON.parse(String(raw))), at: Date.now() }); });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    socket.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs } }));
    await until(() => messages.some((message) => message.type === "RUN_STATUS_SNAPSHOT"), "run-status snapshot", 30_000);
    return messages;
  };
  /** Every AGENT_STATUS of a stream (optionally one member's), as `{status, count}`; a frame without the count fails. */
  const statuses = (frames: Frame[], agentRunId?: string): Status[] => frames.filter((frame) => frame.type === "AGENT_STATUS"
    && (!agentRunId || frame.payload.agent_run_id === agentRunId)).map((frame) => {
    expect(Number.isInteger(frame.payload.background_tasks_running), `count on ${JSON.stringify(frame.payload)}`).toBe(true);
    return { status: String(frame.payload.status), count: Number(frame.payload.background_tasks_running), at: frame.at };
  });
  /** `expected` appears in `list` in this order (other entries may sit between). */
const inOrder = (list: string[], expected: string[]) => expected.reduce((from, value) => from < 0 ? -1 : (list.indexOf(value, from) < 0 ? -1 : list.indexOf(value, from) + 1), 0) >= 0;
const path_ = (list: Status[]) => list.map((entry) => `${entry.status}:${entry.count}`).filter((value, index, all) => index === 0 || all[index - 1] !== value);

  beforeAll(async () => {
    await model.listen();
    vi.stubEnv("LMSTUDIO_HOSTS", model.origin);
    await harness.start();
    const catalog = await harness.gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string; value: string }> } }>(
      "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value } } }",
      { p: "LMSTUDIO", r: "autobyteus" });
    modelIdentifier = catalog.ensureProviderModelCatalog.llmModels.find((entry) => entry.value === MODEL_KEY || entry.modelIdentifier.startsWith(MODEL_KEY))?.modelIdentifier ?? "";
    expect(modelIdentifier).not.toBe("");
  }, 180_000);
  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    await harness.stop();
    await model.close();
    vi.unstubAllEnvs();
  }, 180_000);

  const definition = (toolNames: string[]) => harness.createDefinition("bts", "Run the commands you are asked to run.", toolNames);
  const createRun = async (definitionId: string, runtimeKind: string, llmModelIdentifier: string) => {
    const created = await harness.gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: await fs.realpath(await harness.makeWorkspace()), llmModelIdentifier, autoExecuteTools: true, runtimeKind } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    return created.createAgentRun.runId!;
  };
  const agentChannel = async (runId: string) => {
    const frames = await open(`/ws/agent/${runId}`);
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "CONNECTED", 30_000);
    return frames;
  };
  const feedAgent = (messages: Array<RunStatusServerMessage & { at: number }>, agentRunId: string): Array<{ status: string | null; count: number }> =>
    messages.flatMap((message) => message.type === "RUN_STATUS_SNAPSHOT"
      ? message.payload.runs.flatMap((run) => run.agents.filter((agent) => agent.agentRunId === agentRunId).map((agent) => ({ status: agent.status, count: agent.backgroundTasksRunning })))
      : message.type === "RUN_STATUS_CHANGED" && message.payload.agentRunId === agentRunId ? [{ status: message.payload.status, count: message.payload.backgroundTasksRunning }] : []);

  it("BTS-01: native: the example sequence on the stream and the feed, a reconnect snapshot, a message delivered at once, counts 2, 1, 0", async () => {
    model.script("BTS-01", [
      () => ({ toolCalls: [background("sleep 14; echo first")] }), text("Started the first build."),
      () => ({ toolCalls: [background("sleep 4; echo second")] }), text("Started the second build."),
    ]);
    const runId = await createRun(await definition(["run_bash"]), "autobyteus", modelIdentifier);
    const frames = await agentChannel(runId);
    sendE2eSendMessageCommand(socketOf(frames), { content: "CASE:BTS-01 Start the first build." });
    await until(() => frames.some((frame) => frame.type === "TURN_COMPLETED") && statuses(frames).at(-1)?.status === "idle", "first turn ends", 60_000);
    const firstTurn = path_(statuses(frames));
    const taskFrame = frames.find((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status === "running")!;
    const statusBeforeTask = statuses(frames.slice(0, frames.indexOf(taskFrame))).at(-1);
    const runStatus = await feed([{ kind: "agent", runId }]);
    const snapshot = runStatus.find((message) => message.type === "RUN_STATUS_SNAPSHOT")!;
    const reconnect = await agentChannel(runId);
    const reconnectFirst = statuses(reconnect)[0];
    // AC-006: a message to the run idle with a task is delivered at once.
    const sentAt = Date.now();
    sendE2eSendMessageCommand(socketOf(frames), { content: "CASE:BTS-01 Start the second build too." });
    const delivered = await until(() => model.of("BTS-01").find((request) => request.lastUser.includes("second build too") && request.at >= sentAt), "the second message reaches the model", 30_000);
    await until(() => statuses(frames).some((entry) => entry.count === 2), "count 2", 60_000);
    await until(() => statuses(frames).filter((entry) => entry.at > sentAt).some((entry) => entry.status === "idle" && entry.count === 1), "back to idle 1 after the second task ended", 60_000);
    await until(() => statuses(frames).at(-1)?.status === "idle" && statuses(frames).at(-1)?.count === 0
      && frames.filter((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status !== "running").length === 2, "idle 0 after both ended", 90_000);
    await wait(4_000);
    const all = path_(statuses(frames));
    const fed = feedAgent(runStatus, runId);
    const runStates = runStatus.flatMap((message) => message.type === "RUN_STATE_CHANGED" ? [`${message.payload.status}:${message.payload.backgroundTasksRunning}`]
      : message.type === "RUN_STATUS_SNAPSHOT" ? message.payload.runs.map((run) => `${run.status}:${run.backgroundTasksRunning}`) : []);
    await record("BTS-01", { runId, firstTurn, statusBeforeTask, snapshot, reconnectFirst, deliveredAfterMs: delivered.at - sentAt, all, fed, runStates });

    // The example sequence (design SR-006): the turn starts at 0, the task starts in the turn (the turn wins), the turn ends.
    expect(inOrder(firstTurn, ["running:0", "running:1", "idle:1"]), JSON.stringify(firstTurn)).toBe(true);
    expect(firstTurn.at(-1)).toBe("idle:1");
    expect(statusBeforeTask).toMatchObject({ status: "running", count: 1 });
    expect(snapshot.type === "RUN_STATUS_SNAPSHOT" && snapshot.payload.runs[0]).toMatchObject({ status: "idle", backgroundTasksRunning: 1,
      agents: [{ agentRunId: runId, status: "idle", backgroundTasksRunning: 1 }] });
    expect(reconnectFirst).toMatchObject({ status: "idle", count: 1 });
    expect(delivered.at - sentAt).toBeLessThan(5_000);
    expect(all).toContain("running:1");
    expect(all).toContain("idle:2");
    expect(all.at(-1)).toBe("idle:0");
    expect(fed.map((entry) => `${entry.status}:${entry.count}`)).toEqual(expect.arrayContaining(["idle:1", "idle:2", "idle:0"]));
    expect(runStates.at(-1)).toBe("idle:0");
  }, 300_000);

  it("BTS-02: a Team: each member's status carries its own count; the feed's Team run state carries the sum", async () => {
    model.script("BTS-02A", [() => ({ toolCalls: [background("sleep 10; echo built")] }), text("Started.")]);
    model.script("BTS-02B", [text("Hello.")]);
    const coordinator = await definition(["run_bash"]);
    const worker = await definition(["run_bash"]);
    const team = await harness.gql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `bts-team-${randomUUID().slice(0, 8)}`, description: "background count", instructions: "Follow your instructions.",
        coordinatorMemberName: "coordinator", nodes: [{ memberName: "coordinator", ref: coordinator, refScope: "SHARED" }, { memberName: "worker", ref: worker, refScope: "SHARED" }] } });
    const workspaceRootPath = await fs.realpath(await harness.makeWorkspace());
    const config = (memberAddress: string, agentDefinitionId: string) => ({ memberAddress, agentDefinitionId, llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath });
    const created = (await harness.gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId: team.createAgentTeamDefinition.id,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: modelIdentifier, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath }],
        memberConfigs: [config("/coordinator", coordinator), config("/worker", worker)] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId!;
    const tree = (await harness.gql<{ getTeamRunResumeConfig: { executionTree: Json } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: teamRunId })).getTeamRunResumeConfig.executionTree;
    const members = ((tree.root_team as Json).members as Json[]).map((member) => ({ address: String(member.address), id: String(member.agent_run_id) }));
    const coordinatorId = members.find((member) => member.address === "/coordinator")!.id;
    const workerId = members.find((member) => member.address === "/worker")!.id;
    const frames = await open(`/ws/agent-team/${teamRunId}`);
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "team CONNECTED", 30_000);
    sendE2eSendMessageCommand(socketOf(frames), { agent_run_id: coordinatorId, content: "CASE:BTS-02A Start the build." });
    sendE2eSendMessageCommand(socketOf(frames), { agent_run_id: workerId, content: "CASE:BTS-02B Say hello." });
    await until(() => statuses(frames, coordinatorId).some((entry) => entry.status === "idle" && entry.count === 1)
      && statuses(frames, workerId).some((entry) => entry.status === "idle"), "coordinator idle 1, worker idle", 60_000);
    const runStatus = await feed([{ kind: "agent_team", runId: teamRunId }]);
    const snapshot = runStatus.find((message) => message.type === "RUN_STATUS_SNAPSHOT")!;
    await until(() => statuses(frames, coordinatorId).at(-1)?.count === 0 && statuses(frames, coordinatorId).at(-1)?.status === "idle", "coordinator idle 0", 60_000);
    await until(() => runStatus.some((message) => message.type === "RUN_STATE_CHANGED" && message.payload.backgroundTasksRunning === 0), "Team run state count 0", 30_000).catch(() => null);
    const runStates = runStatus.flatMap((message) => message.type === "RUN_STATE_CHANGED" ? [`${message.payload.status}:${message.payload.backgroundTasksRunning}`] : []);
    await record("BTS-02", { teamRunId, coordinatorId, workerId, coordinator: path_(statuses(frames, coordinatorId)), worker: path_(statuses(frames, workerId)), snapshot, runStates });
    await harness.gql("mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId }).catch(() => undefined);

    expect(path_(statuses(frames, coordinatorId))).toEqual(expect.arrayContaining(["idle:1", "idle:0"]));
    expect(statuses(frames, workerId).every((entry) => entry.count === 0)).toBe(true);
    expect(snapshot.type === "RUN_STATUS_SNAPSHOT" && snapshot.payload.runs[0]).toMatchObject({ kind: "agent_team", status: "idle", backgroundTasksRunning: 1 });
    expect(snapshot.type === "RUN_STATUS_SNAPSHOT" && snapshot.payload.runs[0]?.agents).toEqual(expect.arrayContaining([
      { agentRunId: coordinatorId, status: "idle", backgroundTasksRunning: 1 }, { agentRunId: workerId, status: "idle", backgroundTasksRunning: 0 }]));
    expect(runStates.at(-1)).toBe("idle:0");
  }, 300_000);

  it.skipIf(!SCRIPTED_AGY)("BTS-03: Antigravity: an open daemon step reads idle 1, then idle 0 when it exits", async () => {
    const runId = await createRun(await harness.createDefinition("bts-agy", "Follow the request.", []), "antigravity_cli", "gemini-3.8-flash-low");
    const frames = await agentChannel(runId);
    sendE2eSendMessageCommand(socketOf(frames), { content: 'BACKGROUND_STEP:{"seconds":8,"exitCode":3}' });
    await until(() => statuses(frames).some((entry) => entry.status === "idle" && entry.count === 1), "idle 1", 90_000);
    const runStatus = await feed([{ kind: "agent", runId }]);
    await until(() => statuses(frames).at(-1)?.status === "idle" && statuses(frames).at(-1)?.count === 0, "idle 0 after the step exits", 60_000);
    await wait(2_000);
    // autobyteus-517 FU-003: a viewer that opens the run after the step exited (the panel's or the phone's seed) still
    // gets the task from the view, ended with its exit code, as for Claude and native runs.
    const view = (await harness.gql<{ agentBackgroundTaskView: Json }>(
      "query($id: String!) { agentBackgroundTaskView(agentRunId: $id) { __typename ... on AgentBackgroundTaskEventStream { tasks { command status endReason exitCode } } } }",
      { id: runId })).agentBackgroundTaskView;
    await record("BTS-03", { runId, path: path_(statuses(frames)), fed: feedAgent(runStatus, runId), view });
    expect(path_(statuses(frames))).toEqual(expect.arrayContaining(["idle:1", "idle:0"]));
    expect(feedAgent(runStatus, runId).map((entry) => `${entry.status}:${entry.count}`)).toEqual(expect.arrayContaining(["idle:1", "idle:0"]));
    expect(view.__typename).toBe("AgentBackgroundTaskEventStream");
    expect(view.tasks).toEqual([expect.objectContaining({ status: "failed", endReason: null, exitCode: 3,
      command: expect.stringContaining("background step") })]);
  }, 300_000);

  it("BTS-06: autobyteus-483's ends beside the count: exit code, signal and the run's end each bring it down", async () => {
    const tag = `BTS06_${randomUUID().slice(0, 8)}`;
    // The first task exits with code 3 when the test creates this file (not on a timer, so it is still running at the turn end).
    const flag = path.join(os.tmpdir(), `${tag}.flag`);
    const node = (name: string) => `${JSON.stringify(process.execPath)} -e "setInterval(()=>{},1000)" ${tag}_${name}`;
    const withTag = () => execFileSync("ps", ["-ww", "-A", "-o", "pid=,command="], { encoding: "utf8" }).split("\n")
      .flatMap((line) => { const match = line.trim().match(/^(\d+)\s+(.*)$/); return match && match[2]!.startsWith(process.execPath) && match[2]!.includes(tag) ? [Number(match[1])] : []; });
    model.script("BTS-06", [
      () => ({ toolCalls: [background(`until [ -e ${JSON.stringify(flag)} ]; do sleep 0.2; done; exit 3`), background(`echo b; ${node("B")}`), background(`echo c; ${node("C")}`)] }),
      text("Started three."),
    ]);
    const runId = await createRun(await definition(["run_bash"]), "autobyteus", modelIdentifier);
    const frames = await agentChannel(runId);
    const tasks = () => frames.filter((frame) => frame.type === "BACKGROUND_TASK_UPDATED");
    const lastOf = (match: (command: string) => boolean) => tasks().filter((frame) => match(String(frame.payload.command ?? ""))).at(-1)?.payload;
    try {
      sendE2eSendMessageCommand(socketOf(frames), { content: "CASE:BTS-06 Start the three commands in the background." });
      await until(() => statuses(frames).some((entry) => entry.status === "idle" && entry.count === 3), "idle 3", 90_000);
      const runStatus = await feed([{ kind: "agent", runId }]);
      // 1. An exit code (failed, exit_code 3, no end reason).
      await fs.writeFile(flag, "");
      await until(() => lastOf((command) => command.includes("exit 3"))?.status === "failed", "the exit-3 task ended", 60_000);
      const exitNotice = await until(() => model.of("BTS-06").find((request) => /exit code 3/.test(request.lastUser)), "the notice of the exit", 60_000);
      await until(() => statuses(frames).some((entry) => entry.at > exitNotice.at && entry.status === "idle" && entry.count === 2), "idle 2 after the notice's turn", 90_000);
      // 2. A signal from outside (stopped, "signal SIGTERM", no end reason).
      const killed = Number(lastOf((command) => command.includes(`${tag}_B`))!.task_id);
      process.kill(killed, "SIGTERM");
      await until(() => lastOf((command) => command.includes(`${tag}_B`))?.status === "stopped", "the killed task ended", 60_000);
      const killNotice = await until(() => model.of("BTS-06").find((request) => /killed by SIGTERM/.test(request.lastUser)), "the notice of the kill", 60_000);
      await until(() => statuses(frames).some((entry) => entry.at > killNotice.at && entry.status === "idle" && entry.count === 1), "idle 1 after the notice's turn", 90_000);
      const notices = [exitNotice.lastUser, killNotice.lastUser];
      const view = (await harness.gql<{ agentBackgroundTaskView: Json }>(
        "query($id: String!) { agentBackgroundTaskView(agentRunId: $id) { __typename ... on AgentBackgroundTaskEventStream { tasks { command status summary endReason exitCode } } } }",
        { id: runId })).agentBackgroundTaskView;
      // 3. The run's end (stopped, end_reason run_ended).
      await harness.gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });
      await until(() => lastOf((command) => command.includes(`${tag}_C`))?.status === "stopped", "the run's end stopped the last task", 30_000);
      await until(() => feedAgent(runStatus, runId).at(-1)?.status === "offline", "the feed reads the run offline", 30_000);
      const path = path_(statuses(frames));
      await record("BTS-06", { runId, path, fed: feedAgent(runStatus, runId), ends: tasks().map((frame) => frame.payload).filter((task) => task.status !== "running"), view, notices, requests: model.of("BTS-06").map((request) => request.lastUser) });

      // Each notice's turn reads running with the tasks still running (2, then 1), then idle with them.
      expect(inOrder(path, ["idle:3", "idle:2", "running:2", "idle:2", "idle:1", "running:1", "idle:1", "offline:0"]), JSON.stringify(path)).toBe(true);
      expect(statuses(frames).at(-1)?.count ?? 0).toBe(0);
      expect(feedAgent(runStatus, runId).at(-1)).toMatchObject({ status: "offline", count: 0 });
      expect(lastOf((command) => command.includes("exit 3"))).toMatchObject({ status: "failed", exit_code: 3, end_reason: null });
      expect(lastOf((command) => command.includes(`${tag}_B`))).toMatchObject({ status: "stopped", summary: "signal SIGTERM", end_reason: null, exit_code: null });
      expect(lastOf((command) => command.includes(`${tag}_C`))).toMatchObject({ status: "stopped", end_reason: "run_ended", exit_code: null });
      // The view (the panel's source) keeps both earlier ends beside the running one; the notices name each end.
      expect((view.tasks as Json[]).map((task) => ({ status: task.status, endReason: task.endReason, exitCode: task.exitCode }))).toEqual(expect.arrayContaining([
        { status: "failed", endReason: null, exitCode: 3 }, { status: "stopped", endReason: null, exitCode: null }, { status: "running", endReason: null, exitCode: null }]));
      expect(notices.join("\n")).toMatch(/exit code 3/);
      expect(notices.join("\n")).toMatch(/killed by SIGTERM/);
      expect(withTag()).toEqual([]);
    } finally {
      for (const pid of withTag()) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
      await fs.rm(flag, { force: true });
    }
  }, 300_000);

  it.skipIf(!CLAUDE)("BTS-04 (live): Claude idle with a background Bash command reads idle 1, then 0", async () => {
    vi.stubEnv("CLAUDE_CODE_EXECUTABLE_PATH", resolveClaudeCliExecutableCandidates()[0]!.executablePath);
    const runId = await createRun(await harness.createDefinition("bts-claude", "Keep replies to one word.", []), "claude_agent_sdk",
      process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku");
    const frames = await agentChannel(runId);
    sendE2eSendMessageCommand(socketOf(frames), { content: "Use the Bash tool with run_in_background set to true to run exactly: sleep 25\nDo not wait for it. Reply only STARTED and end your turn." });
    await until(() => statuses(frames).some((entry) => entry.status === "idle" && entry.count === 1), "idle 1", 300_000);
    const runStatus = await feed([{ kind: "agent", runId }]);
    await until(() => statuses(frames).at(-1)?.status === "idle" && statuses(frames).at(-1)?.count === 0, "idle 0 after the command ends", 120_000);
    await record("BTS-04", { runId, path: path_(statuses(frames)), fed: feedAgent(runStatus, runId) });
    expect(feedAgent(runStatus, runId)[0]).toMatchObject({ status: "idle", count: 1 });
  }, 600_000);

  it.skipIf(!CODEX)("BTS-05 (live): Codex idle with a background terminal stays at count 0 (its view is a snapshot)", async () => {
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "bts-codex-home-"));
    await fs.symlink(path.join(os.userInfo().homedir, ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    vi.stubEnv("CODEX_HOME", codexHome);
    try {
      const runId = await createRun(await harness.createDefinition("bts-codex", "Keep replies to one word.", []), "codex_app_server",
        process.env.CODEX_E2E_MODEL?.trim() || "gpt-6.1-terra");
      const frames = await agentChannel(runId);
      sendE2eSendMessageCommand(socketOf(frames), { content: "Start the command `sleep 60` so that it keeps running in a background terminal after you reply, and do not wait for it. Then reply only STARTED." });
      await until(() => frames.some((frame) => frame.type === "TURN_COMPLETED") && statuses(frames).at(-1)?.status === "idle", "idle", 300_000);
      const view = await harness.gql<{ agentBackgroundTaskView: Json }>(
        "query($id: String!) { agentBackgroundTaskView(agentRunId: $id) { __typename ... on AgentBackgroundTaskSnapshot { tasks { status } } } }", { id: runId });
      const runStatus = await feed([{ kind: "agent", runId }]);
      await record("BTS-05", { runId, path: path_(statuses(frames)), view: view.agentBackgroundTaskView, fed: feedAgent(runStatus, runId) });
      expect(statuses(frames).every((entry) => entry.count === 0)).toBe(true);
      expect(feedAgent(runStatus, runId)[0]).toMatchObject({ status: "idle", count: 0 });
    } finally {
      await fs.rm(codexHome, { recursive: true, force: true });
    }
  }, 600_000);
});
