import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { chooseLiveModel } from "../helpers/live-model-choice.js";

/**
 * Agent semantic memory with real runtimes (agent-semantic-memory, Task autobyteus-12; AC-001..AC-005, REQ-006).
 *
 * An agent with semantic memory is told its folder only through its instructions. Through the real Studio server
 * (GraphQL definitions, Projects and runs, the agent and team WebSockets) each enabled runtime:
 *  - SML-WRITE (AC-001, AC-002): a run under Project A saves a codeword "in its semantic memory"; the file is on disk in
 *    `<data>/memory/semantic/<agent>/` afterwards, without a sandbox denial, and the instructions the runtime received
 *    hold the contract's §2 paragraph with that folder.
 *  - SML-READ (AC-003): a new run under Project B answers the codeword from its semantic memory.
 * Codex also (auto-execute off: `workspace-write` + `on-request`, the case the writable root exists for):
 *  - the wire `thread/start` carries `sandbox_workspace_write.writable_roots = [folder]`; no approval is asked for the
 *    memory write, while a write elsewhere outside the workspace asks one (denied; the file is not created) (QR-002);
 *  - after terminate and restore, `thread/resume` carries the same folder (REQ-009);
 *  - SML-CODEX-INTEGRATION: an agent that also has an imported integration's skill (no token connected: the proxy
 *    answers without GitHub) reaches the loopback proxy from its shell and writes its memory in the same run; the wire
 *    object is `{ network_access: true, writable_roots: [folder] }`;
 *  - SML-CODEX-OFF (AC-005): an agent without the setting: `config` keys exactly `["mcp_servers"]`, no section, no folder;
 *  - SML-CODEX-TEAM (AC-004): the agent as a shared team member reads the codeword.
 * Claude also: the CLI gets `--add-dir <folder>`; SML-CLAUDE-APPROVALS with auto-execute off: reading and writing the
 * memory asks no approval the same operation in the workspace does not ask, and reading a file outside both does ask.
 *
 * The recorded wire: for Codex and Claude the suite points CODEX_APP_SERVER_COMMAND / CLAUDE_CODE_EXECUTABLE_PATH (and
 * GROK_BUILD_COMMAND for Grok) at a small recorder written into its own root, which runs the real CLI unchanged and
 * appends what the server sends to it; native AutoByteus records the provider request body (fetch); AGY keeps its
 * capsule's main agent file. Paid inference, one short turn per step, the cheapest models: Codex gpt-6.1-terra (low),
 * Claude haiku, Grok grok-4.7 (falls back to the first offered), AGY flash-low, native Anthropic haiku.
 *
 * The data root is outside the temp folder (Codex `workspace-write` always allows /tmp, investigation AF-03):
 * SEMANTIC_MEMORY_LIVE_E2E_ROOT, default `$HOME/.autobyteus-e2e`; the suite makes and removes its own folder in it.
 * Gates (one per runtime; run each runtime alone, a skip is not a pass):
 *   Codex:  RUN_CODEX_E2E=1 (throwaway CODEX_HOME holding a link to the host auth.json)
 *   Claude: RUN_CLAUDE_E2E=1 (host login: real HOME, USER, LOGNAME)
 *   Grok:   RUN_GROK_E2E=1 (host login)
 *   AGY:    RUN_AGY_E2E=1 without ANTIGRAVITY_CLI_COMMAND, HOME = a throwaway folder holding a copy of
 *           .gemini/antigravity-cli/antigravity-oauth-token (TESTING.md), and SEMANTIC_MEMORY_LIVE_E2E_ROOT set
 *   Native: RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault (Anthropic key)
 * Command:
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" <gate> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts --no-watch
 * Optional: <RUNTIME>_E2E_MODEL overrides (CODEX_E2E_MODEL, CLAUDE_E2E_MODEL, GROK_E2E_MODEL, AGY_E2E_MODEL,
 * AUTOBYTEUS_E2E_MODEL); SEMANTIC_MEMORY_LIVE_E2E_EVIDENCE_DIR keeps the wire excerpts, replies and files per case.
 */
