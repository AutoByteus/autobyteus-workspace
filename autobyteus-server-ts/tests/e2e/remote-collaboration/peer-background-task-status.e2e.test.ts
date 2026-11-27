/**
 * A peer run's running background task count reaches its delegator's node (autobyteus-448 part 2, REQ-006, the peer
 * route). Two built servers (`dist/app.js`), "alpha" and "beta", each with its own data root, ports and HOME, turn remote
 * collaboration on and pair with one invite as the owner does on the Nodes page. Runtimes are the scripted AGY CLI
 * (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): alpha's agent calls the real `delegate_task` to beta's shared
 * agent (`CALL_TOOL:{…}`); the delegated copy on beta receives `BACKGROUND_STEP:{"seconds":N}` as its task and ends its
 * turn with a daemon step open (a running background task). Alpha's run-status feed (`/ws/run-status`, what the
 * delegator's tree rows read), subscribed to the peer run, answers it through beta: idle with 1, then 0 when the step
 * exits. Every feed message is parsed with the contract's strict parser.
 *
 * Gate: RUN_PEER_BACKGROUND_STATUS_E2E=1. Prerequisite: `pnpm -C autobyteus-server-ts build`. No credentials. Run (in
 * autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_PEER_BACKGROUND_STATUS_E2E=1 \
 *     pnpm exec vitest run tests/e2e/remote-collaboration/peer-background-task-status.e2e.test.ts --no-watch
 * Optional PEER_BACKGROUND_STATUS_E2E_EVIDENCE_DIR keeps a JSON receipt.
 */
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { parseRunStatusServerMessage, type RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { pairNodes } from "../helpers/pair-nodes.js";

const ENABLED = process.env.RUN_PEER_BACKGROUND_STATUS_E2E === "1" && process.platform !== "win32";
const SERVER_DIR = path.resolve(__dirname, "../../..");
const AGY_CLI = path.resolve(__dirname, "../../fixtures/agy-failure-cli.mjs");
const MODEL = "gemini-3.8-flash-low";
const STEP_SECONDS = 25;
type Json = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async <T>(probe: () => T | undefined | null | false | Promise<T | undefined | null | false>, label: string, ms = 60_000): Promise<T> => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await probe(); if (value !== undefined && value !== null && value !== false) return value as T; } catch (error) { last = error; }
    await wait(200);
  }
  throw new Error(`Timed out after ${ms} ms waiting for ${label}${last ? ` (${String(last)})` : ""}`);
};
const freePort = () => new Promise<number>((resolve) => { const server = createServer(); server.listen(0, "127.0.0.1", () => {
  const address = server.address(); const port = typeof address === "object" && address ? address.port : 0; server.close(() => resolve(port)); }); });

