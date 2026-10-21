#!/usr/bin/env node
// API-26 (REQ-307, BEH-305) temporary setup, autobyteus-247: two built server processes (alpha, beta) on loopback with
// their own temp data roots and HOMEs, registered with each other, and one real remote Team delegation: a standalone run
// on alpha delegates beta's shared Agent Team "Studio Team" (lead = Publisher with its own default, checker = Checker
// covered by the Team default `alt-model`). Nothing is published. Scripted AGY CLI. Writes <root>/state.json and keeps
// both nodes running until SIGTERM/SIGINT, then stops them and removes <root>. Not durable coverage: the durable proof
// of the same flow is the two-server E2E (RC-21); this only provides the live receiving node the browser journey opens.
// Usage: node API-26-setup-two-nodes.mjs <autobyteus-server-ts dir> <agy cli path>
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const [serverRoot, cli] = process.argv.slice(2);
const appEntry = path.join(serverRoot, "dist", "app.js");
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "api26-two-nodes-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const children = [];
const log = (...args) => console.log(new Date().toISOString(), ...args);
const MODEL = "gemini-3.8-flash-low";

const startNode = async (name) => {
  const port = await freePort();
  const dir = path.join(root, name);
  const dataDir = path.join(dir, "data"), home = path.join(dir, "home"), workspace = path.join(dir, "workspace");
  for (const d of [dataDir, home, workspace]) fs.mkdirSync(d, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  fs.writeFileSync(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir], { cwd: serverRoot,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills",
      AGY_FAKE_EXTRA_MODELS: "alt-model", APP_ENV: "test", LOG_LEVEL: "WARN", HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: baseUrl },
    stdio: ["ignore", fs.openSync(path.join(dir, "server.log"), "a"), fs.openSync(path.join(dir, "server.log"), "a")] });
  children.push(child);
  for (let i = 0; i < 300; i += 1) { if (await fetch(`${baseUrl}/rest/health`).then((r) => r.ok, () => false)) break; await wait(300); }
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
  const gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  return { name, port, baseUrl, nodeId, workspace, dataDir, gql };
};

const stop = async () => {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  await wait(3_000);
  for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
  fs.rmSync(root, { recursive: true, force: true });
  log("stopped; removed", root, "exists:", fs.existsSync(root));
  process.exit(0);
};
process.on("SIGTERM", stop); process.on("SIGINT", stop);

try {
  const [alpha, beta] = [await startNode("alpha"), await startNode("beta")];
  for (const node of [alpha, beta]) await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
  await alpha.gql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl: beta.baseUrl, name: "beta-node" } });
  await beta.gql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl: alpha.baseUrl, name: "alpha-node" } });
  const def = async (node, name, defaultLaunchConfig) => (await node.gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
    { i: { name, role: "assistant", description: `${name} (API-26)`, instructions: "Follow the user's request.", toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  const agy = (model) => ({ runtimeKind: "antigravity_cli", llmModelIdentifier: model, llmConfig: null });
  const delegatorDef = await def(alpha, "Delegator");
  const publisherDef = await def(beta, "Publisher", agy(MODEL));
  const checkerDef = await def(beta, "Checker");
  await beta.gql(`mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}`, { i: { name: "Studio Team", description: "Studio Team (API-26)",
    instructions: "Work as a team.", coordinatorMemberName: "lead", defaultLaunchConfig: agy("alt-model"),
    nodes: [{ memberName: "lead", ref: publisherDef, refScope: "SHARED" }, { memberName: "checker", ref: checkerDef, refScope: "SHARED" }] } });
  const run = (await alpha.gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`,
    { i: { agentDefinitionId: delegatorDef, workspaceRootPath: alpha.workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
  const socket = new WebSocket(`ws://127.0.0.1:${alpha.port}/ws/agent/${run.runId}`);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await wait(1_000);
  const content = `CALL_TOOL:${JSON.stringify({ name: "delegate_task", arguments: { node: "beta-node", recipient_address: "/studio_team",
    description: "Cut the launch trailer and have it checked. Marker BROWSER-TEAM-PACKET." } })}`;
  const messageId = `api26-${randomUUID()}`;
  socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}`, context_file_paths: [], image_urls: [], agent_run_id: run.runId, content } }));
  let result = null;
  for (let i = 0; i < 300 && !result; i += 1) {
    await wait(300);
    const text = JSON.stringify((await alpha.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: run.runId })).getRunProjection?.conversation ?? []);
    const at = text.indexOf("CALLED:");
    if (at >= 0) result = text.slice(at, at + 1500);
  }
  socket.close();
  const pick = (key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(result ?? "")?.[1];
  const state = { root, alpha: { baseUrl: alpha.baseUrl, nodeId: alpha.nodeId }, beta: { baseUrl: beta.baseUrl, nodeId: beta.nodeId, dataDir: beta.dataDir },
    delegatorRunId: run.runId, teamRunId: pick("target_team_run_id"), coordinatorRunId: pick("target_team_coordinator_agent_run_id"), delegateResult: result };
  fs.writeFileSync(path.join(root, "state.json"), JSON.stringify(state, null, 2));
  log("READY", JSON.stringify(state));
} catch (error) {
  log("SETUP FAILED", error);
  await stop();
}
setInterval(() => undefined, 60_000);