type RuntimeName = "codex" | "claude" | "grok" | "agy" | "autobyteus";
type Rec = Record<string, any>;
type WsMessage = { type: string; payload: Rec };
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const which = (command: string) => spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).stdout.trim();
const RUNTIMES: Record<RuntimeName, { kind: string; enabled: boolean; pins: string[]; override?: string; llmConfig: Rec | null;
  autoExecute: boolean; toolNames: string[] }> = {
  codex: { kind: "codex_app_server", enabled: process.env.RUN_CODEX_E2E === "1" && commandReady("codex"), pins: ["gpt-6.1-terra"],
    override: process.env.CODEX_E2E_MODEL?.trim() || undefined, llmConfig: { reasoning_effort: "low" }, autoExecute: false, toolNames: [] },
  claude: { kind: "claude_agent_sdk", enabled: process.env.RUN_CLAUDE_E2E === "1" && commandReady("claude"), pins: ["haiku"],
    override: process.env.CLAUDE_E2E_MODEL?.trim() || undefined, llmConfig: null, autoExecute: true, toolNames: [] },
  grok: { kind: "grok_build", enabled: process.env.RUN_GROK_E2E === "1" && commandReady(process.env.GROK_BUILD_COMMAND?.trim() || "grok"),
    pins: ["grok-4.7"], override: process.env.GROK_E2E_MODEL?.trim() || undefined, llmConfig: { reasoning_effort: "low" }, autoExecute: true, toolNames: [] },
  agy: { kind: "antigravity_cli", enabled: process.env.RUN_AGY_E2E === "1" && !process.env.ANTIGRAVITY_CLI_COMMAND && commandReady("agy"),
    pins: ["gemini-3.8-flash-low", "flash-low"], override: process.env.AGY_E2E_MODEL?.trim() || undefined, llmConfig: null, autoExecute: true, toolNames: [] },
  autobyteus: { kind: "autobyteus", enabled: process.env.RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E === "1", pins: [],
    override: process.env.AUTOBYTEUS_E2E_MODEL?.trim() || undefined, llmConfig: { temperature: 0 }, autoExecute: true,
    toolNames: ["read_file", "write_file", "run_bash"] },
};
const enabledRuntimes = (Object.keys(RUNTIMES) as RuntimeName[]).filter((name) => RUNTIMES[name].enabled);
const describeLive = enabledRuntimes.length > 0 ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.SEMANTIC_MEMORY_LIVE_E2E_STEP_TIMEOUT_MS || 300_000);
const evidenceDir = process.env.SEMANTIC_MEMORY_LIVE_E2E_EVIDENCE_DIR?.trim() || null;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** semantic-memory-prompt-contract.md §2, the paragraph, with the folder (copied from the contract, not the source). */
const paragraph = (folder: string) => `Your semantic memory is the folder \`${folder}\`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.`;
const section = (folder: string) => `## Semantic Memory\n\n${paragraph(folder)}`;

/** A recorder that runs the real CLI unchanged and appends its argv, stdin and stdout to one file per process. */
const recorderSource = (realCommand: string, logPrefix: string) => `#!${process.execPath}
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const log = ${JSON.stringify(logPrefix)} + "-" + process.pid + ".jsonl";
const note = (dir, data) => fs.appendFileSync(log, JSON.stringify({ dir, data }) + "\\n");
note("argv", process.argv.slice(2));
const child = spawn(${JSON.stringify(realCommand)}, process.argv.slice(2), { stdio: ["pipe", "pipe", "inherit"] });
process.stdin.on("data", (chunk) => { note("in", chunk.toString("utf8")); child.stdin.write(chunk); });
process.stdin.on("end", () => child.stdin.end());
child.stdin.on("error", () => {});
process.stdout.on("error", () => {});
child.stdout.on("data", (chunk) => { note("out", chunk.toString("utf8")); process.stdout.write(chunk); });
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, () => child.kill(signal));
child.on("close", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
`;
type WireProcess = { file: string; argv: string[]; sent: Rec[]; received: Rec[]; sentText: string };
const jsonLines = (text: string): Rec[] => text.split("\n").flatMap((line) => { try { return [JSON.parse(line) as Rec]; } catch { return []; } });
/** Every process a recorder ran, with the JSON lines the server sent it and received from it. */
const readWire = (logPrefix: string): WireProcess[] => {
  const dir = path.dirname(logPrefix);
  return readdirSync(dir).filter((name) => name.startsWith(`${path.basename(logPrefix)}-`)).map((name) => {
    const entries = jsonLines(readFileSync(path.join(dir, name), "utf8"));
    const sentText = entries.filter((entry) => entry.dir === "in").map((entry) => entry.data as string).join("");
    const receivedText = entries.filter((entry) => entry.dir === "out").map((entry) => entry.data as string).join("");
    return { file: name, argv: (entries.find((entry) => entry.dir === "argv")?.data ?? []) as string[], sent: jsonLines(sentText),
      received: jsonLines(receivedText), sentText };
  });
};
/** Every file under `dir` (relative path → text). */
const filesUnder = (dir: string): Record<string, string> => {
  if (!existsSync(dir)) return {};
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) out[path.relative(dir, path.join(entry.parentPath, entry.name))] = readFileSync(path.join(entry.parentPath, entry.name), "utf8");
  }
  return out;
};
const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

