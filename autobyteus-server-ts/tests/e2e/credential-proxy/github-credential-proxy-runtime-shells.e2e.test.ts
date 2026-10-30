/**
 * Runtime shells × GitHub credential proxy (autobyteus-311, AC-002, AC-006, AC-007; DEC-011): a real run in each
 * runtime, whose agent is ticked for GitHub, uses GitHub from its own shell through the proxy, with the GitHub test token.
 *
 * Setup: an in-process studio server with its own application vault. GitHub is connected once through
 * `connectGitHubIntegration` with `test.github.token` from the test vault (the token is revealed only in that request).
 * Each cell:
 *   1. ticks a new agent and starts its run. The run's shell runs `tests/fixtures/github-proxy-shell-probe.sh`, which
 *      records `env` and `ps`, curls issue #1 of `ryan-zheng-teki/autobyteus-mcp-test` at `$AUTOBYTEUS_GITHUB_API_URL`
 *      and runs `git ls-remote https://github.com/<repo>.git` (git's redirection, unchanged URL).
 *      - live runtimes: the agent is asked in chat to run the probe with its own shell tool (native `run_bash`, the Claude
 *        Bash tool, the Codex, Grok and AGY shells);
 *      - AGY scripted: `tests/fixtures/agy-shell-env-probe-cli.mjs` runs the probe as a child of the AGY process itself.
 *   2. asserts: the variables are set (the API address, `GIT_CONFIG_*` insteadOf, `GIT_TERMINAL_PROMPT=0`); GitHub
 *      answered issue #1 and the ls-remote; the token is in none of the shell's env, process listing, outputs, the run's
 *      wire messages, the data dir (database, memory, workspaces, integrations files) or a temp `CODEX_HOME`. No tool
 *      approval was requested (Codex with auto-execute off runs in `workspace-write`; DEC-011 adds its network).
 *   3. with the run's own address: untick → `403 INTEGRATION_NOT_ALLOWED`; tick again → 200; stop the run →
 *      `403 RUN_PASS_INVALID`. Each call has its activity record.
 * Also (AGY scripted): a run of an agent that is not ticked gets none of the variables; in a team, only the member
 * whose agent is ticked gets them, and stopping the team ends its pass.
 * Gates (a skip is not a pass), always with RUN_GITHUB_PROXY_E2E=1 and AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault:
 *   - AGY scripted (no model): RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-shell-env-probe-cli.mjs
 *   - native AutoByteus with LM Studio: RUN_LMSTUDIO_E2E=1 (LMSTUDIO_TARGET_TEXT_MODEL, default qwen3.6-35b-a3b)
 *   - Claude: RUN_CLAUDE_E2E=1 (CLAUDE_E2E_TOOL_MODEL, default haiku)
 *   - Codex, auto-execute off (`workspace-write`) and on: RUN_CODEX_E2E=1 (CODEX_E2E_TOOL_MODEL); use a temp CODEX_HOME
 *   - Grok Build: RUN_GROK_E2E=1 (GROK_E2E_MODEL; paid on the user's plan)
 *   - Antigravity live (host login, adds to the user's agy history): RUN_AGY_E2E=1 without ANTIGRAVITY_CLI_COMMAND
 *   - Grok scripted (no model): RUN_GROK_SCRIPTED_E2E=1. `GROK_BUILD_COMMAND` is pointed at a wrapper that runs the probe
 *     with the Grok process's own environment and then replays `tests/fixtures/grok-acp/prompt.jsonl` (fake-grok-cli)
 * Signed-in CLIs need the real HOME, USER and LOGNAME (TESTING.md). Network access to api.github.com and github.com.
 * Optional GITHUB_PROXY_SHELLS_E2E_EVIDENCE_DIR=<dir> writes one value-free summary per cell (the pass is masked).
 * Command: <gates> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getSecretVaultRuntime, resetSecretVaultRuntimeForTests } from "../../../src/secret-management/secret-vault-runtime.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { createFakeGrokCommand, grokAcpFixturePath, overrideEnv } from "../helpers/grok-fake-cli.js";

type Wire = { type: string; payload: Record<string, unknown> };
type Live = "native" | "claude" | "codex-workspace-write" | "codex-full-access" | "grok" | "agy-live";
type ProbeResult = { apiHttp: string; gitStatus: number; psStatus: number; psEnvStatus: number };

const REPOSITORY = "ryan-zheng-teki/autobyteus-mcp-test";
const PROBE = fileURLToPath(new URL("../../fixtures/github-proxy-shell-probe.sh", import.meta.url));
const AGY_PROBE_CLI = fileURLToPath(new URL("../../fixtures/agy-shell-env-probe-cli.mjs", import.meta.url));
const AGY_COMMAND = process.env["ANTIGRAVITY_CLI_COMMAND"]?.trim() ?? "";
const GATE = process.env["RUN_GITHUB_PROXY_E2E"] === "1";
const ready = (command: string) => Boolean(command) && spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const flag = (name: string) => GATE && process.env[name] === "1";
const ENABLED = {
  agyScripted: flag("RUN_AGY_FAILURE_E2E") && path.resolve(AGY_COMMAND) === AGY_PROBE_CLI,
  native: flag("RUN_LMSTUDIO_E2E"),
  claude: flag("RUN_CLAUDE_E2E") && ready("claude"),
  codex: flag("RUN_CODEX_E2E") && ready("codex"),
  grok: flag("RUN_GROK_E2E") && ready(process.env["GROK_BUILD_COMMAND"]?.trim() || "grok"),
  agyLive: flag("RUN_AGY_E2E") && !AGY_COMMAND && ready("agy"),
  grokScripted: flag("RUN_GROK_SCRIPTED_E2E"),
};
const LIVE: Record<Live, { kind: RuntimeKind; enabled: boolean; autoExecute: boolean; toolNames: string[]; preferred: Array<string | undefined> }> = {
  native: { kind: RuntimeKind.AUTOBYTEUS, enabled: ENABLED.native, autoExecute: true, toolNames: ["run_bash"],
    preferred: [process.env["LMSTUDIO_TARGET_TEXT_MODEL"], "qwen3.6-35b-a3b"] },
  claude: { kind: RuntimeKind.CLAUDE_AGENT_SDK, enabled: ENABLED.claude, autoExecute: true, toolNames: [],
    preferred: [process.env["CLAUDE_E2E_TOOL_MODEL"], "haiku"] },
  "codex-workspace-write": { kind: RuntimeKind.CODEX_APP_SERVER, enabled: ENABLED.codex, autoExecute: false, toolNames: [],
    preferred: [process.env["CODEX_E2E_TOOL_MODEL"], "gpt-5.4-mini", "mini"] },
  "codex-full-access": { kind: RuntimeKind.CODEX_APP_SERVER, enabled: ENABLED.codex, autoExecute: true, toolNames: [],
    preferred: [process.env["CODEX_E2E_TOOL_MODEL"], "gpt-5.4-mini", "mini"] },
  grok: { kind: RuntimeKind.GROK_BUILD, enabled: ENABLED.grok, autoExecute: true, toolNames: [],
    preferred: [process.env["GROK_E2E_MODEL"]] },
  "agy-live": { kind: RuntimeKind.ANTIGRAVITY_CLI, enabled: ENABLED.agyLive, autoExecute: true, toolNames: [],
    preferred: [process.env["AGY_E2E_MODEL"], "flash-low", "flash"] },
};
const LLM_CONFIG: Partial<Record<RuntimeKind, Record<string, unknown>>> = {
  [RuntimeKind.AUTOBYTEUS]: { temperature: 0 }, [RuntimeKind.CODEX_APP_SERVER]: { reasoning_effort: "low" } };
const evidenceDir = process.env["GITHUB_PROXY_SHELLS_E2E_EVIDENCE_DIR"]?.trim() || null;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const suite = Object.values(ENABLED).some(Boolean) ? describe : describe.skip;

/** Every file under `dir` whose bytes contain `secret` (paths only; the secret is never printed). */
const filesContaining = (dir: string, secret: string): string[] => {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    const full = path.join(entry.parentPath, entry.name);
    if (entry.isFile() && readFileSync(full).includes(secret)) found.push(full);
  }
  return found;
};
const envOf = (text: string) => new Map(text.split("\n").filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)] as const));
const mask = (text: string) => text.replace(/rp_[A-Za-z0-9_-]+/g, "rp_<pass>");