type Node = { name: string; url: string; gql: (query: string, variables?: Json) => Promise<Json>; child: ChildProcess; output: () => string };
const children: ChildProcess[] = [];
const startNode = async (name: string, root: string): Promise<Node> => {
  for (const dir of ["home", "db", "workspace"]) await fs.mkdir(path.join(root, dir), { recursive: true });
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(root, ".env"), `AUTOBYTEUS_SERVER_HOST=${url}\nAPP_ENV=test\n`);
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, AUTOBYTEUS_SERVER_HOST: url,
    ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills", ...builtServerLaunchEnvironment() });
  const child = spawn(process.execPath, [path.join(SERVER_DIR, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", String(port)],
    { cwd: SERVER_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout!.on("data", (chunk) => { output += String(chunk); });
  child.stderr!.on("data", (chunk) => { output += String(chunk); });
  const gql = async (query: string, variables: Json = {}) => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Json; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  for (const deadline = Date.now() + 180_000; ; await wait(200)) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${name} exited: ${output.slice(-2000)}`);
    if (Date.now() > deadline) throw new Error(`${name} not ready: ${output.slice(-2000)}`);
    if (await gql("{__typename}").then(() => true, () => false)) break;
  }
  return { name, url, gql, child, output: () => output };
};
const stopNode = async (node: Node | undefined) => {
  if (!node || node.child.exitCode !== null || node.child.signalCode !== null) return;
  const exited = once(node.child, "exit");
  node.child.kill("SIGTERM");
  const force = setTimeout(() => node.child.kill("SIGKILL"), 15_000);
  try { await exited; } finally { clearTimeout(force); }
};
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

describe.skipIf(!ENABLED)("A peer run's background task count on its delegator's node", () => {
  let root = "";
  let alpha: Node | undefined;
  let beta: Node | undefined;
  const sockets: WebSocket[] = [];
  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    await Promise.all([stopNode(alpha), stopNode(beta)]);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("PBS-01: the delegator's run-status feed shows the peer run idle with 1 running background task, then 0", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "peer-bts-e2e-")));
    [alpha, beta] = await Promise.all([startNode("alpha", path.join(root, "alpha")), startNode("beta", path.join(root, "beta"))]);
    const paired = await pairNodes({ granter: { gql: (q, v) => beta!.gql(q, v), address: beta.url }, asker: { gql: (q, v) => alpha!.gql(q, v), address: alpha.url },
      granterName: "beta", askerName: "alpha" });
    expect(paired).toMatchObject({ name: "beta", paired: true });
    const workerName = `Worker ${randomUUID().slice(0, 6)}`;
    await beta.gql("mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}", { input: { name: workerName, role: "engineer",
      description: "A shared worker", instructions: "Follow the request.", toolNames: [], skillNames: [],
      defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null } } });
    const delegatorDefinition = (await alpha.gql("mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}", { input: {
      name: `Delegator ${randomUUID().slice(0, 6)}`, role: "engineer", description: "Delegates", instructions: "Follow the request.", toolNames: ["delegate_task"], skillNames: [] } }))
      .createAgentDefinition.id;
    const created = (await alpha.gql("mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}", { input: {
      agentDefinitionId: delegatorDefinition, workspaceRootPath: path.join(root, "alpha", "workspace"), llmModelIdentifier: MODEL, autoExecuteTools: true,
      runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const delegatorRunId = created.runId as string;
    const socket = new WebSocket(`${alpha.url.replace(/^http/, "ws")}/ws/agent/${delegatorRunId}`);
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await wait(500);
    const call = { name: "delegate_task", arguments: { node: "beta", recipient_address: `/${segment(workerName)}`,
      description: `BACKGROUND_STEP:{"seconds":${STEP_SECONDS}}` } };
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: delegatorRunId, message_id: `e2e-${randomUUID()}`,
      dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content: `CALL_TOOL:${JSON.stringify(call)}`, context_file_paths: [], image_urls: [] } }));
    const delegated = await until(async () => {
      const conversation = JSON.stringify((await alpha!.gql("query($id:String!){getRunProjection(runId:$id){conversation}}", { id: delegatorRunId })).getRunProjection?.conversation ?? []);
      const match = conversation.match(/target_agent_run_id\\?"\s*:\s*\\?"([^"\\]+)/);
      return match ? { peerRunId: match[1]!, conversation: conversation.slice(conversation.indexOf("CALLED"), conversation.indexOf("CALLED") + 600) } : null;
    }, "delegate_task result", 90_000);

    // Alpha's run-status feed subscribed to the peer run (the delegator's tree reads its rows from this feed).
    const feed = new WebSocket(`${alpha.url.replace(/^http/, "ws")}/ws/run-status`);
    sockets.push(feed);
    const messages: Array<RunStatusServerMessage & { at: number }> = [];
    feed.on("message", (raw: unknown) => { messages.push({ ...parseRunStatusServerMessage(JSON.parse(String(raw))), at: Date.now() }); });
    await new Promise<void>((resolve, reject) => { feed.once("open", () => resolve()); feed.once("error", reject); });
    feed.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs: [{ kind: "agent", runId: delegated.peerRunId }] } }));
    type PeerRunState = { answer: string; node: string | null; status: string | null; count: number };
    const states = (): PeerRunState[] => messages.flatMap((message): PeerRunState[] => message.type === "RUN_STATUS_SNAPSHOT"
      ? message.payload.runs.map((run) => ({ answer: run.answer, node: run.node, status: run.status, count: run.backgroundTasksRunning }))
      : message.type === "RUN_STATE_CHANGED" ? [{ answer: message.payload.answer, node: message.payload.node, status: message.payload.status, count: message.payload.backgroundTasksRunning }] : []);
    const agentsSeen = () => messages.flatMap((message) => message.type === "RUN_STATUS_SNAPSHOT" ? message.payload.runs.flatMap((run) => run.agents)
      : message.type === "RUN_STATUS_CHANGED" ? [{ agentRunId: message.payload.agentRunId, status: message.payload.status, backgroundTasksRunning: message.payload.backgroundTasksRunning }] : []);
    const isBackground = (agent: { status: string | null; backgroundTasksRunning: number }) => agent.status === "idle" && agent.backgroundTasksRunning === 1;
    const writeReceipt = async (extra: Json) => {
      if (!process.env.PEER_BACKGROUND_STATUS_E2E_EVIDENCE_DIR) return;
      await fs.mkdir(process.env.PEER_BACKGROUND_STATUS_E2E_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.PEER_BACKGROUND_STATUS_E2E_EVIDENCE_DIR, "PBS-01.json"), JSON.stringify({ delegatorRunId,
        peerRunId: delegated.peerRunId, called: delegated.conversation, ...extra, states: states(),
        agents: agentsSeen(), messages: messages.map((message) => ({ type: message.type, at: message.at })) }, null, 2));
    };
    let background: ReturnType<typeof agentsSeen>[number] | undefined;
    let backgroundState: PeerRunState | undefined;
    let ended: ReturnType<typeof agentsSeen>[number] | undefined;
    try {
      background = await until(() => agentsSeen().find(isBackground), "the peer run idle with 1 on alpha", 90_000);
      backgroundState = await until(() => states().find((state: PeerRunState) => state.answer === "ok" && state.count === 1), "the peer run's state with 1", 60_000);
      // The first idle 0 after the first idle 1, in the order alpha received them.
      ended = await until(() => { const seen = agentsSeen(); const from = seen.findIndex(isBackground);
        return seen.slice(from + 1).find((agent) => agent.status === "idle" && agent.backgroundTasksRunning === 0); }, "the peer run back to 0 on alpha", (STEP_SECONDS + 60) * 1_000);
    } finally {
      await writeReceipt({ background, backgroundState, ended });
    }
    expect(background).toMatchObject({ agentRunId: delegated.peerRunId, status: "idle", backgroundTasksRunning: 1 });
    expect(backgroundState).toMatchObject({ answer: "ok", status: "idle", count: 1 });
    expect(ended).toMatchObject({ agentRunId: delegated.peerRunId, backgroundTasksRunning: 0 });
  }, 400_000);
});
