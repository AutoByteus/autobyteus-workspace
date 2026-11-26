#!/usr/bin/env node
// autobyteus-484 probe: a fresh, throwaway server container with the test vault mounted read-only.
//
//   node sandbox-probe.mjs [--keep] [--smoke=<runtimeKind>:<modelIdentifier>] [--vault=<dir>] [--image=<ref>]
//
// Value-free by construction: the setup code and the owner credential live only in this process's memory
// (never in a command line, a file or the output); provider keys never leave the container's vault. Prints
// timings, states and booleans only. The container and its anonymous volumes are removed at the end
// unless --keep is given. It does not touch other containers, volumes or the user's data.
import { execFile } from "node:child_process";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const keep = process.argv.includes("--keep");
const smoke = arg("smoke", null);
const prompt = arg("prompt", "Reply with exactly: SANDBOX-OK");
const autoTools = process.argv.includes("--tools");
const scan = process.argv.includes("--scan");
const scanDuringTurn = process.argv.includes("--scan-during-turn");
const codexLogin = process.argv.includes("--codex-login");
const vaultDir = path.resolve(arg("vault", path.join(os.homedir(), ".autobyteus-test", "vault")));
const image = arg("image", "autobyteus/autobyteus-server:beta");
const name = `autobyteus-sandbox-484-${randomUUID().slice(0, 8)}`;
const VAULT_IN_CONTAINER = "/run/autobyteus-test-vault";
const SOCKET = "/home/autobyteus/data/node-access/local-control.sock";
const SETUP_CODE_JS = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));s.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});s.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write(r.setupCode)});s.on("error",()=>process.exit(1))';

