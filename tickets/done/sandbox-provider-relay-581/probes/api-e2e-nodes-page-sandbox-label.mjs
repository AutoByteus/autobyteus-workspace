#!/usr/bin/env node
// autobyteus-581 API/E2E probe API-L11 (AC-015 rendered): the host's Nodes page labels a sandbox peer "sandbox" and a
// normal peer not. Value-free.
//
// A test-owned built host node (this worktree's dist, its own data root and HOME, remote collaboration on, the scripted
// AGY evaluator, AUTOBYTEUS_SANDBOX_IMAGE) creates a real sandbox through the `create_sandbox` tool. A second built node
// is paired with the host as a normal peer. The web app runs with `nuxt dev` against the host (browser mode) and headless
// Chrome opens Nodes → Manage Nodes. The probe asserts the DOM: one `node-sandbox-label-*` chip, on the sandbox's row,
// reading "sandbox"; none on the normal peer's row. Then the evaluator destroys the sandbox and the label's row goes.
//
//   node api-e2e-nodes-page-sandbox-label.mjs --image=<tag> --output-dir=<dir>
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const here = path.dirname(new URL(import.meta.url).pathname);
const worktree = path.resolve(here, "../../../..");
const webDir = path.join(worktree, "autobyteus-web");
const serverDir = path.join(worktree, "autobyteus-server-ts");
const appEntry = path.join(serverDir, "dist", "app.js");
const requireWeb = createRequire(path.join(webDir, "package.json"));
const { chromium } = requireWeb("playwright-core");
const WebSocket = createRequire(path.join(serverDir, "package.json"))("ws");
const { attachToBrowserContext, ownerHeaders, pairNodes, probeNodeEnvironment, ownerSocketUrl } = await import(path.join(webDir, "tests/e2e/fixtures/probe-node-access.mjs"));

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const image = arg("image", null);
const outputDir = path.resolve(arg("output-dir", "/tmp/api581-nodes-page"));
if (!image) { console.error("usage: node api-e2e-nodes-page-sandbox-label.mjs --image=<tag> --output-dir=<dir>"); process.exit(2); }
const executablePath = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (label, fn, ms = 120_000) => {
  const deadline = Date.now() + ms;
  let last;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch (error) { last = error; } await sleep(250); }
  throw new Error(`timed out: ${label}${last ? ` (${last.message})` : ""}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = (child) => child.exitCode !== null || child.signalCode !== null;
const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, (error, stdout) => resolve({ code: error ? 1 : 0, stdout: String(stdout) })));

const evidence = { startedAt: new Date().toISOString(), node: process.version, image, result: "Fail", checks: {}, browserErrors: [], cleanup: {}, error: null };
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "api581-nodes-page-")));
const children = new Set();
let frontend;
let browser;
let hostNodeId = "";
await fs.mkdir(outputDir, { recursive: true });
const frontendPort = await freePort();
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

const startServer = async (name, extra = {}) => {
  const port = await freePort();
  const dataDir = path.join(root, name, "data");
  const home = path.join(root, name, "home");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`));
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir], {
    cwd: serverDir, stdio: ["ignore", "pipe", "pipe"],
    env: { PATH: process.env.PATH, HOME: home, USER: process.env.USER, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: "test", LOG_LEVEL: "WARN",
      HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl, ENABLE_REMOTE_COLLABORATION: "true",
      ...extra, ...probeNodeEnvironment() } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  children.add(child);
  await waitFor(`${name} health`, async () => {
    if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
    return fetch(`${baseUrl}/rest/health`).then((r) => r.ok).catch(() => false);
  });
  const gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: "POST", headers: ownerHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${body.errors.map((e) => e.message).join("; ").slice(0, 300)}`);
    return body.data;
  };
  return { name, port, baseUrl, dataDir, home, child, gql };
};

const callTool = async (server, runId, name, args) => {
  const frames = [];
  const ws = new WebSocket(ownerSocketUrl(`${server.baseUrl.replace("http", "ws")}/ws/agent/${runId}`));
  ws.on("message", (data) => { try { frames.push(JSON.parse(String(data))); } catch { /* ignore */ } });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const id = `probe-${randomUUID()}`;
  ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [],
    content: `CALL_TOOL:${JSON.stringify({ name, arguments: args })}` } }));
  await waitFor(`${name} turn`, () => frames.some((f) => f.type === "TURN_COMPLETED" || (f.type === "ERROR" && f.payload?.error_effect !== "diagnostic")), 180_000);
  ws.close();
  return JSON.stringify(frames);
};

try {
  if (!existsSync(appEntry)) throw new Error("build the server first");
  const host = await startServer("host", { AUTOBYTEUS_SANDBOX_IMAGE: image,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, "tests/fixtures/agy-failure-cli.mjs"), AGY_FAKE_CASE: "linked_skills" });
  const peer = await startServer("peer");
  await pairNodes({ inviter: peer.gql, accepter: host.gql, inviterName: "plain-peer", accepterName: "host-node" });

  const packageDir = path.join(root, "package");
  await fs.mkdir(path.join(packageDir, "agents", "label-check"), { recursive: true });
  await fs.writeFile(path.join(packageDir, "agents", "label-check", "agent.md"), "---\nname: Label Check\ndescription: Probe agent.\ncategory: test\nrole: worker\n---\n\nAnswer briefly.\n");
  await fs.writeFile(path.join(packageDir, "agents", "label-check", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
  const def = (await host.gql("mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }", { i: {
    name: "label-evaluator", role: "evaluator", description: "probe", instructions: "Use the tools.", category: "test",
    toolNames: ["create_sandbox", "run_in_sandbox", "destroy_sandbox"], skillNames: [] } })).createAgentDefinition.id;
  const evaluator = (await host.gql("mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }", { i: {
    agentDefinitionId: def, workspaceRootPath: host.home, llmModelIdentifier: "gemini-3.8-flash-low", autoExecuteTools: true,
    runtimeKind: "antigravity_cli", llmConfig: null } })).createAgentRun.runId;
  await callTool(host, evaluator, "create_sandbox", { agentPackages: [packageDir] });
  const peers = (await host.gql("{ peerNodes { nodeId name paired role } }")).peerNodes;
  const sandboxPeer = peers.find((p) => p.role === "sandbox");
  if (!sandboxPeer) throw new Error(`no sandbox peer: ${JSON.stringify(peers.map((p) => p.role))}`);
  hostNodeId = JSON.parse((await run("docker", ["inspect", `autobyteus-${sandboxPeer.name}`, "--format", "{{json .Config.Labels}}"])).stdout)["autobyteus.sandbox.host"];
  evidence.checks.hostPeers = peers.map((p) => ({ name: p.name, paired: p.paired, role: p.role }));

  const frontendLog = createWriteStream(path.join(outputDir, "frontend.log"));
  frontend = spawn("corepack", ["pnpm", "dev", "--host", "127.0.0.1", "--port", String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "development", BACKEND_NODE_BASE_URL: host.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor("frontend", async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(`${frontendUrl}/nodes?nodeTab=manage`).then((r) => r.ok).catch(() => false);
  }, 300_000);
  browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-US", timezoneId: "UTC" });
  await attachToBrowserContext(context);
  await context.addInitScript(() => localStorage.setItem("autobyteus.localization.preference-mode", "en"));
  const page = await context.newPage();
  page.on("pageerror", (error) => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") evidence.browserErrors.push(`console: ${message.text().slice(0, 300)}`); });
  // Warm the dev server, then load the page fresh.
  await page.goto(`${frontendUrl}/nodes?nodeTab=manage`, { waitUntil: "networkidle", timeout: 300_000 });
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  const label = page.locator('[data-testid^="node-sandbox-label-"]');
  await label.first().waitFor({ state: "visible", timeout: 120_000 });
  await page.screenshot({ path: path.join(outputDir, "API-L11-nodes-page-sandbox-label.png"), fullPage: true });
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="node-sandbox-label-"]')].map((chip) => {
    const key = chip.getAttribute("data-testid").replace("node-sandbox-label-", "");
    const row = chip.closest("li, [data-testid^='node-row-']") ?? chip.parentElement?.parentElement;
    return { key, text: chip.textContent.trim(), rowText: (row?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200) };
  }));
  const pageText = await page.evaluate(() => document.body.innerText);
  evidence.checks.labels = rows;
  evidence.checks.sandboxNameShown = pageText.includes(sandboxPeer.name);
  evidence.checks.plainPeerShown = pageText.includes("plain-peer");
  const plainRowHasLabel = rows.some((r) => r.rowText.includes("plain-peer"));
  evidence.checks.plainPeerLabelled = plainRowHasLabel;
  const ok1 = rows.length === 1 && rows[0].text === "sandbox" && rows[0].rowText.includes(sandboxPeer.name) && evidence.checks.plainPeerShown && !plainRowHasLabel;

  await callTool(host, evaluator, "destroy_sandbox", { sandboxId: sandboxPeer.name });
  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  await waitFor("plain peer row after destroy", async () => (await page.evaluate(() => document.body.innerText)).includes("plain-peer"), 60_000);
  await sleep(2_000);
  evidence.checks.labelsAfterDestroy = await page.locator('[data-testid^="node-sandbox-label-"]').count();
  evidence.checks.sandboxNameAfterDestroy = (await page.evaluate(() => document.body.innerText)).includes(sandboxPeer.name);
  await page.screenshot({ path: path.join(outputDir, "API-L11-nodes-page-after-destroy.png"), fullPage: true });
  const ok2 = evidence.checks.labelsAfterDestroy === 0 && !evidence.checks.sandboxNameAfterDestroy;
  evidence.result = ok1 && ok2 ? "Pass" : "Fail";
} catch (error) {
  evidence.error = error instanceof Error ? error.message : String(error);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, "SIGTERM"); } catch { /* gone */ }
    await Promise.race([new Promise((resolve) => frontend.once("close", resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, "SIGKILL"); } catch { /* gone */ } }
  }
  if (hostNodeId) {
    const left = (await run("docker", ["ps", "-aq", "--filter", `label=autobyteus.sandbox.host=${hostNodeId}`])).stdout.trim().split("\n").filter(Boolean);
    for (const id of left) await run("docker", ["rm", "-f", "-v", id]);
    evidence.cleanup.containersRemovedByFailsafe = left.length;
  }
  for (const child of children) { if (!exited(child)) { child.kill("SIGTERM"); await Promise.race([new Promise((r) => child.once("close", r)), sleep(10_000)]); if (!exited(child)) child.kill("SIGKILL"); } }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup.rootRemoved = !existsSync(root);
  evidence.cleanup.frontendExited = !frontend || exited(frontend);
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, "API-L11-nodes-page-sandbox-label.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`API-L11: ${evidence.result}${evidence.error ? ` (${evidence.error})` : ""}`);
  process.exit(evidence.result === "Pass" ? 0 : 1);
}
