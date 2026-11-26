/**
 * Sandbox nodes end to end on this computer (autobyteus-581): a test-owned BUILT host node (this worktree's
 * `dist/app.js`, the test vault, its own data root and database, remote collaboration on) and real sandboxes from an
 * image that runs this worktree's server package. Real tool calls (the scripted AGY evaluator sends `CALL_TOOL:`),
 * real Docker, real pairing over Docker's network, real provider calls through the host's relay. Value-free: no key,
 * token, credential, pass or setup code is printed or stored.
 *
 * Cases (in order; the first four share one sandbox):
 * - SBX-01 (AC-008, QR-001, AC-009, AC-001, AC-007, AC-006, AC-015 role, AC-002): `create_sandbox` with a package and a
 *   read-only shared folder is ready in ≤ 90 s with the C7 result; the host marks the peer `sandbox`; the sandbox
 *   answers from the internet, reaches the host and finds it available as a peer; its relayed runtimes are signed in;
 *   one real turn each on native, Claude, Codex and Grok in the sandbox, each with relayed `apiKey` 200 lines in the
 *   host's C5 log (exact keys); and the unrelayed host's own native and Claude turns go direct (no C5 line).
 * - SBX-02 (QR-002): time to the first streamed content of the same native model, host direct vs. in the sandbox,
 *   5 turns each, alternating; the medians differ by ≤ 1 s.
 * - SBX-03 (AC-011, AC-015, AC-010, QR-003): the evaluator delegates to the sandbox's imported agent (native, through
 *   the relay); it writes a file and answers the evaluator with it; the answer and the file arrive on the host; the
 *   file and the run's transcript are on the host in the mapped folders; a value scan of everything the sandbox wrote
 *   (`docker diff` paths and its volumes), its mapped folders, every process's environment and command line, the
 *   host's C5 log and the evaluator's tool results finds no test-vault secret and not the host's owner credential.
 * - SBX-04 (AC-012, AC-011): another run of the host is refused `run_in_sandbox` and `destroy_sandbox`
 *   (`SANDBOX_NOT_YOURS`); then the creator destroys it: no container, no anonymous volume, no peer, no record;
 *   the folders stay, with the runs' transcripts.
 * - SBX-05 (AC-003, SCN-A2): the host removes a running sandbox's peer; the sandbox's next native turn fails with
 *   `RELAY_PEER_NOT_ACCEPTED` and no C5 line is written (nothing reached a provider); destroy still cleans up.
 * - SBX-06 (AC-013 expiry): a 1-minute sandbox is removed at its expiry, folders kept.
 * - SBX-07 (AC-013 restart, R-A): two sandboxes alive, the host is killed, one sandbox's record is lost while it is
 *   down; at the next start both containers and both sandbox peers are removed, folders kept.
 * - SBX-08 (AC-014, R-B): five runs create a sandbox at the same time: exactly four are ready and one is refused
 *   `SANDBOX_LIMIT_REACHED` with nothing created; with remote collaboration off, and with the home folder shared,
 *   creation is refused with its code and nothing is created.
 *
 * Gate: RUN_SANDBOX_LIVE_E2E=1, Docker Desktop on macOS, AUTOBYTEUS_TEST_VAULT (the relayed calls spend the vault's
 * Anthropic, OpenAI and xAI keys), a built server (`pnpm -C autobyteus-server-ts build`) and SANDBOX_LIVE_E2E_IMAGE: an
 * image running this worktree's server package (TESTING.md, Sandbox nodes), for example
 *   docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package \
 *     --platform linux/arm64 --load -t <package tag> .
 *   printf 'FROM <package tag> AS pkg\nFROM autobyteus/autobyteus-server:beta\nCOPY --from=pkg / /opt/autobyteus/server-package/\n' \
 *     > <dir>/Dockerfile && docker build -t <tag> <dir>
 * (A `--output type=local` export of the package can stall on Docker Desktop; loading it as an image does not.)
 * The evaluator is the scripted AGY (`tests/fixtures/agy-failure-cli.mjs`); each tool result is the one it got, read
 * from its tool log (AGY_FAKE_TOOL_LOG).
 * Command (repository root; about 15 minutes):
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" \
 *     AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_SANDBOX_LIVE_E2E=1 SANDBOX_LIVE_E2E_IMAGE=<tag> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/sandboxes/sandbox-live.e2e.test.ts --no-watch
 * SANDBOX_LIVE_E2E_EVIDENCE_DIR (optional) keeps one value-free JSON summary per case. Afterwards
 * `docker ps -a --filter label=autobyteus.sandbox` shows none of this test's containers.
 */
import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openVerifiedTestVault } from "autobyteus-ts/secrets/vault/open-test-vault.js";
import { readSecretEntry } from "autobyteus-ts/secrets/vault/read-secret-entry.js";
import { FIXED_PROVIDER_SECRET_IDS } from "autobyteus-ts/secrets/vault/provider-secret-id.js";
import { secretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import {
  removeOwnedTestRuntime,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type Json = Record<string, any>;
type Frame = { type: string; payload: Json };
type Host = Awaited<ReturnType<typeof startBuiltTestServer>>;

const execFileAsync = promisify(execFile);
const GATE = process.env.RUN_SANDBOX_LIVE_E2E === "1";
const IMAGE = process.env.SANDBOX_LIVE_E2E_IMAGE?.trim() ?? "";
const EVIDENCE_DIR = process.env.SANDBOX_LIVE_E2E_EVIDENCE_DIR?.trim() || "";
const VAULT = capturedTestVaultSetting();
const READY = GATE && Boolean(IMAGE) && Boolean(VAULT) && process.platform === "darwin";
const FIXTURE = path.resolve(import.meta.dirname, "../../fixtures/agy-failure-cli.mjs");
const SUFFIX = randomUUID().slice(0, 8);
const RUNTIME_ROOT = path.join(testRuntimeRoot, `sandbox-live-${SUFFIX}`);
const DATABASE_URL = `file:./db/sandbox-live-${SUFFIX}.db`;
const CASE_TIMEOUT = 900_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 180_000) => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch (error) { last = error; }
    await wait(500);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last).slice(0, 300)})` : ""}`);
};
const docker = async (...args: string[]) => {
  try {
    const { stdout } = await execFileAsync("docker", args, { maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, stdout: String(stdout) };
  } catch (error: any) {
    return { code: typeof error?.code === "number" ? error.code : 1, stdout: String(error?.stdout ?? "") };
  }
};
const evidence = (name: string, summary: Json) => {
  if (!EVIDENCE_DIR) return;
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_DIR, `${name}.json`), `${JSON.stringify(summary, null, 2)}\n`);
};
const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]!; };

