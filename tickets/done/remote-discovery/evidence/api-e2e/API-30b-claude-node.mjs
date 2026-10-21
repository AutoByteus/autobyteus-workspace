#!/usr/bin/env node
// API-30b (autobyteus-261, broader validation) temporary setup: one more built server ("claude-node") for the Claude
// runtime. Its data root is a temp directory; HOME is the real one (plus USER and LOGNAME) only because the signed-in
// `claude` CLI needs it (TESTING.md, live suites with a signed-in CLI). Provider keys: none (Claude uses its CLI login);
// the test vault is still selected so no other key source is read. It registers with the running API-30 beta both ways
// and creates two Claude agents (haiku): "Claude Producer" selects list_available_nodes and list_available_agents,
// "Claude Plain" selects neither. Writes <root>/state.json; SIGTERM/SIGINT stops it and removes <root>.
// Usage: AUTOBYTEUS_TEST_VAULT=<vault> node API-30b-claude-node.mjs <autobyteus-server-ts dir> <beta baseUrl>
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const [serverRoot, betaUrl] = process.argv.slice(2);
const appEntry = path.join(serverRoot, "dist", "app.js");
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "api30b-claude-node-")));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
let child = null;
const log = (...args) => console.log(new Date().toISOString(), ...args);
const stop = async () => {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  await wait(3_000);
  if (child && child.exitCode === null) child.kill("SIGKILL");
  fs.rmSync(root, { recursive: true, force: true });
  log("stopped; removed", root, "exists:", fs.existsSync(root));
  process.exit(0);
};
process.on("SIGTERM", stop); process.on("SIGINT", stop);

try {
  const port = await freePort();
  const dataDir = path.join(root, "data"), workspace = path.join(root, "workspace");
  for (const d of [dataDir, workspace]) fs.mkdirSync(d, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  fs.writeFileSync(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=INFO\nHTTP_ACCESS_LOG_MODE=off\n`);
  child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir], { cwd: serverRoot,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      AUTOBYTEUS_TEST_VAULT: process.env.AUTOBYTEUS_TEST_VAULT, APP_ENV: "test", LOG_LEVEL: "INFO", HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: baseUrl },
    stdio: ["ignore", fs.openSync(path.join(root, "server.log"), "a"), fs.openSync(path.join(root, "server.log"), "a")] });
  for (let i = 0; i < 300; i += 1) { if (await fetch(`${baseUrl}/rest/health`).then((r) => r.ok, () => false)) break; await wait(300); }
  const gqlAt = (url) => async (query, variables) => {
    const body = await (await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const gql = gqlAt(baseUrl), betaGql = gqlAt(betaUrl);
  await gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
  await gql(`mutation{checkAgentRuntimes}`);
  await gql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl: betaUrl, name: "beta-node" } });
  await betaGql(`mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}`, { i: { baseUrl, name: "claude-node" } });
  const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "haiku", llmConfig: null };
  const instructions = "You are a producer. Follow the user's requests. Keep your messages short.";
  const def = async (name, toolNames) => (await gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
    { i: { name, role: "assistant", description: "Coordinates work for the user", instructions, toolNames } })).createAgentDefinition.id;
  const run = async (definitionId) => {
    const created = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`,
      { i: { agentDefinitionId: definitionId, workspaceRootPath: workspace, autoExecuteTools: true, ...claude } })).createAgentRun;
    if (!created.success) throw new Error(created.message);
    return created.runId;
  };
  const state = { root, baseUrl, producerRunId: await run(await def("Claude Producer", ["list_available_nodes", "list_available_agents"])),
    plainRunId: await run(await def("Claude Plain", [])) };
  fs.writeFileSync(path.join(root, "state.json"), JSON.stringify(state, null, 2));
  log("READY", JSON.stringify(state));
} catch (error) {
  log("SETUP FAILED", error);
  await stop();
}
setInterval(() => undefined, 60_000);
