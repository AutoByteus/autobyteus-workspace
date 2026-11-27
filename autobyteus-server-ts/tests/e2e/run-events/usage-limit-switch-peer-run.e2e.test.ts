/**
 * A run another node delegated here switches runtime on its own node when it reaches a usage limit (autobyteus-646 R-11,
 * DEC-003, CM-10). Two built servers (`dist/app.js`), "alpha" and "beta", each with its own data root, ports and HOME,
 * turn remote collaboration on and pair with one invite. Alpha's agent (the scripted AGY CLI, `linked_skills`) calls the
 * real `delegate_task` to beta's shared worker, whose default is Codex. Beta's Codex is the scripted app-server
 * (`tests/fixtures/codex-usage-limit-app-server.mjs`), its limit used up; the worker's history on beta is AutoByteus (an
 * LM Studio-compatible scripted model). The copy fails on Codex on beta, switches on beta to AutoByteus (C-2 `switched`,
 * its metadata), and alpha's tree, which reads the peer run's launch fresh while a view holds the run (its run-status
 * feed), shows beta's new launch.
 *
 * Gate: RUN_USAGE_LIMIT_PEER_E2E=1. Prerequisite: `pnpm -C autobyteus-server-ts build`. No credentials. About 1 minute.
 * Run (in autobyteus-server-ts):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" RUN_USAGE_LIMIT_PEER_E2E=1 \
 *     pnpm exec vitest run tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts --no-watch
 * Optional USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR keeps a JSON receipt.
 */
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer as createHttpServer, type Server } from "node:http";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { pairNodes } from "../helpers/pair-nodes.js";
import { readRunTree } from "../helpers/run-tree-delegated.js";