// ---- secrets for the scans (memory only; never printed) ------------------------------------------------------------
type Needle = { id: string; bytes: Buffer };
const needles: Needle[] = [];
const loadVaultNeedles = async () => {
  const vault = await openVerifiedTestVault(VAULT!);
  try {
    const ids = [...new Set([...FIXED_PROVIDER_SECRET_IDS, "search.serpapi.api-key", "search.serper.api-key",
      "search.vertex-ai.api-key", "test.github.token"])];
    for (const id of ids) {
      let value: string;
      try { value = (await readSecretEntry(vault.store, vault.rootKey, vault.metadata, secretId(id))).revealToTrustedConsumer(); }
      catch { continue; }
      for (const form of new Set([value, Buffer.from(value).toString("base64"), Buffer.from(value).toString("base64url")])) {
        needles.push({ id, bytes: Buffer.from(form) });
      }
    }
  } finally { vault.close(); }
};
const addNeedle = (id: string, value: string) => { needles.push({ id, bytes: Buffer.from(value) }); };
const hitsIn = (buffer: Buffer): string[] => [...new Set(needles.filter((n) => buffer.indexOf(n.bytes) !== -1).map((n) => n.id))];
/** Streams a child's stdout through every needle, keeping an overlap so a value split between chunks is found. */
const scanCommand = (command: string, args: string[]) => new Promise<{ hits: string[]; bytes: number }>((resolve, reject) => {
  const overlap = Math.max(...needles.map((n) => n.bytes.length)) - 1;
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
  const found = new Set<string>();
  let tail = Buffer.alloc(0);
  let bytes = 0;
  child.stdout.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    const window = Buffer.concat([tail, chunk]);
    for (const id of hitsIn(window)) found.add(id);
    tail = Buffer.from(window.subarray(Math.max(0, window.length - overlap)));
    window.fill(0);
  });
  child.once("error", reject);
  child.once("close", () => { tail.fill(0); resolve({ hits: [...found], bytes }); });
});
const scanFolder = (root: string): { hits: Record<string, string[]>; files: number; links: number } => {
  const hits: Record<string, string[]> = {};
  let files = 0;
  let links = 0;
  const walk = (p: string) => {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) { links += 1; return; }
    if (st.isDirectory()) { for (const entry of fs.readdirSync(p)) walk(path.join(p, entry)); return; }
    if (!st.isFile()) return;
    files += 1;
    const buffer = fs.readFileSync(p);
    const found = hitsIn(buffer);
    buffer.fill(0);
    if (found.length) hits[path.relative(root, p)] = found;
  };
  walk(root);
  return { hits, files, links };
};

// ---- host, GraphQL, turns, tools ------------------------------------------------------------------------------------
const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-live-home-")));
const fixtures = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-live-fixtures-")));
let host: Host | null = null;
let hostUrl = "";
/** The host node's ID, read from `/rest/remote-access/status` once the host runs; the failsafe cleanup and the sweep checks use it. */
let hostNodeId = "";
const hostEnvironment = () => ({
  HOME: home,
  ENABLE_REMOTE_COLLABORATION: "true",
  AUTOBYTEUS_SANDBOX_IMAGE: IMAGE,
  ANTIGRAVITY_CLI_COMMAND: FIXTURE,
  AGY_FAKE_CASE: "linked_skills",
  AGY_FAKE_TOOL_LOG: TOOL_LOG,
  CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
  CLAUDE_CONFIG_DIR: path.join(home, "claude-config"),
});
const startHost = async () => {
  host = await startBuiltTestServer({
    runtimeRoot: RUNTIME_ROOT, databaseUrlOverride: DATABASE_URL, testVaultSetting: VAULT, environment: hostEnvironment(),
  });
  hostUrl = `http://127.0.0.1:${host.port}`;
};

const gql = async (url: string, query: string, variables: Json = {}, credential: string | null = null): Promise<Json> => {
  const response = await fetch(`${url}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json() as Json;
  if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((e: Json) => e.message).join("; ").slice(0, 400)}`);
  return body.data;
};

type Turn = { completed: boolean; frames: Frame[]; firstContentMs: number | null; errors: string[] };
const turn = async (url: string, runId: string, content: string, credential: string, timeoutMs = 300_000): Promise<Turn> => {
  const frames: Frame[] = [];
  const ws = new WebSocket(`${url.replace("http", "ws")}/ws/agent/${runId}?access_token=${encodeURIComponent(credential)}`);
  let sentAt = 0;
  let firstContentMs: number | null = null;
  ws.on("message", (data) => {
    try {
      const frame = JSON.parse(String(data)) as Frame;
      frames.push(frame);
      if (firstContentMs === null && sentAt && /^SEGMENT_CONTENT/.test(frame.type)) firstContentMs = Date.now() - sentAt;
    } catch { /* not a frame */ }
  });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const id = `sbx-${randomUUID()}`;
  sentAt = Date.now();
  ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: id, dedupe_key: `agent_run_input:sbx:${id}`,
    context_file_paths: [], image_urls: [], content } }));
  const deadline = Date.now() + timeoutMs;
  const finished = () => frames.some((f) => f.type === "TURN_COMPLETED" || (f.type === "ERROR" && f.payload?.error_effect !== "diagnostic"));
  while (!finished() && Date.now() < deadline) await wait(200);
  ws.close();
  return {
    completed: frames.some((f) => f.type === "TURN_COMPLETED"),
    frames,
    firstContentMs,
    errors: frames.filter((f) => f.type === "ERROR").map((f) => `${f.payload?.code}: ${String(f.payload?.message ?? "")}`),
  };
};