describeLive("agent semantic memory with real runtimes", () => {
  const unique = randomUUID().slice(0, 8);
  let root = "";
  let dataDir = "";
  let memoryDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let vaultOpened = false;
  const models = new Map<RuntimeName, string>();
  const cleanup: Array<() => Promise<unknown>> = [];
  const sockets: WebSocket[] = [];
  const projects: Record<"A" | "B", string> = { A: "", B: "" };
  const wirePrefix: Partial<Record<"codex" | "claude" | "grok", string>> = {};
  const providerBodies: Rec[] = [];
  const originalFetch = globalThis.fetch;
  const previousEnv: Record<string, string | undefined> = {};
  const setEnv = (key: string, value: string) => { if (!(key in previousEnv)) previousEnv[key] = process.env[key]; process.env[key] = value; };
  const folderOf = (definitionId: string) => path.join(memoryDir, "semantic", encodeURIComponent(definitionId));

  const graphql = async <T = Rec>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    const base = process.env.SEMANTIC_MEMORY_LIVE_E2E_ROOT?.trim() || path.join(os.homedir(), ".autobyteus-e2e");
    await fs.mkdir(base, { recursive: true });
    root = await fs.realpath(await fs.mkdtemp(path.join(base, "semantic-memory-live-")));
    const tmp = await fs.realpath(os.tmpdir());
    if (root.startsWith(`${tmp}${path.sep}`) || root.startsWith("/tmp/")) throw new Error(`The data root must be outside the temp folder (AF-03): ${root}`);
    dataDir = path.join(root, "app-data");
    await fs.mkdir(path.join(root, "bin"), { recursive: true });
    await fs.mkdir(path.join(root, "wire"), { recursive: true });
    await fs.mkdir(dataDir);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const recorder = async (name: "codex" | "claude" | "grok", realCommand: string) => {
      const script = path.join(root, "bin", `${name}-recorder`);
      wirePrefix[name] = path.join(root, "wire", name);
      await fs.writeFile(script, recorderSource(realCommand, wirePrefix[name]!), { mode: 0o755 });
      return script;
    };
    if (RUNTIMES.codex.enabled) {
      const codexHome = path.join(root, "codex-home");
      await fs.mkdir(codexHome);
      await fs.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
      setEnv("CODEX_HOME", codexHome);
      setEnv("CODEX_APP_SERVER_COMMAND", await recorder("codex", which("codex")));
    }
    if (RUNTIMES.claude.enabled) setEnv("CLAUDE_CODE_EXECUTABLE_PATH", await recorder("claude", which("claude")));
    if (RUNTIMES.grok.enabled) setEnv("GROK_BUILD_COMMAND", await recorder("grok", which(process.env.GROK_BUILD_COMMAND?.trim() || "grok")));
    if (RUNTIMES.autobyteus.enabled) {
      // The provider request exactly as production built it (bodies only; no headers or query strings are kept).
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (/^https:\/\/api\.anthropic\.com\//.test(target) && typeof init?.body === "string") {
          try { providerBodies.push(JSON.parse(init.body) as Rec); } catch { /* not JSON */ }
        }
        return originalFetch(input, init);
      }) as typeof fetch;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (RUNTIMES.autobyteus.enabled) { await initializeLiveServerVault(); vaultOpened = true; }
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    memoryDir = appConfigProvider.config.getMemoryDir();
    for (const key of ["A", "B"] as const) {
      projects[key] = (await graphql<Rec>(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
        { input: { name: `SM live ${key} ${unique}` } })).createProject.projectId;
    }
  }, 300_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    if (vaultOpened) await closeLiveServerVault();
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    if (root) { await wait(2_000); await fs.rm(root, { recursive: true, force: true }); }
  }, 180_000);

  const openSocket = async (route: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}${route}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Rec : {} });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { socket, messages };
  };

  type Approval = { tool: string; args: string; decision: "approved" | "denied" };
  /**
   * Sends one message and returns the reply once the turn ends. Each approval request is answered by `decide`
   * (no `decide`: an approval request is recorded and denied, so a run that should need none shows it).
   */
  const ask = async (stream: { socket: WebSocket; messages: WsMessage[] }, runId: string, content: string,
    decide?: (tool: string, args: string) => boolean) => {
    const from = stream.messages.length;
    sendE2eSendMessageCommand(stream.socket, { agent_run_id: runId, content });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    const ofRun = (m: WsMessage) => !m.payload.agent_run_id || m.payload.agent_run_id === runId;
    const approvals: Approval[] = [];
    const answered = new Set<string>();
    while (!stream.messages.slice(from).some((m) => ofRun(m) && (m.type === "TURN_COMPLETED" || m.type === "ERROR"))) {
      if (Date.now() > deadline) {
        const tail = stream.messages.slice(from).slice(-20).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`);
        throw new Error(`Turn did not end for ${runId}. tail=${tail.join(" | ")}`);
      }
      for (const request of stream.messages.slice(from).filter((m) => ofRun(m) && m.type === "TOOL_APPROVAL_REQUESTED")) {
        const id = String(request.payload.invocation_id);
        if (answered.has(id)) continue;
        answered.add(id);
        const tool = String(request.payload.tool_name);
        const args = JSON.stringify(request.payload.arguments ?? {});
        const approve = decide ? decide(tool, args) : false;
        approvals.push({ tool, args: args.slice(0, 600), decision: approve ? "approved" : "denied" });
        stream.socket.send(JSON.stringify(approve ? { type: "APPROVE_TOOL", payload: { invocation_id: id } }
          : { type: "DENY_TOOL", payload: { invocation_id: id, reason: "Denied by the semantic memory live e2e." } }));
      }
      await wait(200);
    }
    await wait(500);
    const turn = stream.messages.slice(from).filter(ofRun);
    const textParts = turn.flatMap((m) => m.type === "SEGMENT_CONTENT" ? [m.payload]
      : m.type === "SEGMENT_CONTENT_BATCH" ? (m.payload.items as Rec[] | undefined ?? []).filter((item) => item.agent_run_id === runId) : []);
    return {
      text: textParts.map((part) => String(part.delta ?? "")).join(""),
      errors: turn.filter((m) => m.type === "ERROR").map((m) => JSON.stringify(m.payload)),
      tools: turn.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => `${m.payload.tool_name} ${JSON.stringify(m.payload.arguments ?? {}).slice(0, 300)}`),
      failures: turn.filter((m) => m.type === "TOOL_EXECUTION_FAILED" || m.type === "TOOL_DENIED").map((m) => JSON.stringify(m.payload).slice(0, 400)),
      approvals,
    };
  };
  const turnErrors = (errors: string[]) => `turn errors: ${errors.join(" | ").slice(0, 400)}`;

  const createAgent = async (name: RuntimeName, label: string, extra: Rec = {}) => (await graphql<Rec>(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id semanticMemoryEnabled semanticMemoryPath } }",
    { input: { name: `sm live ${label} ${name} ${unique}`, role: "assistant", category: "sm-live-e2e",
      description: "Semantic memory live test agent", toolNames: RUNTIMES[name].toolNames, skillNames: [],
      instructions: `You are a concise test agent (${label} ${name}). Do exactly what the user asks, with your own tools, and keep your replies short.`,
      ...extra } })).createAgentDefinition as Rec;
  const workspace = async (label: string) => {
    const dir = path.join(root, `ws-${label}`);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };
  const runConfig = (name: RuntimeName, workspaceRootPath: string, autoExecute = RUNTIMES[name].autoExecute) => ({
    llmModelIdentifier: models.get(name)!, llmConfig: RUNTIMES[name].llmConfig, autoExecuteTools: autoExecute,
    runtimeKind: RUNTIMES[name].kind, workspaceRootPath });
  const createRun = async (agentDefinitionId: string, config: Rec, projectId?: string) => {
    const created = (await graphql<Rec>("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, ...config, ...(projectId ? { projectId } : {}) } })).createAgentRun as Rec;
    expect(created, created.message).toMatchObject({ success: true });
    const runId = created.runId as string;
    cleanup.push(() => graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }));
    return runId;
  };
  const terminate = (runId: string) => graphql<Rec>("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });

  /** The instructions the runtime received for the run whose agent is `agentId` (wire, provider body or capsule). */
  const receivedInstructions = async (name: RuntimeName, marker: string, runId: string): Promise<string[]> => {
    if (name === "codex") return readWire(wirePrefix.codex!).flatMap((p) => p.sent).filter((m) => (m.method === "thread/start"
      || m.method === "thread/resume") && String(m.params?.baseInstructions ?? "").includes(marker)).map((m) => String(m.params.baseInstructions));
    if (name === "claude" || name === "grok") return readWire(wirePrefix[name]!).filter((p) => p.sentText.includes(marker) || p.argv.join(" ").includes(marker))
      .map((p) => `${p.argv.join(" ")}\n${p.sentText}`);
    if (name === "autobyteus") return providerBodies.map((body) => JSON.stringify(body.system ?? "")).filter((system) => system.includes(marker))
      .map((system) => JSON.parse(system) as unknown).map((system) => typeof system === "string" ? system
        : (system as Rec[]).map((block) => String(block.text ?? "")).join("\n"));
    const capsule = (dir: string): string | null => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name === "agy-project") {
          const manifest = JSON.parse(readFileSync(path.join(full, "manifest.json"), "utf8")) as Rec;
          if (manifest.runId === runId) return full;
        } else { const found = capsule(full); if (found) return found; }
      }
      return null;
    };
    const found = capsule(path.join(memoryDir, "agents"));
    if (!found) return [];
    const agents = path.join(found, ".agents", "agents");
    return readdirSync(agents).map((agent) => readFileSync(path.join(agents, agent, "agent.md"), "utf8"));
  };
  /** The JSON-RPC request the server sent to Codex for a run (by a marker in its instructions). */
  const codexThreadRequests = (marker: string) => readWire(wirePrefix.codex!).flatMap((p) => p.sent)
    .filter((m) => (m.method === "thread/start" || m.method === "thread/resume") && String(m.params?.baseInstructions ?? "").includes(marker));
  const excerpt = (request: Rec) => ({ method: request.method, sandbox: request.params.sandbox, approvalPolicy: request.params.approvalPolicy,
    cwd: request.params.cwd, configKeys: Object.keys(request.params.config ?? {}).sort(),
    sandbox_workspace_write: request.params.config?.sandbox_workspace_write ?? null,
    semanticSection: String(request.params.baseInstructions).includes("## Semantic Memory")
      ? String(request.params.baseInstructions).slice(String(request.params.baseInstructions).indexOf("## Semantic Memory")) : null });

  describe.each(enabledRuntimes)("%s", (name) => {
    const codeword = `SMCODE-${name.toUpperCase()}-${unique}`;
    let agent: Rec = {};
    let folder = "";

    beforeAll(async () => {
      const runtime = RUNTIMES[name];
      const availability = await graphql<Rec>("query($r: String!) { runtimeAvailability(runtimeKind: $r) { enabled reason } }", { r: runtime.kind });
      expect(availability.runtimeAvailability, name).toMatchObject({ enabled: true });
      const catalog = await graphql<Rec>("query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
        { r: runtime.kind });
      const available = (catalog.providerModelCatalogSnapshots as Rec[]).flatMap((snapshot) => (snapshot.llmModels as Rec[]).map((m) => String(m.modelIdentifier)));
      const pins = name === "autobyteus" ? available.filter((id) => /haiku/i.test(id)).slice(0, 1) : runtime.pins;
      const pin = pins.find((candidate) => available.includes(candidate)) ?? pins[0] ?? "";
      const choice = chooseLiveModel(name === "agy" ? "grok" : name, pin, available, runtime.override);
      models.set(name, choice.model);
      console.info("SEMANTIC_MEMORY_LIVE_MODEL", JSON.stringify({ runtime: name, model: choice.model, ...(choice.fallbackFrom ? { pinned: choice.fallbackFrom } : {}) }));
      agent = await createAgent(name, "keeper", { semanticMemoryEnabled: true });
      folder = folderOf(agent.id);
      expect(agent).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folder });
    }, 300_000);

    it("SML-WRITE (AC-001, AC-002): a run under Project A writes its codeword into its semantic memory, told only by its instructions", async () => {
      const ws = await workspace(`${name}-a`);
      const runId = await createRun(agent.id, runConfig(name, ws), projects.A);
      const stream = await openSocket(`/ws/agent/${runId}`);
      const reply = await ask(stream, runId, `Remember this for all your future work, in every Project: the deploy codeword is ${codeword}. `
        + "Save it now as a short Markdown document in your semantic memory (the folder your instructions name), then reply SAVED.");
      const files = filesUnder(folder);
      const instructions = await receivedInstructions(name, `(keeper ${name})`, runId);
      const summary = { runId, model: models.get(name), reply: reply.text.slice(0, 300), tools: reply.tools, failures: reply.failures,
        approvals: reply.approvals, errors: reply.errors, folder, files, workspaceFiles: filesUnder(ws),
        instructionsHaveSection: instructions.map((text) => text.includes(paragraph(folder))),
        instructionsExcerpt: instructions[0] ? instructions[0].slice(Math.max(0, instructions[0].indexOf("## Project")),
          instructions[0].indexOf(paragraph(folder)) + paragraph(folder).length + 200) : null,
        ...(name === "codex" ? { wire: codexThreadRequests(`(keeper ${name})`).map(excerpt) } : {}),
        ...(name === "claude" ? { addDirArgs: readWire(wirePrefix.claude!).filter((p) => p.sentText.includes(`(keeper ${name})`))
          .map((p) => p.argv.filter((arg, i, all) => arg === "--add-dir" || all[i - 1] === "--add-dir")) } : {}) };
      console.info(`SEMANTIC_MEMORY_LIVE_WRITE ${name}`, JSON.stringify(summary).slice(0, 2000));
      await keep(`SML-WRITE-${name}.json`, summary);
      expect(reply.errors, turnErrors(reply.errors)).toEqual([]);
      expect(Object.values(files).some((text) => text.includes(codeword)), JSON.stringify(summary).slice(0, 1500)).toBe(true);
      expect(Object.values(filesUnder(ws)).some((text) => text.includes(codeword))).toBe(false);
      expect(reply.approvals, "no approval asked for the agent's own memory").toEqual([]);
      expect(instructions.length, "instructions received").toBeGreaterThan(0);
      for (const text of instructions) expect(text).toContain(paragraph(folder));
      if (name === "autobyteus") {
        const system = instructions[0]!;
        expect(system).toContain(`(Project ID ${projects.A}). Use this Project ID with the Project tools; ask the user before working on another Project.\n\n${section(folder)}\n\n## Working Environment`);
      }
      if (name === "codex") {
        const [start] = codexThreadRequests(`(keeper ${name})`);
        expect(start!.params).toMatchObject({ sandbox: "workspace-write", approvalPolicy: "on-request" });
        expect(start!.params.config.sandbox_workspace_write).toEqual({ writable_roots: [folder] });
        // Control (QR-002): a write elsewhere outside the workspace still needs an approval; it is denied.
        const control = path.join(memoryDir, `not-semantic-${unique}.txt`);
        const denied = await ask(stream, runId, `Now run this exact shell command once: echo control > ${control} — then reply DONE.`, () => false);
        console.info("SEMANTIC_MEMORY_LIVE_CODEX_CONTROL", JSON.stringify({ approvals: denied.approvals, tools: denied.tools, failures: denied.failures }).slice(0, 1500));
        await keep("SML-WRITE-codex-control.json", { control, reply: denied.text.slice(0, 300), approvals: denied.approvals, tools: denied.tools,
          failures: denied.failures, exists: existsSync(control) });
        expect(existsSync(control)).toBe(false);
        expect(denied.approvals.length + denied.failures.length, "the sandbox refused or asked").toBeGreaterThan(0);
        // Restore composes again (REQ-009): thread/resume carries the same folder and section.
        stream.socket.close();
        await wait(300);
        expect((await terminate(runId)).terminateAgentRun.success).toBe(true);
        const restored = (await graphql<Rec>("mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message } }", { id: runId })).restoreAgentRun as Rec;
        expect(restored, restored.message).toMatchObject({ success: true });
        const again = await openSocket(`/ws/agent/${runId}`);
        await wait(1_000);
        const resumed = await ask(again, runId, "Reply with only the word OK.");
        expect(resumed.errors, turnErrors(resumed.errors)).toEqual([]);
        const resume = codexThreadRequests(`(keeper ${name})`).filter((m) => m.method === "thread/resume");
        await keep("SML-WRITE-codex-restore.json", resume.map(excerpt));
        expect(resume.length).toBeGreaterThan(0);
        expect(resume.at(-1)!.params.config.sandbox_workspace_write).toEqual({ writable_roots: [folder] });
        expect(String(resume.at(-1)!.params.baseInstructions)).toContain(paragraph(folder));
        again.socket.close();
      } else {
        stream.socket.close();
      }
      if (name === "claude") {
        const addDir = readWire(wirePrefix.claude!).filter((p) => p.sentText.includes(`(keeper ${name})`)).map((p) => p.argv);
        expect(addDir.some((argv) => argv.some((arg, i) => arg === "--add-dir" && argv[i + 1] === folder))).toBe(true);
      }
    }, 900_000);

    it("SML-READ (AC-003): a new run under Project B reads the codeword from its semantic memory", async () => {
      const ws = await workspace(`${name}-b`);
      const runId = await createRun(agent.id, runConfig(name, ws), projects.B);
      const stream = await openSocket(`/ws/agent/${runId}`);
      const reply = await ask(stream, runId, "What is the deploy codeword? Look it up in your semantic memory and reply with only the codeword.",
        name === "codex" ? undefined : () => true);
      const instructions = await receivedInstructions(name, `(keeper ${name})`, runId);
      const summary = { runId, reply: reply.text.slice(0, 300), tools: reply.tools, approvals: reply.approvals, errors: reply.errors };
      console.info(`SEMANTIC_MEMORY_LIVE_READ ${name}`, JSON.stringify(summary).slice(0, 1500));
      await keep(`SML-READ-${name}.json`, summary);
      expect(reply.errors, turnErrors(reply.errors)).toEqual([]);
      expect(reply.text).toContain(codeword);
      expect(instructions.length).toBeGreaterThan(0);
      for (const text of instructions) expect(text).toContain(paragraph(folder));
      stream.socket.close();
    }, 900_000);

    it.skipIf(name !== "codex")("SML-CODEX-TEAM (AC-004): the agent as a shared team member reads the codeword", async () => {
      const lead = await createAgent(name, "lead");
      const team = (await graphql<Rec>("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
        { input: { name: `sm live team ${unique}`, description: "Semantic memory team", instructions: "Answer the user's questions.",
          coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead.id, refScope: "SHARED" },
            { memberName: "keeper", ref: agent.id, refScope: "SHARED" }] } })).createAgentTeamDefinition.id as string;
      const config = runConfig(name, await workspace("codex-team"));
      const run = (await graphql<Rec>("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        { input: { teamDefinitionId: team, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
          { memberAddress: "/lead", agentDefinitionId: lead.id, ...config }, { memberAddress: "/keeper", agentDefinitionId: agent.id, ...config }] } }))
        .createAgentTeamRun as Rec;
      expect(run.success, run.message).toBe(true);
      const teamRunId = run.teamRunId as string;
      cleanup.push(() => graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId }));
      const members = flattenE2eConfiguredAgentExecutions((await graphql<Rec>("query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }",
        { id: teamRunId })).getTeamRunResumeConfig.executionTree);
      const keeperRunId = members.find((member) => member.memberName === "keeper")!.agentRunId;
      const stream = await openSocket(`/ws/agent-team/${teamRunId}`);
      const reply = await ask(stream, keeperRunId, "What is the deploy codeword? Look it up in your semantic memory and reply with only the codeword.");
      const wire = codexThreadRequests(`(keeper ${name})`).filter((m) => m.params.baseInstructions.includes("## Working With Other Agents")
        || m.params.baseInstructions.includes("## AgentTeam Addressing"));
      const summary = { teamRunId, keeperRunId, reply: reply.text.slice(0, 300), tools: reply.tools, approvals: reply.approvals, wire: wire.map(excerpt) };
      console.info("SEMANTIC_MEMORY_LIVE_CODEX_TEAM", JSON.stringify(summary).slice(0, 1500));
      await keep("SML-CODEX-TEAM.json", summary);
      expect(reply.errors, turnErrors(reply.errors)).toEqual([]);
      expect(reply.text).toContain(codeword);
      expect(wire.length).toBeGreaterThan(0);
      expect(String(wire.at(-1)!.params.baseInstructions).endsWith(`\n\n${section(folder)}`)).toBe(true);
      expect(wire.at(-1)!.params.config.sandbox_workspace_write).toEqual({ writable_roots: [folder] });
      stream.socket.close();
    }, 900_000);

    it.skipIf(name !== "codex")("SML-CODEX-INTEGRATION (AC-002): with integration variables the shell reaches the proxy and the memory is written in one run", async () => {
      const source = path.join(root, "integration-source");
      await fs.mkdir(path.join(source, "github"), { recursive: true });
      await fs.writeFile(path.join(source, "github", "integration.json"), JSON.stringify({ name: "GitHub", description: "GitHub through the credential proxy.",
        token: { help: "A test token." }, prerequisites: ["curl", "git"] }));
      await fs.writeFile(path.join(source, "github", "SKILL.md"), "---\nname: github-integration\ndescription: Reach GitHub through the AutoByteus proxy.\n---\n\nUse $AUTOBYTEUS_GITHUB_API_URL.\n");
      const imported = (await graphql<Rec>("mutation($location: String!) { importIntegrations(location: $location) { id state } }", { location: source })).importIntegrations;
      expect(imported).toEqual([{ id: "github", state: "NEEDS_TOKEN" }]);
      const integrated = await createAgent(name, "integrated", { semanticMemoryEnabled: true, skillNames: ["github-integration"] });
      const integratedFolder = folderOf(integrated.id);
      const integrationCode = `SMNET-${unique}`;
      const runId = await createRun(integrated.id, runConfig(name, await workspace("codex-integration")), projects.A);
      const stream = await openSocket(`/ws/agent/${runId}`);
      const reply = await ask(stream, runId, "Run this exact shell command once: curl -s -o /dev/null -w '%{http_code}' \"$AUTOBYTEUS_GITHUB_API_URL/repos/octocat/hello-world\" "
        + `— then save a short Markdown document in your semantic memory (the folder your instructions name) that says: proxy probe ${integrationCode} returned <the HTTP code>. Reply with the HTTP code.`);
      const [start] = codexThreadRequests(`(integrated ${name})`);
      const files = filesUnder(integratedFolder);
      const summary = { runId, reply: reply.text.slice(0, 300), tools: reply.tools, failures: reply.failures, approvals: reply.approvals,
        files, wire: start ? excerpt(start) : null };
      console.info("SEMANTIC_MEMORY_LIVE_CODEX_INTEGRATION", JSON.stringify(summary).slice(0, 2000));
      await keep("SML-CODEX-INTEGRATION.json", summary);
      expect(reply.errors, turnErrors(reply.errors)).toEqual([]);
      expect(start!.params.config.sandbox_workspace_write).toEqual({ network_access: true, writable_roots: [integratedFolder] });
      expect(Object.keys(start!.params.config).sort()).toEqual(["mcp_servers", "sandbox_workspace_write", "shell_environment_policy"]);
      expect(reply.approvals).toEqual([]);
      const saved = Object.values(files).find((text) => text.includes(integrationCode));
      expect(saved, JSON.stringify(summary).slice(0, 1500)).toBeTruthy();
      const httpCode = /\b([1-5]\d\d)\b/.exec(saved!)?.[1];
      expect(httpCode, `HTTP code from the proxy in: ${saved}`).toBeTruthy();
      stream.socket.close();
    }, 900_000);

    it.skipIf(name !== "codex")("SML-CODEX-OFF (AC-005): an agent without the setting gets an unchanged thread config, no section and no folder", async () => {
      const plain = await createAgent(name, "plain");
      expect(plain).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null });
      const runId = await createRun(plain.id, runConfig(name, await workspace("codex-plain")), projects.A);
      const stream = await openSocket(`/ws/agent/${runId}`);
      const reply = await ask(stream, runId, "Reply with only the word OK.");
      const [start] = codexThreadRequests(`(plain ${name})`);
      await keep("SML-CODEX-OFF.json", { runId, reply: reply.text.slice(0, 100), wire: start ? excerpt(start) : null,
        folderExists: existsSync(folderOf(plain.id)), baseInstructionsTail: String(start?.params.baseInstructions ?? "").slice(-400) });
      expect(reply.errors, turnErrors(reply.errors)).toEqual([]);
      expect(start!.params).toMatchObject({ sandbox: "workspace-write", approvalPolicy: "on-request" });
      expect(Object.keys(start!.params.config)).toEqual(["mcp_servers"]);
      expect(String(start!.params.baseInstructions)).not.toContain("Semantic Memory");
      expect(String(start!.params.baseInstructions).endsWith(`(Project ID ${projects.A}). Use this Project ID with the Project tools; ask the user before working on another Project.`)).toBe(true);
      expect(existsSync(folderOf(plain.id))).toBe(false);
      stream.socket.close();
    }, 900_000);

    it.skipIf(name !== "claude")("SML-CLAUDE-APPROVALS (AC-002, REQ-006): with auto-execute off the memory asks no approval the workspace does not ask", async () => {
      const ws = await workspace("claude-approvals");
      const wsCode = `WSCODE-${unique}`;
      const outsideCode = `OUTCODE-${unique}`;
      await fs.writeFile(path.join(ws, "ws-fact.md"), `The workspace codeword is ${wsCode}.\n`);
      const outside = path.join(root, "outside");
      await fs.mkdir(outside, { recursive: true });
      await fs.writeFile(path.join(outside, "outside-fact.md"), `The outside codeword is ${outsideCode}.\n`);
      const memoryDoc = Object.keys(filesUnder(folder)).find((file) => filesUnder(folder)[file]!.includes(codeword));
      expect(memoryDoc, "the document SML-WRITE saved").toBeTruthy();
      const runId = await createRun(agent.id, runConfig(name, ws, false), projects.A);
      const stream = await openSocket(`/ws/agent/${runId}`);
      const classify = (args: string) => args.includes(folder) || args.includes(encodeURIComponent(agent.id)) ? "semantic"
        : args.includes(outside) ? "outside" : "workspace";
      const reads = await ask(stream, runId, `Use your Read tool (not the shell) to read these two files: ${path.join(ws, "ws-fact.md")} and `
        + `${path.join(folder, memoryDoc!)}. Reply with both codewords.`, () => true);
      const writes = await ask(stream, runId, `Use your Write tool (not the shell) to create ${path.join(ws, "ws-out.md")} containing WS-${unique}, and `
        + `${path.join(folder, "approvals.md")} containing MEM-${unique}. Reply DONE.`, () => true);
      const outsideRead = await ask(stream, runId, `Use your Read tool to read ${path.join(outside, "outside-fact.md")} and reply with its codeword.`, () => false);
      const byTarget = (approvals: Approval[]) => approvals.map((approval) => ({ tool: approval.tool, target: classify(approval.args), decision: approval.decision }));
      const summary = { runId, reads: { text: reads.text.slice(0, 300), tools: reads.tools, approvals: byTarget(reads.approvals) },
        writes: { text: writes.text.slice(0, 300), tools: writes.tools, approvals: byTarget(writes.approvals) },
        outsideRead: { text: outsideRead.text.slice(0, 300), tools: outsideRead.tools, approvals: byTarget(outsideRead.approvals) },
        files: { workspace: existsSync(path.join(ws, "ws-out.md")) ? readFileSync(path.join(ws, "ws-out.md"), "utf8") : null,
          memory: existsSync(path.join(folder, "approvals.md")) ? readFileSync(path.join(folder, "approvals.md"), "utf8") : null } };
      console.info("SEMANTIC_MEMORY_LIVE_CLAUDE_APPROVALS", JSON.stringify(summary).slice(0, 3000));
      await keep("SML-CLAUDE-APPROVALS.json", summary);
      for (const turn of [reads, writes]) expect(turn.errors, turnErrors(turn.errors)).toEqual([]);
      expect(reads.text).toContain(wsCode);
      expect(reads.text).toContain(codeword);
      expect(summary.files.workspace).toContain(`WS-${unique}`);
      expect(summary.files.memory).toContain(`MEM-${unique}`);
      // No extra prompt: a tool asks for the memory only if it asks for the workspace too, and no prompt names another folder.
      const asked = [...summary.reads.approvals, ...summary.writes.approvals];
      const toolsAskedFor = (target: string) => new Set(asked.filter((approval) => approval.target === target).map((approval) => approval.tool));
      for (const tool of toolsAskedFor("semantic")) expect(toolsAskedFor("workspace").has(tool), `${tool} asked only for the memory`).toBe(true);
      expect(asked.filter((approval) => approval.target === "outside")).toEqual([]);
      // Control: a folder that is neither the workspace nor the memory asks before reading.
      expect(outsideRead.text).not.toContain(outsideCode);
      expect(summary.outsideRead.approvals.some((approval) => approval.target === "outside")
        || outsideRead.failures.length > 0, JSON.stringify(summary.outsideRead)).toBe(true);
      stream.socket.close();
    }, 900_000);
  });
});
