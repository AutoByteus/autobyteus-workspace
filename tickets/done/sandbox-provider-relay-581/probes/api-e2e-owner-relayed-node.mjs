#!/usr/bin/env node
// autobyteus-581 API/E2E probe API-L09 (SCN-005, UC-007, AC-001, AC-002, AC-007, REQ-001, REQ-011, persisted `role`):
// an owner-managed relayed node outside Docker. Value-free.
//
// Two test-owned BUILT nodes of this worktree on this computer, each with its own data root, HOME and database:
// - relay node A: the test vault (its keys), remote collaboration on;
// - node B: no keys at all (its own empty database vault, a throwaway HOME, so no CLI login of the user), remote
//   collaboration on.
// They pair by invite (the Nodes page's API). Then B's owner writes the relay settings into B's `.env`
// (AUTOBYTEUS_PROVIDER_RELAY_PEER = A's node ID, AUTOBYTEUS_PROVIDER_RELAYS) and restarts B. On B: runtime sign-ins,
// then one real turn each on native (Anthropic), Claude, Codex, Grok and DeepSeek Harness (the host's own CLIs). On A:
// one C5 line per relayed call with B's node ID and `apiKey`. A's peer record of B has no `role` (a normal peer). A
// value scan of B's data root, database files and HOME finds no test-vault secret. Before the settings, B's native
// provider is not configured (no key), so the relay is what makes B work.
//
//   AUTOBYTEUS_TEST_VAULT=<dir> node api-e2e-owner-relayed-node.mjs --output-dir=<dir>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const here = path.dirname(new URL(import.meta.url).pathname);
const worktree = path.resolve(here, "../../../..");
const serverRoot = path.join(worktree, "autobyteus-server-ts");
const WebSocket = createRequire(path.join(serverRoot, "package.json"))("ws");
const { startBuiltTestServer, removeOwnedTestRuntime, testRuntimeRoot } = await import(path.join(worktree, "test-support/live-e2e/test-runtime-bootstrap.mjs"));
const tsDist = path.join(worktree, "autobyteus-ts", "dist", "secrets", "vault");
const { openVerifiedTestVault } = await import(pathToFileURL(path.join(tsDist, "open-test-vault.js")).href);
const { readSecretEntry } = await import(pathToFileURL(path.join(tsDist, "read-secret-entry.js")).href);
const { FIXED_PROVIDER_SECRET_IDS } = await import(pathToFileURL(path.join(tsDist, "provider-secret-id.js")).href);
const { secretId } = await import(pathToFileURL(path.join(tsDist, "secret-id.js")).href);

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const outputDir = path.resolve(arg("output-dir", "/tmp/api581-owner-relayed"));
const vault = process.env.AUTOBYTEUS_TEST_VAULT;
if (!vault) { console.error("usage: AUTOBYTEUS_TEST_VAULT=<dir> node api-e2e-owner-relayed-node.mjs --output-dir=<dir>"); process.exit(2); }
fs.mkdirSync(outputDir, { recursive: true });
const t0 = Date.now();
const lines = [];
const log = (line) => { const text = `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${line}`; lines.push(text); process.stdout.write(`${text}\n`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const suffix = randomUUID().slice(0, 8);
const roots = { a: path.join(testRuntimeRoot, `api581-relay-a-${suffix}`), b: path.join(testRuntimeRoot, `api581-relayed-b-${suffix}`) };
const dbs = { a: `file:./db/api581-relay-a-${suffix}.db`, b: `file:./db/api581-relayed-b-${suffix}.db` };
const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "api581-owner-relayed-")));
const homes = { a: path.join(temp, "home-a"), b: path.join(temp, "home-b") };
for (const dir of Object.values(homes)) for (const sub of ["", "codex-home", "claude-config"]) fs.mkdirSync(path.join(dir, sub), { recursive: true });

const needles = [];
{
  const v = await openVerifiedTestVault(vault);
  for (const id of FIXED_PROVIDER_SECRET_IDS) {
    try {
      const value = (await readSecretEntry(v.store, v.rootKey, v.metadata, secretId(id))).revealToTrustedConsumer();
      for (const form of new Set([value, Buffer.from(value).toString("base64"), Buffer.from(value).toString("base64url")])) needles.push({ id, bytes: Buffer.from(form) });
    } catch { /* not configured */ }
  }
  v.close();
}

