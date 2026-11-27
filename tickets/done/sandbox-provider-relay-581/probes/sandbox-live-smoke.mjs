#!/usr/bin/env node
// autobyteus-581 implementation probe (not a test suite): one sandbox end to end on this Mac, value-free.
//
// A test-owned BUILT host node (this worktree's dist, the test vault, a test-owned data root, remote collaboration on)
// runs a scripted Antigravity agent that has the three sandbox tools and calls them for real (CALL_TOOL). The sandbox
// starts from AUTOBYTEUS_SANDBOX_IMAGE (an image with this worktree's server package). The probe then connects to the
// sandbox node itself (its setup code over docker exec), reads its runtime sign-ins and native provider settings, runs one
// short real turn per runtime INSIDE the sandbox (its calls go through the host's relay), reads the host's provider relay
// activity, runs a command and destroys the sandbox through the agent, and checks that nothing is left.
//
//   node sandbox-live-smoke.mjs --image=<tag> [--login-tokens] [--runtimes=autobyteus,claude_agent_sdk,codex_app_server,grok_build,deepseek_harness]
//
// --login-tokens: the host's AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS=true, and its HOME holds links to the user's own
// ~/.codex/auth.json and ~/.grok/auth.json (read for this probe only, never renewed: DEC-108), so Codex and Grok in the
// sandbox run on those logins. Needs AUTOBYTEUS_TEST_VAULT. Prints states, codes, counts and timings only.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const here = path.dirname(new URL(import.meta.url).pathname);
const worktree = path.resolve(here, "../../../..");
const serverRoot = path.join(worktree, "autobyteus-server-ts");
const WebSocket = createRequire(path.join(serverRoot, "package.json"))("ws");
const { startBuiltTestServer, executeGraphql, removeOwnedTestRuntime } = await import(path.join(worktree, "test-support/live-e2e/test-runtime-bootstrap.mjs"));

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const image = arg("image", null);
const loginTokens = process.argv.includes("--login-tokens");
const runtimes = arg("runtimes", "autobyteus,claude_agent_sdk,codex_app_server,grok_build,deepseek_harness").split(",");
const vault = process.env.AUTOBYTEUS_TEST_VAULT;
if (!image || !vault) { console.error("usage: AUTOBYTEUS_TEST_VAULT=<dir> node sandbox-live-smoke.mjs --image=<tag>"); process.exit(2); }

const t0 = Date.now();
const log = (line) => process.stdout.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${line}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, { maxBuffer: 16 * 1024 * 1024 },
  (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) })));

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-smoke-home-")));
if (loginTokens) {
  for (const [dir, file] of [[".codex", "auth.json"], [".grok", "auth.json"]]) {
    const real = path.join(os.homedir(), dir, file);
    if (!fs.existsSync(real)) { log(`no ${dir}/${file}: that login-token check is skipped`); continue; }
    fs.mkdirSync(path.join(home, dir), { recursive: true });
    fs.symlinkSync(real, path.join(home, dir, file));
  }
}
const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-smoke-package-"));
fs.mkdirSync(path.join(packageDir, "agents", "sandbox-greeter"), { recursive: true });
fs.writeFileSync(path.join(packageDir, "agents", "sandbox-greeter", "agent.md"),
  "---\nname: Sandbox Greeter\ndescription: Answers in one short line.\ncategory: test\nrole: greeter\n---\n\nAnswer in one short line.\n");
