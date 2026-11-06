import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { DefaultProviderRelayAccess } from "../../../src/credential-proxy/provider-relays/provider-relay-access.js";
import { ProviderCallObservers } from "../../../src/credential-proxy/provider-relays/provider-relay-access.js";
import type { ProviderCallObservation } from "../../../src/credential-proxy/provider-relays/provider-call-observation.js";
import type { ApplicationPlatformRuntime } from "../../../src/application-platform/runtime/application-platform-runtime.js";
import { getSecretVaultRuntime } from "../../../src/secret-management/secret-vault-runtime.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { assertBriefStudioPackageBuilt, BRIEF_STUDIO_PACKAGE } from "../helpers/brief-studio-package.js";
import { fakeRuntimeState, prepareFakeRuntimes } from "../helpers/agent-runtimes-e2e-harness.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * DeepSeek Harness live: the real `dsh` (DeepSeek Harness 0.2.2-rc.1, `--profile acp`) against the REAL DeepSeek API
 * through the product's credential proxy relay, on the real Studio server (paid inference, flash model, low effort).
 *
 * Gate: RUN_DEEPSEEK_HARNESS_E2E=1, a working dsh command (`DEEPSEEK_HARNESS_COMMAND` or `dsh`, Node.js 24.9+), and the
 * DeepSeek key `provider.deepseek.api-key` in the test vault (`AUTOBYTEUS_TEST_VAULT`, TESTING.md#test-vault). The Brief
 * Studio case needs `pnpm -C autobyteus-server-ts test:integration:prepare` once.
 *
 * Command:
 *   AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_HARNESS_E2E=1 DEEPSEEK_HARNESS_COMMAND=<dsh> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/deepseek-harness-live.e2e.test.ts --no-watch
 *
 * Cases: availability, models and the Agent Runtimes row; a standalone run in a subfolder of a git repository (shell and
 * read cards, usage per call, the agent's own rule, only its configured skill, an Agent Tool, approval allow and reject,
 * stop of a running command, a reopen after an Agent Tools change, a restore by `session/resume`, the pass refused after
 * release); the dsh home's effective config (no subagent/workflow/goal/plugin-manager tools, no session log, only the
 * run's skills folder) and the user's `~/.dsh` untouched; a Brief Studio launch on dsh in the studio's application scope
 * and its pass refused after the application platform stopped; and the key-absence scan over every file of the data
 * root, the dsh processes' environments and the console (QR-001).
 */

const dshCommand = process.env.DEEPSEEK_HARNESS_COMMAND?.trim() || "dsh";
const dshReady = spawnSync(dshCommand, ["--version"], { stdio: "ignore" }).status === 0;
const live = process.env.RUN_DEEPSEEK_HARNESS_E2E === "1" && dshReady;
const describeLive = live ? describe : describe.skip;
const MODEL = process.env.DEEPSEEK_HARNESS_E2E_MODEL?.trim() || "deepseek-v4-flash";
const EFFORT = process.env.DEEPSEEK_HARNESS_E2E_REASONING_EFFORT?.trim() || "low";
const STEP_TIMEOUT_MS = Number(process.env.DEEPSEEK_HARNESS_E2E_STEP_TIMEOUT_MS || 240_000);
const KEY_SECRET_ID = "provider.deepseek.api-key";
const KEY_CONSUMER = { kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey" } as const;

type WsMessage = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (label: string, value: unknown) => process.stdout.write(`DSH_LIVE ${label} ${JSON.stringify(value)}\n`);

describeLive("DeepSeek Harness live (real dsh, real DeepSeek API, product relay)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let proxy: CredentialProxyHost;
  let applicationRuntime: ApplicationPlatformRuntime;
  let url: URL;
  let key = "";
  const passes = new Map<string, string>();
  const observations = new Map<string, ProviderCallObservation[]>();
  const consoleLines: string[] = [];
  const processEnvironments: string[] = [];
  const cleanup: Array<() => Promise<unknown>> = [];
  const sockets: WebSocket[] = [];
  const userDshHome = path.join(os.homedir(), ".dsh");
  let userDshBefore: string | null = null;
  /** The scripted CLIs for the other runtimes: Brief Studio's default Codex slot must not quarantine it before the dsh override. */
  let fakeRuntimes: ReturnType<typeof prepareFakeRuntimes> | null = null;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const rest = async (method: "GET" | "POST" | "PUT", route: string, body?: unknown) => {
    const response = await fetch(new URL(`/rest${route}`, url), {
      method, headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  /** A model call on the relay with a pass, as dsh makes one; tiny, refused before any upstream call when the pass is dead. */
  const relayCall = (pass: string) => fetch(`${proxy.providerRelayAccess.relayBaseUrl("deepseek")}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": pass, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1, messages: [{ role: "user", content: "x" }] }),
  });

  const snapshotDshEnvironments = () => {
    const pids = spawnSync("pgrep", ["-f", "profile acp"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
    for (const pid of pids) {
      const shown = spawnSync("ps", ["eww", "-o", "command=", "-p", pid], { encoding: "utf8" }).stdout;
      if (shown.includes("DSH_HOME=")) processEnvironments.push(shown);
    }
  };

  beforeAll(async () => {
    fakeRuntimes = prepareFakeRuntimes({ label: "dsh-live-other-runtimes", grokInstalled: false });
    fakeRuntimeState(fakeRuntimes.stateDir).set("codex-account", "signedIn");
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dsh-live-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    key = (await getSecretVaultRuntime().requireService().resolveForUse(KEY_CONSUMER).catch(() => null))?.revealToTrustedConsumer() ?? "";
    userDshBefore = await fs.stat(userDshHome).then((stat) => String(stat.mtimeMs)).catch(() => null);

    const prepare = DefaultProviderRelayAccess.prototype.prepareForRun;
    vi.spyOn(DefaultProviderRelayAccess.prototype, "prepareForRun").mockImplementation(async function (this: DefaultProviderRelayAccess, run, relayId) {
      const granted = await prepare.call(this, run, relayId);
      passes.set(run.runId, granted.apiKey);
      return granted;
    });
    const notify = ProviderCallObservers.prototype.notify;
    vi.spyOn(ProviderCallObservers.prototype, "notify").mockImplementation(function (this: ProviderCallObservers, runId, observation) {
      observations.set(runId, [...(observations.get(runId) ?? []), observation]);
      notify.call(this, runId, observation);
    });
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { consoleLines.push(args.map(String).join(" ")); });
    }

    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    proxy = started.credentialProxyHost;
    applicationRuntime = started.applicationRuntime;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    vi.restoreAllMocks();
    await closeLiveServerVault();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    fakeRuntimes?.dispose();
  }, 120_000);

  const openSocket = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { socket, messages };
  };

  const waitFor = async (messages: WsMessage[], from: number, predicate: (message: WsMessage) => boolean, label: string,
    timeoutMs = STEP_TIMEOUT_MS) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.slice(from).find(predicate);
      if (found) return found;
      await wait(100);
    }
    const tail = messages.slice(from).slice(-20).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 200)}`);
    throw new Error(`Timed out waiting for ${label}. tail=${tail.join(" | ")}`);
  };
  const textSince = (messages: WsMessage[], from: number) => messages.slice(from)
    .filter((m) => m.type === "SEGMENT_CONTENT").map((m) => String(m.payload.delta ?? "")).join("");
  const turnEnded = (m: WsMessage) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED"
    || (m.type === "ERROR" && m.payload.error_scope === "turn");

  /** One turn; approval requests are answered by `decide` (default allow). */
  const turn = async (socket: WebSocket, messages: WsMessage[], runId: string, content: string,
    decide: (request: WsMessage) => "APPROVE_TOOL" | "DENY_TOOL" = () => "APPROVE_TOOL") => {
    const from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    const answered = new Set<unknown>();
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (!messages.slice(from).some(turnEnded)) {
      if (Date.now() > deadline) throw new Error(`Turn did not end: ${content.slice(0, 80)}`);
      for (const request of messages.slice(from).filter((m) => m.type === "TOOL_APPROVAL_REQUESTED")) {
        if (answered.has(request.payload.invocation_id)) continue;
        answered.add(request.payload.invocation_id);
        const type = decide(request);
        socket.send(JSON.stringify({ type, payload: { invocation_id: request.payload.invocation_id,
          ...(type === "DENY_TOOL" ? { reason: "Denied by the live e2e." } : {}) } }));
      }
      await wait(100);
    }
    const events = messages.slice(from);
    const result = { events, text: textSince(messages, from), terminal: events.find(turnEnded)! };
    log("TURN", { prompt: content.slice(0, 60), terminal: result.terminal.type, text: result.text.slice(-300),
      tools: events.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => m.payload.tool_name) });
    return result;
  };
  const toolStarts = (events: WsMessage[], name: string) =>
    events.filter((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload.tool_name === name);
  const succeeded = (events: WsMessage[], start: WsMessage) =>
    events.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload.invocation_id === start.payload.invocation_id);

  const createDefinition = async (input: { name: string; instructions: string; toolNames: string[]; skillNames?: string[] }) => {
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${input.name}-${randomUUID()}`, role: "assistant", description: "DeepSeek Harness live e2e agent",
        instructions: input.instructions, category: "runtime-e2e", toolNames: input.toolNames, skillNames: input.skillNames ?? [] } });
    return created.createAgentDefinition.id;
  };
  const resumeConfig = (runId: string) => graphql<{ getAgentRunResumeConfig: {
    isActive: boolean; metadataConfig: { runtimeReference: { runtimeKind: string; sessionId: string | null } } } }>(
    `query($runId: String!) { getAgentRunResumeConfig(runId: $runId) { isActive metadataConfig { runtimeReference { runtimeKind sessionId } } } }`,
    { runId }).then((result) => result.getAgentRunResumeConfig);

  it("is available with dsh's DeepSeek models and shows its key state on the Agent Runtimes page (AC-005, AC-013)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const availability = await graphql<{ runtimeAvailability: { enabled: boolean; reason: string | null } }>(
      "{ runtimeAvailability(runtimeKind: \"deepseek_harness\") { enabled reason } }");
    expect(availability.runtimeAvailability).toEqual({ enabled: true, reason: null });
    const catalog = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string; configSchema: unknown }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier configSchema } } }",
      { r: "deepseek_harness" });
    const models = catalog.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels);
    log("MODELS", models.map((model) => model.modelIdentifier));
    expect(models.length, "dsh's official-route catalog").toBeGreaterThanOrEqual(2);
    const flash = models.find((model) => model.modelIdentifier === MODEL);
    expect(flash, JSON.stringify(models)).toBeDefined();
    expect(JSON.stringify(flash!.configSchema)).toContain("reasoning_effort");

    await graphql("mutation { checkAgentRuntimes }").catch(() => undefined);
    let row: { runtimeKind: string; installed: boolean; installedVersion: string | null; signInRoute: string; account: { state: string };
      updates: { state: string; latestVersion: string | null } } | undefined;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      row = (await graphql<{ agentRuntimes: NonNullable<typeof row>[] }>(
        "{ agentRuntimes { runtimeKind installed installedVersion signInRoute account { state } updates { state latestVersion } } }"))
        .agentRuntimes.find((entry) => entry.runtimeKind === "deepseek_harness");
      if (row?.account.state === "SIGNED_IN" && row.updates.state !== "CHECKING") break;
      await wait(250);
    }
    expect(row).toMatchObject({ installed: true, signInRoute: "API_KEY_SETTING", account: { state: "SIGNED_IN" } });
    // The row shows dsh's full version, prerelease included (autobyteus-393), and the registry's full latest version.
    const fullVersion = /\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/;
    const ownVersion = fullVersion.exec(spawnSync(dshCommand, ["--version"], { encoding: "utf8" }).stdout)?.[0];
    expect(row!.installedVersion).toBe(ownVersion);
    const registry = spawnSync("npm", ["view", "@deepseek-ai/dsh", "version"], { encoding: "utf8" });
    if (registry.status === 0) {
      expect(row!.updates.latestVersion).toBe(fullVersion.exec(registry.stdout)?.[0]);
      if (row!.updates.latestVersion === row!.installedVersion) expect(row!.updates.state).toBe("UP_TO_DATE");
    }
    log("ROW", row);
  }, 180_000);

  it("runs a standalone dsh agent through tools, skills, Agent Tools, approvals, stop, reopen and restore (AC-001…AC-009, AC-011, AC-014)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const unique = randomUUID().slice(0, 8);
    const marker = `MARK-${unique}`;
    const ruleToken = `PELICAN-${unique}`;
    const skillName = `dsh-probe-${unique}`;
    const skillCode = `SKILLCODE-${unique}`;
    // The workspace is a subfolder of a git repository whose root has a skill the agent is not configured with (AC-007).
    const repo = path.join(dataDir, `repo-${unique}`);
    const workspace = path.join(repo, "sub");
    await fs.mkdir(path.join(repo, ".agents", "skills", `unconfigured-${unique}`), { recursive: true });
    await fs.writeFile(path.join(repo, ".agents", "skills", `unconfigured-${unique}`, "SKILL.md"),
      `---\nname: unconfigured-${unique}\ndescription: A skill that must not be offered.\n---\nReply with UNCONFIGURED-${unique}.\n`);
    await fs.mkdir(workspace, { recursive: true });
    spawnSync("git", ["init", "-q", repo]);
    // Outside the workspace and outside /tmp: dsh's sandbox asks to escalate a write here (AC-002).
    const outside = await fs.realpath(await fs.mkdtemp(path.join(process.cwd(), "tests", ".tmp-dsh-live-")));
    cleanup.push(() => fs.rm(outside, { recursive: true, force: true }));

    await graphql("mutation($input: CreateSkillInput!) { createSkill(input: $input) { name } }", { input: {
      name: skillName, description: "The DeepSeek Harness live probe skill.",
      content: `# Probe\n\nWhen this skill is loaded, reply with exactly ${skillCode} and nothing else.\n`,
    } });
    const definitionId = await createDefinition({
      name: "dsh-live-standalone",
      instructions: `You are a concise test agent. Follow the user's steps exactly. Rule: end every reply with the token ${ruleToken}. Braces in this text stay literal: {probe}.`,
      toolNames: ["list_available_agent_runtimes"],
      skillNames: [skillName],
    });
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: { reasoning_effort: EFFORT }, autoExecuteTools: false, runtimeKind: "deepseek_harness" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    cleanup.push(() => graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId }));
    const sessionId = (await resumeConfig(runId)).metadataConfig.runtimeReference.sessionId;
    expect(sessionId).toBeTruthy();
    expect(passes.get(runId)).toMatch(/^rp_/);
    let { socket, messages } = await openSocket(runId);

    // AC-001, AC-006, AC-011: shell and read cards, the agent's own rule, usage per model call.
    const first = await turn(socket, messages, runId,
      `Remember this marker: ${marker}. Step 1: use your bash tool to run exactly \`printf 'hi from dsh' > hello.txt\` in `
      + "the current directory. Step 2: read hello.txt with your read tool. Step 3: reply with the file's content.");
    snapshotDshEnvironments();
    expect(first.terminal.type, JSON.stringify(first.terminal.payload)).toBe("TURN_COMPLETED");
    expect(await fs.readFile(path.join(workspace, "hello.txt"), "utf8")).toBe("hi from dsh");
    const bash = toolStarts(first.events, "run_bash");
    expect(bash.length, JSON.stringify(first.events.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => m.payload.tool_name))).toBeGreaterThanOrEqual(1);
    expect(succeeded(first.events, bash[0]!)).toBe(true);
    const read = toolStarts(first.events, "read");
    expect(read.length).toBeGreaterThanOrEqual(1);
    expect(succeeded(first.events, read[0]!)).toBe(true);
    expect(first.text).toContain("hi from dsh");
    expect(first.text).toContain(ruleToken);
    const usage = first.events.filter((m) => m.type === "TOKEN_USAGE_UPDATED");
    expect(usage.length).toBeGreaterThanOrEqual(2);
    for (const entry of usage) {
      expect(entry.payload).toMatchObject({ runtime_kind: "deepseek_harness", usage_scope: "per_call", model_identifier: MODEL });
      expect(Number(entry.payload.reported_input_tokens)).toBeGreaterThan(0);
    }
    const finishedCalls = (observations.get(runId) ?? []).filter((o) => o.kind === "finished");
    expect(finishedCalls.length).toBeGreaterThanOrEqual(usage.length);
    log("TURN1", { usageCalls: usage.length, relayCalls: finishedCalls.length });

    // AC-007: only the configured skill, found in a workspace inside a larger repository.
    const skills = await turn(socket, messages, runId,
      `Load your skill named ${skillName} with your skill tool and follow it. After that, answer on a new line whether a `
      + `skill named unconfigured-${unique} is available to you: write AVAILABLE or NOT-AVAILABLE.`);
    expect(toolStarts(skills.events, "skill").length).toBeGreaterThanOrEqual(1);
    expect(skills.text).toContain(skillCode);
    expect(skills.text).toContain("NOT-AVAILABLE");
    expect(skills.text).not.toContain(`UNCONFIGURED-${unique}`);

    // AC-008: an Agent Tool, shown and recorded under its AutoByteus name.
    const tools = await turn(socket, messages, runId, "Call your list_available_agent_runtimes tool once, then reply with how many runtimes it lists.");
    const listed = toolStarts(tools.events, "list_available_agent_runtimes");
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(succeeded(tools.events, listed[0]!)).toBe(true);

    // AC-002: an escalated write outside the workspace asks; allow runs it, reject fails the call.
    const allowedFile = path.join(outside, `allowed-${unique}.txt`);
    const allow = await turn(socket, messages, runId,
      `Run exactly this shell command: \`echo escaped > ${allowedFile}\`. It writes outside the workspace: if the sandbox `
      + "denies it, run it again with sandbox escalation (danger-full-access). Then reply DONE.");
    const allowRequests = allow.events.filter((m) => m.type === "TOOL_APPROVAL_REQUESTED");
    expect(allowRequests.length, JSON.stringify(allow.events.slice(-10).map((m) => m.type))).toBeGreaterThanOrEqual(1);
    expect(allow.events.some((m) => m.type === "TOOL_APPROVED")).toBe(true);
    expect(await fs.readFile(allowedFile, "utf8")).toBe("escaped\n");
    const rejectedFile = path.join(outside, `rejected-${unique}.txt`);
    const reject = await turn(socket, messages, runId,
      `Run exactly this shell command with sandbox escalation (danger-full-access) on the first attempt: `
      + `\`echo escaped > ${rejectedFile}\`. If the user rejects the escalation, do not retry; reply DENIED.`, () => "DENY_TOOL");
    expect(reject.events.filter((m) => m.type === "TOOL_APPROVAL_REQUESTED").length,
      JSON.stringify(reject.events.map((m) => m.type))).toBeGreaterThanOrEqual(1);
    expect(reject.events.some((m) => m.type === "TOOL_DENIED")).toBe(true);
    await expect(fs.stat(rejectedFile)).rejects.toThrow();
    expect(reject.terminal.type).toBe("TURN_COMPLETED");

    // AC-003: stop ends the turn and its running command; the next message works.
    let from = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Run the shell command `sleep 60 && echo SLEPT`, then reply DONE." });
    await waitFor(messages, from, (m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload.tool_name === "run_bash", "the sleep command");
    await wait(1_500);
    const stoppedAt = Date.now();
    socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `interrupt-${randomUUID()}` } }));
    await waitFor(messages, from, (m) => m.type === "TURN_INTERRUPTED", "TURN_INTERRUPTED", 30_000);
    const stopLatencyMs = Date.now() - stoppedAt;
    expect(stopLatencyMs).toBeLessThan(10_000);
    expect(messages.slice(from).some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && String(JSON.stringify(m.payload)).includes("SLEPT"))).toBe(false);
    expect(spawnSync("pgrep", ["-f", "sleep 60 && echo SLEPT"]).status).not.toBe(0);
    const afterStop = await turn(socket, messages, runId, "Reply with only the marker from my first message.");
    expect(afterStop.text).toContain(marker);

    // A reopen after an Agent Tools change re-sends the instructions to the new dsh process.
    const preparedBefore = vi.mocked(DefaultProviderRelayAccess.prototype.prepareForRun).mock.calls.filter(([run]) => run.runId === runId).length;
    await graphql("mutation($input: UpdateAgentDefinitionInput!) { updateAgentDefinition(input: $input) { id } }",
      { input: { id: definitionId, toolNames: ["list_available_agent_runtimes", "list_projects"] } });
    await wait(2_000);
    const reopened = await turn(socket, messages, runId, "We continue. Reply with only the marker from my first message.");
    expect(vi.mocked(DefaultProviderRelayAccess.prototype.prepareForRun).mock.calls.filter(([run]) => run.runId === runId).length)
      .toBeGreaterThan(preparedBefore);
    expect(reopened.text).toContain(marker);
    expect(reopened.text).toContain(ruleToken);
    expect((await resumeConfig(runId)).metadataConfig.runtimeReference.sessionId).toBe(sessionId);

    // AC-009: the run's pass dies with the run; AC-004/AC-006: restore by session/resume continues the conversation.
    const passBeforeStop = passes.get(runId)!;
    socket.close();
    await wait(300);
    expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId })).terminateAgentRun.success).toBe(true);
    const refused = await relayCall(passBeforeStop);
    expect(refused.status).toBe(401);
    expect(await refused.json()).toMatchObject({ type: "error", error: { type: "authentication_error", code: "RUN_PASS_INVALID" } });
    const restored = await graphql<{ restoreAgentRun: { success: boolean; message: string } }>(
      "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message } }", { agentRunId: runId });
    expect(restored.restoreAgentRun.success, restored.restoreAgentRun.message).toBe(true);
    expect((await resumeConfig(runId)).metadataConfig.runtimeReference.sessionId).toBe(sessionId);
    ({ socket, messages } = await openSocket(runId));
    const afterRestore = await turn(socket, messages, runId, "We continue after a restart. Reply with only the marker from my very first message.");
    expect(afterRestore.terminal.type).toBe("TURN_COMPLETED");
    expect(afterRestore.text).toContain(marker);
    expect(afterRestore.text).toContain(ruleToken);
    snapshotDshEnvironments();

    // AC-014: the Work Journal reads dsh's tools like other runtimes'.
    const journals = (await fs.readdir(dataDir, { recursive: true }) as string[]).filter((entry) => /journal.*\.md$/i.test(entry));
    const journalText = (await Promise.all(journals.map((entry) => fs.readFile(path.join(dataDir, entry), "utf8")))).join("\n");
    expect(journalText).toContain("Command: printf");
    expect(journalText).toMatch(/Command: cat -n \S*hello\.txt/);
    log("STANDALONE", { runId, sessionId, stopLatencyMs });
  }, 1_800_000);

  it("runs dsh with the owned home's composition and never touches the user's ~/.dsh (AC-015)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    const home = path.join(dataDir, "runtimes", "deepseek-harness", "home");
    const dumped = spawnSync(dshCommand, ["--profile", "acp", "--dump-config"], {
      encoding: "utf8", cwd: dataDir,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, DSH_HOME: home, AUTOBYTEUS_DSH_SKILLS_DIR: "/w/.dsh/skills" },
    });
    expect(dumped.status, dumped.stderr).toBe(0);
    const config = dumped.stdout;
    for (const id of ["tool-subagent", "tool-subagent-fork", "tool-subagent-control", "tool-workflow", "tool-goal", "tool-plugin-manager"]) {
      expect(config, id).toMatch(new RegExp(`- id: ${id}\\n(?:  [^\\n]*\\n)*?  disabled: true`));
    }
    expect(config).toMatch(/- id: session-log-deepseek\n(?: {2}[^\n]*\n)*? {2}config:\n {4}enabled: false/);
    expect(config).toContain("includeDefaultRoots: false");
    expect(config).toContain("autobyteus-agent-instructions");
    expect(config).not.toMatch(/- id: tool-ask-user|- id: tool-agent-team/);
    const userDshAfter = await fs.stat(userDshHome).then((stat) => String(stat.mtimeMs)).catch(() => null);
    expect(userDshAfter).toBe(userDshBefore);
  }, 120_000);

  it("launches a Brief Studio team on dsh in the studio's application scope and refuses its pass once the application platform stopped (DEC-020, AR-008)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    assertBriefStudioPackageBuilt();
    const imported = await graphql<{ importApplicationPackage: Array<{ applicationCount: number }> }>(
      "mutation($input: ImportApplicationPackageInput!) { importApplicationPackage(input: $input) { packageId applicationCount } }",
      { input: { sourceKind: "LOCAL_PATH", source: BRIEF_STUDIO_PACKAGE } });
    expect(imported.importApplicationPackage.some((entry) => entry.applicationCount > 0), JSON.stringify(imported)).toBe(true);
    const applicationId = (await graphql<{ listApplications: Array<{ id: string; localApplicationId: string }> }>(
      "{ listApplications { id localApplicationId } }")).listApplications.find((entry) => entry.localApplicationId === "brief-studio")!.id;
    const encoded = encodeURIComponent(applicationId);
    const view = async () => {
      const response = await rest("GET", `/applications/${encoded}/execution-resource-configurations`);
      expect(response.status, JSON.stringify(response.body).slice(0, 2000)).toBe(200);
      return response.body as {
      readiness: { status: string; issues: unknown[] }; slots: Array<{ slot: { defaultExecutionResourceRef: unknown };
        effectiveConfiguration: { leaves: Array<{ memberAddress: string; displayName: string; agentDefinitionId: string }> } }> };
    };
    const current = await view();
    const leaves = current.slots[0]!.effectiveConfiguration.leaves;
    const put = await rest("PUT", `/applications/${encoded}/execution-resource-configurations/draftingTeam`, {
      executionResourceRef: current.slots[0]!.slot.defaultExecutionResourceRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: { runtimeKind: "deepseek_harness", llmModelIdentifier: MODEL, llmConfig: { reasoning_effort: EFFORT } },
        memberProfiles: leaves.map((leaf) => ({ memberAddress: leaf.memberAddress, displayName: leaf.displayName,
          agentDefinitionId: leaf.agentDefinitionId, runtimeKind: "deepseek_harness", llmModelIdentifier: MODEL,
          llmConfig: { reasoning_effort: EFFORT } })),
      },
    });
    expect(put.status, JSON.stringify(put.body).slice(0, 2000)).toBe(200);
    expect((await view()).readiness).toEqual({ status: "RUNNABLE", issues: [] });

    expect((await rest("POST", `/applications/${encoded}/backend/ensure-ready`)).status).toBe(200);
    const appGraphql = (query: string, variables: Record<string, unknown>) => rest("POST", `/applications/${encoded}/backend/graphql`,
      { requestContext: { applicationId }, request: { query, variables } });
    const brief = await appGraphql("mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }", { input: { title: "DeepSeek Harness brief" } });
    const knownRuns = new Set(passes.keys());
    const launched = await appGraphql("mutation($input: LaunchDraftRunInput!) { launchDraftRun(input: $input) { runId status } }",
      { input: { briefId: brief.body.result.data.createBrief.briefId } });
    expect(launched.body.result.errors, JSON.stringify(launched.body)).toBeUndefined();
    expect(launched.body.result.data.launchDraftRun.status).toBe("ATTACHED");
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    let applicationRunId: string | undefined;
    while (Date.now() < deadline && !applicationRunId) {
      applicationRunId = [...passes.keys()].find((runId) => !knownRuns.has(runId)
        && (observations.get(runId) ?? []).some((observation) => observation.kind === "finished"));
      await wait(250);
    }
    expect(applicationRunId, "an application run made a model call through the relay").toBeDefined();
    snapshotDshEnvironments();
    const pass = passes.get(applicationRunId!)!;

    // The application platform stops (as at server shutdown) while the credential proxy still listens.
    await applicationRuntime.lifecycle.stop();
    const refused = await relayCall(pass);
    expect(refused.status).toBe(401);
    expect(await refused.json()).toMatchObject({ error: { type: "authentication_error", code: "RUN_PASS_INVALID" } });
    log("APPLICATION", { applicationRunId });
  }, 600_000);

  it("leaves the DeepSeek key in no file, process environment or log (QR-001)", async (ctx) => {
    await requireLiveCapability(ctx, KEY_SECRET_ID);
    expect(key.length).toBeGreaterThan(10);
    const needle = Buffer.from(key, "utf8");
    const entries = await fs.readdir(dataDir, { recursive: true }) as string[];
    let scanned = 0;
    for (const entry of entries) {
      const file = path.join(dataDir, entry);
      const stat = await fs.lstat(file).catch(() => null);
      if (!stat?.isFile()) continue;
      scanned += 1;
      expect((await fs.readFile(file)).includes(needle), `key found in ${entry}`).toBe(false);
    }
    expect(scanned).toBeGreaterThan(10);
    expect(processEnvironments.length).toBeGreaterThanOrEqual(1);
    for (const environment of processEnvironments) {
      expect(environment.includes(key)).toBe(false);
      expect(environment).toMatch(/DEEPSEEK_API_KEY=rp_/);
    }
    expect(consoleLines.some((line) => line.includes(key))).toBe(false);
    for (const pass of passes.values()) expect(consoleLines.some((line) => line.includes(pass))).toBe(false);
    log("KEY_SCAN", { files: scanned, environments: processEnvironments.length, consoleLines: consoleLines.length });
  }, 120_000);
});
