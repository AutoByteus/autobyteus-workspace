/**
 * A restart keeps a person's runs running (autobyteus-638, AC-001, AC-002, AC-003), across real restarts of the BUILT
 * server. Each case runs `dist/app.js` as its own process on a test-owned data root, drives runs through GraphQL and the
 * agent and team WebSockets as the desktop app does, and restarts the node the two ways a node ends: a graceful stop
 * (SIGTERM, the app's quit) and a forced kill (SIGKILL, a crash). Inference is scripted: an LM Studio-compatible server
 * answers each case's turns and records what each agent's model received, so "no input was posted" is read where the
 * agent would read it.
 *
 * Per case: an idle Agent run and an idle Team run (its coordinator idle) a person started, and an Agent run the person
 * stopped. The running-run record holds the first two within the 2 s check. After the restart both are running again
 * without any model call; the stopped one is not brought back. Then a new agent calls `list_running_agents` (both are
 * listed: the Agent run and the Team by its coordinator) and `send_message_to` to each: both messages are delivered.
 *
 *   RUN-01  graceful restart (SIGTERM)
 *   RUN-02  forced kill (SIGKILL)
 *
 * Gate: RUN_RUNNING_RUNS_E2E=1. Prerequisite: `pnpm -C autobyteus-server-ts build` for this worktree. No credentials.
 * macOS/Linux. About 2 minutes. Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_RUNNING_RUNS_E2E=1 \
 *     pnpm exec vitest run tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts --no-watch
 * Optional: RUNNING_RUNS_E2E_EVIDENCE_DIR keeps per-case JSON.
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

const ENABLED = process.env.RUN_RUNNING_RUNS_E2E === "1" && process.platform !== "win32";
const SERVER_DIR = path.resolve(__dirname, "../../..");
const EVIDENCE_DIR = process.env.RUNNING_RUNS_E2E_EVIDENCE_DIR?.trim() || null;
const MODEL_KEY = "running-runs-fixture";
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
const readJson = async (file: string): Promise<Json | null> => JSON.parse(await fs.readFile(file, "utf8").catch(() => "null")) as Json | null;

// --- scripted model (each agent's conversation carries its CASE tag) ----------------------------------------------

type ModelRequest = { caseId: string; at: number; lastUser: string; toolResults: string[] };
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

// --- the node ---------------------------------------------------------------------------------------------------

type Session = Readonly<{ url: string; gql: <T = any>(query: string, variables?: Json) => Promise<T>; child: ChildProcess; output: () => string }>;
const children: ChildProcess[] = [];

class TestNode {
  constructor(readonly root: string, private readonly env: Record<string, string>) {}
  static async create(env: Record<string, string>): Promise<TestNode> {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "running-runs-e2e-")));
    for (const dir of ["home", "db", "workspace"]) await fs.mkdir(path.join(root, dir));
    await fs.writeFile(path.join(root, ".env"), `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\nLMSTUDIO_HOSTS=${env.LMSTUDIO_HOSTS ?? ""}\n`);
    return new TestNode(root, env);
  }
  get runningRuns(): string { return path.join(this.root, "restart-resume", "running-runs.json"); }
  get workspace(): string { return path.join(this.root, "workspace"); }

  async start(): Promise<Session> {
    const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    Object.assign(env, { HOME: path.join(this.root, "home"), DATABASE_URL: `file:${path.join(this.root, "db", "production.db")}`, ...this.env, ...builtServerLaunchEnvironment() });
    const child = spawn(NODE, [path.join(SERVER_DIR, "dist", "app.js"), "--data-dir", this.root, "--host", "127.0.0.1", "--port", "0"],
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

  /** SIGTERM is the graceful stop the app's quit sends; SIGKILL leaves no graceful end (a crash). */
  async stop(session: Session, signal: "SIGTERM" | "SIGKILL"): Promise<void> {
    if (session.child.exitCode !== null || session.child.signalCode !== null) return;
    const exited = once(session.child, "exit");
    session.child.kill(signal);
    const force = setTimeout(() => session.child.kill("SIGKILL"), 20_000);
    try { await exited; } finally { clearTimeout(force); }
  }
}