const t0 = Date.now();
const since = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const log = (line) => process.stdout.write(`[${since()}] ${line}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts = {}) => new Promise((resolve) => {
  execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts }, (error, stdout, stderr) =>
    resolve({ code: error ? (error.code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) }));
});
const freePort = () => new Promise((resolve) => {
  const s = createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

let credential = null;
let baseUrl = null;
const gql = async (query, variables = {}) => {
  const response = await fetch(`${baseUrl}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => ({}));
  if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((e) => e.message).join("; ").slice(0, 300)}`);
  if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);
  return body.data;
};

const leakScan = async (when) => {
  await run("docker", ["cp", new URL("./leak-scan.mjs", import.meta.url).pathname, `${name}:/tmp/leak-scan.mjs`]);
  const r = await run("docker", ["exec", name, "node", "--no-warnings", "/tmp/leak-scan.mjs", "--proc-environ",
    "/home/autobyteus", "/root", "/var/log", "/tmp", "/app/autobyteus-server-ts/workspace"]);
  log(`leak scan ${when} (exit ${r.code}): ${(r.stdout + r.stderr).trim().replace(/\n/g, " | ").slice(0, 900)}`);
};

const cleanup = async () => {
  if (keep) { log(`kept container ${name} (remove with: docker rm -f -v ${name})`); return; }
  const r = await run("docker", ["rm", "-f", "-v", name]);
  log(`container removed with its anonymous volumes: ${r.code === 0}`);
};

try {
  const port = await freePort();
  baseUrl = `http://localhost:${port}`;
  const started = await run("docker", [
    "run", "-d", "--name", name, "--label", "autobyteus.sandbox=484",
    "-p", `127.0.0.1:${port}:8000`,
    "--mount", `type=bind,src=${vaultDir},dst=${VAULT_IN_CONTAINER},readonly`,
    "-e", `AUTOBYTEUS_TEST_VAULT=${VAULT_IN_CONTAINER}`,
    "-e", "CLAUDE_AGENT_SDK_AUTH_MODE=api-key",
    "-e", `AUTOBYTEUS_SERVER_HOST=${baseUrl}`,
    // Fresh anonymous volumes for every writable root the image uses; removed by `docker rm -v`.
    "-v", "/home/autobyteus/data", "-v", "/root", "-v", "/home/autobyteus/server-packages",
    "-v", "/app/autobyteus-server-ts/workspace", "-v", "/home/autobyteus/workspace",
    image,
  ]);
  if (started.code !== 0) throw new Error(`docker run failed: ${started.stderr.trim().slice(0, 300)}`);
  log(`container ${name} started on 127.0.0.1:${port}`);

  let setupCode = null;
  for (let attempt = 0; attempt < 120 && !setupCode; attempt += 1) {
    const r = await run("docker", ["exec", name, "node", "-e", SETUP_CODE_JS, SOCKET]);
    if (r.code === 0 && r.stdout.trim()) setupCode = r.stdout.trim(); else await sleep(1000);
  }
  if (!setupCode) throw new Error("no setup code within 120 s");
  log("node answered with a setup code (local control socket)");

  const exchange = await fetch(`${baseUrl}/rest/node-access/setup-exchanges`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ setupCode, desktopName: "sandbox-484-probe" }),
  });
  setupCode = null;
  const issued = await exchange.json().catch(() => ({}));
  if (exchange.status !== 201 || !issued.credential) throw new Error(`setup exchange HTTP ${exchange.status}`);
  credential = issued.credential;
  log("setup exchange: owner credential issued (kept in memory)");

  if (codexLogin) {
    await run("docker", ["cp", new URL("./codex-login-from-vault.mjs", import.meta.url).pathname, `${name}:/tmp/codex-login-from-vault.mjs`]);
    const r = await run("docker", ["exec", name, "node", "--no-warnings", "/tmp/codex-login-from-vault.mjs"]);
    log(`codex sign-in from the vault: ${(r.stdout + r.stderr).trim().slice(0, 200)}`);
  }

  const unauth = await fetch(`${baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"query":"{__typename}"}' });
  log(`GraphQL without credential: HTTP ${unauth.status}`);

  const logs = await run("docker", ["exec", name, "bash", "-lc",
    "grep -h -o -E 'Secret vault: [^\"]*|TEST_VAULT_[A-Z_]+|SECRET_VAULT_[A-Z_]+' /var/log/supervisor/autobyteus_server*.log /home/autobyteus/data/logs/*.log 2>/dev/null | sort | uniq -c | head -5"]);
  log(`server log vault lines: ${logs.stdout.trim().replace(/\n/g, " | ") || "(none found)"}`);

  const settings = await gql('query { providerCredentialSettings(runtimeKind: "autobyteus") { provider { id } apiKeyConfigured } }');
  const configured = settings.providerCredentialSettings.filter((s) => s.apiKeyConfigured).map((s) => s.provider.id);
  log(`providers with a key (from the vault): ${configured.join(", ") || "none"}`);

  const saveAttempt = await gql('mutation { updateServerSetting(key: "AUTOBYTEUS_SANDBOX_PROBE", value: "1") }').then(() => "ok", (e) => e.message.slice(0, 80));
  log(`ordinary server setting write (not the vault): ${saveAttempt}`);

  await gql("mutation { checkAgentRuntimes }").catch(() => undefined);
  let runtimes = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    runtimes = await gql("query { agentRuntimes { runtimeKind installed account { state } } }").catch((e) => ({ error: e.message.slice(0, 160) }));
    if (runtimes.error || !runtimes.agentRuntimes.some((r) => r.account?.state === "CHECKING")) break;
    await sleep(1000);
  }
  log(`agent runtimes sign-in: ${runtimes.error ?? runtimes.agentRuntimes.map((r) => `${r.runtimeKind}=${r.installed ? r.account?.state : "not installed"}`).join(", ")}`);

  if (smoke) {
    // --smoke=<runtimeKind>:<modelIdentifier>, or --smoke=autobyteus:<PROVIDER>:<model value> (resolved from the catalog)
    const [runtimeKind, ...modelParts] = smoke.split(":");
    let modelIdentifier = modelParts.join(":");
    if (modelParts.length === 2) {
      const catalog = await gql("mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value } } }",
        { p: modelParts[0], r: runtimeKind });
      const models = catalog.ensureProviderModelCatalog.llmModels;
      const found = models.find((m) => m.value === modelParts[1] || m.modelIdentifier === modelParts[1]);
      if (!found) throw new Error(`model ${modelParts[1]} not in ${modelParts[0]} catalog (${models.map((m) => m.value).slice(0, 12).join(", ")})`);
      modelIdentifier = found.modelIdentifier;
    }
    const def = await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
      input: { name: `sandbox-smoke-${randomUUID().slice(0, 6)}`, role: "assistant", description: "autobyteus-484 sandbox smoke",
        instructions: "Answer in one short line.", category: "sandbox", toolNames: [], skillNames: [] } });
    const created = await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
      input: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: "/home/autobyteus/workspace",
        llmModelIdentifier: modelIdentifier, autoExecuteTools: autoTools, runtimeKind, llmConfig: null } });
    if (!created.createAgentRun.success) throw new Error(`createAgentRun: ${created.createAgentRun.message}`);
    const runId = created.createAgentRun.runId;
    const frames = [];
    const ws = new WebSocket(`ws://localhost:${port}/ws/agent/${runId}?access_token=${encodeURIComponent(credential)}`);
    ws.onmessage = (event) => { try { frames.push(JSON.parse(String(event.data))); } catch { /* ignore */ } };
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("WebSocket error")); });
    const turnStart = Date.now();
    const messageId = `sandbox-${randomUUID()}`;
    ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: messageId, dedupe_key: `agent_run_input:sandbox:${messageId}`,
      context_file_paths: [], image_urls: [], content: prompt } }));
    if (scanDuringTurn) { await sleep(2500); await leakScan("during the turn"); }
    const deadline = Date.now() + 180_000;
    let done = null;
    while (!done && Date.now() < deadline) {
      done = frames.find((f) => f.type === "TURN_COMPLETED" || f.type === "ERROR");
      if (!done) await sleep(300);
    }
    const text = JSON.stringify(frames);
    const answer = (text.match(/ENVLEN=\\?"?(\d+)/) ?? [])[1];
    log(`smoke ${runtimeKind}/${modelIdentifier}: ${done ? done.type : "TIMEOUT"} in ${((Date.now() - turnStart) / 1000).toFixed(1)}s; reply contains SANDBOX-OK: ${text.includes("SANDBOX-OK")}${answer !== undefined ? `; agent shell saw ANTHROPIC_API_KEY length ${answer}` : ""}`);
    if (done?.type === "ERROR") log(`smoke error: ${JSON.stringify(done.payload).slice(0, 300)}`);
    ws.close();
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
  }

  if (scan) await leakScan("after the run");
  const size = await run("docker", ["ps", "-a", "--size", "--filter", `name=${name}`, "--format", "{{.Size}}"]);
  log(`container writable layer: ${size.stdout.trim()}`);
  const vol = await run("docker", ["exec", name, "du", "-sh", "/home/autobyteus/data", "/root"]);
  log(`fresh volumes used: ${vol.stdout.trim().replace(/\s+/g, " ")}`);
} catch (error) {
  log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  credential = null;
  await cleanup();
}