fs.writeFileSync(path.join(packageDir, "agents", "sandbox-greeter", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
const sharedDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-smoke-shared-"));
fs.writeFileSync(path.join(sharedDir, "input.txt"), "shared input\n");

let host = null;
let sandboxId = null;
try {
  host = await startBuiltTestServer({
    testVaultSetting: vault,
    environment: {
      HOME: home, USER: process.env.USER ?? "", LOGNAME: process.env.LOGNAME ?? "", PATH: process.env.PATH,
      ENABLE_REMOTE_COLLABORATION: "true",
      AUTOBYTEUS_SANDBOX_IMAGE: image,
      ANTIGRAVITY_CLI_COMMAND: path.join(serverRoot, "tests/fixtures/agy-failure-cli.mjs"), AGY_FAKE_CASE: "linked_skills",
      ...(loginTokens ? { AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS: "true", CODEX_HOME: path.join(home, ".codex") } : {}),
    },
  });
  const hostUrl = `http://127.0.0.1:${host.port}`;
  for (let i = 0; i < 120; i += 1) {
    const ok = await fetch(`${hostUrl}/rest/health`).then((r) => r.ok, () => false);
    if (ok) break;
    await sleep(500);
  }
  log(`host node up at ${hostUrl} (data ${host.runtimeRoot ? "test-owned" : "?"})`);
  const gql = async (url, query, variables = {}, credential = null) => {
    const response = await fetch(`${url}/graphql`, { method: "POST",
      headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
      body: JSON.stringify({ query, variables }) });
    const body = await response.json().catch(() => ({}));
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((e) => e.message).join("; ").slice(0, 400)}`);
    return body.data;
  };

  // The evaluator on the host: a scripted Antigravity agent with the three tools.
  const def = await gql(hostUrl, "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
    input: { name: `evaluator-${randomUUID().slice(0, 6)}`, role: "evaluator", description: "581 probe", instructions: "Use the tools.",
      category: "test", toolNames: ["create_sandbox", "run_in_sandbox", "destroy_sandbox"], skillNames: [] } });
  const evaluator = (await gql(hostUrl, "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
    input: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: home, llmModelIdentifier: "gemini-3.8-flash-low",
      autoExecuteTools: true, runtimeKind: "antigravity_cli", llmConfig: null } })).createAgentRun;
  if (!evaluator.success) throw new Error(`evaluator run: ${evaluator.message}`);
  const turn = async (url, runId, content, credential, timeoutMs = 300_000) => {
    const frames = [];
    const ws = new WebSocket(`${url.replace("http", "ws")}/ws/agent/${runId}?access_token=${encodeURIComponent(credential)}`);
    ws.on("message", (data) => { try { frames.push(JSON.parse(String(data))); } catch { /* ignore */ } });
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    const id = `probe-${randomUUID()}`;
    ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], content } }));
    const deadline = Date.now() + timeoutMs;
    let done = null;
    while (!done && Date.now() < deadline) {
      done = frames.find((f) => f.type === "TURN_COMPLETED" || (f.type === "ERROR" && f.payload?.error_effect !== "diagnostic"));
      if (!done) await sleep(300);
    }
    ws.close();
    const errors = frames.filter((f) => f.type === "ERROR").map((f) => `${f.payload?.code}:${String(f.payload?.message ?? "").slice(0, 80)}:${f.payload?.error_effect}`);
    const completed = frames.some((f) => f.type === "TURN_COMPLETED");
    return { done: completed ? "TURN_COMPLETED" : (done?.type ?? "TIMEOUT"), text: JSON.stringify(frames), error: errors.length ? errors.join(" | ") : null };
  };
  const tool = (name, args) => turn(hostUrl, evaluator.runId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, host.ownerCredential);
  const records = () => JSON.parse(fs.readFileSync(path.join(host.runtimeRoot, "sandboxes", "sandboxes.json"), "utf8")).sandboxes;

  const created = await tool("create_sandbox", { agentPackages: [packageDir], sharedFolders: [{ path: sharedDir, name: "inputs" }], lifetimeMinutes: 30 });
  const record = fs.existsSync(path.join(host.runtimeRoot, "sandboxes", "sandboxes.json")) ? records()[0] : null;
  log(`create_sandbox turn: ${created.done}; record state: ${record?.state ?? "none"}; tool error codes: ${(created.text.match(/SANDBOX_[A-Z_]+/g) ?? []).join(",") || "none"}`);
  if (!record || record.state !== "ready") throw new Error(`no ready sandbox ${created.error ?? ""}`);
  sandboxId = record.sandboxId;
  log(`sandbox ${sandboxId} ready ${Math.round((Date.parse(record.createdAt) ? Date.now() - Date.parse(record.createdAt) : 0) / 1000)}s after its record; image ${record.image}`);
  log(`result names the imported agent: ${created.text.includes("Sandbox Greeter")}; shared folder in result: ${created.text.includes("/home/autobyteus/shared/inputs")}`);
  const peers = (await gql(hostUrl, "{ peerNodes { name paired role } }")).peerNodes;
  log(`host peers: ${peers.map((p) => `${p.name}:${p.paired ? "paired" : "unpaired"}:${p.role ?? "normal"}`).join(", ")}`);

  // The sandbox node itself, with its own owner credential (the probe's, in memory only).
  const container = `autobyteus-${sandboxId}`;
  const env = await run("docker", ["exec", container, "sh", "-c", "env | cut -d= -f1 | sort | tr '\\n' ' '"]);
  log(`sandbox environment names: ${env.stdout.trim()}`);
  const relayEnv = await run("docker", ["exec", container, "sh", "-c", "echo RELAYS=$AUTOBYTEUS_PROVIDER_RELAYS LOGIN=$AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES"]);
  log(`sandbox C1: ${relayEnv.stdout.trim()}`);
  const SETUP = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));s.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});s.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write(r.setupCode)});s.on("error",()=>process.exit(1))';
  const code = (await run("docker", ["exec", container, "node", "-e", SETUP, "/home/autobyteus/data/node-access/local-control.sock"])).stdout.trim();
  const sandboxUrl = `http://127.0.0.1:${record.hostPort}`;
  const issued = await (await fetch(`${sandboxUrl}/rest/node-access/setup-exchanges`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ setupCode: code, desktopName: "581 probe" }) })).json();
  const cred = issued.credential;
  await gql(sandboxUrl, "mutation { checkAgentRuntimes }", {}, cred).catch(() => undefined);
  let states = null;
  for (let i = 0; i < 60; i += 1) {
    states = (await gql(sandboxUrl, "{ agentRuntimes { runtimeKind installed account { state } } }", {}, cred)).agentRuntimes;
    if (!states.some((r) => r.account?.state === "CHECKING")) break;
    await sleep(1000);
  }
  log(`sandbox runtime sign-ins: ${states.map((r) => `${r.runtimeKind}=${r.installed ? r.account?.state : "not installed"}`).join(", ")}`);
  const natives = (await gql(sandboxUrl, '{ providerCredentialSettings(runtimeKind: "autobyteus") { provider { id } apiKeyConfigured } }', {}, cred)).providerCredentialSettings;
  log(`sandbox native providers usable (R-E): ${natives.filter((s) => s.apiKeyConfigured).map((s) => s.provider.id).join(", ")}`);

  const MODELS = { autobyteus: ["ANTHROPIC", /haiku/i], claude_agent_sdk: [null, /haiku/i], codex_app_server: [null, /terra|mini|luna/i], grok_build: [null, /fast|mini|grok/i], deepseek_harness: [null, /flash/i] };
  for (const runtimeKind of runtimes) {
    try {
      const [provider, wanted] = MODELS[runtimeKind];
      let models = [];
      if (provider) {
        models = (await gql(sandboxUrl, "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }", { p: provider, r: runtimeKind }, cred)).ensureProviderModelCatalog.llmModels;
      } else {
        const snapshots = (await gql(sandboxUrl, "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: runtimeKind }, cred)).providerModelCatalogSnapshots;
        models = snapshots.flatMap((s) => s.llmModels);
      }
      const model = models.find((m) => wanted.test(m.modelIdentifier)) ?? models[0];
      if (!model) { log(`${runtimeKind}: no model offered in the sandbox`); continue; }
      const d = await gql(sandboxUrl, "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
        input: { name: `smoke-${runtimeKind}-${randomUUID().slice(0, 4)}`, role: "assistant", description: "581 probe", instructions: "Answer in one short line.", category: "test", toolNames: [], skillNames: [] } }, cred);
      const r = (await gql(sandboxUrl, "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
        input: { agentDefinitionId: d.createAgentDefinition.id, workspaceRootPath: "/home/autobyteus/workspace", llmModelIdentifier: model.modelIdentifier,
          autoExecuteTools: false, runtimeKind, llmConfig: null } }, cred)).createAgentRun;
      if (!r.success) { log(`${runtimeKind}: run refused: ${r.message.slice(0, 200)}`); continue; }
      const started = Date.now();
      const answer = await turn(sandboxUrl, r.runId, "Reply with exactly: SANDBOX-OK", cred, 240_000);
      log(`${runtimeKind} (${model.modelIdentifier}) in the sandbox: ${answer.done} in ${((Date.now() - started) / 1000).toFixed(1)}s; SANDBOX-OK: ${answer.text.includes("SANDBOX-OK")}${answer.error ? `; error: ${answer.error}` : ""}`);
    } catch (error) {
      log(`${runtimeKind}: probe step failed: ${error instanceof Error ? error.message.slice(0, 300) : String(error)}`);
    }
  }

  const activityFile = path.join(host.runtimeRoot, "provider-relays", "activity.jsonl");
  const lines = fs.existsSync(activityFile) ? fs.readFileSync(activityFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const summary = {};
  for (const line of lines) { const key = `${line.relayId}/${line.relayCredentialKind}/${line.status ?? line.error}`; summary[key] = (summary[key] ?? 0) + 1; }
  log(`host relay activity (C5): ${JSON.stringify(summary)}; keys per line: ${[...new Set(lines.flatMap((l) => Object.keys(l)))].sort().join(",")}`);
  const paths = {};
  for (const line of lines) { const key = `${line.relayId}/${line.relayCredentialKind} ${line.method} ${line.path} -> ${line.status ?? line.error}`; paths[key] = (paths[key] ?? 0) + 1; }
  log(`host relay calls by path: ${JSON.stringify(paths)}`);

  const listed = await tool("run_in_sandbox", { sandboxId, argv: ["sh", "-c", "cat /home/autobyteus/shared/inputs/input.txt && touch /home/autobyteus/shared/inputs/x 2>&1; echo exit=$?"] });
  log(`run_in_sandbox: ${listed.done}; read the shared file: ${listed.text.includes("shared input")}; write refused: ${/Read-only file system/.test(listed.text)}`);
  const destroyed = await tool("destroy_sandbox", { sandboxId });
  const left = await run("docker", ["ps", "-a", "--filter", `label=autobyteus.sandbox=${sandboxId}`, "--format", "{{.Names}}"]);
  const peersAfter = (await gql(hostUrl, "{ peerNodes { name role } }")).peerNodes;
  log(`destroy_sandbox: ${destroyed.done}; containers left: ${left.stdout.trim() || "none"}; sandbox peers left: ${peersAfter.filter((p) => p.role === "sandbox").length}; records left: ${records().length}; folders kept: ${fs.existsSync(record.workspaceFolder)}`);
  sandboxId = null;
} catch (error) {
  log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  if (host) log(`host output tail: ${host.output().split("\n").filter((l) => /error|Error|SANDBOX|RELAY/.test(l)).slice(-12).join(" | ").slice(0, 2000)}`);
  process.exitCode = 1;
} finally {
  if (sandboxId) await run("docker", ["rm", "-f", "-v", `autobyteus-${sandboxId}`]);
  if (host) { await host.stop().catch(() => undefined); await removeOwnedTestRuntime(host.runtimeRoot, host.database).catch(() => undefined); }
  for (const dir of [home, packageDir, sharedDir]) fs.rmSync(dir, { recursive: true, force: true });
  log("cleaned up");
}