type Frame = { type: string; payload: Json };
/** A run's own stream (`/ws/agent/<run>` or `/ws/agent-team/<team>`): send a user message, read frames. */
const openStream = async (session: Session, kind: "agent" | "agent-team", runId: string) => {
  const socket = new WebSocket(`${session.url.replace(/^http/, "ws")}/ws/${kind}/${runId}`);
  const frames: Frame[] = [];
  socket.on("message", (raw: unknown) => { try { frames.push(JSON.parse(String(raw)) as Frame); } catch { /* ignore */ } });
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  await until(() => frames.some((frame) => frame.type === "CONNECTED" || frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), `${kind} stream ${runId}`, 30_000);
  return { frames, send: (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }), close: () => socket.terminate() };
};

describe.skipIf(!ENABLED)("A restart keeps a person's runs running (built server)", () => {
  const model = new ScriptedModel();
  const cleanups: Array<() => Promise<unknown>> = [];

  beforeAll(async () => {
    await fs.access(path.join(SERVER_DIR, "dist", "app.js"));
    await model.listen();
  });
  afterAll(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    for (const cleanup of cleanups.reverse()) await cleanup().catch(() => undefined);
    await model.close();
  }, 60_000);

  const modelIdOf = async (session: Session) => {
    const models = (await session.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
      .reloadProviderModelCatalog.llmModels.map((entry: Json) => entry.modelIdentifier as string);
    const found = models.find((id: string) => id.startsWith(MODEL_KEY));
    expect(found, models.join(", ")).toBeTruthy();
    return found as string;
  };
  const agentDefinition = async (session: Session, label: string, toolNames: string[]) => (await session.gql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name: `${label}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "running runs E2E",
      instructions: "Answer briefly.", toolNames, skillNames: [] } })).createAgentDefinition.id as string;
  const agentRun = async (session: Session, node: TestNode, definitionId: string, modelId: string) => {
    const created = (await session.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, workspaceRootPath: node.workspace, llmModelIdentifier: modelId, autoExecuteTools: true, runtimeKind: "autobyteus" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  const isAgentActive = async (session: Session, runId: string) =>
    (await session.gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig.isActive as boolean;
  const idleAgentRun = async (session: Session, node: TestNode, caseId: string, modelId: string) => {
    const runId = await agentRun(session, node, await agentDefinition(session, "person-agent", []), modelId);
    const stream = await openStream(session, "agent", runId);
    stream.send(runId, `CASE:${caseId} Hello.`);
    await until(() => model.of(caseId).length >= 1 && stream.frames.some((frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle"
      && stream.frames.some((f) => f.type === "TURN_COMPLETED")), `${caseId} idle`, 60_000);
    stream.close();
    return runId;
  };
  const idleTeamRun = async (session: Session, node: TestNode, caseId: string, modelId: string) => {
    const leadId = await agentDefinition(session, "team-lead", []);
    const helperId = await agentDefinition(session, "team-helper", []);
    const teamDefinitionId = (await session.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `running-runs-team-${randomUUID().slice(0, 8)}`, description: "running runs E2E team", instructions: "Answer briefly.",
        coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "helper", ref: helperId, refScope: "SHARED" }] } }))
      .createAgentTeamDefinition.id as string;
    const launch = { runtimeKind: "autobyteus", llmModelIdentifier: modelId, autoExecuteTools: true, workspaceRootPath: node.workspace };
    const created = (await session.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...launch }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: leadId, ...launch }, { memberAddress: "/helper", agentDefinitionId: helperId, ...launch }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const tree = JSON.parse(await fs.readFile(path.join(node.root, "memory", "agent_teams", teamRunId, "team_run_execution_tree.json"), "utf8")) as Json;
    const coordinator = (tree.rootTeam.members as Json[]).find((member) => member.address === tree.rootTeam.coordinatorAddress)!.agentRunId as string;
    const stream = await openStream(session, "agent-team", teamRunId);
    stream.send(coordinator, `CASE:${caseId} Hello team.`);
    await until(() => model.of(caseId).length >= 1, `${caseId} coordinator answered`, 60_000);
    await wait(1_000);
    stream.close();
    return { teamRunId, coordinator };
  };

  const scenario = async (prefix: "RUN-01" | "RUN-02", signal: "SIGTERM" | "SIGKILL") => {
    const node = await TestNode.create({ LMSTUDIO_HOSTS: model.origin });
    cleanups.push(() => fs.rm(node.root, { recursive: true, force: true }));
    let session = await node.start();
    const modelId = await modelIdOf(session);
    const agentCase = `${prefix}A`, teamCase = `${prefix}T`, stoppedCase = `${prefix}S`, callerCase = `${prefix}C`;
    const agentRunId = await idleAgentRun(session, node, agentCase, modelId);
    const team = await idleTeamRun(session, node, teamCase, modelId);
    const stoppedRunId = await idleAgentRun(session, node, stoppedCase, modelId);
    const stopped = (await session.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: stoppedRunId })).terminateAgentRun;
    expect(stopped.success, stopped.message).toBe(true);

    const expected = [{ rootSubjectKind: "agent", rootRunId: agentRunId }, { rootSubjectKind: "agent_team", rootRunId: team.teamRunId }]
      .sort((a, b) => a.rootSubjectKind.localeCompare(b.rootSubjectKind) || a.rootRunId.localeCompare(b.rootRunId));
    const live = await until(async () => {
      const record = await readJson(node.runningRuns);
      return JSON.stringify(record?.runs) === JSON.stringify(expected) ? record : null;
    }, "the running-run record within its 2 s check", 15_000);
    await node.stop(session, signal);
    const afterStop = await readJson(node.runningRuns);
    const callsBefore = { agent: model.of(agentCase).length, team: model.of(teamCase).length };

    session = await node.start();
    await until(() => session.output().includes("Running runs after the restart:"), "the restore summary", 60_000);
    const summary = session.output().match(/Running runs after the restart: [^\n]*/)?.[0] ?? "";
    await until(() => isAgentActive(session, agentRunId), "the Agent run running again", 30_000);
    expect(await isAgentActive(session, stoppedRunId)).toBe(false);
    // Nothing was posted: neither agent's model was called by the restore.
    await wait(1_000);
    expect({ agent: model.of(agentCase).length, team: model.of(teamCase).length }).toEqual(callsBefore);

    // A new agent finds both and messages them; both messages are delivered.
    let listing = "";
    model.script(callerCase, [
      () => ({ toolCalls: [{ name: "list_running_agents", args: {} }] }),
      (request) => { listing = request.toolResults[0] ?? ""; return { toolCalls: [
        { name: "send_message_to", args: { target_agent_run_id: agentRunId, content: `CASE:${agentCase} ping after the restart` } },
        { name: "send_message_to", args: { target_agent_run_id: team.coordinator, content: `CASE:${teamCase} ping after the restart` } },
      ] }; },
      () => ({ text: "Sent." }),
    ]);
    const callerRunId = await agentRun(session, node, await agentDefinition(session, "caller", ["list_running_agents", "send_message_to"]), modelId);
    const caller = await openStream(session, "agent", callerRunId);
    caller.send(callerRunId, `CASE:${callerCase} Find the running agents and message them.`);
    await until(() => model.of(agentCase).some((request) => JSON.stringify(request).includes("ping after the restart")), "the Agent run received the message", 60_000);
    await until(() => model.of(teamCase).some((request) => JSON.stringify(request).includes("ping after the restart")), "the Team coordinator received the message", 60_000);
    caller.close();

    if (EVIDENCE_DIR) {
      await fs.mkdir(EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(EVIDENCE_DIR, `${prefix}.json`), JSON.stringify({ signal, agentRunId, team, stoppedRunId, live, afterStop, summary,
        listing: listing.slice(0, 3000), callsBefore }, null, 2));
    }
    expect(afterStop?.runs).toEqual(expected);
    expect(summary).toBe("Running runs after the restart: 2 brought back, 0 skipped, 0 failed");
    expect(listing).toContain(agentRunId);
    expect(listing).toContain(team.coordinator);
    expect(listing).not.toContain(stoppedRunId);
    await node.stop(session, "SIGTERM");
  };

  it("RUN-01: graceful restart: the idle Agent run and Team come back running, listed and reachable; the stopped run does not", async () => {
    await scenario("RUN-01", "SIGTERM");
  }, 300_000);

  it("RUN-02: forced kill: the same from the live record", async () => {
    await scenario("RUN-02", "SIGKILL");
  }, 300_000);
});
