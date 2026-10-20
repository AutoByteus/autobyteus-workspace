import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile, spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";

/**
 * Remote collaboration slice 1 (autobyteus-191: remote delegation, text only) between two real server processes.
 *
 * Node "alpha" (A, the delegating node) and node "beta" (B, the receiving node) are two built servers
 * (`dist/app.js`) with their own data roots, ports and HOMEs. Each node reaches the other through a capturing HTTP
 * proxy (its registered peer URL), so every request between the nodes is recorded (AC-111) and the test can
 * partition, stop or retarget the link (QR-102, AC-102). Runtimes are the scripted AGY CLI
 * (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): a message containing `CALL_TOOL:{…}` makes that agent call
 * the actual agent tool and reply `CALLED:<result>`; anything else is answered `OK`. No provider inference.
 * Every action enters through a real surface: GraphQL settings (the Nodes tab's API), the composer WebSocket of a
 * run (the owner's message), and the agents' own tool calls. The cases share the two nodes and run in order:
 *
 * - node settings and the gateway: RC-01 AC-101 off by default (inbound refused, no peer can be added); RC-03 switched
 *   on, AC-102 registration with pinned identities, bad URLs, gateway admission order for both request kinds, AC-103
 *   publishing; RC-20 AC-111 audit of every captured request (these three run on their own: `-t "RC-(01|03|20) "`);
 * - delegation and messages: RC-02 delegate_task with the switch off; RC-04 AC-103 not published / cannot run;
 *   RC-05 … RC-07 AC-104/105 both ways from a standalone, Team and Org delegator with the delegator's root view open
 *   (contiguous change sequences); RC-08 AC-107 unlinked senders; RC-09 AC-108 files and saved Tasks; RC-10/RC-11
 *   AC-109 Task closure; RC-12 AC-106 idle shutdown on B and restore; RC-13 restart of B, then of A (inbound restores
 *   every root kind); RC-14 history deleted; RC-15 QR-102 partition and stopped peer; RC-16 identity mismatch;
 *   RC-17 unpublish; RC-18 switch off again; RC-19 peer removal.
 *
 * Prerequisite: a current build (`pnpm -C autobyteus-server-ts build`). About 8 minutes (one idle grace of 60 s and
 * two restarts). `REMOTE_E2E_EVIDENCE_DIR` keeps a JSON receipt and both servers' logs.
 * Run (from the repository root, with a clean environment as TESTING.md asks for E2E folders):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *     ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch
 */

const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && fs.existsSync(appEntry)
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const GRACE_MS = 60_000;
const MODEL = "gemini-3.8-flash-low";
const LABEL = { alpha: "alpha-node", beta: "beta-node" } as const;
const PATHS = { runs: "/rest/remote/delegated-runs", messages: "/rest/remote/messages", status: "/rest/remote-access/status" } as const;
const CANARY = { alpha: `sk-canary-alpha-${randomUUID()}`, beta: `sk-canary-beta-${randomUUID()}` };

type Rec = Record<string, any>;
type Frame = { type: string; payload: Rec; at: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await predicate()) return; await wait(100); }
  throw new Error(`Timed out waiting for ${label}`);
};
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const stringsOf = (value: unknown): string[] =>
  objectsIn(value).flatMap((record) => Object.values(record)).filter((entry): entry is string => typeof entry === "string");
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = stringsOf(entry).filter((value) => value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: Rec) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
/** The text an agent reads in a tool result (a refusal's message, or the result's text). */
const textOf = (result: Rec): string => String(result.message ?? result.text ?? JSON.stringify(result));
/** The same-node refusal for a run ID the sender's root does not know (unchanged by this slice). */
const liveOnlyRefusal = (runId: string) => `No running agent has the run id '${runId}', so the message was not sent. Use an exact run id you were given: a sender run id (from a message or your new task), or a run id delegate_task returned to you.`;
const getFreePort = async (): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port")));
  });
});
const execFileAsync = promisify(execFile);
/** Working directories of every live scripted AGY process (each agent's capsule; the path contains its run ID). */
const liveAgyCwds = async (): Promise<string[]> => {
  const pids = (await execFileAsync("pgrep", ["-f", "agy-failure-cli"]).catch(() => ({ stdout: "" }))).stdout.trim().split("\n").filter(Boolean);
  if (pids.length === 0) return [];
  const { stdout } = await execFileAsync("lsof", ["-a", "-d", "cwd", "-p", pids.join(","), "-Fn"])
    .catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "" }));
  return stdout.split("\n").filter((line) => line.startsWith("n")).map((line) => line.slice(1));
};
const processLive = async (runId: string) => (await liveAgyCwds()).some((cwd) => cwd.includes(runId));
const walkFiles = async (dir: string): Promise<string[]> => (await fsp.readdir(dir, { withFileTypes: true }).catch(() => []))
  .reduce<Promise<string[]>>(async (acc, entry) => {
    const full = path.join(dir, entry.name);
    return [...await acc, ...(entry.isDirectory() ? await walkFiles(full) : [full])];
  }, Promise.resolve([]));
const readJson = async (file: string): Promise<Rec> => JSON.parse(await fsp.readFile(file, "utf8")) as Rec;
const sortedKeys = (value: Rec) => Object.keys(value).sort();

/** One server process with its own data root, port and HOME; restartable on the same port and data. */
class NodeServer {
  child: ChildProcessWithoutNullStreams | null = null;
  nodeId = "";
  readonly logs: string[] = [];
  readonly dataDir: string; readonly home: string; readonly workspace: string; readonly argvLog: string; readonly logFile: string;
  constructor(readonly name: "alpha" | "beta", readonly root: string, readonly port: number) {
    this.dataDir = path.join(root, name, "data");
    this.home = path.join(root, name, "home");
    this.workspace = path.join(root, name, "workspace");
    this.argvLog = path.join(root, name, "agy-argv.jsonl");
    this.logFile = path.join(root, name, "server.log");
  }
  get baseUrl() { return `http://127.0.0.1:${this.port}`; }
  get memory() { return path.join(this.dataDir, "memory"); }
  async start(): Promise<void> {
    for (const dir of [this.dataDir, this.home, this.workspace]) await fsp.mkdir(dir, { recursive: true });
    const envFile = path.join(this.dataDir, ".env");
    if (!fs.existsSync(envFile)) {
      await fsp.writeFile(envFile, [`AUTOBYTEUS_SERVER_HOST=${this.baseUrl}`, "APP_ENV=test", "LOG_LEVEL=WARN", "HTTP_ACCESS_LOG_MODE=off",
        `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=${GRACE_MS}`, ""].join("\n"));
    }
    // A clean environment: only what the server and the scripted CLI need (no inherited app roots or keys).
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: this.home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: this.argvLog,
      APP_ENV: "test", LOG_LEVEL: "WARN", HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: this.baseUrl };
    const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(this.port), "--data-dir", this.dataDir],
      { cwd: serverRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    const log = fs.createWriteStream(this.logFile, { flags: "a" });
    log.write(`--- start ${new Date().toISOString()} pid ${child.pid}\n`);
    const onData = (chunk: Buffer) => {
      log.write(chunk);
      for (const line of chunk.toString("utf8").split(/\r?\n/)) if (line.trim()) this.logs.push(line);
      while (this.logs.length > 400) this.logs.shift();
    };
    child.stdout.on("data", onData); child.stderr.on("data", onData);
    child.once("exit", () => log.end());
    this.child = child;
    const deadline = Date.now() + 90_000;
    for (;;) {
      if (child.exitCode !== null) throw new Error(`${this.name} exited during startup:\n${this.logs.join("\n")}`);
      const ok = await fetch(`${this.baseUrl}/rest/health`).then((response) => response.ok, () => false);
      if (ok) break;
      if (Date.now() > deadline) throw new Error(`${this.name} did not become healthy:\n${this.logs.join("\n")}`);
      await wait(300);
    }
    const status = await (await fetch(`${this.baseUrl}${PATHS.status}`)).json() as Rec;
    if (this.nodeId && status.serverInstanceId !== this.nodeId) throw new Error(`${this.name} changed its identity on restart`);
    this.nodeId = status.serverInstanceId as string;
  }
  async stop(): Promise<void> {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([exited, wait(15_000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })]);
    await exited;
  }
  async gqlRaw(query: string, variables?: Rec): Promise<{ data?: Rec; errors?: Rec[] }> {
    const response = await fetch(`${this.baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: Rec; errors?: Rec[] };
  }
  async gql(query: string, variables?: Rec): Promise<Rec> {
    const body = await this.gqlRaw(query, variables);
    if (!body.data || body.errors?.length) throw new Error(`${this.name} GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
    return body.data;
  }
  async post(route: string, body: unknown): Promise<{ status: number; answer: Rec }> {
    const response = await fetch(`${this.baseUrl}${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, answer: await response.json() as Rec };
  }
  async launches(): Promise<Array<{ argv: string[]; cwd: string }>> {
    return (await fsp.readFile(this.argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  }
}

type Captured = { seq: number; at: number; via: "toBeta" | "toAlpha"; method: string; path: string; headers: Rec; body: unknown; status?: number; answer?: unknown; outcome?: string };

/** The link from one node to the other: forwards to the target node and records every request. */
class CapturingProxy {
  mode: "forward" | "blackhole" = "forward";
  targetPort: number;
  private server: http.Server | null = null;
  private readonly held = new Set<http.ServerResponse>();
  constructor(readonly via: Captured["via"], readonly port: number, targetPort: number, readonly captured: Captured[]) { this.targetPort = targetPort; }
  get url() { return `http://127.0.0.1:${this.port}`; }
  async open(): Promise<void> {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: unknown = raw;
        try { body = raw ? JSON.parse(raw) : null; } catch { /* keep the raw text */ }
        const entry: Captured = { seq: this.captured.length + 1, at: Date.now(), via: this.via, method: req.method ?? "", path: req.url ?? "", headers: { ...req.headers }, body };
        this.captured.push(entry);
        if (this.mode === "blackhole") { entry.outcome = "held"; this.held.add(res); return; }
        const upstream = http.request({ host: "127.0.0.1", port: this.targetPort, method: req.method, path: req.url,
          headers: { ...req.headers, host: `127.0.0.1:${this.targetPort}` } }, (answer) => {
          const parts: Buffer[] = [];
          answer.on("data", (chunk: Buffer) => parts.push(chunk));
          answer.on("end", () => {
            const text = Buffer.concat(parts).toString("utf8");
            entry.status = answer.statusCode; entry.outcome = "forwarded";
            try { entry.answer = JSON.parse(text); } catch { entry.answer = text; }
            res.writeHead(answer.statusCode ?? 502, answer.headers); res.end(text);
          });
        });
        upstream.on("error", (error) => { entry.outcome = `upstream error: ${error.message}`; res.socket?.destroy(); });
        upstream.end(raw);
      });
    });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(this.port, "127.0.0.1", () => resolve()); });
    this.server = server;
  }
  /** Releases held requests (their callers already gave up) and stops listening: the address refuses connections. */
  async close(): Promise<void> {
    this.releaseHeld();
    const server = this.server;
    this.server = null;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  releaseHeld(): void { for (const res of this.held) res.socket?.destroy(); this.held.clear(); }
}