const createDefinition = async (url: string, name: string, toolNames: string[], credential: string | null = null) =>
  (await gql(url, "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
    input: { name: `${name}-${randomUUID().slice(0, 6)}`, role: "assistant", description: "sandbox live e2e",
      instructions: "Answer in one short line.", category: "test", toolNames, skillNames: [] } }, credential)).createAgentDefinition.id as string;
const createRun = async (url: string, definitionId: string, runtimeKind: string, model: string, workspace: string,
  credential: string | null = null): Promise<string> => {
  const created = (await gql(url, "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
    input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model,
      autoExecuteTools: true, runtimeKind, llmConfig: null } }, credential)).createAgentRun;
  if (!created.success) throw new Error(`${runtimeKind} run refused: ${String(created.message).slice(0, 300)}`);
  return created.runId as string;
};

/** A scripted evaluator run on the host (AGY fixture) with the three sandbox tools. */
const evaluatorRun = async (): Promise<string> => {
  const id = await createDefinition(hostUrl, "evaluator", ["create_sandbox", "run_in_sandbox", "destroy_sandbox"]);
  return await createRun(hostUrl, id, "antigravity_cli", "gemini-3.8-flash-low", home);
};
type ToolOutcome = { ok: boolean; result: Json | null; code: string | null; message: string | null; text: string };
/** The scripted AGY's log of each tool call it made and the exact MCP result it got (AGY_FAKE_TOOL_LOG). */
const TOOL_LOG = path.join(fixtures, "agy-tool-calls.jsonl");
const toolLog = (): Json[] => (fs.existsSync(TOOL_LOG)
  ? fs.readFileSync(TOOL_LOG, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const outcomeOf = (entry: Json | undefined, frames: Frame[] = []): ToolOutcome => {
  const mcp = entry?.result ?? null;
  let structured: Json | null = mcp?.structuredContent ?? null;
  if (!structured && typeof mcp?.content?.[0]?.text === "string") { try { structured = JSON.parse(mcp.content[0].text); } catch { structured = null; } }
  const code = structured?.error?.code ?? (entry?.error ? "MCP_CALL_ERROR" : null);
  const message = structured?.error?.message ?? entry?.error?.message ?? null;
  const ok = Boolean(mcp) && !mcp.isError && !code;
  return { ok, result: ok ? structured : null, code, message, text: JSON.stringify(entry ?? frames) };
};
/** The evaluator calls one tool for real (`CALL_TOOL:`); its result or refusal is the one the agent got. */
const callTool = async (runId: string, name: string, args: Json): Promise<ToolOutcome> => {
  const before = toolLog().length;
  const answer = await turn(hostUrl, runId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, host!.ownerCredential);
  return outcomeOf(toolLog().slice(before).filter((entry) => entry.name === name).at(-1), answer.frames);
};

const records = (): Json[] => {
  const file = path.join(RUNTIME_ROOT, "sandboxes", "sandboxes.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).sandboxes : [];
};
const activity = (): Json[] => {
  const file = path.join(RUNTIME_ROOT, "provider-relays", "activity.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
};
const hostPeers = async (): Promise<Json[]> => (await gql(hostUrl, "{ peerNodes { nodeId name paired role } }")).peerNodes;
const containersOf = async (filter: string) => (await docker("ps", "-a", "--filter", filter, "--format", "{{.Names}}")).stdout.trim().split("\n").filter(Boolean);

/** The sandbox node's own owner credential, from its setup code over `docker exec` (memory only). */
const SETUP = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));s.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});s.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write(r.setupCode)});s.on("error",()=>process.exit(1))';
const sandboxCredential = async (sandboxId: string, hostPort: number): Promise<string> => {
  const code = (await docker("exec", `autobyteus-${sandboxId}`, "node", "-e", SETUP, "/home/autobyteus/data/node-access/local-control.sock")).stdout.trim();
  const issued = await (await fetch(`http://127.0.0.1:${hostPort}/rest/node-access/setup-exchanges`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupCode: code, desktopName: "sandbox live e2e" }),
  })).json() as Json;
  if (typeof issued.credential !== "string") throw new Error("no sandbox credential");
  return issued.credential;
};
const nativeModel = async (url: string, credential: string | null, provider = "ANTHROPIC", wanted = /haiku/i): Promise<string> => {
  const models = (await gql(url, "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
    { p: provider, r: "autobyteus" }, credential)).ensureProviderModelCatalog.llmModels as Json[];
  const model = models.find((m) => wanted.test(m.modelIdentifier)) ?? models[0];
  if (!model) throw new Error(`no ${provider} model`);
  return model.modelIdentifier;
};
const runtimeModel = async (url: string, credential: string | null, runtimeKind: string, wanted: RegExp): Promise<string> => {
  const snapshots = (await gql(url, "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
    { r: runtimeKind }, credential)).providerModelCatalogSnapshots as Json[];
  const models = snapshots.flatMap((s) => s.llmModels);
  const model = models.find((m: Json) => wanted.test(m.modelIdentifier)) ?? models[0];
  if (!model) throw new Error(`no ${runtimeKind} model`);
  return model.modelIdentifier;
};

// ---- fixtures -------------------------------------------------------------------------------------------------------
const writePackage = (name: string, agentName: string, defaultLaunchConfig: Json | null) => {
  const dir = path.join(fixtures, name);
  const agentDir = path.join(dir, "agents", agentName.toLowerCase().replace(/\s+/g, "-"));
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, "agent.md"), `---\nname: ${agentName}\ndescription: Does one small task and reports it.\n`
    + "category: test\nrole: worker\n---\n\nDo the task you are given exactly. Use your tools for files and messages.\n");
  fs.writeFileSync(path.join(agentDir, "agent-config.json"), JSON.stringify({ toolNames: ["write_file"], skillNames: [], defaultLaunchConfig }));
  return dir;
};

