#!/usr/bin/env node
// API-30 (autobyteus-261, broader validation) temporary setup: two built servers (alpha, beta) on loopback with their
// own temp data roots and HOMEs, reading provider keys only from the read-only test vault (AUTOBYTEUS_TEST_VAULT),
// switched on and registered with each other. Runtime: AutoByteus with deepseek-v4-flash (real inference).
// Beta: shared Agent "Designer" (own default) and shared Agent Team "Copy Team" (lead Copy Lead with its own default,
// checker Copy Checker covered by the Team default). Alpha: "Producer" selects list_available_nodes and
// list_available_agents; "Plain Producer" selects neither. One standalone run of each.
// Writes <root>/state.json and keeps both nodes running until SIGTERM/SIGINT, then stops them and removes <root>.
// Not durable coverage (real inference); the durable proof of the discovery paths is the two-server E2E (RC-26 … RC-29).
// Usage: AUTOBYTEUS_TEST_VAULT=<vault> node API-30-live-two-nodes.mjs <autobyteus-server-ts dir>
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const [serverRoot] = process.argv.slice(2);
const vault = process.env.AUTOBYTEUS_TEST_VAULT;
if (!vault) throw new Error("AUTOBYTEUS_TEST_VAULT is required");
const appEntry = path.join(serverRoot, "dist", "app.js");
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "api30-two-nodes-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const children = [];
const log = (...args) => console.log(new Date().toISOString(), ...args);

const startNode = async (name) => {
  const port = await freePort();
  const dir = path.join(root, name);
  const dataDir = path.join(dir, "data"), home = path.join(dir, "home"), workspace = path.join(dir, "workspace");
  for (const d of [dataDir, home, workspace]) fs.mkdirSync(d, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  fs.writeFileSync(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=INFO\nHTTP_ACCESS_LOG_MODE=off\n`);
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir], { cwd: serverRoot,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), AUTOBYTEUS_TEST_VAULT: vault,
      APP_ENV: "test", LOG_LEVEL: "INFO", HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: baseUrl },
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
  for (const node of [alpha, beta]) {
    await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
    await node.gql(`mutation{checkAgentRuntimes}`);
  }
  await alpha.gql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl: beta.baseUrl, name: "beta-node" } });
  await beta.gql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl: alpha.baseUrl, name: "alpha-node" } });
  const model = "deepseek-v4-flash";
  const autobyteus = { runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: null };
  const def = async (node, name, description, instructions, toolNames, defaultLaunchConfig) => (await node.gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
    { i: { name, role: "assistant", description, instructions, toolNames, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  const producerInstructions = "You are a producer. Follow the user's requests. Keep your messages short.";
  const producerDef = await def(alpha, "Producer", "Coordinates work for the user", producerInstructions, ["list_available_nodes", "list_available_agents"]);
  const plainDef = await def(alpha, "Plain Producer", "Coordinates work for the user", producerInstructions, []);
  await def(beta, "Designer", "Designs logos and posters", "You are a designer. When you get a task, do it briefly (a few sentences) and report the result to the agent that sent it with send_message_to and its sender run id.", [], autobyteus);
  const leadDef = await def(beta, "Copy Lead", "Leads copywriting", "You lead copywriting. Do the task briefly and report the result to the sender with send_message_to.", [], autobyteus);
  const checkerDef = await def(beta, "Copy Checker", "Checks copy", "You check copy. Answer whoever messages you briefly with send_message_to.", [], null);
  await beta.gql(`mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}`, { i: { name: "Copy Team", description: "Writes and checks short copy",
    instructions: "A lead and a checker.", coordinatorMemberName: "lead", defaultLaunchConfig: autobyteus,
    nodes: [{ memberName: "lead", ref: leadDef, refScope: "SHARED" }, { memberName: "checker", ref: checkerDef, refScope: "SHARED" }] } });
  const createRun = async (definitionId) => {
    const run = (await alpha.gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`,
      { i: { agentDefinitionId: definitionId, workspaceRootPath: alpha.workspace, autoExecuteTools: true, ...autobyteus } })).createAgentRun;
    if (!run.success) throw new Error(run.message);
    return run.runId;
  };
  const state = { root, model, alpha: { baseUrl: alpha.baseUrl, nodeId: alpha.nodeId, dataDir: alpha.dataDir }, beta: { baseUrl: beta.baseUrl, nodeId: beta.nodeId, dataDir: beta.dataDir },
    producerRunId: await createRun(producerDef), plainRunId: await createRun(plainDef) };
  fs.writeFileSync(path.join(root, "state.json"), JSON.stringify(state, null, 2));
  log("READY", JSON.stringify(state));
} catch (error) {
  log("SETUP FAILED", error);
  await stop();
}
setInterval(() => undefined, 60_000);