/** The web's check of a root view stream: every sequenced frame continues the snapshot's sequence contiguously. */
const sequenceCheck = (frames: readonly Frame[], snapshotType: string) => {
  const baseOf = (frame: Frame) => objectsIn(frame.payload).map((record) => record.base_change_sequence).find((value) => typeof value === "number") as number | undefined;
  let next = NaN; let sequenced = 0; const gaps: Rec[] = []; const snapshots: number[] = [];
  for (const frame of frames) {
    if (frame.type === snapshotType) { const base = baseOf(frame) ?? 0; snapshots.push(base); next = base + 1; continue; }
    const first = frame.payload?.change_sequence;
    if (typeof first !== "number" || Number.isNaN(next)) continue;
    const through = typeof frame.payload.change_sequence_through === "number" ? frame.payload.change_sequence_through : first;
    if (first !== next) gaps.push({ type: frame.type, expected: next, received: first });
    next = through + 1; sequenced += 1;
  }
  return { snapshots, sequenced, lastSequence: next - 1, gaps, errorFrames: frames.filter((frame) => frame.type === "ERROR").map((frame) => frame.payload) };
};

suite("Remote collaboration slice 1 between two real server processes (scripted AGY runtime, capturing proxies)", () => {
  let root = "";
  let alpha!: NodeServer, beta!: NodeServer, toBeta!: CapturingProxy, toAlpha!: CapturingProxy;
  const captured: Captured[] = [];
  const sockets: WebSocket[] = [];
  const evidence: Rec = { cases: {} };
  const ids: Rec = {};
  const record = (caseId: string, value: Rec) => { evidence.cases[caseId] = { ...(evidence.cases[caseId] ?? {}), ...value }; };
  const remoteRequests = (since = 0) => captured.filter((entry) => entry.seq > since && entry.path.startsWith("/rest/remote/"));

  const connect = async (node: NodeServer, route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://127.0.0.1:${node.port}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    let closed: { code: number; at: number } | null = null;
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    socket.on("close", (code: number) => { closed = { code, at: Date.now() }; });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => ready(frames), `${node.name} ${route}/${id} ready`, 30_000);
    return { socket, frames, closed: () => closed };
  };

  /** An agent run that the test drives like its user: composer messages in, its conversation out. */
  type Actor = { node: NodeServer; label: string; runId: string; conversation(): Promise<unknown>; send(content: string): Promise<void> };
  const standaloneActor = (node: NodeServer, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation,
    send: async (content) => {
      const channel = await connect(node, "agent", runId, (frames) => frames.some((frame) => frame.type === "CONNECTED"));
      channel.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    },
  });
  const teamActor = (node: NodeServer, teamRunId: string, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: teamRunId, a: runId })).getTeamMemberRunProjection?.conversation,
    send: async (content) => {
      const view = await connect(node, "agent-team", teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
      view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    },
  });
  const orgActor = (node: NodeServer, orgRunId: string, address: string, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
      { id: orgRunId, a: runId, m: address })).getAgentOrgMemberRunProjection?.conversation,
    send: async (content) => {
      const view = await connect(node, "agent-org", orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
      view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: runId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
    },
  });
  /** The actor calls one actual agent tool; returns the tool result it reports and how long the call took. */
  const calls = async (actor: Actor, name: string, args: Rec, ms = 90_000): Promise<Rec & { elapsedMs: number }> => {
    const before = calledResults(await actor.conversation()).length;
    const started = Date.now();
    await actor.send(callTool(name, args));
    let results: string[] = [];
    await until(async () => { results = calledResults(await actor.conversation()); return results.length > before; },
      `${actor.label} result of ${name} ${JSON.stringify(args).slice(0, 160)}`, ms)
      .catch(async (error) => { throw new Error(`${error}; conversation tail: ${JSON.stringify(stringsOf(await actor.conversation()).slice(-6)).slice(0, 1500)}`); });
    return { ...toolResult(results[before]!), elapsedMs: Date.now() - started };
  };
  /** The string of the actor's conversation that holds `marker` (a message it received). */
  const receives = async (actor: Actor, marker: string, ms = 60_000): Promise<string> => {
    let found: string | undefined;
    await until(async () => Boolean(found = stringsOf(await actor.conversation()).find((value) => value.includes(marker) && !value.includes("CALL_TOOL"))),
      `${actor.label} receives ${marker}`, ms);
    return found!;
  };
  const neverReceives = async (actor: Actor, marker: string, ms = 5_000) => {
    await wait(ms);
    expect(stringsOf(await actor.conversation()).filter((value) => value.includes(marker) && !value.includes("CALL_TOOL")), `${actor.label} must not receive ${marker}`).toEqual([]);
  };
  /** Every message-log line (any `*communication_messages*.jsonl` under the node's memory) with this message ID. */
  const logLines = async (node: NodeServer, messageId: string) => (await walkFiles(node.memory))
    .filter((file) => /communication_messages.*\.jsonl$/.test(file))
    .flatMap((file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => ({ file: path.relative(node.dataDir, file), line: JSON.parse(line) as Rec })))
    .filter((entry) => entry.line.messageId === messageId);
  const messageIdOf = async (node: NodeServer, content: string) => {
    let id: string | undefined;
    await until(async () => Boolean(id = (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file))
      .flatMap((file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec))
      .find((line) => line.content === content)?.messageId), `${node.name} log line for ${content}`, 20_000);
    return id!;
  };
  /** Each message once in the delegating node's log and once in the receiving node's log, under one message ID (CM-9). */
  const assertBothLogs = async (content: string, from: Actor, to: Actor) => {
    const messageId = await messageIdOf(from.node, content);
    const fromLines = await logLines(from.node, messageId);
    let toLines: Awaited<ReturnType<typeof logLines>> = [];
    await until(async () => (toLines = await logLines(to.node, messageId)).length > 0, `${to.node.name} log of ${messageId}`, 20_000);
    expect(fromLines, `${from.node.name} log of ${content}`).toHaveLength(1);
    expect(toLines, `${to.node.name} log of ${content}`).toHaveLength(1);
    for (const { line } of [...fromLines, ...toLines]) {
      expect(line).toMatchObject({ messageId, senderAgentRunId: from.runId, receiverAgentRunId: to.runId, content });
      expect(sortedKeys(line)).toEqual(["content", "createdAt", "messageId", "messageType", "receiverAgentRunId", "referenceFiles", "senderAgentRunId"]);
    }
    return { messageId, files: { [from.node.name]: fromLines[0]!.file, [to.node.name]: toLines[0]!.file } };
  };
  const remoteRunDirs = async () => (await fsp.readdir(path.join(beta.memory, "agents")).catch(() => [] as string[])).sort();
  const betaMetadata = (runId: string) => readJson(path.join(beta.memory, "agents", runId, "run_metadata.json"));
  const taskResourcesWith = async (node: NodeServer, runId: string) => {
    const files = (await walkFiles(node.dataDir)).filter((file) => file.endsWith("agent_run_resources.json"));
    const out: Array<{ file: string; entry: Rec }> = [];
    for (const file of files) {
      for (const entry of objectsIn(await readJson(file))) {
        if (entry.agentRun?.agentRunId === runId) out.push({ file: path.relative(node.dataDir, file), entry });
      }
    }
    return out;
  };
  const remoteLinksIn = (tree: Rec | undefined) => ((tree?.taskExecutions ?? []) as Rec[]).filter((entry) => typeof entry.nodeId === "string");

  // Definitions and runs.
  const agentDefinition = async (node: NodeServer, name: string, toolNames: string[] = []) => (await node.gql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (remote collaboration E2E)`, instructions: "Follow the user's request.", toolNames } })).createAgentDefinition.id as string;
  const runConfig = (node: NodeServer) => ({ workspaceRootPath: node.workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const createStandalone = async (node: NodeServer, definitionId: string, label: string) => {
    const created = (await node.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, ...runConfig(node) } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return standaloneActor(node, created.runId as string, label);
  };
  const delegateRemote = (actor: Actor, description: string, extra: Rec = {}) =>
    calls(actor, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description, ...extra });
  const composeOnBeta = (remoteRunId: string) => standaloneActor(beta, remoteRunId, `beta remote run ${remoteRunId}`);

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "remote-collab-two-server-")));
    const [alphaPort, betaPort, toBetaPort, toAlphaPort] = [await getFreePort(), await getFreePort(), await getFreePort(), await getFreePort()];
    alpha = new NodeServer("alpha", root, alphaPort);
    beta = new NodeServer("beta", root, betaPort);
    toBeta = new CapturingProxy("toBeta", toBetaPort, betaPort, captured);
    toAlpha = new CapturingProxy("toAlpha", toAlphaPort, alphaPort, captured);
    await Promise.all([alpha.start(), beta.start(), toBeta.open(), toAlpha.open()]);
    expect(alpha.nodeId).not.toBe(beta.nodeId);
    evidence.nodes = { alpha: { nodeId: alpha.nodeId, port: alpha.port, peerUrlOnBeta: toAlpha.url }, beta: { nodeId: beta.nodeId, port: beta.port, peerUrlOnAlpha: toBeta.url } };
    // Canary provider keys on both nodes (AC-111: they must never appear between the nodes).
    for (const [node, key] of [[alpha, CANARY.alpha], [beta, CANARY.beta]] as const) {
      const saved = await node.gqlRaw(`mutation($k:String!){saveProviderApiKey(providerId:"OPENAI",apiKey:$k){apiKeyConfigured}}`, { k: key });
      evidence.nodes[node.name].canaryKeySaved = saved.data?.saveProviderApiKey?.apiKeyConfigured === true ? true : JSON.stringify(saved.errors);
    }
    ids.delegator = await agentDefinition(alpha, "Delegator", ["create_task", "update_task"]);
    ids.manager = await agentDefinition(alpha, "Remote Manager", ["list_projects", "list_project_tasks", "create_task", "update_task"]);
    ids.worker = await agentDefinition(alpha, "Remote Worker");
    ids.team = (await alpha.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: "Remote Squad", description: "Team delegator", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.delegator, refScope: "SHARED" }, { memberName: "mate", ref: ids.delegator, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    ids.org = (await alpha.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "Remote Org", description: "Org delegator", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "lead", ref: ids.delegator, refType: "AGENT", refScope: "SHARED" },
        { memberName: "mate", ref: ids.delegator, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
    ids.publisher = await agentDefinition(beta, "Publisher");
    ids.fragile = await agentDefinition(beta, "Fragile");
    ids.bystander = await agentDefinition(beta, "Bystander");
  }, 240_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    await Promise.all([alpha?.stop(), beta?.stop()].filter(Boolean)).catch((error) => errors.push(String(error)));
    await Promise.all([toBeta?.close(), toAlpha?.close()].filter(Boolean)).catch((error) => errors.push(String(error)));
    await wait(1_000);
    const leftover = root ? (await liveAgyCwds()).filter((cwd) => cwd.startsWith(root)) : [];
    if (leftover.length) errors.push(`live AGY processes after both servers stopped: ${leftover.join(", ")}`);
    const dir = process.env["REMOTE_E2E_EVIDENCE_DIR"];
    if (dir && root) {
      await fsp.mkdir(dir, { recursive: true });
      for (const node of [alpha, beta]) await fsp.copyFile(node.logFile, path.join(dir, `remote-two-server-${node.name}-server.log`)).catch(() => undefined);
      evidence.captured = captured;
    }
    // Diagnostics: `REMOTE_E2E_KEEP_DATA_DIR` keeps a copy of both nodes' data roots (test-owned temp data only).
    const keep = process.env["REMOTE_E2E_KEEP_DATA_DIR"];
    if (keep && root) for (const node of [alpha, beta]) await fsp.cp(node.dataDir, path.join(keep, node.name), { recursive: true }).catch((error) => errors.push(String(error)));
    if (root) await fsp.rm(root, { recursive: true, force: true });
    if (dir && root) {
      evidence.cleanup = { rootRemoved: !fs.existsSync(root), serversStopped: [alpha, beta].every((node) => node.child?.exitCode !== null), leftoverAgy: leftover, errors };
      await fsp.writeFile(path.join(dir, "remote-two-server-receipt.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  const inboundStart = (fromNodeId: string, toNodeId: string) => ({ fromNodeId, toNodeId, publishedAddress: "/publisher",
    delegator: { agentRunId: "agent_probe" }, coordinatingRun: { kind: "agent", runId: "agent_probe" } });
  const inboundMessage = (fromNodeId: string, toNodeId: string, messageId: string) => ({ fromNodeId, toNodeId, kind: "message", messageId,
    sender: { agentRunId: "agent_probe" }, target: { agentRunId: "agent_probe_target" }, content: "x", messageType: "agent_message", createdAt: new Date().toISOString() });

  it("RC-01 AC-101/AC-111: off by default; with the switch off, both inbound request kinds are refused 'turned off' and no peer can be added", async () => {
    for (const node of [alpha, beta]) {
      expect((await node.gql(`query{remoteCollaborationCapability{enabled settingKey source}}`)).remoteCollaborationCapability)
        .toEqual({ enabled: false, settingKey: "ENABLE_REMOTE_COLLABORATION", source: "DEFAULT_DISABLED" });
      expect(fs.readFileSync(path.join(node.dataDir, ".env"), "utf8")).not.toMatch(/ENABLE_REMOTE_COLLABORATION/);
    }
    const start = await beta.post(PATHS.runs, inboundStart(alpha.nodeId, beta.nodeId));
    const message = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_off"));
    for (const answer of [start, message]) expect(answer).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "REMOTE_COLLABORATION_OFF", message: "Remote collaboration is turned off on this node." } });
    const addWhileOff = await alpha.gqlRaw(`mutation($input:AddPeerNodeInput!){addPeerNode(input:$input){nodeId}}`, { input: { baseUrl: toBeta.url, name: LABEL.beta } });
    expect(addWhileOff.errors?.[0]?.message, JSON.stringify(addWhileOff)).toBeTruthy();
    expect(captured, "nothing contacted the peer").toEqual([]);
    expect(fs.existsSync(path.join(alpha.dataDir, "remote-collaboration", "peers.json")) ? (await readJson(path.join(alpha.dataDir, "remote-collaboration", "peers.json"))).peers : [], "nothing recorded").toEqual([]);
    record("RC-01", { inbound: { start, message }, addWhileOff: addWhileOff.errors?.[0] });
  }, 120_000);

  it("RC-02 AC-101: on a fresh node with the switch off, delegate_task naming a peer is refused 'turned off' and nothing is sent", async () => {
    const solo = await createStandalone(alpha, ids.delegator, "alpha standalone delegator");
    ids.solo = solo.runId;
    const before = captured.length;
    const off = await delegateRemote(solo, "Never sent.");
    expect(off.delegated, JSON.stringify(off)).toBe(false);
    expect(textOf(off)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(captured.length, "nothing sent with the switch off").toBe(before);
    record("RC-02", { delegateOff: textOf(off) });
  }, 120_000);

  it("RC-03 AC-101/102/103/111: switched on, both nodes register each other with pinned identities; bad URLs record nothing; the gateway admits in order; publishing records launch settings", async () => {
    for (const node of [alpha, beta]) {
      expect((await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled source}}`)).setRemoteCollaborationEnabled).toEqual({ enabled: true, source: "SERVER_SETTING" });
      expect(fs.readFileSync(path.join(node.dataDir, ".env"), "utf8")).toMatch(/^ENABLE_REMOTE_COLLABORATION=true$/m);
    }
    // After turning it on, the same inbound requests are evaluated normally: the caller is not registered yet.
    const unregisteredCaller = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_unregistered"));
    expect(unregisteredCaller).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "PEER_NOT_REGISTERED", message: "The calling node is not a registered peer of this node." } });
    const statusBefore = captured.length;
    const added = (await alpha.gql(`mutation($input:AddPeerNodeInput!){addPeerNode(input:$input){nodeId name baseUrl addedAt}}`,
      { input: { baseUrl: toBeta.url, name: LABEL.beta } })).addPeerNode;
    expect(added).toMatchObject({ nodeId: beta.nodeId, name: LABEL.beta, baseUrl: toBeta.url });
    const addedOnBeta = (await beta.gql(`mutation($input:AddPeerNodeInput!){addPeerNode(input:$input){nodeId name baseUrl addedAt}}`,
      { input: { baseUrl: toAlpha.url, name: LABEL.alpha } })).addPeerNode;
    expect(addedOnBeta).toMatchObject({ nodeId: alpha.nodeId, name: LABEL.alpha, baseUrl: toAlpha.url });
    expect(captured.slice(statusBefore).map((entry) => `${entry.via} ${entry.method} ${entry.path}`)).toEqual([`toBeta GET ${PATHS.status}`, `toAlpha GET ${PATHS.status}`]);

    // A URL that answers but is not an AutoByteus node, and a URL nothing listens on.
    // A web page (a router's admin page) and a web server without the route (404) are reached but are not AutoByteus nodes.
    const foreign = http.createServer((req, res) => {
      if (req.headers.host?.endsWith(":404") || req.url?.includes("missing")) { res.writeHead(404, { "content-type": "text/html" }); res.end("<html>Not Found</html>"); return; }
      res.writeHead(200, { "content-type": "text/html" }); res.end("<html>router admin</html>");
    });
    const foreignPort = await getFreePort();
    await new Promise<void>((resolve) => foreign.listen(foreignPort, "127.0.0.1", () => resolve()));
    const addPeer = (baseUrl: string, name: string) => alpha.gqlRaw(`mutation($input:AddPeerNodeInput!){addPeerNode(input:$input){nodeId}}`, { input: { baseUrl, name } });
    const notAutobyteus = await addPeer(`http://127.0.0.1:${foreignPort}`, "router");
    const notFound = await addPeer(`http://127.0.0.1:${foreignPort}/missing`, "web");
    await new Promise<void>((resolve) => foreign.close(() => resolve()));
    const dead = await addPeer(`http://127.0.0.1:${await getFreePort()}`, "nowhere");
    for (const [refused, url] of [[notAutobyteus, `http://127.0.0.1:${foreignPort}`], [notFound, `http://127.0.0.1:${foreignPort}/missing`]] as const) {
      expect(refused.errors?.[0]?.message, JSON.stringify(refused)).toBeTruthy();
      expect.soft(refused.errors?.[0], `${url} is reached but is not an AutoByteus node`).toMatchObject({ message: `${url} is not an AutoByteus node.`, extensions: { code: "PEER_NOT_AUTOBYTEUS" } });
    }
    expect(dead.errors?.[0]?.extensions?.code, JSON.stringify(dead)).toBe("PEER_UNREACHABLE");
    expect(dead.errors?.[0]?.message).toMatch(/could not be reached/);

    // Rename (the agents' `node` follows the label) and back.
    expect((await alpha.gql(`mutation($id:String!,$n:String!){renamePeerNode(nodeId:$id,name:$n){name}}`, { id: beta.nodeId, n: "beta-renamed" })).renamePeerNode.name).toBe("beta-renamed");
    expect((await alpha.gql(`mutation($id:String!,$n:String!){renamePeerNode(nodeId:$id,name:$n){name}}`, { id: beta.nodeId, n: LABEL.beta })).renamePeerNode.name).toBe(LABEL.beta);

    for (const [node, peer, url, label] of [[alpha, beta, toBeta.url, LABEL.beta], [beta, alpha, toAlpha.url, LABEL.alpha]] as const) {
      const listed = (await node.gql(`query{peerNodes{nodeId name baseUrl addedAt}}`)).peerNodes as Rec[];
      expect(listed.map(({ nodeId, name, baseUrl }) => ({ nodeId, name, baseUrl }))).toEqual([{ nodeId: peer.nodeId, name: label, baseUrl: url }]);
      const file = await readJson(path.join(node.dataDir, "remote-collaboration", "peers.json"));
      expect(sortedKeys(file)).toEqual(["peers"]);
      expect(file.peers).toHaveLength(1);
      expect(sortedKeys(file.peers[0])).toEqual(["addedAt", "baseUrl", "name", "nodeId"]);
      expect(file.peers[0]).toMatchObject({ nodeId: peer.nodeId, name: label, baseUrl: url });
    }
    // The single gateway entry of each request kind applies its checks in order (REQ-114): toNodeId, then the caller.
    const wrongTo = "srv_someone_else_000000000000000000000";
    const mismatchStart = await beta.post(PATHS.runs, inboundStart(alpha.nodeId, wrongTo));
    const mismatchMessage = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, wrongTo, "collabmsg_wrong_to"));
    for (const answer of [mismatchStart, mismatchMessage]) expect(answer).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "PEER_IDENTITY_MISMATCH", message: "This request was meant for another node." } });
    const unregisteredStart = await beta.post(PATHS.runs, inboundStart("srv_unregistered_00000000000000000000000", beta.nodeId));
    expect(unregisteredStart).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "PEER_NOT_REGISTERED", message: "The calling node is not a registered peer of this node." } });
    const malformedStart = await beta.post(PATHS.runs, { fromNodeId: alpha.nodeId });
    const malformedMessage = await beta.post(PATHS.messages, { ...inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_bad"), kind: "command" });
    for (const answer of [malformedStart, malformedMessage]) {
      expect(answer.status).toBe(400);
      expect(answer.answer).toMatchObject({ accepted: false, nodeId: beta.nodeId, code: "REMOTE_REQUEST_INVALID" });
    }

    // Publishing (REQ-103): launch settings are checked when published; the address is derived, never stored.
    const fragileWorkspace = path.join(root, "beta", "fragile-workspace");
    await fsp.mkdir(fragileWorkspace);
    const missingWorkspace = await beta.gqlRaw(`mutation($input:PublishedAgentInput!){publishAgent(input:$input){address}}`,
      { input: { agentDefinitionId: ids.fragile, ...runConfig(beta), workspaceRootPath: path.join(root, "beta", "no-such-folder") } });
    const unknownModel = await beta.gqlRaw(`mutation($input:PublishedAgentInput!){publishAgent(input:$input){address}}`,
      { input: { agentDefinitionId: ids.fragile, ...runConfig(beta), workspaceRootPath: fragileWorkspace, llmModelIdentifier: "no-such-model" } });
    for (const refused of [missingWorkspace, unknownModel]) expect(refused.errors?.[0]?.message, JSON.stringify(refused)).toBeTruthy();
    expect(fs.existsSync(path.join(beta.dataDir, "remote-collaboration", "published-agents.json"))
      ? (await readJson(path.join(beta.dataDir, "remote-collaboration", "published-agents.json"))).publishedAgents : [], "refused launch settings record nothing").toEqual([]);
    const published = (await beta.gql(`mutation($input:PublishedAgentInput!){publishAgent(input:$input){agentDefinitionId definitionName address runtimeKind llmModelIdentifier workspaceRootPath autoExecuteTools}}`,
      { input: { agentDefinitionId: ids.fragile, ...runConfig(beta), workspaceRootPath: fragileWorkspace } })).publishAgent as Rec[];
    expect(published).toEqual([{ agentDefinitionId: ids.fragile, definitionName: "Fragile", address: "/fragile", runtimeKind: "antigravity_cli",
      llmModelIdentifier: MODEL, workspaceRootPath: fragileWorkspace, autoExecuteTools: true }]);
    const publishedFile = await readJson(path.join(beta.dataDir, "remote-collaboration", "published-agents.json"));
    expect(sortedKeys(publishedFile)).toEqual(["publishedAgents"]);
    expect(sortedKeys(publishedFile.publishedAgents[0])).toEqual(["agentDefinitionId", "autoExecuteTools", "llmConfig", "llmModelIdentifier", "publishedAt", "runtimeKind", "workspaceRootPath"]);
    expect((await beta.gql(`mutation($id:String!){unpublishAgent(agentDefinitionId:$id){address}}`, { id: ids.fragile })).unpublishAgent).toEqual([]);
    expect((await readJson(path.join(beta.dataDir, "remote-collaboration", "published-agents.json"))).publishedAgents).toEqual([]);
    expect((await alpha.gql(`query{publishedAgents{address}}`)).publishedAgents, "nothing is published by default").toEqual([]);
    record("RC-03", { unregisteredCaller, alphaPeers: await readJson(path.join(alpha.dataDir, "remote-collaboration", "peers.json")),
      betaPeers: await readJson(path.join(beta.dataDir, "remote-collaboration", "peers.json")),
      notAutobyteus: notAutobyteus.errors?.[0], notFound: notFound.errors?.[0], dead: dead.errors?.[0],
      gateway: { mismatchStart, mismatchMessage, unregisteredStart, malformedStart, malformedMessage },
      publishRefusals: { missingWorkspace: missingWorkspace.errors?.[0], unknownModel: unknownModel.errors?.[0] }, published, publishedFile });
  }, 120_000);

  it("RC-04 AC-103: before publishing a delegation is refused; after publishing it is evaluated; an Agent that cannot run there is refused; refusals leave nothing", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const runsBefore = await remoteRunDirs();
    const notPublished = await delegateRemote(solo, "Before publishing.");
    expect(textOf(notPublished)).toBe(`Node "${LABEL.beta}" has no published Agent at that address.`);

    const published = (await beta.gql(`mutation($input:PublishedAgentInput!){publishAgent(input:$input){agentDefinitionId definitionName address runtimeKind llmModelIdentifier workspaceRootPath autoExecuteTools}}`,
      { input: { agentDefinitionId: ids.publisher, ...runConfig(beta) } })).publishAgent as Rec[];
    expect(published).toEqual([{ agentDefinitionId: ids.publisher, definitionName: "Publisher", address: "/publisher", runtimeKind: "antigravity_cli",
      llmModelIdentifier: MODEL, workspaceRootPath: beta.workspace, autoExecuteTools: true }]);

    // A published Agent whose workspace folder was removed afterwards cannot run there.
    const fragileWorkspace = path.join(root, "beta", "fragile-workspace");
    await fsp.mkdir(fragileWorkspace, { recursive: true });
    await beta.gql(`mutation($input:PublishedAgentInput!){publishAgent(input:$input){address}}`,
      { input: { agentDefinitionId: ids.fragile, ...runConfig(beta), workspaceRootPath: fragileWorkspace } });
    await fsp.rm(fragileWorkspace, { recursive: true });
    const cannotRun = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/fragile", description: "Cannot run." });
    expect(cannotRun.delegated, JSON.stringify(cannotRun)).toBe(false);
    expect(textOf(cannotRun)).toMatch(new RegExp(`^The published Agent on node "${LABEL.beta}" cannot run there: `));
    await beta.gql(`mutation($id:String!){unpublishAgent(agentDefinitionId:$id){address}}`, { id: ids.fragile });

    expect(await remoteRunDirs(), "nothing started on beta").toEqual(runsBefore);
    expect(remoteLinksIn(await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json")).catch(() => ({}))), "no link on alpha").toEqual([]);
    expect(await taskResourcesWith(alpha, "agent_x_none")).toEqual([]);
    const refusals = remoteRequests().filter((entry) => entry.path === PATHS.runs).map((entry) => (entry.answer as Rec)?.code);
    expect(refusals).toEqual(["AGENT_NOT_PUBLISHED", "PUBLISHED_AGENT_CANNOT_RUN"]);
    record("RC-04", { notPublished: textOf(notPublished), published, cannotRun: textOf(cannotRun) });
  }, 180_000);

  it("RC-05 AC-104/105: a standalone delegator delegates to Publisher on beta and the two runs message each other both ways (view open)", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const view = await connect(alpha, "agent-collaboration", ids.solo, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const delegated = await delegateRemote(solo, "Publish the draft. Marker STANDALONE-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent", node: LABEL.beta });
    const r1 = delegated.target_agent_run_id as string;
    ids.r1 = r1; ids.r1Task = delegated.task_id;
    const remote = composeOnBeta(r1);

    // On beta: an ordinary standalone run of Publisher with the published launch settings and its back-link.
    const metadata = await betaMetadata(r1);
    expect(metadata).toMatchObject({ runId: r1, agentDefinitionId: ids.publisher, workspaceRootPath: beta.workspace, llmModelIdentifier: MODEL,
      autoExecuteTools: true, runtimeKind: "antigravity_cli" });
    expect(metadata.delegatedFrom).toEqual({ nodeId: alpha.nodeId, coordinatingRun: { kind: "agent", runId: ids.solo }, delegatorAgentRunId: ids.solo });
    expect(metadata.taskAgent, "a remote run is not a task agent's own file").toBeUndefined();
    const packet = await receives(remote, "STANDALONE-PACKET");
    expect(packet).toContain(`You have a new task from the agent with sender run id "${ids.solo}" on node "${LABEL.alpha}".`);
    expect((await beta.launches()).some((launch) => launch.cwd.includes(r1) && launch.argv.includes(MODEL))).toBe(true);

    // On alpha: the link in the delegator's tree (exact keys) and the Task record of the remote run.
    const tree = await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json"));
    const links = remoteLinksIn(tree);
    expect(links).toEqual([{ address: "/publisher", agentRunId: r1, nodeId: beta.nodeId, delegatorAgentRunId: ids.solo, startedAt: expect.any(String) }]);
    expect(sortedKeys(links[0]!)).toEqual(["address", "agentRunId", "delegatorAgentRunId", "nodeId", "startedAt"]);
    const resources = await taskResourcesWith(alpha, r1);
    expect(resources, JSON.stringify(resources)).toHaveLength(1);
    expect(resources[0]!.entry).toMatchObject({ role: "assigned", hostRoot: { kind: "agent", runId: ids.solo }, agentRun: { kind: "agent", agentRunId: r1 }, start: "started" });
    expect(fs.existsSync(path.join(alpha.memory, "agents", r1)), "no folder for the remote run on alpha").toBe(false);

    // Reply from beta (its owner asks the remote run to answer), then a follow-up from alpha.
    const reply = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "REPLY-FROM-BETA-1" });
    expect(reply, JSON.stringify(reply)).toMatchObject({ accepted: true });
    expect(textOf(reply)).toContain(`on node "${LABEL.alpha}"`);
    const received = await receives(solo, "REPLY-FROM-BETA-1");
    expect(received).toContain(`You received a message from the agent with sender run id "${r1}" on node "${LABEL.beta}".`);
    const followUp = await calls(solo, "send_message_to", { target_agent_run_id: r1, content: "FOLLOWUP-FROM-ALPHA-1" });
    expect(followUp, JSON.stringify(followUp)).toMatchObject({ accepted: true });
    expect(textOf(followUp)).toBe(`Delivered message to ${r1} on node "${LABEL.beta}".`);
    const atBeta = await receives(remote, "FOLLOWUP-FROM-ALPHA-1");
    expect(atBeta).toContain(`You received a message from the agent with sender run id "${ids.solo}" on node "${LABEL.alpha}".`);

    const replyLogs = await assertBothLogs("REPLY-FROM-BETA-1", remote, solo);
    const followUpLogs = await assertBothLogs("FOLLOWUP-FROM-ALPHA-1", solo, remote);
    expect(replyLogs.files).toEqual({ beta: `memory/agents/${r1}/collaboration/communication_messages_active.jsonl`, alpha: `memory/agents/${ids.solo}/collaboration/communication_messages_active.jsonl` });
    await wait(2_000);
    const sequences = sequenceCheck(view.frames, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(view.closed(), "the view stream stays open").toBeNull();
    // Every request kind of the contract was exchanged, so RC-20 audits each of them.
    const kinds = new Set(remoteRequests().filter((entry) => entry.status === 200).map((entry) => entry.path === PATHS.runs ? "start"
      : (entry.body as Rec).kind === "work_packet" ? "work_packet" : `message ${entry.via}`));
    expect([...kinds].sort()).toEqual(["message toAlpha", "message toBeta", "start", "work_packet"]);
    record("RC-05", { delegated, metadata, packet, link: links[0], taskResource: resources[0], reply, received, followUp, atBeta, replyLogs, followUpLogs, sequences });
  }, 240_000);

  it("RC-06 AC-104/105/107: a Team coordinator delegates; messages both ways with the Team view open; a later local message appears; the other member is not permitted", async () => {
    const created = (await alpha.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...runConfig(alpha) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: ids.delegator, ...runConfig(alpha) },
        { memberAddress: "/mate", agentDefinitionId: ids.delegator, ...runConfig(alpha) }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const members = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    ids.team = { teamRunId, lead: members["/lead"], mate: members["/mate"] };
    const lead = teamActor(alpha, teamRunId, members["/lead"]!, "alpha team lead");
    const mate = teamActor(alpha, teamRunId, members["/mate"]!, "alpha team mate");
    const view = await connect(alpha, "agent-team", teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));

    const delegated = await delegateRemote(lead, "Team work. Marker TEAM-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
    const r2 = delegated.target_agent_run_id as string;
    ids.team.r2 = r2;
    const remote = composeOnBeta(r2);
    expect((await betaMetadata(r2)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, coordinatingRun: { kind: "agent_team", runId: teamRunId }, delegatorAgentRunId: lead.runId });
    expect(await receives(remote, "TEAM-PACKET")).toContain(`sender run id "${lead.runId}" on node "${LABEL.alpha}"`);
    expect(await calls(remote, "send_message_to", { target_agent_run_id: lead.runId, content: "REPLY-TO-TEAM-LEAD" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "REPLY-TO-TEAM-LEAD")).toContain(`sender run id "${r2}" on node "${LABEL.beta}"`);
    expect(await calls(lead, "send_message_to", { target_agent_run_id: r2, content: "FOLLOWUP-FROM-TEAM-LEAD" })).toMatchObject({ accepted: true });
    await receives(remote, "FOLLOWUP-FROM-TEAM-LEAD");
    const replyLogs = await assertBothLogs("REPLY-TO-TEAM-LEAD", remote, lead);
    await assertBothLogs("FOLLOWUP-FROM-TEAM-LEAD", lead, remote);
    expect(replyLogs.files.alpha).toBe(`memory/agent_teams/${teamRunId}/team_communication_messages_active.jsonl`);

    // A local message after the remote exchange still reaches the view.
    expect(await calls(lead, "send_message_to", { target_agent_run_id: mate.runId, content: "LOCAL-AFTER-REMOTE-TEAM" })).toMatchObject({ accepted: true });
    await receives(mate, "LOCAL-AFTER-REMOTE-TEAM");
    await until(() => view.frames.some((frame) => frame.type === "TEAM_COMMUNICATION_MESSAGE" && JSON.stringify(frame.payload).includes("LOCAL-AFTER-REMOTE-TEAM")), "local message on the Team view", 20_000);

    // Same root, not the delegator: refused by the pair rule; nothing sent.
    const sentBefore = remoteRequests().length;
    const notPermitted = await calls(mate, "send_message_to", { target_agent_run_id: r2, content: "MATE-TO-REMOTE" });
    expect(notPermitted.accepted, JSON.stringify(notPermitted)).toBe(false);
    expect(textOf(notPermitted)).toBe("That run is on another node and is not linked with you: only the agent that delegated to it, and the run itself, can message each other. The message was not sent.");
    expect(remoteRequests().length).toBe(sentBefore);
    await neverReceives(remote, "MATE-TO-REMOTE", 2_000);

    const tree = await readJson(path.join(alpha.memory, "agent_teams", teamRunId, "team_run_execution_tree.json"));
    expect(remoteLinksIn(tree.rootTeam)).toEqual([{ address: "/publisher", agentRunId: r2, nodeId: beta.nodeId, delegatorAgentRunId: lead.runId, startedAt: expect.any(String) }]);
    const sequences = sequenceCheck(view.frames, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(view.closed(), "the Team view stays open").toBeNull();
    const remoteInView = view.frames.filter((frame) => frame.type === "TEAM_COMMUNICATION_MESSAGE" && JSON.stringify(frame.payload).includes(r2));
    expect(remoteInView, "remote-endpoint messages are not on the Team view").toEqual([]);
    record("RC-06", { teamRunId, delegated, link: remoteLinksIn(tree.rootTeam)[0], replyLogs, notPermitted: textOf(notPermitted), sequences, frameTypes: view.frames.map((frame) => frame.type) });
  }, 300_000);

  it("RC-07 AC-104/105: an Org member delegates; messages both ways with the Org view open; a later local message appears", async () => {
    const created = (await alpha.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: ids.org, rootConfiguration: runConfig(alpha), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const orgTree = (await alpha.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const member = (address: string) => (orgTree.rootOrg.members as Rec[]).find((entry) => entry.address === address)!.agentRunId as string;
    ids.org = { orgRunId, lead: member("/lead"), mate: member("/mate") };
    const lead = orgActor(alpha, orgRunId, "/lead", ids.org.lead, "alpha org lead");
    const mate = orgActor(alpha, orgRunId, "/mate", ids.org.mate, "alpha org mate");
    const view = await connect(alpha, "agent-org", orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));

    const delegated = await delegateRemote(lead, "Org work. Marker ORG-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
    const r5 = delegated.target_agent_run_id as string;
    ids.org.r5 = r5;
    const remote = composeOnBeta(r5);
    expect((await betaMetadata(r5)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, coordinatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: lead.runId });
    await receives(remote, "ORG-PACKET");
    expect(await calls(remote, "send_message_to", { target_agent_run_id: lead.runId, content: "REPLY-TO-ORG-LEAD" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "REPLY-TO-ORG-LEAD")).toContain(`sender run id "${r5}" on node "${LABEL.beta}"`);
    expect(await calls(lead, "send_message_to", { target_agent_run_id: r5, content: "FOLLOWUP-FROM-ORG-LEAD" })).toMatchObject({ accepted: true });
    await receives(remote, "FOLLOWUP-FROM-ORG-LEAD");
    const replyLogs = await assertBothLogs("REPLY-TO-ORG-LEAD", remote, lead);
    await assertBothLogs("FOLLOWUP-FROM-ORG-LEAD", lead, remote);

    expect(await calls(lead, "send_message_to", { target_agent_run_id: mate.runId, content: "LOCAL-AFTER-REMOTE-ORG" })).toMatchObject({ accepted: true });
    await receives(mate, "LOCAL-AFTER-REMOTE-ORG");
    await until(() => view.frames.some((frame) => frame.type !== "ROOT_EXECUTION_VIEW_SNAPSHOT" && JSON.stringify(frame.payload).includes("LOCAL-AFTER-REMOTE-ORG")), "local message on the Org view", 20_000);

    const tree = await readJson(path.join(alpha.memory, "agent_orgs", orgRunId, "agent_org_run_execution_tree.json"));
    expect(remoteLinksIn(tree.rootOrg)).toEqual([{ address: "/publisher", agentRunId: r5, nodeId: beta.nodeId, delegatorAgentRunId: lead.runId, startedAt: expect.any(String) }]);
    const sequences = sequenceCheck(view.frames, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(view.closed(), "the Org view stays open").toBeNull();
    record("RC-07", { orgRunId, delegated, link: remoteLinksIn(tree.rootOrg)[0], replyLogs, sequences, frameTypes: view.frames.map((frame) => frame.type) });
  }, 300_000);

  it("RC-08 AC-107: unlinked senders are refused on both nodes and the target receives nothing", async () => {
    const other = await createStandalone(alpha, ids.delegator, "alpha other root");
    ids.other = other.runId;
    const sentBefore = remoteRequests().length;
    const otherRoot = await calls(other, "send_message_to", { target_agent_run_id: ids.r1, content: "OTHER-ROOT-TO-REMOTE" });
    expect(otherRoot.accepted, JSON.stringify(otherRoot)).toBe(false);
    // Today's live-only refusal (design § Ownership Boundaries: a run ID that is neither local nor linked keeps it).
    expect(textOf(otherRoot)).toBe(liveOnlyRefusal(ids.r1));
    expect(remoteRequests().length, "the live-only path never reaches a peer").toBe(sentBefore);

    const bystander = await createStandalone(beta, ids.bystander, "beta bystander");
    ids.bystander = bystander.runId;
    const fromBystander = await calls(bystander, "send_message_to", { target_agent_run_id: ids.solo, content: "BYSTANDER-TO-ALPHA" });
    expect(fromBystander.accepted, JSON.stringify(fromBystander)).toBe(false);
    expect(textOf(fromBystander)).toBe(liveOnlyRefusal(ids.solo));
    expect(remoteRequests().length).toBe(sentBefore);

    // Requests a peer could send for runs that are not linked: refused at the receiving root, nothing written.
    const forged = (fromNodeId: string, toNodeId: string, sender: string, target: string, messageId: string, coordinatingRun?: Rec) => ({
      fromNodeId, toNodeId, kind: "message", messageId, sender: { agentRunId: sender }, target: { agentRunId: target }, ...(coordinatingRun ? { coordinatingRun } : {}),
      content: `FORGED ${messageId}`, messageType: "agent_message", createdAt: new Date().toISOString() });
    const toBystander = await beta.post(PATHS.messages, forged(alpha.nodeId, beta.nodeId, ids.solo, ids.bystander, "collabmsg_forged_bystander"));
    const toR1FromOther = await beta.post(PATHS.messages, forged(alpha.nodeId, beta.nodeId, ids.other, ids.r1, "collabmsg_forged_r1"));
    const toSoloFromBystander = await alpha.post(PATHS.messages, forged(beta.nodeId, alpha.nodeId, ids.bystander, ids.solo, "collabmsg_forged_solo", { kind: "agent", runId: ids.solo }));
    for (const answer of [toBystander, toR1FromOther, toSoloFromBystander]) {
      expect(answer.status).toBe(200);
      expect(answer.answer, JSON.stringify(answer)).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    }
    await neverReceives(bystander, "FORGED", 1_000);
    await neverReceives(composeOnBeta(ids.r1), "FORGED", 0);
    await neverReceives(standaloneActor(alpha, ids.solo, "solo"), "FORGED", 0);
    for (const id of ["collabmsg_forged_bystander", "collabmsg_forged_r1", "collabmsg_forged_solo"]) {
      expect([...await logLines(alpha, id), ...await logLines(beta, id)], id).toEqual([]);
    }
    expect(fs.existsSync(path.join(beta.memory, "agents", ids.bystander, "collaboration")), "no collaboration package for the bystander").toBe(false);
    record("RC-08", { otherRoot: textOf(otherRoot), fromBystander: textOf(fromBystander), forged: { toBystander, toR1FromOther, toSoloFromBystander } });
  }, 240_000);

  it("RC-09 AC-108: files and saved Tasks across nodes are refused before anything is sent", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const file = path.join(alpha.workspace, "draft.txt");
    await fsp.writeFile(file, "draft");
    const projectId = (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "RC-09 project" } })).createProject.projectId as string;
    const taskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, description: "Saved work." } })).createProjectTask.taskId as string;
    const sentBefore = remoteRequests().length;
    const runsBefore = await remoteRunDirs();
    const withFiles = await delegateRemote(solo, "With a file.", { reference_files: [file] });
    const savedTask = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", task_id: taskId });
    const followUpFiles = await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "WITH-FILE", reference_files: [file] });
    const existingCopy = await calls(solo, "delegate_task", { target_agent_run_id: ids.r1, task_id: taskId });
    expect(textOf(withFiles)).toBe("Files (reference_files) can't be sent to an agent on another node yet, so nothing was sent.");
    expect(textOf(savedTask)).toBe("A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.");
    expect(textOf(followUpFiles)).toBe("Files (reference_files) can't be sent to an agent on another node yet, so nothing was sent.");
    expect(textOf(existingCopy)).toBe("A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.");
    for (const result of [withFiles, savedTask, existingCopy]) expect(result.delegated, JSON.stringify(result)).toBe(false);
    expect(followUpFiles.accepted).toBe(false);
    expect(remoteRequests().length, "nothing sent").toBe(sentBefore);
    expect(await remoteRunDirs(), "nothing started").toEqual(runsBefore);
    await neverReceives(composeOnBeta(ids.r1), "WITH-FILE", 1_000);
    const task = ((await alpha.gql(`query($id:String!){projectTasks(projectId:$id){taskId status}}`, { id: projectId })).projectTasks as Rec[]).find((entry) => entry.taskId === taskId);
    expect(task?.status, "the saved Task is unchanged").toBe("TODO");
    record("RC-09", { withFiles: textOf(withFiles), savedTask: textOf(savedTask), followUpFiles: textOf(followUpFiles), existingCopy: textOf(existingCopy) });
  }, 240_000);

  it("RC-10 AC-109: a task agent on a Project Task delegates remotely; the remote run is a run of that Task; after DONE its messages are not delivered", async () => {
    const manager = await createStandalone(alpha, ids.manager, "alpha manager");
    ids.manager = manager.runId;
    const projectId = (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "RC-10 project" } })).createProject.projectId as string;
    const taskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId,
      description: callTool("delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Project work. Marker PROJECT-PACKET." }) } })).createProjectTask.taskId as string;
    const assigned = await calls(manager, "delegate_task", { recipient_address: "/remote_worker", task_id: taskId });
    expect(assigned, JSON.stringify(assigned)).toMatchObject({ delegated: true });
    const workerRunId = assigned.target_agent_run_id as string;
    const worker: Actor = { node: alpha, label: "alpha task agent", runId: workerRunId,
      conversation: async () => (await alpha.gql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: manager.runId, a: "/remote_worker", r: workerRunId })).agentRunCollaborationMemberProjection?.conversation,
      send: async () => { throw new Error("not used"); } };
    // The worker's Task work makes it delegate to beta; find the remote run by its back-link.
    let r3 = "";
    await until(async () => {
      for (const dir of await remoteRunDirs()) {
        const metadata = await betaMetadata(dir).catch(() => null);
        if (metadata?.delegatedFrom?.delegatorAgentRunId === workerRunId) { r3 = dir; return true; }
      }
      return false;
    }, "remote run of the task agent", 90_000);
    const remote = composeOnBeta(r3);
    await receives(remote, "PROJECT-PACKET");
    expect((await betaMetadata(r3)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, coordinatingRun: { kind: "agent", runId: manager.runId }, delegatorAgentRunId: workerRunId });
    const workerResult = toolResult(calledResults(await worker.conversation())[0]!);
    expect(workerResult).toMatchObject({ delegated: true, node: LABEL.beta, target_agent_run_id: r3 });
    expect(workerResult.task_id, "sub-work of Task work stays that Task's").toBeUndefined();

    const resources = await taskResourcesWith(alpha, r3);
    expect(resources, JSON.stringify(resources)).toHaveLength(1);
    expect(resources[0]!.file).toContain(path.join("projects", projectId, "tasks"));
    expect(resources[0]!.entry).toMatchObject({ role: "delegated", hostRoot: { kind: "agent", runId: manager.runId }, agentRun: { kind: "agent", agentRunId: r3 } });
    const tree = await readJson(path.join(alpha.memory, "agents", manager.runId, "collaboration", "collaboration_tree.json"));
    expect(remoteLinksIn(tree), "the topmost coordinating root holds the link").toEqual([{ address: "/publisher", agentRunId: r3, nodeId: beta.nodeId, delegatorAgentRunId: workerRunId, startedAt: expect.any(String) }]);

    expect(await calls(remote, "send_message_to", { target_agent_run_id: workerRunId, content: "BEFORE-DONE-TO-WORKER" })).toMatchObject({ accepted: true });
    await receives(worker, "BEFORE-DONE-TO-WORKER");
    const done = await calls(manager, "update_task", { task_id: taskId, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { projectId, status: "DONE" } });
    expect(JSON.stringify(done), "nothing says the remote run was stopped (AR-007)").not.toMatch(/stopped/i);
    const afterDone = await calls(remote, "send_message_to", { target_agent_run_id: workerRunId, content: "AFTER-DONE-TO-WORKER" });
    expect(afterDone.accepted, JSON.stringify(afterDone)).toBe(false);
    expect(textOf(afterDone)).toMatch(/DONE or CANCELLED|closed/i);
    await neverReceives(worker, "AFTER-DONE-TO-WORKER", 3_000);
    const lastMessage = remoteRequests().filter((entry) => entry.path === PATHS.messages && JSON.stringify(entry.body).includes("AFTER-DONE-TO-WORKER")).at(-1);
    expect((lastMessage?.answer as Rec)?.code, JSON.stringify(lastMessage)).toBe("TASK_AGENT_RESOURCE_CLOSED");
    ids.r3 = r3;
    record("RC-10", { projectId, taskId, workerRunId, r3, workerResult, taskResource: resources[0], link: remoteLinksIn(tree)[0], afterDone: textOf(afterDone), refusalAnswer: lastMessage?.answer });
  }, 300_000);

  it("RC-11 AC-109: after the delegator sets its Task DONE, its own message to the remote run is refused with the closed-Task reason and nothing is sent", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const delegated = await delegateRemote(solo, "Ad hoc work. Marker ADHOC-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    const r4 = delegated.target_agent_run_id as string;
    const remote = composeOnBeta(r4);
    await receives(remote, "ADHOC-PACKET");
    const done = await calls(solo, "update_task", { task_id: delegated.task_id, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { taskId: delegated.task_id, status: "DONE" } });
    expect(JSON.stringify(done), "nothing says the remote run was stopped (AR-007)").not.toMatch(/stopped/i);
    const sentBefore = remoteRequests().length;
    const toRemote = await calls(solo, "send_message_to", { target_agent_run_id: r4, content: "AFTER-DONE-TO-REMOTE" });
    expect(toRemote.accepted, JSON.stringify(toRemote)).toBe(false);
    expect(textOf(toRemote)).toMatch(/DONE or CANCELLED|closed/i);
    expect(remoteRequests().length, "nothing sent to a closed remote run").toBe(sentBefore);
    const fromRemote = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "AFTER-DONE-FROM-REMOTE" });
    expect(fromRemote.accepted, JSON.stringify(fromRemote)).toBe(false);
    await neverReceives(solo, "AFTER-DONE-FROM-REMOTE", 3_000);
    await neverReceives(remote, "AFTER-DONE-TO-REMOTE", 0);
    record("RC-11", { r4, taskId: delegated.task_id, toRemote: textOf(toRemote), fromRemote: textOf(fromRemote) });
  }, 240_000);

  it("RC-12 AC-106: the remote run on beta is shut down after the idle grace period and a follow-up restores it with its conversation", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    expect(await processLive(ids.r1), "the remote run's CLI is live before idling").toBe(true);
    const startedWaiting = Date.now();
    await until(async () => !(await processLive(ids.r1)), "remote run shut down after the idle grace period", GRACE_MS + 120_000);
    const shutDownAfterMs = Date.now() - startedWaiting;
    const launchesBefore = (await beta.launches()).length;
    expect(await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "AFTER-IDLE-FROM-ALPHA" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-IDLE-FROM-ALPHA");
    const relaunches = (await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(ids.r1));
    expect(relaunches, "restored once").toHaveLength(1);
    expect(relaunches[0]!.argv).toContain("--conversation");
    record("RC-12", { shutDownAfterMs, relaunch: relaunches[0] });
  }, 300_000);

  it("RC-13 AC-106/REQ-108: after beta restarts, a follow-up restores the remote run; after alpha restarts, replies restore every root kind and wake the delegators", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const teamLead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const orgLead = orgActor(alpha, ids.org.orgRunId, "/lead", ids.org.lead, "alpha org lead");
    const linkFiles = {
      solo: path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json"),
      team: path.join(alpha.memory, "agent_teams", ids.team.teamRunId, "team_run_execution_tree.json"),
      org: path.join(alpha.memory, "agent_orgs", ids.org.orgRunId, "agent_org_run_execution_tree.json"),
    };
    const linksNow = async () => ({ solo: remoteLinksIn(await readJson(linkFiles.solo)), team: remoteLinksIn((await readJson(linkFiles.team)).rootTeam), org: remoteLinksIn((await readJson(linkFiles.org)).rootOrg) });
    const linksBefore = await linksNow();
    const backLinksBefore = await Promise.all([ids.r1, ids.team.r2, ids.org.r5].map(async (id) => (await betaMetadata(id)).delegatedFrom));

    // Restart of the receiving node: the delegator's follow-up restores the remote run with its conversation.
    await beta.stop();
    await beta.start();
    const betaLaunches = (await beta.launches()).length;
    expect(await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "AFTER-BETA-RESTART-SOLO" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-BETA-RESTART-SOLO");
    const betaRelaunches = (await beta.launches()).slice(betaLaunches).filter((launch) => launch.cwd.includes(ids.r1));
    expect(betaRelaunches.filter((launch) => launch.argv.includes("--conversation")), "remote run restored once").toHaveLength(1);

    // Restart of the delegating node: each remote run replies; the reply restores its coordinating root on alpha.
    await alpha.stop();
    await alpha.start();
    const alphaLaunches = (await alpha.launches()).length;
    const replies: Rec = {};
    for (const [kind, remoteId, delegator, marker] of [["solo", ids.r1, ids.solo, "AFTER-ALPHA-RESTART-TO-SOLO"], ["team", ids.team.r2, ids.team.lead, "AFTER-ALPHA-RESTART-TO-TEAM"],
      ["org", ids.org.r5, ids.org.lead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      replies[kind] = await calls(composeOnBeta(remoteId), "send_message_to", { target_agent_run_id: delegator, content: marker });
    }
    expect(replies.solo, JSON.stringify(replies.solo)).toMatchObject({ accepted: true });
    expect(await receives(solo, "AFTER-ALPHA-RESTART-TO-SOLO")).toContain(`on node "${LABEL.beta}"`);
    const alphaRelaunches = (await alpha.launches()).slice(alphaLaunches);
    expect(alphaRelaunches.filter((launch) => launch.cwd.includes(ids.solo) && launch.argv.includes("--conversation")), "standalone delegator woken").toHaveLength(1);
    expect(await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "AFTER-ALPHA-RESTART-FROM-SOLO" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-ALPHA-RESTART-FROM-SOLO");
    expect(await linksNow(), "links unchanged on disk after restarts and later saves").toEqual(linksBefore);
    expect(await Promise.all([ids.r1, ids.team.r2, ids.org.r5].map(async (id) => (await betaMetadata(id)).delegatedFrom))).toEqual(backLinksBefore);

    // Team and Org delegators (DS-003 restore by coordinatingRun): observed first, then asserted.
    const delivered = async (node: NodeServer, content: string) => (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file))
      .some((file) => fs.readFileSync(file, "utf8").includes(JSON.stringify(content)));
    const observed: Rec = {};
    for (const [kind, actor, marker] of [["team", teamLead, "AFTER-ALPHA-RESTART-TO-TEAM"], ["org", orgLead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      observed[kind] = { reply: { accepted: replies[kind].accepted, text: textOf(replies[kind]) }, inAlphaLog: await delivered(alpha, marker),
        delegatorRelaunched: alphaRelaunches.some((launch) => launch.cwd.includes(actor.runId) && launch.argv.includes("--conversation")),
        conversation: await actor.conversation().then(() => "readable", (error: Error) => error.message) };
    }
    record("RC-13", { betaRelaunches, alphaRelaunches, replies: Object.fromEntries(Object.entries(replies).map(([k, v]) => [k, textOf(v as Rec)])), observed, linksAfter: await linksNow() });
    for (const [kind, actor, marker] of [["team", teamLead, "AFTER-ALPHA-RESTART-TO-TEAM"], ["org", orgLead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      expect(observed[kind], `${kind} delegator after alpha's restart`).toMatchObject({ reply: { accepted: true }, inAlphaLog: true, delegatorRelaunched: true, conversation: "readable" });
      await receives(actor, marker);
    }
  }, 420_000);

  it("RC-14 AC-106: a follow-up to a remote run whose history was deleted on beta is refused with 'not found'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const delegated = await delegateRemote(solo, "Short-lived work. Marker DELETED-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    const doomed = delegated.target_agent_run_id as string;
    await receives(composeOnBeta(doomed), "DELETED-PACKET");
    await beta.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: doomed });
    const deleted = (await beta.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: doomed })).deleteStoredRun;
    expect(deleted.success, deleted.message).toBe(true);
    expect(fs.existsSync(path.join(beta.memory, "agents", doomed))).toBe(false);
    const notFound = await calls(solo, "send_message_to", { target_agent_run_id: doomed, content: "TO-DELETED-RUN" });
    expect(notFound.accepted, JSON.stringify(notFound)).toBe(false);
    expect(textOf(notFound)).toBe(`That run no longer exists on node "${LABEL.beta}".`);
    record("RC-14", { doomed, deleted, notFound: textOf(notFound) });
  }, 180_000);

  it("RC-15 QR-102: a partitioned or stopped peer is refused within the bound and the tool call never hangs; nothing is left on alpha", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const linksBefore = remoteLinksIn(await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json")));
    const runsBefore = await remoteRunDirs();
    let partitionedDelegation: Rec & { elapsedMs: number }, partitionedMessage: Rec & { elapsedMs: number };
    toBeta.mode = "blackhole";
    try {
      partitionedDelegation = await delegateRemote(solo, "Partitioned.");
      partitionedMessage = await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "PARTITIONED-MESSAGE" });
    } finally { toBeta.mode = "forward"; toBeta.releaseHeld(); }
    expect(textOf(partitionedDelegation)).toBe(`Node "${LABEL.beta}" could not be reached (it did not answer in time).`);
    expect(textOf(partitionedMessage)).toBe(`Node "${LABEL.beta}" could not be reached (it did not answer in time; the message may have been delivered).`);
    for (const result of [partitionedDelegation, partitionedMessage]) expect(result.elapsedMs, "refused within the bound (QR-102 ≤ 30 s)").toBeLessThan(30_000);

    await beta.stop();
    await toBeta.close();
    let stoppedDelegation: Rec & { elapsedMs: number };
    try { stoppedDelegation = await delegateRemote(solo, "Peer stopped."); }
    finally { await toBeta.open(); await beta.start(); }
    expect(textOf(stoppedDelegation)).toMatch(new RegExp(`^Node "${LABEL.beta}" could not be reached \\(`));
    expect(stoppedDelegation.elapsedMs).toBeLessThan(30_000);

    expect(remoteLinksIn(await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json"))), "no link left").toEqual(linksBefore);
    expect(await remoteRunDirs(), "nothing started on beta").toEqual(runsBefore);
    record("RC-15", { partitionedDelegation: { text: textOf(partitionedDelegation), elapsedMs: partitionedDelegation.elapsedMs },
      partitionedMessage: { text: textOf(partitionedMessage), elapsedMs: partitionedMessage.elapsedMs },
      stoppedDelegation: { text: textOf(stoppedDelegation), elapsedMs: stoppedDelegation.elapsedMs } });
  }, 240_000);

  it("RC-16 AC-102: when beta's address reaches a different AutoByteus server, delegation and messages are refused with 'identity mismatch'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const runsBefore = await remoteRunDirs();
    let mismatch: Rec, mismatchMessage: Rec;
    toBeta.targetPort = alpha.port;
    try {
      mismatch = await delegateRemote(solo, "Wrong server.");
      mismatchMessage = await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "TO-WRONG-SERVER" });
    } finally { toBeta.targetPort = beta.port; }
    const text = `The server at node "${LABEL.beta}"'s address is not the node that was registered (identity mismatch), so nothing was sent.`;
    expect(textOf(mismatch)).toBe(text);
    expect(textOf(mismatchMessage)).toBe(text);
    expect(await remoteRunDirs()).toEqual(runsBefore);
    record("RC-16", { mismatch: textOf(mismatch), mismatchMessage: textOf(mismatchMessage) });
  }, 180_000);

  it("RC-17 AC-103: after unpublishing, new delegations are refused and a run already started still accepts follow-ups", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    expect((await beta.gql(`mutation($id:String!){unpublishAgent(agentDefinitionId:$id){address}}`, { id: ids.publisher })).unpublishAgent).toEqual([]);
    const refused = await delegateRemote(solo, "After unpublishing.");
    expect(textOf(refused)).toBe(`Node "${LABEL.beta}" has no published Agent at that address.`);
    expect(await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "AFTER-UNPUBLISH-FOLLOWUP" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-UNPUBLISH-FOLLOWUP");
    expect(await calls(composeOnBeta(ids.r1), "send_message_to", { target_agent_run_id: ids.solo, content: "AFTER-UNPUBLISH-REPLY" })).toMatchObject({ accepted: true });
    await receives(solo, "AFTER-UNPUBLISH-REPLY");
    record("RC-17", { refused: textOf(refused) });
  }, 180_000);

  it("RC-18 AC-101/SCN-107: turning the switch off on beta, then on alpha, refuses new requests with 'turned off'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const remote = composeOnBeta(ids.r1);
    let offOnBeta: Rec, offFromBeta: Rec, offOnAlpha: Rec, inboundWhileAlphaOff: Rec, sentDuringAlphaOff: string[];
    await beta.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
    try {
      offOnBeta = await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "WHILE-BETA-OFF" });
      offFromBeta = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "FROM-BETA-WHILE-OFF" });
    } finally { await beta.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`); }
    await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
    try {
      const sentBefore = captured.length;
      offOnAlpha = await delegateRemote(solo, "While alpha off.");
      inboundWhileAlphaOff = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "TO-ALPHA-WHILE-OFF" });
      sentDuringAlphaOff = remoteRequests(sentBefore).map((entry) => entry.via);
    } finally { await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`); }
    expect(textOf(offOnBeta)).toBe(`Remote collaboration is turned off on node "${LABEL.beta}", so it refused the request.`);
    expect(textOf(offFromBeta)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(textOf(offOnAlpha)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(textOf(inboundWhileAlphaOff)).toBe(`Remote collaboration is turned off on node "${LABEL.alpha}", so it refused the request.`);
    expect(sentDuringAlphaOff, "only beta's refused message was sent while alpha was off").toEqual(["toAlpha"]);
    await neverReceives(solo, "TO-ALPHA-WHILE-OFF", 0);
    await neverReceives(solo, "FROM-BETA-WHILE-OFF", 0);
    await neverReceives(remote, "WHILE-BETA-OFF", 0);
    record("RC-18", { offOnBeta: textOf(offOnBeta), offFromBeta: textOf(offFromBeta), offOnAlpha: textOf(offOnAlpha), inboundWhileAlphaOff: textOf(inboundWhileAlphaOff) });
  }, 240_000);

  it("RC-19 AC-102: after a peer is removed, new requests in either direction are refused and run history stays", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const remote = composeOnBeta(ids.r1);
    for (const node of [alpha, beta]) await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
    const historyBefore = { alphaLinks: await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json")).then(remoteLinksIn),
      betaRuns: await remoteRunDirs() };
    expect((await beta.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: alpha.nodeId })).removePeerNode).toBe(true);
    const toBetaAfterRemoval = await calls(solo, "send_message_to", { target_agent_run_id: ids.r1, content: "AFTER-REMOVAL-TO-BETA" });
    expect(textOf(toBetaAfterRemoval)).toBe(`Node "${LABEL.beta}" does not have this node registered as a peer, so it refused the request.`);
    const fromBetaAfterRemoval = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "AFTER-REMOVAL-TO-ALPHA" });
    expect(textOf(fromBetaAfterRemoval)).toBe(`The node of that run (${alpha.nodeId}) is no longer a registered peer of this node, so nothing was sent.`);
    expect((await alpha.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: beta.nodeId })).removePeerNode).toBe(true);
    const delegateAfterRemoval = await delegateRemote(solo, "After removal.");
    expect(textOf(delegateAfterRemoval)).toBe(`No peer node named "${LABEL.beta}" is registered on this node, so nothing was sent. Use a node name the user gave you.`);
    // History stays: the links on alpha and the remote runs on beta, still readable through their normal views.
    expect(await readJson(path.join(alpha.memory, "agents", ids.solo, "collaboration", "collaboration_tree.json")).then(remoteLinksIn)).toEqual(historyBefore.alphaLinks);
    expect(await remoteRunDirs()).toEqual(historyBefore.betaRuns);
    expect(stringsOf(await remote.conversation()).some((value) => value.includes("STANDALONE-PACKET")), "the remote run's history is readable on beta").toBe(true);
    expect(stringsOf(await solo.conversation()).some((value) => value.includes("REPLY-FROM-BETA-1")), "the delegator's history is readable on alpha").toBe(true);
    record("RC-19", { toBetaAfterRemoval: textOf(toBetaAfterRemoval), fromBetaAfterRemoval: textOf(fromBetaAfterRemoval), delegateAfterRemoval: textOf(delegateAfterRemoval), historyBefore });
  }, 240_000);

  it("RC-20 AC-111/REQ-113/REQ-114: every captured request between the nodes carries no credential and only the contract's fields", () => {
    const allowed = new Set([PATHS.runs, PATHS.messages, PATHS.status]);
    expect(captured.filter((entry) => !allowed.has(entry.path)).map((entry) => entry.path)).toEqual([]);
    const keysByKind: Record<string, string[]> = {
      [PATHS.runs]: ["coordinatingRun", "delegator", "fromNodeId", "publishedAddress", "toNodeId"],
      work_packet: ["content", "createdAt", "fromNodeId", "kind", "messageType", "sender", "target", "toNodeId"],
      toBeta: ["content", "createdAt", "fromNodeId", "kind", "messageId", "messageType", "sender", "target", "toNodeId"],
      toAlpha: ["content", "coordinatingRun", "createdAt", "fromNodeId", "kind", "messageId", "messageType", "sender", "target", "toNodeId"],
    };
    const counts: Record<string, number> = {};
    const secretPattern = /sk-[A-Za-z0-9_-]{8,}|mra_[A-Za-z0-9]|mhub_[A-Za-z0-9]|bearer\s|api[_-]?key|password|secret|token/i;
    for (const entry of captured) {
      const text = JSON.stringify({ headers: entry.headers, body: entry.body });
      expect(text.includes(CANARY.alpha) || text.includes(CANARY.beta), `canary key in request ${entry.seq}`).toBe(false);
      expect(Object.keys(entry.headers).filter((name) => /auth|cookie|key|token|secret/i.test(name)), `credential header in request ${entry.seq}`).toEqual([]);
      if (entry.path === PATHS.status) { expect(entry.method).toBe("GET"); counts.status = (counts.status ?? 0) + 1; continue; }
      const body = entry.body as Rec;
      expect(secretPattern.test(JSON.stringify(body)), `secret-like text in request ${entry.seq}: ${JSON.stringify(body).slice(0, 300)}`).toBe(false);
      const kind = entry.path === PATHS.runs ? PATHS.runs : body.kind === "work_packet" ? "work_packet" : entry.via;
      expect(sortedKeys(body), `fields of request ${entry.seq} (${kind})`).toEqual(keysByKind[kind]);
      expect(entry.method).toBe("POST");
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    expect(counts.status ?? 0, "the identity checks were captured").toBeGreaterThan(0);
    expect(evidence.nodes.alpha.canaryKeySaved, "the canary key was saved on alpha").toBe(true);
    expect(evidence.nodes.beta.canaryKeySaved, "the canary key was saved on beta").toBe(true);
    record("RC-20", { total: captured.length, counts, headerNames: [...new Set(captured.flatMap((entry) => Object.keys(entry.headers)))].sort() });
  });
});
