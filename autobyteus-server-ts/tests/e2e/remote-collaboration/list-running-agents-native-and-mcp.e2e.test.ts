import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import { pairNodes } from "../helpers/pair-nodes.js";

/**
 * autobyteus-500 FU-011 with autobyteus-492 merged: `list_running_agents` reads the host's `PeerDiscoveryAccess`, passed in
 * by the composition, on both of its routes: the native tool (an AutoByteus run; only its inference is scripted, by an
 * emulated LM Studio that makes the real tool call) and Agent Tools MCP (the scripted AGY CLI makes the real tool call).
 * Built servers (`dist/app.js`, `dist/index.js`), real pairing by invite, signed peer requests; no user data.
 * - LRN-1 (two Studio nodes, alpha and beta, paired): an alpha agent on each route lists alpha's running roots a person
 *   started (without its own run), beta's with `node` (each entry with `node`), and, with alpha's remote collaboration
 *   switched off, gets the "turned off" refusal with `node` while its local list still answers. Both routes answer the same.
 * - LRN-2 (the standalone application host, which composes no remote collaboration): an application's native agent and its
 *   AGY agent each get the same outcome from list_running_agents as from list_available_agents (492 DS-001, the same senders),
 *   with and without `node`, and never a peer's list.
 * Prerequisites: `pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts build`.
 * Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/list-running-agents-native-and-mcp.e2e.test.ts --no-watch
 */
type Rec = Record<string, any>;
const serverRoot = path.resolve(import.meta.dirname, "../../..");
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && fs.existsSync(path.join(serverRoot, "dist", "app.js"))
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const AGY_MODEL = "gemini-3.8-flash-low";
const MODEL_KEY = "lrn-fixture";
const BETA = "beta-node";
const OFF = `No peer node named "${BETA}" is registered on this node, so nothing was sent.`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async <T>(check: () => Promise<T> | T, label: string, ms = 90_000): Promise<NonNullable<T>> => {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value as NonNullable<T>;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await wait(150);
  }
};
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const a = server.address(); server.close(() => typeof a === "object" && a ? resolve(a.port) : reject(new Error("no port"))); });
});
const textOf = (content: unknown): string => typeof content === "string" ? content
  : Array.isArray(content) ? content.map((part) => typeof part === "string" ? part : String((part as Rec)?.text ?? "")).join("") : "";
/** A tool result's text as JSON when it is JSON (the native tool's result), else `{ text }` (its error). */
const parsed = (text: string): Rec => { try { return JSON.parse(text) as Rec; } catch { return { text }; } };
/** The scripted CLI's reply `CALLED:<MCP tool result>`, as the agent reads it: the result, or `{ text, isError }`. */
const mcpResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: Rec) => part.type === "text")?.text ?? "";
  return { ...parsed(text), isError: raw.isError === true };
};
const idOf = (entry: Rec) => String(entry.kind === "agent_team" ? entry.team_run_id : entry.agent_run_id);