const summary = { startedAt: new Date().toISOString(), node: process.version, result: "Fail", checks: {}, error: null };
const started = {};
const start = async (name, extra, port = undefined) => {
  started[name] = await startBuiltTestServer({ runtimeRoot: roots[name], databaseUrlOverride: dbs[name], port,
    testVaultSetting: name === "a" ? vault : undefined,
    environment: { HOME: homes[name], ENABLE_REMOTE_COLLABORATION: "true", CLAUDE_CONFIG_DIR: path.join(homes[name], "claude-config"),
      CODEX_HOME: path.join(homes[name], "codex-home"), ...extra } });
  return started[name];
};
const url = (name) => `http://127.0.0.1:${started[name].port}`;
const gql = async (name, query, variables = {}) => {
  const body = await (await fetch(`${url(name)}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) throw new Error(`${name}: ${body.errors.map((e) => e.message).join("; ").slice(0, 400)}`);
  return body.data;
};
const turn = async (name, runId, content, timeoutMs = 240_000) => {
  const frames = [];
  const ws = new WebSocket(`${url(name).replace("http", "ws")}/ws/agent/${runId}?access_token=${encodeURIComponent(started[name].ownerCredential)}`);
  ws.on("message", (data) => { try { frames.push(JSON.parse(String(data))); } catch { /* ignore */ } });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const id = `probe-${randomUUID()}`;
  ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], content } }));
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !frames.some((f) => f.type === "TURN_COMPLETED" || (f.type === "ERROR" && f.payload?.error_effect !== "diagnostic"))) await sleep(250);
  ws.close();
  return { completed: frames.some((f) => f.type === "TURN_COMPLETED"),
    errors: frames.filter((f) => f.type === "ERROR").map((f) => `${f.payload?.code}: ${String(f.payload?.message ?? "").slice(0, 160)}`) };
};
const activity = () => {
  const file = path.join(roots.a, "provider-relays", "activity.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};

try {
  await start("a", {});
  await start("b", {});
  log("A and B up");
  const nativeBefore = (await gql("b", '{ providerCredentialSettings(runtimeKind: "autobyteus") { provider { id } apiKeyConfigured } }')).providerCredentialSettings
    .filter((s) => s.apiKeyConfigured).map((s) => s.provider.id);
  summary.checks.bNativeProvidersConfiguredBeforeRelay = nativeBefore;
  // Pairing by invite: A invites, B accepts (the Nodes page's own API).
  const invite = (await gql("a", "mutation { createPeerInvite { inviteText } }")).createPeerInvite.inviteText;
  await gql("b", "mutation($t: String!, $n: String!, $m: String) { acceptPeerInvite(inviteText: $t, name: $n, nameOnInviter: $m) { nodeId } }",
    { t: invite, n: "relay-a", m: "relayed-b" });
  const aPeers = (await gql("a", "{ peerNodes { nodeId name paired role } }")).peerNodes;
  const bPeers = (await gql("b", "{ peerNodes { nodeId name paired role } }")).peerNodes;
  const aId = bPeers.find((p) => p.name === "relay-a").nodeId;
  const bId = aPeers.find((p) => p.name === "relayed-b").nodeId;
  const rowOfB = JSON.parse(fs.readFileSync(path.join(roots.a, "remote-collaboration", "peers.json"), "utf8")).peers.find((p) => p.nodeId === bId);
  summary.checks.pairing = { aSeesB: aPeers.map((p) => ({ name: p.name, paired: p.paired, role: p.role })), bSeesA: bPeers.map((p) => ({ name: p.name, paired: p.paired, role: p.role })),
    roleKeyInAPeersJson: Object.prototype.hasOwnProperty.call(rowOfB, "role") };
  log(`paired: ${JSON.stringify(summary.checks.pairing)}`);

  // B's owner sets the relay in B's .env and restarts B.
  const bPort = started.b.port;
  await started.b.stop();
  fs.appendFileSync(path.join(roots.b, ".env"), `AUTOBYTEUS_PROVIDER_RELAY_PEER=${aId}\nAUTOBYTEUS_PROVIDER_RELAYS=anthropic,openai,xai,deepseek\n`);
  await start("b", {}, bPort);
  log("B restarted relayed");
  await gql("b", "mutation { checkAgentRuntimes }").catch(() => undefined);
  let states = [];
  for (let i = 0; i < 90; i += 1) {
    states = (await gql("b", "{ agentRuntimes { runtimeKind installed account { state } } }")).agentRuntimes;
    if (!states.some((r) => r.account?.state === "CHECKING")) break;
    await sleep(1000);
  }
  summary.checks.bRuntimeStates = Object.fromEntries(states.map((r) => [r.runtimeKind, r.installed ? r.account?.state : "NOT_INSTALLED"]));
  summary.checks.bNativeProvidersConfiguredRelayed = (await gql("b", '{ providerCredentialSettings(runtimeKind: "autobyteus") { provider { id } apiKeyConfigured } }')).providerCredentialSettings
    .filter((s) => s.apiKeyConfigured).map((s) => s.provider.id);
  log(`B states ${JSON.stringify(summary.checks.bRuntimeStates)}; native configured ${summary.checks.bNativeProvidersConfiguredRelayed}`);

  const pick = async (runtimeKind, wanted, provider = null) => {
    let models;
    if (provider) models = (await gql("b", "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }", { p: provider, r: runtimeKind })).ensureProviderModelCatalog.llmModels;
    else models = (await gql("b", "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: runtimeKind })).providerModelCatalogSnapshots.flatMap((s) => s.llmModels);
    return (models.find((m) => wanted.test(m.modelIdentifier)) ?? models[0])?.modelIdentifier ?? null;
  };
  const plan = [["autobyteus", /haiku/i, "ANTHROPIC"], ["claude_agent_sdk", /haiku/i], ["codex_app_server", /terra|mini|luna/i], ["grok_build", /fast|mini|non-reasoning/i], ["deepseek_harness", /flash/i]];
  summary.checks.turns = {};
  for (const [runtimeKind, wanted, provider] of plan) {
    const before = activity().length;
    try {
      const model = await pick(runtimeKind, wanted, provider ?? null);
      if (!model) { summary.checks.turns[runtimeKind] = { error: "no model offered" }; continue; }
      const def = (await gql("b", "mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }", { i: {
        name: `relayed-${runtimeKind}-${randomUUID().slice(0, 4)}`, role: "assistant", description: "probe", instructions: "Answer in one short line.",
        category: "test", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
      const created = (await gql("b", "mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }", { i: {
        agentDefinitionId: def, workspaceRootPath: homes.b, llmModelIdentifier: model, autoExecuteTools: false, runtimeKind, llmConfig: null } })).createAgentRun;
      if (!created.success) { summary.checks.turns[runtimeKind] = { model, refused: created.message.slice(0, 200) }; continue; }
      const answer = await turn("b", created.runId, "Reply with one short word.");
      const relayed = activity().slice(before);
      summary.checks.turns[runtimeKind] = { model, completed: answer.completed, errors: answer.errors,
        relayedLines: relayed.map((l) => `${l.relayId}/${l.relayCredentialKind} ${l.method} ${l.path} -> ${l.status ?? l.error}`),
        allFromB: relayed.every((l) => l.peerNodeId === bId) };
      log(`${runtimeKind} (${model}): ${answer.completed ? "TURN_COMPLETED" : "not completed"}; ${relayed.length} relayed lines`);
    } catch (error) {
      summary.checks.turns[runtimeKind] = { error: String(error.message ?? error).slice(0, 300) };
    }
  }
  // Value scan of everything B has on disk.
  const hits = {};
  let files = 0;
  const walk = (p) => { let st; try { st = fs.lstatSync(p); } catch { return; } if (st.isSymbolicLink()) return;
    if (st.isDirectory()) { for (const e of fs.readdirSync(p)) walk(path.join(p, e)); return; }
    if (!st.isFile() || st.size > 200 * 1024 * 1024) return; files += 1; const buf = fs.readFileSync(p);
    const found = [...new Set(needles.filter((n) => buf.indexOf(n.bytes) !== -1).map((n) => n.id))]; buf.fill(0); if (found.length) hits[p.replace(worktree, "<worktree>")] = found; };
  walk(roots.b); walk(homes.b);
  const dbPath = path.resolve(serverRoot, dbs.b.slice(5));
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}.secret.key`]) walk(f);
  summary.checks.bValueScan = { files, hits, needleIds: [...new Set(needles.map((n) => n.id))].length };
  const c5 = activity();
  summary.checks.c5Keys = [...new Set(c5.flatMap((l) => Object.keys(l)))].sort();
  const c5Text = Buffer.from(fs.readFileSync(path.join(roots.a, "provider-relays", "activity.jsonl")));
  summary.checks.c5SecretHits = [...new Set(needles.filter((n) => c5Text.indexOf(n.bytes) !== -1).map((n) => n.id))];
  const t = summary.checks.turns;
  const ok = ["autobyteus", "claude_agent_sdk", "codex_app_server", "grok_build", "deepseek_harness"].every((k) => t[k]?.completed && t[k].relayedLines.some((l) => /apiKey .* -> 200$/.test(l)) && t[k].allFromB);
  summary.result = ok && nativeBefore.length === 0 && Object.keys(hits).length === 0 && summary.checks.c5SecretHits.length === 0
    && !summary.checks.pairing.roleKeyInAPeersJson ? "Pass" : "Fail";
  log(`result ${summary.result}`);
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
  log(`FAILED: ${summary.error}`);
} finally {
  for (const name of ["b", "a"]) if (started[name]) { await started[name].stop().catch(() => undefined); await removeOwnedTestRuntime(started[name].runtimeRoot, started[name].database).catch(() => undefined); }
  fs.rmSync(temp, { recursive: true, force: true });
  for (const n of needles) n.bytes.fill(0);
  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "API-L09-owner-relayed-node.json"), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "API-L09-owner-relayed-node.log"), `${lines.join("\n")}\n`);
  process.exit(summary.result === "Pass" ? 0 : 1);
}