describe.skipIf(!READY)("sandbox nodes end to end (autobyteus-581)", () => {
  let evaluator = "";
  let sandbox: Json | null = null;
  let record: Json | null = null;
  let credential = "";
  let packageDir = "";
  let sharedDir = "";
  let hostModel = "";

  beforeAll(async () => {
    await loadVaultNeedles();
    if (needles.length === 0) throw new Error("no test-vault secret to scan for");
    await startHost();
    hostNodeId = (await (await fetch(`${hostUrl}/rest/remote-access/status`)).json() as Json).nodeId;
    addNeedle("host.owner-credential", host!.ownerCredential);
    hostModel = await nativeModel(hostUrl, null);
    packageDir = writePackage("package", "Sandbox Worker", { runtimeKind: "autobyteus", llmModelIdentifier: hostModel, llmConfig: null });
    sharedDir = path.join(fixtures, "shared");
    fs.mkdirSync(sharedDir);
    fs.writeFileSync(path.join(sharedDir, "input.txt"), "shared input\n");
    evaluator = await evaluatorRun();
  }, 300_000);

  afterAll(async () => {
    // Failsafe: only this host's sandboxes (by its label), whatever a failed case left.
    if (hostNodeId) for (const name of await containersOf(`label=autobyteus.sandbox.host=${hostNodeId}`)) await docker("rm", "-f", "-v", name);
    if (host) { await host.stop().catch(() => undefined); await removeOwnedTestRuntime(host.runtimeRoot, host.database).catch(() => undefined); }
    for (const dir of [home, fixtures]) fs.rmSync(dir, { recursive: true, force: true });
    for (const n of needles) n.bytes.fill(0);
  }, 300_000);

  it("SBX-01: create, peer role, network, sign-ins, one relayed turn per runtime, direct turns on the host", async () => {
    const started = Date.now();
    const created = await callTool(evaluator, "create_sandbox", {
      agentPackages: [packageDir], sharedFolders: [{ path: sharedDir, name: "inputs" }], lifetimeMinutes: 60 });
    const readyMs = Date.now() - started;
    expect(created.ok, `${created.code}: ${created.message ?? created.text.slice(0, 600)}`).toBe(true);
    record = records()[0]!;
    expect(record).toMatchObject({ state: "ready", createdByRunId: evaluator, image: IMAGE });
    sandbox = created.result;
    // C7's fields; `teams` is empty here and the platform's tool result rule leaves out empty fields
    // (agent-tools-mcp-structured-json-result.ts: "no empty fields").
    expect(Object.keys(sandbox ?? {}).sort()).toEqual(["agents", "expiresAt", "image", "nodeId", "peerName", "runMemoryFolder",
      "sandboxId", "sharedFolders", "workspaceFolder"]);
    expect(sandbox).toMatchObject({ sandboxId: record!.sandboxId, peerName: record!.sandboxId, image: IMAGE,
      workspaceFolder: record!.workspaceFolder, runMemoryFolder: record!.runMemoryFolder,
      sharedFolders: [{ name: "inputs", pathInSandbox: "/home/autobyteus/shared/inputs" }] });
    expect(sandbox!.agents.map((a: Json) => a.name)).toEqual(["Sandbox Worker"]);
    const lifetime = Date.parse(sandbox!.expiresAt) - Date.parse(record!.createdAt);
    expect(Math.abs(lifetime - 60 * 60_000)).toBeLessThan(5_000);
    expect(readyMs, "QR-001: ready in at most 90 s").toBeLessThanOrEqual(90_000);
    const container = `autobyteus-${record!.sandboxId}`;
    const labels = JSON.parse((await docker("inspect", container, "--format", "{{json .Config.Labels}}")).stdout);
    expect(labels["autobyteus.sandbox.host"]).toBe(hostNodeId);
    const limits = (await docker("inspect", container, "--format", "{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{.HostConfig.NetworkMode}}")).stdout.trim();
    expect(limits).toBe(`${6 * 1024 ** 3} ${4 * 1e9} bridge`);

    const peers = await hostPeers();
    expect(peers.filter((p) => p.role === "sandbox")).toEqual([expect.objectContaining({ name: record!.sandboxId, paired: true, nodeId: sandbox!.nodeId })]);

    credential = await sandboxCredential(record!.sandboxId, record!.hostPort);
    const internet = await callTool(evaluator, "run_in_sandbox", { sandboxId: record!.sandboxId, timeoutSeconds: 60,
      argv: ["node", "-e", `Promise.all([fetch("https://example.com").then((r) => "internet " + r.status), fetch("http://host.docker.internal:${host!.port}/rest/health").then((r) => "host " + r.status)]).then((a) => console.log(a.join(" ")), (e) => { console.log("failed " + e.message); process.exit(1); })`] });
    expect(internet.ok, internet.text.slice(0, 400)).toBe(true);
    expect(internet.result).toMatchObject({ exitCode: 0 });
    expect(String(internet.result!.stdout)).toMatch(/internet 200 host \d{3}/);
    const sandboxPeers = (await gql(`http://127.0.0.1:${record!.hostPort}`, "{ peerNodes { nodeId name paired role } }", {}, credential)).peerNodes as Json[];
    expect(sandboxPeers).toEqual([expect.objectContaining({ name: "host", paired: true, role: null })]);
    const availability = (await gql(`http://127.0.0.1:${record!.hostPort}`, "query($n: String!) { peerNodeAvailability(nodeId: $n) { available refusalCode } }",
      { n: sandboxPeers[0]!.nodeId }, credential)).peerNodeAvailability;
    expect(availability).toEqual({ available: true, refusalCode: null });

    const sandboxUrl = `http://127.0.0.1:${record!.hostPort}`;
    await gql(sandboxUrl, "mutation { checkAgentRuntimes }", {}, credential).catch(() => undefined);
    let states: Json[] = [];
    await until(async () => {
      states = (await gql(sandboxUrl, "{ agentRuntimes { runtimeKind installed account { state } } }", {}, credential)).agentRuntimes;
      return !states.some((r) => r.account?.state === "CHECKING");
    }, "sandbox runtime states", 60_000);
    const stateOf = Object.fromEntries(states.map((r) => [r.runtimeKind, r.installed ? r.account?.state : "NOT_INSTALLED"]));
    expect(stateOf).toMatchObject({ claude_agent_sdk: "SIGNED_IN", codex_app_server: "SIGNED_IN", grok_build: "SIGNED_IN", antigravity_cli: "SIGNED_OUT" });

    const before = activity().length;
    const turns: Json = {};
    const plan: Array<[string, () => Promise<string>]> = [
      ["autobyteus", () => nativeModel(sandboxUrl, credential)],
      ["claude_agent_sdk", () => runtimeModel(sandboxUrl, credential, "claude_agent_sdk", /haiku/i)],
      ["codex_app_server", () => runtimeModel(sandboxUrl, credential, "codex_app_server", /terra|mini|luna/i)],
      ["grok_build", () => runtimeModel(sandboxUrl, credential, "grok_build", /fast|mini|non-reasoning/i)],
    ];
    for (const [runtimeKind, model] of plan) {
      const definition = await createDefinition(sandboxUrl, `turn-${runtimeKind}`, [], credential);
      const modelId = await model();
      const runId = await createRun(sandboxUrl, definition, runtimeKind, modelId, "/home/autobyteus/workspace", credential);
      const answer = await turn(sandboxUrl, runId, "Reply with one short word.", credential, 240_000);
      turns[runtimeKind] = { model: modelId, completed: answer.completed, errors: answer.errors.map((e) => e.slice(0, 160)) };
      expect(answer.completed, `${runtimeKind}: ${answer.errors.join(" | ").slice(0, 300)}`).toBe(true);
    }
    const relayed = activity().slice(before);
    const byRelay: Json = {};
    for (const line of relayed) { const key = `${line.relayId}/${line.relayCredentialKind}/${line.status ?? line.error}`; byRelay[key] = (byRelay[key] ?? 0) + 1; }
    for (const relayId of ["anthropic", "openai", "xai"]) {
      expect(relayed.some((l) => l.relayId === relayId && l.relayCredentialKind === "apiKey" && l.status === 200), `${relayId} 200`).toBe(true);
    }
    expect(relayed.every((l) => l.peerNodeId === sandbox!.nodeId)).toBe(true);
    expect([...new Set(relayed.flatMap((l) => Object.keys(l)))].sort())
      .toEqual(["at", "durationMs", "method", "path", "peerNodeId", "relayCredentialKind", "relayId", "status"]);

    // AC-002: the unrelayed host's own runtimes call their providers directly (no C5 line).
    const direct: Json = {};
    const beforeDirect = activity().length;
    for (const [runtimeKind, model] of [["autobyteus", hostModel], ["claude_agent_sdk", await runtimeModel(hostUrl, null, "claude_agent_sdk", /haiku/i)]] as const) {
      const definition = await createDefinition(hostUrl, `direct-${runtimeKind}`, []);
      const runId = await createRun(hostUrl, definition, runtimeKind, model, home);
      const answer = await turn(hostUrl, runId, "Reply with one short word.", host!.ownerCredential, 240_000);
      direct[runtimeKind] = { model, completed: answer.completed };
      expect(answer.completed, `${runtimeKind} direct: ${answer.errors.join(" | ").slice(0, 300)}`).toBe(true);
    }
    // The relay node logs only calls a peer relayed to it; lines written meanwhile are the sandbox's own late calls.
    const duringDirect = activity().slice(beforeDirect);
    expect(duringDirect.every((line) => line.peerNodeId === sandbox!.nodeId)).toBe(true);
    evidence("SBX-01", { readyMs, resultKeys: Object.keys(sandbox!).sort(), agents: sandbox!.agents, sharedFolders: sandbox!.sharedFolders,
      limits, hostPeers: peers.map((p) => ({ name: p.name, paired: p.paired, role: p.role })), network: internet.result!.stdout.trim(),
      sandboxPeers: sandboxPeers.map((p) => ({ name: p.name, paired: p.paired })), availability, runtimeStates: stateOf, turns,
      relayedLines: byRelay, relayedPaths: relayed.map((l) => `${l.relayId}/${l.relayCredentialKind} ${l.method} ${l.path} -> ${l.status ?? l.error}`),
      directTurns: direct, c5LinesDuringDirectTurns: duringDirect.map((l) => ({ fromSandbox: l.peerNodeId === sandbox!.nodeId, relay: l.relayId, path: l.path, status: l.status })) });
  }, CASE_TIMEOUT);

  it("SBX-02 (QR-002): the relay adds at most 1 s to the time to the first streamed content", async () => {
    expect(record, "SBX-01 created the sandbox").not.toBeNull();
    const sandboxUrl = `http://127.0.0.1:${record!.hostPort}`;
    const sandboxModel = await nativeModel(sandboxUrl, credential);
    expect(sandboxModel).toBe(hostModel);
    const hostRun = await createRun(hostUrl, await createDefinition(hostUrl, "latency-host", []), "autobyteus", hostModel, home);
    const sandboxRun = await createRun(sandboxUrl, await createDefinition(sandboxUrl, "latency-sandbox", [], credential), "autobyteus",
      sandboxModel, "/home/autobyteus/workspace", credential);
    const direct: number[] = [];
    const relayed: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const a = await turn(hostUrl, hostRun, `Say the number ${i} and nothing else.`, host!.ownerCredential, 120_000);
      const b = await turn(sandboxUrl, sandboxRun, `Say the number ${i} and nothing else.`, credential, 120_000);
      expect(a.completed && b.completed).toBe(true);
      direct.push(a.firstContentMs!);
      relayed.push(b.firstContentMs!);
    }
    const added = median(relayed) - median(direct);
    evidence("SBX-02", { model: hostModel, directFirstContentMs: direct, relayedFirstContentMs: relayed,
      directMedianMs: median(direct), relayedMedianMs: median(relayed), addedMedianMs: added });
    expect(added).toBeLessThanOrEqual(1_000);
  }, CASE_TIMEOUT);

  it("SBX-03: delegation into the sandbox; the answer and its file arrive; folders, transcript; nothing leaked", async () => {
    expect(record, "SBX-01 created the sandbox").not.toBeNull();
    const token = `report-${randomUUID().slice(0, 8)}`;
    const address = sandbox!.agents[0].address as string;
    const delegated = await callTool(evaluator, "delegate_task", {
      recipient_address: address, node: record!.sandboxId,
      description: `Write a file at /home/autobyteus/workspace/${token}.md whose whole content is the single line ${token}. `
        + "Then reply to the run that delegated this task with send_message_to, with the content 'done' and that file's path "
        + "in reference_files. Do nothing else.",
    });
    expect(delegated.ok, delegated.text.slice(0, 600)).toBe(true);
    let message: Json | null = null;
    await until(async () => {
      const page = (await gql(hostUrl, "query($k: String!, $r: String!, $a: String!) { collaborationParticipantMessages(rootKind: $k, rootRunId: $r, agentRunId: $a) }",
        { k: "agent", r: evaluator, a: evaluator })).collaborationParticipantMessages as Json;
      message = page.messages.find((m: Json) => m.receiverAgentRunId === evaluator && m.referenceFiles.some((f: string) => f.includes(token))) ?? null;
      return message !== null;
    }, "the sandbox agent's answer with its file", 300_000);
    const reference = message!.referenceFiles.find((f: string) => f.includes(token)) as string;
    const referenceId = createHash("sha256").update(`${message!.messageId}\0${reference}`).digest("hex");
    const content = await fetch(`${hostUrl}/rest/collaboration-messages/agent/${evaluator}/messages/${message!.messageId}/references/${referenceId}/content`);
    expect(content.status).toBe(200);
    expect((await content.text()).trim()).toBe(token);
    // The evaluator reads the results from the mapped folders on the host.
    const written = path.join(record!.workspaceFolder, `${token}.md`);
    expect(fs.lstatSync(written).isFile()).toBe(true);
    expect(fs.readFileSync(written, "utf8").trim()).toBe(token);
    expect(fs.statSync(written).uid).toBe(process.getuid!());
    // The run memory as the host sees it (relative paths, depth 4), and every transcript in it.
    const tree: string[] = [];
    const list = (dir: string, depth: number) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.relative(record!.runMemoryFolder, path.join(dir, entry.name));
        tree.push(entry.isDirectory() ? `${rel}/` : rel);
        if (entry.isDirectory() && depth < 4) list(path.join(dir, entry.name), depth + 1);
      }
    };
    list(record!.runMemoryFolder, 1);
    const transcripts = tree.filter((rel) => rel.endsWith("raw_traces_active.jsonl"));
    evidence("SBX-03-run-memory-layout", { tree, transcripts });
    // Soft: a missing transcript is recorded and the case goes on to the leak scan.
    expect.soft(transcripts.length, `run memory: ${tree.slice(0, 40).join(", ")}`).toBeGreaterThan(0);
    expect.soft(transcripts.some((rel) => fs.readFileSync(path.join(record!.runMemoryFolder, rel), "utf8").includes(token))).toBe(true);
    // The skill's documented layout (§ 4): an agent run under agents/<runId>/.
    expect.soft(transcripts.some((rel) => /^agents\/[^/]+\/raw_traces_active\.jsonl$/.test(rel)), `transcripts at: ${transcripts.join(", ")}`).toBe(true);
    // A read-only shared folder (DEC-113).
    const shared = await callTool(evaluator, "run_in_sandbox", { sandboxId: record!.sandboxId,
      argv: ["sh", "-c", "cat /home/autobyteus/shared/inputs/input.txt; touch /home/autobyteus/shared/inputs/x; echo touch=$?"] });
    expect(String(shared.result?.stdout)).toMatch(/shared input\ntouch=1/);
    expect(fs.existsSync(path.join(sharedDir, "x"))).toBe(false);

    // AC-010: value scan. What the sandbox wrote: `docker diff` paths and its mounts (volumes and mapped folders).
    const container = `autobyteus-${record!.sandboxId}`;
    const changed = (await docker("diff", container)).stdout.split("\n").filter((l) => /^[AC] /.test(l)).map((l) => l.slice(2));
    const mounts = (JSON.parse((await docker("inspect", container, "--format", "{{json .Mounts}}")).stdout) as Json[]).map((m) => m.Destination as string);
    const roots = [...new Set([...changed, ...mounts])].filter((p) => p && !/^\/(proc|sys|dev)(\/|$)/.test(p)).sort();
    const collapsed = roots.filter((p) => !roots.some((q) => q !== p && p.startsWith(`${q}/`)));
    const files = await scanCommand("docker", ["exec", container, "tar", "-cf", "-", "--ignore-failed-read", "-C", "/", ...collapsed.map((p) => p.slice(1))]);
    const processes = await scanCommand("docker", ["exec", container, "sh", "-c",
      "for p in /proc/[0-9]*; do cat $p/environ 2>/dev/null; printf '\\n'; cat $p/cmdline 2>/dev/null; printf '\\n'; done"]);
    const processCount = Number((await docker("exec", container, "sh", "-c", "ls -d /proc/[0-9]* | wc -l")).stdout.trim());
    const workspace = scanFolder(record!.workspaceFolder);
    const runMemory = scanFolder(record!.runMemoryFolder);
    const c5 = fs.readFileSync(path.join(RUNTIME_ROOT, "provider-relays", "activity.jsonl"));
    const c5Hits = hitsIn(c5);
    c5.fill(0);
    const toolResults = hitsIn(Buffer.from(delegated.text + shared.text));
    const env = (await docker("inspect", container, "--format", "{{json .Config.Env}}")).stdout;
    const envHits = hitsIn(Buffer.from(env));
    evidence("SBX-03", { delegatedTo: address, answer: { content: message!.content, referenceFiles: message!.referenceFiles.length },
      referenceContentMatches: true, workspaceFile: path.basename(written), transcripts,
      sharedReadOnly: String(shared.result?.stdout).trim(),
      leakScan: { needleIds: [...new Set(needles.map((n) => n.id))].length, sandboxFiles: { roots: collapsed, bytes: files.bytes, hits: files.hits },
        processes: { count: processCount, bytes: processes.bytes, hits: processes.hits }, containerEnv: envHits,
        workspace, runMemory, c5Log: c5Hits, toolResults } });
    expect(files.bytes).toBeGreaterThan(1_000_000);
    expect(processCount).toBeGreaterThan(3);
    expect(files.hits).toEqual([]);
    expect(processes.hits).toEqual([]);
    expect(envHits).toEqual([]);
    expect(workspace.hits).toEqual({});
    expect(runMemory.hits).toEqual({});
    expect(c5Hits).toEqual([]);
    expect(toolResults).toEqual([]);
  }, CASE_TIMEOUT);

  it("SBX-04: another run is refused; the creator's destroy leaves nothing but the folders", async () => {
    expect(record, "SBX-01 created the sandbox").not.toBeNull();
    const other = await evaluatorRun();
    const exec = await callTool(other, "run_in_sandbox", { sandboxId: record!.sandboxId, argv: ["true"] });
    const destroy = await callTool(other, "destroy_sandbox", { sandboxId: record!.sandboxId });
    expect([exec.code, destroy.code]).toEqual(["SANDBOX_NOT_YOURS", "SANDBOX_NOT_YOURS"]);
    expect(await containersOf(`label=autobyteus.sandbox=${record!.sandboxId}`)).toHaveLength(1);
    const container = `autobyteus-${record!.sandboxId}`;
    const volumes = (JSON.parse((await docker("inspect", container, "--format", "{{json .Mounts}}")).stdout) as Json[])
      .filter((m) => m.Type === "volume").map((m) => m.Name as string);
    expect(volumes.length).toBeGreaterThanOrEqual(3);
    const destroyed = await callTool(evaluator, "destroy_sandbox", { sandboxId: record!.sandboxId });
    expect(destroyed.ok, destroyed.text.slice(0, 300)).toBe(true);
    expect(destroyed.result).toEqual({ removed: true, foldersKept: true });
    const volumesLeft: string[] = [];
    for (const volume of volumes) if ((await docker("volume", "inspect", volume)).code === 0) volumesLeft.push(volume);
    const after = { containers: await containersOf(`label=autobyteus.sandbox=${record!.sandboxId}`), volumesLeft,
      sandboxPeers: (await hostPeers()).filter((p) => p.role === "sandbox" || p.nodeId === sandbox!.nodeId).length,
      records: records().length, workspaceKept: fs.existsSync(record!.workspaceFolder), runMemoryKept: fs.existsSync(record!.runMemoryFolder),
      // The runs' transcripts outlive the sandbox (they are on the host, not in its removed volumes).
      transcriptsKept: fs.existsSync(path.join(record!.runMemoryFolder, "agents"))
        && fs.readdirSync(path.join(record!.runMemoryFolder, "agents")).some((id) => fs.existsSync(path.join(record!.runMemoryFolder, "agents", id, "raw_traces_active.jsonl"))) };
    evidence("SBX-04", { otherRunCodes: [exec.code, destroy.code], anonymousVolumes: volumes.length, destroyResult: destroyed.result, after });
    expect(after).toEqual({ containers: [], volumesLeft: [], sandboxPeers: 0, records: 0, workspaceKept: true, runMemoryKept: true, transcriptsKept: true });
  }, CASE_TIMEOUT);

  it("SBX-05 (AC-003): the host unpairs a running sandbox; its next call is refused before any provider call", async () => {
    const created = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir] });
    expect(created.ok, `${created.code}: ${created.message}`).toBe(true);
    const own = created.result!;
    const entry = records().find((r) => r.sandboxId === own.sandboxId)!;
    const cred = await sandboxCredential(own.sandboxId, entry.hostPort);
    const sandboxUrl = `http://127.0.0.1:${entry.hostPort}`;
    const runId = await createRun(sandboxUrl, await createDefinition(sandboxUrl, "unpaired", [], cred), "autobyteus",
      await nativeModel(sandboxUrl, cred), "/home/autobyteus/workspace", cred);
    const first = await turn(sandboxUrl, runId, "Reply with one short word.", cred, 120_000);
    expect(first.completed).toBe(true);
    await gql(hostUrl, "mutation($n: String!) { removePeerNode(nodeId: $n) }", { n: own.nodeId });
    const before = activity().length;
    const refused = await turn(sandboxUrl, runId, "Reply with one short word.", cred, 120_000);
    const text = JSON.stringify(refused.frames);
    const destroyed = await callTool(evaluator, "destroy_sandbox", { sandboxId: own.sandboxId });
    evidence("SBX-05", { firstTurn: first.completed, afterUnpair: { completed: refused.completed, errors: refused.errors.map((e) => e.slice(0, 200)),
      mentionsRelayPeerNotAccepted: text.includes("RELAY_PEER_NOT_ACCEPTED") }, c5LinesAfterUnpair: activity().length - before,
      destroy: destroyed.result, containersLeft: (await containersOf(`label=autobyteus.sandbox=${own.sandboxId}`)).length });
    // The run shows the refusal: an ERROR frame with the relay's code (the native turn then ends normally).
    expect(refused.errors.some((e) => e.includes("RELAY_PEER_NOT_ACCEPTED"))).toBe(true);
    expect(activity().length).toBe(before);
    expect(destroyed.result).toEqual({ removed: true, foldersKept: true });
    expect(await containersOf(`label=autobyteus.sandbox=${own.sandboxId}`)).toEqual([]);
  }, CASE_TIMEOUT);

  it("SBX-06 (AC-013): a sandbox is removed at its expiry; its folders stay", async () => {
    const created = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir], lifetimeMinutes: 1 });
    expect(created.ok, `${created.code}: ${created.message}`).toBe(true);
    const own = created.result!;
    const expiresAt = Date.parse(own.expiresAt);
    await until(async () => (await containersOf(`label=autobyteus.sandbox=${own.sandboxId}`)).length === 0
      && !records().some((r) => r.sandboxId === own.sandboxId), "removal at expiry", 150_000);
    const removedAfterExpiryMs = Date.now() - expiresAt;
    const peersLeft = (await hostPeers()).filter((p) => p.nodeId === own.nodeId).length;
    evidence("SBX-06", { lifetimeMinutes: 1, removedAfterExpiryMs, peersLeft, foldersKept: fs.existsSync(own.workspaceFolder) && fs.existsSync(own.runMemoryFolder) });
    expect(removedAfterExpiryMs).toBeGreaterThanOrEqual(-1_000);
    expect(removedAfterExpiryMs).toBeLessThan(60_000);
    expect(peersLeft).toBe(0);
    expect(fs.existsSync(own.workspaceFolder) && fs.existsSync(own.runMemoryFolder)).toBe(true);
  }, CASE_TIMEOUT);

  it("SBX-07 (AC-013, R-A): after a host crash with two sandboxes alive and one record lost, the next start removes both", async () => {
    const a = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir] });
    const b = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir] });
    expect(a.ok && b.ok, `${a.code}: ${a.message} | ${b.code}: ${b.message}`).toBe(true);
    const ids = [a.result!.sandboxId, b.result!.sandboxId];
    const nodeIds = [a.result!.nodeId, b.result!.nodeId];
    expect(hostNodeId, "SBX-01 read the host node ID").not.toBe("");
    host!.child.kill("SIGKILL");
    await new Promise((resolve) => host!.child.once("exit", resolve));
    const file = path.join(RUNTIME_ROOT, "sandboxes", "sandboxes.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.sandboxes = stored.sandboxes.filter((r: Json) => r.sandboxId !== ids[1]);
    fs.writeFileSync(file, JSON.stringify(stored));
    const aliveWhileDown = (await containersOf(`label=autobyteus.sandbox.host=${hostNodeId}`)).length;
    await startHost();
    await until(async () => (await containersOf(`label=autobyteus.sandbox.host=${hostNodeId}`)).length === 0
      && (await hostPeers()).filter((p) => p.role === "sandbox").length === 0 && records().length === 0, "start sweep", 120_000);
    const peers = await hostPeers();
    evidence("SBX-07", { aliveWhileDown, recordsBeforeRestart: 1, afterStart: { containers: 0, sandboxPeers: 0, records: records().length,
      peersOfThoseNodes: peers.filter((p) => nodeIds.includes(p.nodeId)).length,
      foldersKept: [a.result!, b.result!].every((s) => fs.existsSync(s.workspaceFolder) && fs.existsSync(s.runMemoryFolder)) } });
    expect(aliveWhileDown).toBe(2);
    expect(peers.filter((p) => nodeIds.includes(p.nodeId))).toEqual([]);
    expect([a.result!, b.result!].every((s) => fs.existsSync(s.workspaceFolder) && fs.existsSync(s.runMemoryFolder))).toBe(true);
    evaluator = await evaluatorRun();
  }, CASE_TIMEOUT);

  it("SBX-08 (AC-014, R-B): five at once give four sandboxes and one limit refusal; collaboration off and a home folder are refused", async () => {
    expect(hostNodeId, "SBX-01 read the host node ID").not.toBe("");
    const runs = await Promise.all(Array.from({ length: 5 }, () => evaluatorRun()));
    // Five evaluator runs each call create_sandbox at the same moment; each call's own result is in the tool log.
    const before = toolLog().length;
    await Promise.all(runs.map((run) => turn(hostUrl, run, `CALL_TOOL:${JSON.stringify({ name: "create_sandbox", arguments: { agentPackages: [packageDir] } })}`,
      host!.ownerCredential)));
    const outcomes = toolLog().slice(before).filter((entry) => entry.name === "create_sandbox").map((entry) => outcomeOf(entry));
    const ready = outcomes.filter((o) => o.ok);
    const codes = outcomes.filter((o) => !o.ok).map((o) => o.code);
    const atLimit = { calls: outcomes.length, ready: ready.length, refusals: codes, containers: (await containersOf(`label=autobyteus.sandbox.host=${hostNodeId}`)).length,
      records: records().filter((r) => r.state === "ready").length, creators: new Set(records().map((r) => r.createdByRunId)).size };
    // Each creator destroys its own (the record names it).
    for (const entry of records()) {
      expect((await callTool(entry.createdByRunId, "destroy_sandbox", { sandboxId: entry.sandboxId })).ok).toBe(true);
    }
    await gql(hostUrl, "mutation { setRemoteCollaborationEnabled(enabled: false) { enabled } }");
    const off = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir] });
    await gql(hostUrl, "mutation { setRemoteCollaborationEnabled(enabled: true) { enabled } }");
    const homeShared = await callTool(evaluator, "create_sandbox", { agentPackages: [packageDir], sharedFolders: [{ path: os.homedir(), name: "home" }] });
    const left = { containers: (await containersOf(`label=autobyteus.sandbox.host=${hostNodeId}`)).length, records: records().length,
      sandboxPeers: (await hostPeers()).filter((p) => p.role === "sandbox").length };
    evidence("SBX-08", { atLimit, remoteCollaborationOff: off.code, homeFolderShared: homeShared.code, left });
    expect(atLimit).toEqual({ calls: 5, ready: 4, refusals: ["SANDBOX_LIMIT_REACHED"], containers: 4, records: 4, creators: 4 });
    expect(off.code).toBe("SANDBOX_REMOTE_COLLABORATION_OFF");
    expect(homeShared.code).toBe("SANDBOX_SHARED_FOLDER_INVALID");
    expect(left).toEqual({ containers: 0, records: 0, sandboxPeers: 0 });
  }, CASE_TIMEOUT);
});