/** LM Studio as the AutoByteus runtime reads it: a message `LRN:<key>:<tool>:<args>` makes the model call that tool. */
class ScriptedModel {
  readonly results = new Map<string, string>();
  origin = "";
  private server: Server | null = null;
  async listen() {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const a = this.server.address();
    this.origin = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}`;
  }
  async close() { this.server?.closeAllConnections(); await new Promise<void>((resolve) => this.server ? this.server.close(() => resolve()) : resolve()); }
  private async handle(req: IncomingMessage, res: ServerResponse) {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Rec;
    const messages = (Array.isArray(body.messages) ? body.messages : []) as Rec[];
    const lastUser = textOf([...messages].reverse().find((m) => m.role === "user")?.content);
    const marker = lastUser.match(/LRN:([A-Za-z0-9-]+):([a-z_]+):(\{.*\})/);
    const lastAssistant = messages.map((m) => m.role).lastIndexOf("assistant");
    const toolResults = lastAssistant < 0 ? [] : messages.slice(lastAssistant + 1).filter((m) => m.role === "tool").map((m) => textOf(m.content));
    let delta: Rec = { role: "assistant", content: "OK." };
    if (marker && toolResults.length) { this.results.set(marker[1]!, toolResults[0]!); delta = { role: "assistant", content: "Listed." }; }
    else if (marker && !this.results.has(marker[1]!)) {
      delta = { role: "assistant", tool_calls: [{ index: 0, id: `call-${randomUUID().slice(0, 12)}`, type: "function",
        function: { name: marker[2], arguments: marker[3] } }] };
    }
    const calls = Boolean(delta.tool_calls);
    const chunk = (value: Rec, finish: string | null) => ({ id: `lrn-${randomUUID().slice(0, 8)}`, object: "chat.completion.chunk", created: 1,
      model: MODEL_KEY, choices: [{ index: 0, delta: value, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, calls ? "tool_calls" : "stop"))}\n\ndata: [DONE]\n\n`);
  }
}

const children: ChildProcess[] = [];
const roots: string[] = [];
const model = new ScriptedModel();

/** One Studio node: its own data root, port, HOME and `.env` (its own address, as pairing needs). */
const startNode = async (name: string) => {
  const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), `lrn-${name}-`)));
  roots.push(root);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const [data, home, workspace] = ["data", "home", "workspace"].map((dir) => path.join(root, dir));
  for (const dir of [data, home, workspace]) await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(data, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nLMSTUDIO_HOSTS=${model.origin}\n`);
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: "test", LOG_LEVEL: "WARN",
    AUTOBYTEUS_SERVER_HOST: baseUrl, LMSTUDIO_HOSTS: model.origin, ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills",
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "" };
  const child = spawn(process.execPath, [path.join(serverRoot, "dist", "app.js"), "--host", "127.0.0.1", "--port", String(port), "--data-dir", data],
    { cwd: serverRoot, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout!.on("data", (b) => { output += String(b); });
  child.stderr!.on("data", (b) => { output += String(b); });
  await until(async () => {
    if (child.exitCode !== null) throw new Error(`${name} exited: ${output.slice(-2000)}`);
    return fetch(`${baseUrl}/rest/health`).then((r) => r.ok, () => false);
  }, `${name} health`, 180_000);
  const gql = async (query: string, variables: Rec = {}): Promise<Rec> => {
    const response = await fetch(`${baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(`${name} GraphQL: ${JSON.stringify(body.errors ?? body)}`);
    return body.data;
  };
  return { name, baseUrl, workspace, gql, output: () => output };
};
type Node = Awaited<ReturnType<typeof startNode>>;

const definition = (node: Node, name: string, toolNames: string[]) => node.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
  { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames, skillNames: [] } })
  .then((d) => d.createAgentDefinition.id as string);