suite("Runtime shells use GitHub through the credential proxy (live GitHub)", () => {
  let dataDir = "";
  let probeRoot = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let secret: string | null = null;
  const ticked = new Set<string>();
  const runIds: string[] = [];
  const teamRunIds: string[] = [];
  const previous = { lmStudioHosts: process.env["LMSTUDIO_HOSTS"], probeScript: process.env["AGY_SHELL_PROBE_SCRIPT"],
    probeDir: process.env["AGY_SHELL_PROBE_DIR"], agyCase: process.env["AGY_FAKE_CASE"] };

  const gql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await res.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const setTicks = () => gql("mutation($ids: [String!]!) { setGitHubIntegrationAgentAccess(agentDefinitionIds: $ids) { agentDefinitionIds } }",
    { ids: [...ticked] });
  /** Connects GitHub once, with the test token (skips the cell with its reason when the token is unavailable). */
  const connect = async (context: TestContext) => {
    if (secret) return;
    const token = await readLiveTestSecret(context, "test.github.token");
    const status = (await gql<{ connectGitHubIntegration: { connected: boolean; login: string | null } }>(
      "mutation($token: String!) { connectGitHubIntegration(token: $token) { connected login } }",
      { token: token.revealToTrustedConsumer() })).connectGitHubIntegration;
    expect(status).toMatchObject({ connected: true, login: expect.any(String) });
    secret = token.revealToTrustedConsumer();
  };
  const createAgent = async (label: string, toolNames: string[], tick: boolean) => {
    const id = (await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `gh-proxy-${label}-${randomUUID().slice(0, 6)}`, role: "assistant", category: "runtime-e2e",
        description: "GitHub credential proxy shell test agent.", toolNames,
        instructions: "You are a shell test agent. Run exactly the one shell command the user gives you, once, with your shell tool. Do not run any other command, do not read or explore files, and do not change the command. Then reply FINISHED." } })).createAgentDefinition.id;
    if (tick) { ticked.add(id); await setTicks(); }
    return id;
  };
  const pickModel = async (kind: RuntimeKind, preferred: Array<string | undefined>) => {
    if (kind === RuntimeKind.ANTIGRAVITY_CLI && ENABLED.agyScripted) return "gemini-3.8-flash-low";
    const models = kind === RuntimeKind.AUTOBYTEUS
      ? (await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
        { p: "LMSTUDIO", r: kind })).ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier)
      : (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
        "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: kind }))
        .providerModelCatalogSnapshots.flatMap((p) => p.llmModels.map((m) => m.modelIdentifier));
    const fragments = preferred.map((m) => m?.trim()).filter((m): m is string => Boolean(m));
    const model = fragments.map((f) => models.find((m) => m.includes(f))).find(Boolean)
      ?? (kind === RuntimeKind.AUTOBYTEUS ? undefined : models[0]);
    expect(model, `${kind} models: ${models.join(", ")}`).toBeTruthy();
    return model!;
  };
  const startRun = async (agentDefinitionId: string, kind: RuntimeKind, model: string, workspace: string, autoExecuteTools: boolean) => {
    await fs.mkdir(workspace, { recursive: true });
    const run = (await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: LLM_CONFIG[kind] ?? null,
        autoExecuteTools, runtimeKind: kind } })).createAgentRun;
    expect(run.success, run.message).toBe(true);
    runIds.push(run.runId!);
    return run.runId!;
  };
  /** One chat turn on the run's socket; fails at once if a tool approval is requested. Returns the wire messages. */
  const chatTurn = async (runId: string, content: string, timeoutMs = 360_000): Promise<Wire[]> => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* ignore malformed rows */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    const ends = new Set(["TURN_COMPLETED", "ERROR", "TOOL_APPROVAL_REQUESTED"]);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !messages.some((m) => ends.has(m.type))) await wait(200);
    socket.close();
    const tail = mask(messages.slice(-12).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 200)}`).join(" | "));
    expect(messages.map((m) => m.type).filter((type) => ends.has(type)), tail).toEqual(["TURN_COMPLETED"]);
    return messages;
  };
  const waitForFile = async (file: string, timeoutMs = 90_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !existsSync(file)) await wait(250);
    expect(existsSync(file), `${file} written`).toBe(true);
  };
  const call = async (address: string) => {
    const res = await fetch(`${address}/repos/${REPOSITORY}/issues/1`, { headers: { accept: "application/vnd.github+json" } });
    const body = await res.text();
    return { status: res.status, error: res.status === 200 ? null : (JSON.parse(body) as { error?: string }).error ?? body.slice(0, 80) };
  };
  const activitySince = async (mark: number) => {
    const file = path.join(dataDir, "integrations", "activity.jsonl");
    const lines = existsSync(file) ? (await fs.readFile(file, "utf8")).split("\n").filter(Boolean) : [];
    return { count: lines.length, records: lines.slice(mark).map((line) => JSON.parse(line) as Record<string, unknown>) };
  };
  /** The probe's variables, the GitHub answers and the token scan of the shell's own outputs. */
  const readProbe = async (out: string) => {
    await waitForFile(path.join(out, "result.json"));
    const result = JSON.parse(await fs.readFile(path.join(out, "result.json"), "utf8")) as ProbeResult;
    const env = envOf(await fs.readFile(path.join(out, "env.txt"), "utf8"));
    const address = env.get("AUTOBYTEUS_GITHUB_API_URL") ?? null;
    const count = Number(env.get("GIT_CONFIG_COUNT") ?? 0);
    const gitConfig = Array.from({ length: count }, (_, n) => [env.get(`GIT_CONFIG_KEY_${n}`), env.get(`GIT_CONFIG_VALUE_${n}`)]);
    const issue = existsSync(path.join(out, "issue.json")) ? JSON.parse(await fs.readFile(path.join(out, "issue.json"), "utf8")) as { number?: number } : null;
    const lsRemote = existsSync(path.join(out, "ls-remote.txt")) ? await fs.readFile(path.join(out, "ls-remote.txt"), "utf8") : "";
    return { result, address, gitConfig, terminalPrompt: env.get("GIT_TERMINAL_PROMPT") ?? null, issueNumber: issue?.number ?? null,
      lsRemoteHead: /^[0-9a-f]{40}\tHEAD/m.test(lsRemote), tokenInShellOutputs: filesContaining(out, secret!).map((f) => path.basename(f)) };
  };
  const expectVariables = (probe: Awaited<ReturnType<typeof readProbe>>) => {
    expect(probe.address).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/rp_[\w-]+\/github\/api$/);
    const gitBase = probe.address!.replace(/\/api$/, "/git/");
    expect(probe.gitConfig).toContainEqual([`url.${gitBase}.insteadOf`, "https://github.com/"]);
    expect(probe.terminalPrompt).toBe("0");
    expect(probe.result).toMatchObject({ apiHttp: "200", gitStatus: 0 });
    expect({ issueNumber: probe.issueNumber, lsRemoteHead: probe.lsRemoteHead, tokenInShellOutputs: probe.tokenInShellOutputs })
      .toEqual({ issueNumber: 1, lsRemoteHead: true, tokenInShellOutputs: [] });
  };
  /** Untick → refused; tick again → allowed; stop → the pass is invalid. Returns the observed statuses. */
  const lifecycle = async (agentDefinitionId: string, address: string, stop: () => Promise<void>) => {
    ticked.delete(agentDefinitionId); await setTicks();
    const unticked = await call(address);
    ticked.add(agentDefinitionId); await setTicks();
    const reticked = await call(address);
    await stop();
    const stopped = await call(address);
    expect({ unticked, reticked, stopped }).toEqual({ unticked: { status: 403, error: "INTEGRATION_NOT_ALLOWED" },
      reticked: { status: 200, error: null }, stopped: { status: 403, error: "RUN_PASS_INVALID" } });
    return { unticked, reticked, stopped };
  };
  const terminate = (runId: string) => async () => {
    const result = (await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
  };
  /** The token in the data dir (database, memory, workspaces, integrations files) or a temp CODEX_HOME. */
  const tokenScan = (wire: Wire[] = []) => {
    const codexHome = process.env["CODEX_HOME"]?.trim();
    // Real paths: on macOS the temp folder is reached through the `/var` → `/private/var` link.
    const tempCodexHome = codexHome && existsSync(codexHome)
      && realpathSync(codexHome).startsWith(realpathSync(os.tmpdir())) ? codexHome : null;
    return { onWire: JSON.stringify(wire).includes(secret!), filesInDataDir: filesContaining(dataDir, secret!),
      filesInCodexHome: tempCodexHome ? filesContaining(tempCodexHome, secret!) : "not scanned (not a temp CODEX_HOME)" };
  };
  const writeSummary = async (label: string, summary: Record<string, unknown>) => {
    if (!evidenceDir) return;
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, `${label}.json`), mask(JSON.stringify(summary, null, 2)));
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "github-proxy-shells-e2e-")));
    probeRoot = path.join(dataDir, "agy-probes");
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env["LMSTUDIO_HOSTS"] ??= "http://127.0.0.1:1234";
    process.env["AGY_SHELL_PROBE_SCRIPT"] = PROBE;
    process.env["AGY_SHELL_PROBE_DIR"] = probeRoot;
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    // As at server startup: the run database's own vault, where the connect stores the token.
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize({ kind: "application", location: appConfigProvider.config.getOperationalDatabaseLocation() });
  }, 240_000);

  afterAll(async () => {
    if (app) {
      for (const id of teamRunIds) await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id }).catch(() => undefined);
      for (const id of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id }).catch(() => undefined);
      if (secret) await gql("mutation { disconnectGitHubIntegration { connected } }").catch(() => undefined);
      await app.close();
    }
    await resetSecretVaultRuntimeForTests();
    for (const [key, value] of [["LMSTUDIO_HOSTS", previous.lmStudioHosts], ["AGY_SHELL_PROBE_SCRIPT", previous.probeScript],
      ["AGY_SHELL_PROBE_DIR", previous.probeDir], ["AGY_FAKE_CASE", previous.agyCase]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it.skipIf(!ENABLED.agyScripted)("agy (scripted CLI): the AGY process's shell reaches GitHub; untick, re-tick, stop", async (context) => {
    await connect(context);
    const agent = await createAgent("agy-scripted", [], true);
    const mark = (await activitySince(0)).count;
    const runId = await startRun(agent, RuntimeKind.ANTIGRAVITY_CLI, await pickModel(RuntimeKind.ANTIGRAVITY_CLI, []),
      path.join(dataDir, "workspace-agy-scripted"), true);
    const probe = await readProbe(path.join(probeRoot, runId));
    expectVariables(probe);
    const statuses = await lifecycle(agent, probe.address!, terminate(runId));
    const activity = (await activitySince(mark)).records;
    const scan = tokenScan();
    await writeSummary("agy-scripted", { runtime: "antigravity_cli (scripted CLI)", probe, statuses, activity, scan });
    expect(activity.filter((r) => r.runId === runId).map((r) => `${r.route} ${r.method} ${r.status}${r.error ? ` ${r.error}` : ""}`))
      .toEqual(expect.arrayContaining(["api GET 200", "git GET 200", "api GET 403 INTEGRATION_NOT_ALLOWED"]));
    expect(activity.some((r) => r.error === "RUN_PASS_INVALID")).toBe(true);
    expect(scan).toMatchObject({ onWire: false, filesInDataDir: [] });
  }, 300_000);

  it.skipIf(!ENABLED.agyScripted)("agy (scripted CLI): a run of an agent that is not ticked gets no variables", async (context) => {
    await connect(context);
    const agent = await createAgent("agy-not-ticked", [], false);
    const runId = await startRun(agent, RuntimeKind.ANTIGRAVITY_CLI, await pickModel(RuntimeKind.ANTIGRAVITY_CLI, []),
      path.join(dataDir, "workspace-agy-not-ticked"), true);
    const probe = await readProbe(path.join(probeRoot, runId));
    await writeSummary("agy-not-ticked", { runtime: "antigravity_cli (scripted CLI)", probe });
    expect(probe).toMatchObject({ address: null, gitConfig: [], terminalPrompt: null, result: { apiHttp: "skipped" } });
  }, 300_000);

  it.skipIf(!ENABLED.agyScripted)("agy (scripted CLI) team: only the member whose agent is ticked gets the variables", async (context) => {
    await connect(context);
    const lead = await createAgent("team-lead-ticked", [], true);
    const helper = await createAgent("team-helper-not-ticked", [], false);
    const model = await pickModel(RuntimeKind.ANTIGRAVITY_CLI, []);
    const workspace = path.join(dataDir, "workspace-team");
    await fs.mkdir(workspace, { recursive: true });
    const teamDefinitionId = (await gql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `gh-proxy-team-${randomUUID().slice(0, 6)}`, description: "GitHub credential proxy team test.",
        instructions: "Test team.", coordinatorMemberName: "lead", nodes: [
          { memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "helper", ref: helper, refScope: "SHARED" }] } }))
      .createAgentTeamDefinition.id;
    const member = (agentDefinitionId: string, name: string) => ({ memberAddress: `/${name}`, agentDefinitionId, llmModelIdentifier: model,
      llmConfig: {}, autoExecuteTools: true, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, workspaceRootPath: workspace });
    const team = (await gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", llmModelIdentifier: model, llmConfig: {}, autoExecuteTools: true,
        runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, workspaceRootPath: workspace }],
      memberConfigs: [member(lead, "lead"), member(helper, "helper")] } })).createAgentTeamRun;
    expect(team.success, team.message).toBe(true);
    teamRunIds.push(team.teamRunId!);
    const tree = (await gql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { executionTree } }", { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
    const runOf = new Map(flattenE2eConfiguredAgentExecutions(tree).map((m) => [m.memberName, m.agentRunId]));
    // A member's runtime starts with its first message, as when the user writes to it in the team view.
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${team.teamRunId}`);
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    for (const name of ["lead", "helper"]) sendE2eSendMessageCommand(socket, { agent_run_id: runOf.get(name), content: "Hello." });
    const leadProbe = await readProbe(path.join(probeRoot, runOf.get("lead")!));
    const helperProbe = await readProbe(path.join(probeRoot, runOf.get("helper")!));
    expectVariables(leadProbe);
    expect(helperProbe).toMatchObject({ address: null, gitConfig: [], terminalPrompt: null, result: { apiHttp: "skipped" } });
    socket.close();
    await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId });
    const afterStop = await call(leadProbe.address!);
    const scan = tokenScan();
    await writeSummary("agy-team", { runtime: "antigravity_cli (scripted CLI), team", lead: leadProbe, helper: helperProbe, afterStop, scan });
    expect(afterStop).toEqual({ status: 403, error: "RUN_PASS_INVALID" });
    expect(scan).toMatchObject({ onWire: false, filesInDataDir: [] });
  }, 300_000);

  it.skipIf(!ENABLED.grokScripted)("grok (recorded fake CLI): the Grok process's shell reaches GitHub; untick, re-tick, stop", async (context) => {
    await connect(context);
    const agent = await createAgent("grok-scripted", [], true);
    const out = path.join(dataDir, "grok-scripted-probe");
    const fake = await createFakeGrokCommand();
    // The wrapper runs the probe as a child of the Grok process (its environment), then becomes the recorded fake CLI.
    await fs.writeFile(fake.command, [
      "#!/bin/sh",
      `case "$*" in *stdio) bash '${PROBE}' "$GROK_SHELL_PROBE_OUT" > /dev/null 2>&1 & ;; esac`,
      `exec "${process.execPath}" "${fileURLToPath(new URL("../../fixtures/grok-acp/fake-grok-cli.mjs", import.meta.url))}" "$@"`,
      "",
    ].join("\n"), { mode: 0o755 });
    const restoreEnv = overrideEnv({ GROK_BUILD_COMMAND: fake.command, GROK_SHELL_PROBE_OUT: out, FAKE_GROK_VERSION: undefined,
      FAKE_ACP_FIXTURE: grokAcpFixturePath("prompt"), FAKE_ACP_REPORT_MCP_READY: "1" });
    try {
      const mark = (await activitySince(0)).count;
      const runId = await startRun(agent, RuntimeKind.GROK_BUILD, "grok-4.7", path.join(dataDir, "workspace-grok-scripted"), true);
      const probe = await readProbe(out);
      expectVariables(probe);
      const statuses = await lifecycle(agent, probe.address!, terminate(runId));
      const activity = (await activitySince(mark)).records;
      const scan = tokenScan();
      await writeSummary("grok-scripted", { runtime: "grok_build (recorded fake CLI)", probe, statuses, activity, scan });
      expect(activity.filter((r) => r.runId === runId).map((r) => `${r.route} ${r.method} ${r.status}${r.error ? ` ${r.error}` : ""}`))
        .toEqual(expect.arrayContaining(["api GET 200", "git GET 200", "api GET 403 INTEGRATION_NOT_ALLOWED"]));
      expect(scan).toMatchObject({ onWire: false, filesInDataDir: [] });
    } finally {
      restoreEnv();
      await fs.rm(fake.dir, { recursive: true, force: true });
    }
  }, 300_000);

  for (const label of Object.keys(LIVE) as Live[]) {
    const cell = LIVE[label];
    it.skipIf(!cell.enabled)(`${label}: the agent's own shell reaches GitHub through the proxy; untick, re-tick, stop`, async (context) => {
      await connect(context);
      const agent = await createAgent(label, cell.toolNames, true);
      const model = await pickModel(cell.kind, cell.preferred);
      const workspace = path.join(dataDir, `workspace-${label}`);
      const out = path.join(workspace, "probe-out");
      const mark = (await activitySince(0)).count;
      const runId = await startRun(agent, cell.kind, model, workspace, cell.autoExecute);
      const wire = await chatTurn(runId, `Run this exact shell command once, then reply FINISHED:\nbash '${PROBE}' '${out}'`);
      const probe = await readProbe(out);
      expectVariables(probe);
      const statuses = await lifecycle(agent, probe.address!, terminate(runId));
      const activity = (await activitySince(mark)).records;
      const scan = tokenScan(wire);
      const approvalsRequested = wire.filter((m) => m.type === "TOOL_APPROVAL_REQUESTED").length;
      await writeSummary(label, { runtime: cell.kind, model, autoExecuteTools: cell.autoExecute, probe, statuses, activity, scan, approvalsRequested });
      expect(activity.filter((r) => r.runId === runId).map((r) => `${r.route} ${r.method} ${r.status}${r.error ? ` ${r.error}` : ""}`))
        .toEqual(expect.arrayContaining(["api GET 200", "git GET 200", "api GET 403 INTEGRATION_NOT_ALLOWED"]));
      expect(scan).toMatchObject({ onWire: false, filesInDataDir: [] });
      if (Array.isArray(scan.filesInCodexHome)) expect(scan.filesInCodexHome).toEqual([]);
    }, 480_000);
  }
});