const ENABLED = process.env.RUN_USAGE_LIMIT_PEER_E2E === "1" && process.platform !== "win32";
const SERVER_DIR = path.resolve(__dirname, "../../..");
const AGY_CLI = path.resolve(__dirname, "../../fixtures/agy-failure-cli.mjs");
const CODEX_FAKE = path.resolve(__dirname, "../../fixtures/codex-usage-limit-app-server.mjs");
const AGY_MODEL = "gemini-3.8-flash-low";
const CODEX_MODEL = "gpt-e2e";
const MODEL_KEY = "peer-usage-limit-fixture";
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
const jsonLines = async (file: string): Promise<Json[]> => (await fs.readFile(file, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json);
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** An LM Studio-compatible model that answers every request "OK." and counts the requests. */
const scriptedModel = async () => {
  let requests = 0;
  const server: Server = createHttpServer(async (req, res) => {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    for await (const _chunk of req) { /* drain */ }
    requests += 1;
    const chunk = (delta: Json, finish: string | null) => ({ id: `f-${requests}`, object: "chat.completion.chunk", created: 1, model: MODEL_KEY,
      choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: "OK." }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { origin: `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`, requests: () => requests,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }) };
};

type Node = { name: string; root: string; url: string; gql: (query: string, variables?: Json) => Promise<Json>; child: ChildProcess; output: () => string };
const children: ChildProcess[] = [];
const startNode = async (name: string, root: string, extraEnv: Record<string, string>, lmStudio = ""): Promise<Node> => {
  for (const dir of ["home", "db", "workspace"]) await fs.mkdir(path.join(root, dir), { recursive: true });
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(root, ".env"), `AUTOBYTEUS_SERVER_HOST=${url}\nAPP_ENV=test\nLMSTUDIO_HOSTS=${lmStudio}\n`);
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, AUTOBYTEUS_SERVER_HOST: url,
    ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills", ...extraEnv, ...builtServerLaunchEnvironment() });
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
  return { name, root, url, gql, child, output: () => output };
};
const stopNode = async (node: Node | undefined) => {
  if (!node || node.child.exitCode !== null || node.child.signalCode !== null) return;
  const exited = once(node.child, "exit");
  node.child.kill("SIGTERM");
  const force = setTimeout(() => node.child.kill("SIGKILL"), 15_000);
  try { await exited; } finally { clearTimeout(force); }
};
const sendMessage = (socket: WebSocket, agentRunId: string, content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
  agent_run_id: agentRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
const openSocket = async (node: Node, runId: string) => {
  const socket = new WebSocket(`${node.url.replace(/^http/, "ws")}/ws/agent/${runId}`);
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  await wait(500);
  return socket;
};

describe.skipIf(!ENABLED)("A peer-started run switches runtime on its own node", () => {
  let root = "";
  let alpha: Node | undefined;
  let beta: Node | undefined;
  let model: Awaited<ReturnType<typeof scriptedModel>> | undefined;
  const sockets: WebSocket[] = [];
  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    await Promise.all([stopNode(alpha), stopNode(beta)]);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await model?.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("ULP-01: the copy alpha delegated fails on beta's Codex, switches on beta to its history runtime, and alpha's tree shows beta's new launch", async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "usage-limit-peer-e2e-")));
    model = await scriptedModel();
    const betaRoot = path.join(root, "beta");
    await fs.mkdir(betaRoot, { recursive: true });
    await fs.writeFile(path.join(betaRoot, "codex-state.json"), JSON.stringify({ mode: "limit" }));
    const resetAt = new Date(Math.ceil((Date.now() + 3 * 3_600_000) / 60_000) * 60_000).toISOString();
    [alpha, beta] = await Promise.all([
      startNode("alpha", path.join(root, "alpha"), {}),
      startNode("beta", betaRoot, { CODEX_APP_SERVER_COMMAND: CODEX_FAKE, CODEX_FAKE_STATE: path.join(betaRoot, "codex-state.json"),
        CODEX_FAKE_LOG: path.join(betaRoot, "codex-turns.jsonl"), CODEX_FAKE_MODEL: CODEX_MODEL, CODEX_FAKE_RESET_AT: resetAt }, model.origin),
    ]);
    for (const node of [alpha, beta]) await node.gql("mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}");
    expect(await pairNodes({ inviter: (q, v) => beta!.gql(q, v), accepter: (q, v) => alpha!.gql(q, v), inviterName: "beta", accepterName: "alpha" }))
      .toMatchObject({ name: "beta", paired: true });

    // Beta: the shared worker (default Codex) and its history there (one AutoByteus run, answered).
    const autobyteusModel = ((await beta.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`))
      .reloadProviderModelCatalog.llmModels as Json[]).map((entry) => entry.modelIdentifier as string).find((id) => id.startsWith(MODEL_KEY));
    expect(autobyteusModel).toBeTruthy();
    const workerName = `Worker ${randomUUID().slice(0, 6)}`;
    const worker = (await beta.gql("mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}", { input: { name: workerName,
      role: "engineer", description: "A shared worker", instructions: "Follow the request.", toolNames: [], skillNames: [],
      defaultLaunchConfig: { runtimeKind: "codex_app_server", llmModelIdentifier: CODEX_MODEL, llmConfig: null } } })).createAgentDefinition.id as string;
    const historyRun = (await beta.gql("mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}", { input: {
      agentDefinitionId: worker, workspaceRootPath: path.join(betaRoot, "workspace"), llmModelIdentifier: autobyteusModel, autoExecuteTools: true,
      runtimeKind: "autobyteus" } })).createAgentRun;
    expect(historyRun.success, historyRun.message).toBe(true);
    const historySocket = await openSocket(beta, historyRun.runId);
    sockets.push(historySocket);
    const before = model.requests();
    sendMessage(historySocket, historyRun.runId, "Earlier work.");
    await until(() => model!.requests() > before, "the worker's history run answered on beta");

    // Alpha: an AGY agent delegates to beta's worker.
    const delegatorDefinition = (await alpha.gql("mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}", { input: {
      name: `Delegator ${randomUUID().slice(0, 6)}`, role: "engineer", description: "Delegates", instructions: "Follow the request.", toolNames: ["delegate_task"], skillNames: [] } }))
      .createAgentDefinition.id;
    const created = (await alpha.gql("mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}", { input: {
      agentDefinitionId: delegatorDefinition, workspaceRootPath: path.join(root, "alpha", "workspace"), llmModelIdentifier: AGY_MODEL, autoExecuteTools: true,
      runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const delegatorRunId = created.runId as string;
    const socket = await openSocket(alpha, delegatorRunId);
    sockets.push(socket);
    const call = { name: "delegate_task", arguments: { node: "beta", recipient_address: `/${segment(workerName)}`, description: "Write the release notes." } };
    sendMessage(socket, delegatorRunId, `CALL_TOOL:${JSON.stringify(call)}`);
    const peerRunId = await until(async () => {
      const conversation = JSON.stringify((await alpha!.gql("query($id:String!){getRunProjection(runId:$id){conversation}}", { id: delegatorRunId })).getRunProjection?.conversation ?? []);
      return conversation.match(/target_agent_run_id\\?"\s*:\s*\\?"([^"\\]+)/)?.[1] ?? null;
    }, "delegate_task result", 90_000);

    // Beta: the copy failed on Codex and switched there, from its history.
    const turns = await until(async () => { const all = await jsonLines(path.join(betaRoot, "codex-turns.jsonl")); return all.length ? all : null; }, "the copy's Codex turn on beta", 90_000);
    expect(turns[0]).toMatchObject({ mode: "limit" });
    const records = await until(async () => {
      const all = (await jsonLines(path.join(betaRoot, "model-routing", "switches_active.jsonl"))).filter((record) => record.agentRunId === peerRunId);
      return all.length ? all : null;
    }, "beta's switch record of the copy", 90_000);
    expect(records).toEqual([expect.objectContaining({ agentDefinitionId: worker, from: { runtimeKind: "codex_app_server", llmModelIdentifier: CODEX_MODEL },
      to: { runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel }, chosenBy: "agent_history", outcome: "switched" })]);
    const metadata = JSON.parse(await fs.readFile(path.join(betaRoot, "memory", "agents", peerRunId, "run_metadata.json"), "utf8")) as Json;
    expect(metadata).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel });
    expect(metadata.delegatedFrom?.nodeId, "a run another node started").toBeTruthy();

    // Alpha reads the peer run's launch fresh while a view holds it (its run-status feed, as the delegator's tree does):
    // it shows beta's new launch.
    const feed = new WebSocket(`${alpha.url.replace(/^http/, "ws")}/ws/run-status`);
    sockets.push(feed);
    await new Promise<void>((resolve, reject) => { feed.once("open", () => resolve()); feed.once("error", reject); });
    feed.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs: [{ kind: "agent", runId: peerRunId }] } }));
    let lastRows: Json[] = [];
    const row = await until(async () => {
      const tree = await readRunTree(alpha!.gql, "agent", delegatorRunId);
      lastRows = tree.rows;
      const peer = tree.rows.find((entry) => entry.kind === "peer_agent");
      return peer?.launch?.runtimeKind === "autobyteus" ? peer : null;
    }, "alpha's tree row with beta's new launch", 60_000).catch(async (error: unknown) => {
      if (process.env.USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR) await fs.writeFile(path.join(process.env.USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR, "ULP-01-alpha-rows.json"),
        JSON.stringify(lastRows, null, 2));
      throw error;
    });
    expect(row.launch).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: autobyteusModel });

    if (process.env.USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR) {
      await fs.mkdir(process.env.USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.USAGE_LIMIT_PEER_E2E_EVIDENCE_DIR, "ULP-01.json"), `${JSON.stringify({ delegatorRunId, peerRunId, resetAt,
        codexTurns: turns, switchRecords: records, betaMetadata: { runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
          delegatedFrom: metadata.delegatedFrom }, alphaTreeRow: row }, null, 2)}\n`);
    }
  }, 400_000);
});