const nativeModel = async (node: Node) => {
  const models = (await node.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
    .reloadProviderModelCatalog.llmModels.map((m: Rec) => String(m.modelIdentifier));
  return until(() => models.find((id: string) => id.startsWith(MODEL_KEY)), `the fixture model (${models.join(", ")})`, 1);
};
const createRun = async (node: Node, agentDefinitionId: string, runtimeKind: string, llmModelIdentifier: string) => {
  const created = (await node.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
    agentDefinitionId, workspaceRootPath: node.workspace, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, runtimeKind } })).createAgentRun;
  expect(created.success, created.message).toBe(true);
  return created.runId as string;
};
/** The owner's message through the run's composer socket; resolves once the turn is over. */
const send = async (node: Node, runId: string, content: string) => {
  const socket = new WebSocket(`${node.baseUrl.replace(/^http/, "ws")}/ws/agent/${runId}`);
  const frames: Rec[] = [];
  socket.on("message", (raw: unknown) => { try { frames.push(JSON.parse(String(raw)) as Rec); } catch { /* not a frame */ } });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === "CONNECTED"), `${runId} connected`, 30_000);
    const before = frames.length;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), agent_run_id: runId, content } }));
    await until(() => frames.slice(before).some((f) => f.type === "TURN_COMPLETED" || (f.type === "AGENT_STATUS" && f.payload?.status === "idle")),
      `${runId} turn`, 90_000);
  } finally { socket.terminate(); }
};
const conversation = async (node: Node, runId: string) => JSON.stringify((await node.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`,
  { id: runId })).getRunProjection?.conversation ?? []);
/** Agent Tools MCP: the AGY run calls the tool; its reply carries the result. */
const mcpCall = async (node: Node, runId: string, args: Rec): Promise<Rec> => {
  const count = async () => (await conversation(node, runId)).split("CALLED:").length - 1;
  const before = await count();
  await send(node, runId, `CALL_TOOL:${JSON.stringify({ name: "list_running_agents", arguments: args })}`);
  const text = await until(async () => (await count()) > before ? await conversation(node, runId) : null, `${runId} CALLED`);
  const raw = JSON.parse(text) as unknown;
  const strings: string[] = [];
  const walk = (v: unknown) => { if (typeof v === "string") { if (v.includes("CALLED:")) strings.push(v); } else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  walk(raw);
  const last = strings.at(-1)!;
  return mcpResult(last.slice(last.lastIndexOf("CALLED:") + "CALLED:".length));
};
/** The native tool: the AutoByteus run's model calls it; the emulator keeps the tool result the run returned to it. */
const nativeCall = async (node: Node, runId: string, args: Rec): Promise<Rec> => {
  const key = randomUUID().slice(0, 8);
  await send(node, runId, `LRN:${key}:list_running_agents:${JSON.stringify(args)}`);
  return parsed(await until(() => model.results.get(key), `native result ${key}`));
};

suite("list_running_agents on the native tool and on Agent Tools MCP, with the host's peer discovery (FU-011, 492)", () => {
  beforeAll(() => model.listen());
  afterAll(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await wait(2_000);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await model.close();
    for (const root of roots) await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }, 60_000);

  it("LRN-1 Studio: both routes list this node's running roots, a peer's with node, and are refused with node once the nodes are unpaired", async () => {
    const [alpha, beta] = await Promise.all([startNode("alpha"), startNode("beta")]);
    await pairNodes({ granter: { gql: beta.gql, address: beta.baseUrl }, asker: { gql: alpha.gql, address: alpha.baseUrl }, granterName: BETA, askerName: "alpha-node" });

    const lister = await definition(alpha, "LRN Lister", ["list_running_agents"]);
    const bystanderA = await definition(alpha, "LRN Bystander", []);
    const bystanderB = await definition(beta, "LRN Beta Bystander", []);
    const other = await createRun(alpha, bystanderA, "antigravity_cli", AGY_MODEL);
    await send(alpha, other, "Hello.");
    const agy = await createRun(alpha, lister, "antigravity_cli", AGY_MODEL);
    await send(alpha, agy, "Hello.");
    const native = await createRun(alpha, lister, "autobyteus", await nativeModel(alpha));
    await send(alpha, native, "Hello.");
    const betaRun = await createRun(beta, bystanderB, "antigravity_cli", AGY_MODEL);
    await send(beta, betaRun, "Hello.");

    // Local: alpha's running roots a person started, the caller's own run left out.
    const nativeLocal = await nativeCall(alpha, native, {});
    const mcpLocal = await mcpCall(alpha, agy, {});
    console.log(`LRN-1 local: ${JSON.stringify({ nativeLocal, mcpLocal })}`);
    expect((nativeLocal.agents as Rec[]).map(idOf).sort(), JSON.stringify(nativeLocal)).toEqual([other, agy].sort());
    expect(mcpLocal.isError, JSON.stringify(mcpLocal)).toBe(false);
    expect((mcpLocal.agents as Rec[]).map(idOf).sort(), JSON.stringify(mcpLocal)).toEqual([other, native].sort());
    const entry = (result: Rec, id: string) => (result.agents as Rec[]).find((e) => idOf(e) === id);
    expect(entry(nativeLocal, other), "the same entry on both routes").toEqual(entry(mcpLocal, other));
    expect(entry(nativeLocal, other)).toMatchObject({ kind: "agent", name: "LRN Bystander", agent_run_id: other, workspace: alpha.workspace });
    expect(entry(nativeLocal, other)).not.toHaveProperty("node");

    // With node: beta's running root, each entry with the node it runs on.
    const nativePeer = await nativeCall(alpha, native, { node: BETA });
    const mcpPeer = await mcpCall(alpha, agy, { node: BETA });
    console.log(`LRN-1 peer: ${JSON.stringify({ nativePeer, mcpPeer })}`);
    expect((nativePeer.agents as Rec[]).map(idOf), JSON.stringify(nativePeer)).toEqual([betaRun]);
    expect(entry(nativePeer, betaRun)).toMatchObject({ kind: "agent", name: "LRN Beta Bystander", agent_run_id: betaRun, node: BETA });
    expect(mcpPeer.isError, JSON.stringify(mcpPeer)).toBe(false);
    expect(mcpPeer.agents, "the same answer on both routes").toEqual(nativePeer.agents);

    // Alpha unpairs beta (661: no switch): with node, the not-registered refusal on both routes; without node, the local list still answers.
    const betaPeer = ((await alpha.gql(`{ peerNodes { nodeId name } }`)).peerNodes as Rec[]).find((peer) => peer.name === BETA)!;
    await alpha.gql(`mutation($id:String!){unpairPeerNode(nodeId:$id)}`, { id: betaPeer.nodeId });
    const nativeOff = await nativeCall(alpha, native, { node: BETA });
    const mcpOff = await mcpCall(alpha, agy, { node: BETA });
    console.log(`LRN-1 off: ${JSON.stringify({ nativeOff, mcpOff })}`);
    expect(String(nativeOff.text ?? JSON.stringify(nativeOff))).toContain(OFF);
    expect(nativeOff).not.toHaveProperty("agents");
    expect(mcpOff.isError, JSON.stringify(mcpOff)).toBe(true);
    expect(String(mcpOff.text ?? mcpOff.message ?? JSON.stringify(mcpOff))).toContain(OFF);
    expect((await nativeCall(alpha, native, {})).agents.map(idOf).sort()).toEqual([other, agy].sort());
    expect((await mcpCall(alpha, agy, {})).agents.map(idOf).sort()).toEqual([other, native].sort());
  }, 600_000);

  it("LRN-2 application host: on each route an application's agent gets the same outcome from list_running_agents as from list_available_agents", async () => {
    const own = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "lrn-host-")));
    roots.push(own);
    const [data, home, workspace, packageRoot] = ["data", "home", "workspace", "package"].map((dir) => path.join(own, dir));
    for (const dir of [data, home, workspace]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(data, ".env"), `APP_ENV=test\nLMSTUDIO_HOSTS=${model.origin}\n`);
    const app = path.join(packageRoot, "applications", "lrn");
    for (const dir of ["ui", "backend", "agents/lister"]) await fsp.mkdir(path.join(app, dir), { recursive: true });
    await fsp.writeFile(path.join(app, "ui/index.html"), "<!doctype html><title>LRN</title>");
    await fsp.writeFile(path.join(app, "application.json"), JSON.stringify({ manifestVersion: "5", id: "lrn", name: "LRN",
      ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "6" }, backend: { bundleManifest: "backend/bundle.json" }, executionResourceSlots: [], agentTools: [] }));
    await fsp.writeFile(path.join(app, "agents/lister/agent.md"), "---\nname: Lister\ndescription: LRN lister\nrole: Assistant\n---\n\nFollow the request.\n");
    await fsp.writeFile(path.join(app, "agents/lister/agent-config.json"), JSON.stringify({ toolNames: ["list_running_agents", "list_available_agents"], skillNames: [],
      inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [], defaultLaunchConfig: null }));
    await fsp.writeFile(path.join(app, "backend/bundle.json"), JSON.stringify({ contractVersion: "1", entryModule: "backend/entry.mjs", moduleFormat: "esm",
      distribution: "self-contained", targetRuntime: { engine: "node", semver: ">=22 <27" },
      sdkCompatibility: { backendDefinitionContractVersion: "7", frontendSdkContractVersion: "6" },
      supportedExposures: { queries: true, commands: true, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
    await fsp.writeFile(path.join(app, "backend/entry.mjs"), `const events = []; const subscriptions = [];
export default { definitionContractVersion: '7', queries: { events: async () => events }, commands: {
  start: async (input, context) => { const binding = await context.agentExecution.startAgent({ launchRequestId: input.id,
    executionResourceRef: { source: 'bundle', kind: 'AGENT', localId: 'lister' }, launch: { kind: 'AGENT', runtimeKind: input.runtimeKind,
    workspaceRootPath: input.workspace, llmModelIdentifier: input.model, autoExecuteTools: true } });
    subscriptions.push(await context.agentExecution.subscribeEventStream({ bindingId: binding.bindingId, memberAddress: null }, { onEvent: (event) => { events.push(event); } }));
    return binding; },
  say: async (input, context) => { await context.agentExecution.sendInput({ address: { bindingId: input.bindingId, memberAddress: null }, input: { text: input.text } }); return true; },
} };`);
    const imported = (relative: string) => JSON.stringify(pathToFileURL(path.join(serverRoot, relative)).href);
    const entry = path.join(own, "host.mjs");
    await fsp.writeFile(entry, `import { startStandaloneApplicationHost } from ${imported("dist/index.js")};
import { getModelCatalogService } from ${imported("dist/llm-management/services/model-catalog-service.js")};
let host; try { host = await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: "lrn", appDataDir: data, host: "127.0.0.1", port: 0 })});
  const catalog = await getModelCatalogService().reloadProviderModelCatalog('LMSTUDIO', 'autobyteus');
  process.send({ kind: 'ready', url: host.url, model: catalog.llmModels.find((m) => m.model_identifier.startsWith('${MODEL_KEY}'))?.model_identifier });
  process.on('message', async (m) => { if (m === 'close') { await host.close().catch(console.error); process.exit(0); } });
} catch (e) { console.error(e); await host?.close().catch(console.error); process.exit(92); }`);
    const child = spawn(process.execPath, [entry], { cwd: serverRoot, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { PATH: process.env.PATH, HOME: home,
      TMPDIR: own, LMSTUDIO_HOSTS: model.origin, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", APP_ENV: "test", ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" } });
    children.push(child);
    let logs = "";
    let ready: Rec | null = null;
    child.stdout!.on("data", (b) => { logs += String(b); });
    child.stderr!.on("data", (b) => { logs += String(b); });
    child.on("message", (m: Rec) => { if (m.kind === "ready") ready = m; });
    try {
      const host = await until(() => { if (child.exitCode !== null) throw new Error(`host exited ${child.exitCode}: ${logs.slice(-3000)}`); return ready; }, "host ready", 120_000);
      expect(host.model, "the fixture model").toBeTruthy();
      const call = async (name: string, input: Rec, kind = "commands") => {
        const response = await fetch(`${host.url}/_autobyteus/backend/${kind}/${name}`, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ input }), signal: AbortSignal.timeout(60_000) });
        const body = await response.json() as Rec;
        expect(response.ok, JSON.stringify(body)).toBe(true);
        return body.result as Rec;
      };
      /** The AGY run's `CALLED:` replies in the application's event stream (the text of each assistant segment). */
      const calledOf = async (bindingId: string): Promise<string[]> => {
        const events = await call("events", {}, "queries") as unknown as Rec[];
        const text = events.filter((e) => e.address?.bindingId === bindingId).map((e) => JSON.stringify(e.event)).join("\n");
        return [...text.matchAll(/CALLED:((?:[^"\\]|\\.)*)/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
      };
      const nativeBinding = await call("start", { id: "native", runtimeKind: "autobyteus", model: host.model, workspace });
      const agyBinding = await call("start", { id: "agy", runtimeKind: "antigravity_cli", model: AGY_MODEL, workspace });
      const native = async (name: string, args: Rec) => {
        const key = randomUUID().slice(0, 8);
        await call("say", { bindingId: nativeBinding.bindingId, text: `LRN:${key}:${name}:${JSON.stringify(args)}` });
        return parsed(await until(() => model.results.get(key), `host native ${key}`));
      };
      /** One AGY tool call over Agent Tools MCP: its result (`CALLED:`), or the run's ERROR event when the call is refused. */
      const agy = async (name: string, args: Rec): Promise<Rec> => {
        const outcomes = async () => {
          const events = ((await call("events", {}, "queries")) as unknown as Rec[]).filter((e) => e.address?.bindingId === agyBinding.bindingId);
          return [...(await calledOf(agyBinding.bindingId)).map((called) => ({ result: mcpResult(called) })),
            ...events.filter((e) => e.event?.type === "ERROR").map((e) => ({ error: String(e.event.message) }))];
        };
        const before = (await outcomes()).length;
        await call("say", { bindingId: agyBinding.bindingId, text: `CALL_TOOL:${JSON.stringify({ name, arguments: args })}` });
        const all = await until(async () => { const found = await outcomes(); return found.length > before ? found : null; }, `host AGY ${name}`)
          .catch(async (error) => { throw new Error(`${error}; events: ${JSON.stringify(await call("events", {}, "queries")).slice(-3000)}; logs: ${logs.slice(-2000)}`); });
        return all.at(-1)!;
      };
      // 492 DS-001: list_running_agents has the same senders as list_available_agents. An application's agent gets the same
      // outcome from both, on each route, with and without node (at base 53b72018ad and here, neither tool is given to an
      // application's agent: FU-500-15).
      /** An outcome with the tool's name and the call's ID made neutral, so the two tools' outcomes compare. */
      const neutral = (outcome: Rec) => JSON.parse(JSON.stringify(outcome).replaceAll("list_available_agents", "<tool>")
        .replaceAll("list_running_agents", "<tool>").replace(/call-[0-9a-f-]+/g, "<call>")) as Rec;
      const outcomes: Rec = {};
      for (const [label, args] of [["local", {}], ["node", { node: BETA }]] as const) {
        outcomes[label] = { native: { running: await native("list_running_agents", args), available: await native("list_available_agents", args) },
          mcp: { running: await agy("list_running_agents", args), available: await agy("list_available_agents", args) } };
      }
      console.log(`LRN-2: ${JSON.stringify(outcomes)}`);
      for (const label of ["local", "node"]) for (const route of ["native", "mcp"]) {
        expect(neutral(outcomes[label][route].running), `${route} ${label}: the same outcome as list_available_agents`)
          .toEqual(neutral(outcomes[label][route].available));
      }
      // With node, an answer is the host's "turned off" refusal, never a peer's list (it composes no remote collaboration).
      for (const route of ["native", "mcp"]) expect(JSON.stringify(outcomes.node[route].running)).not.toContain("\"agents\"");
    } finally {
      if (child.connected) child.send("close");
      await until(() => child.exitCode !== null || child.signalCode !== null, "host close", 30_000).catch(() => child.kill("SIGKILL"));
    }
  }, 300_000);
});
