/**
 * Live Claude-runtime prompt cache lifetime (autobyteus-273), through the real Studio server (HTTP GraphQL + agent
 * WebSocket), the real Claude backend and session, the Claude Agent SDK and the operator's Claude CLI.
 *
 * AutoByteus adds ENABLE_PROMPT_CACHING_1H=1 to every Claude Code child unless the server setting
 * CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE is "false" or the variable is already set. Claude Code ranks that variable
 * below every user choice (promptCacheTtl settings, CLAUDE_CODE_PROMPT_CACHE_TTL, FORCE_PROMPT_CACHING_5M). Each case
 * reads the cache-write buckets Anthropic reports for every main-loop call (TOKEN_USAGE_UPDATED
 * cache_creation_5m/1h_input_tokens), and, where the platform shows it, ENABLE_PROMPT_CACHING_1H in the spawned CLI's
 * environment (process table; only that variable is read, never a key).
 *
 * Cases (one server, in this order; settings change through GraphQL updateServerSetting, never by restart):
 *   CPC-E2E-001  API billing (CLAUDE_AGENT_SDK_AUTH_MODE=api-key, vault key), toggle never saved: turn 1 writes only
 *                1h; after a gap longer than 5 minutes, turn 2 reads the turn-1 prefix from cache and writes only 1h.
 *   CPC-E2E-002  API billing, toggle saved "false": the next run writes only 5m (Claude Code's own API-billing
 *                default), which also shows these runs are API-billed.
 *   CPC-E2E-003  API billing, toggle saved "true", workspace .claude/settings.json {"promptCacheTtl":"5m"}: writes only
 *                5m; the user's own Claude Code setting wins over the AutoByteus default.
 *   CPC-E2E-004  Subscription (CLAUDE_AGENT_SDK_AUTH_MODE=cli, the operator's Claude login), toggle "true": the agent
 *                conversation writes only 1h.
 *   CPC-E2E-005  Subscription, toggle saved "false": the spawned CLI has no ENABLE_PROMPT_CACHING_1H and the agent
 *                conversation keeps Claude Code's own subscription default (1h).
 *   CPC-E2E-006  Subscription, toggle "true", workspace promptCacheTtl "5m": writes only 5m although the spawned CLI has
 *                ENABLE_PROMPT_CACHING_1H=1; the user's setting wins (as investigation T3, through the AutoByteus spawn).
 *
 * Gate: RUN_CLAUDE_PROMPT_CACHE_E2E=1. Prerequisites: a Claude CLI >= 2.1.242 that AutoByteus resolves (PATH `claude`
 * or CLAUDE_CODE_EXECUTABLE_PATH); for 001-003 the Anthropic key in the test vault (AUTOBYTEUS_TEST_VAULT, see
 * TESTING.md#test-vault; a missing key, or Anthropic refusing the key (for example "Credit balance is too low"), is
 * reported as a skip with its reason, a failure with AUTOBYTEUS_LIVE_STRICT=1); for 004-006 the operator's CLI signed
 * in on a Claude subscription (real HOME, USER, LOGNAME; select cases with -t "CPC-E2E-00[123]" or "CPC-E2E-00[456]").
 * The operator's own Claude settings must not set promptCacheTtl or the cache variables. Cost: four short Haiku turns
 * on API credits (well under 2 cents at Haiku 5.5 prices) plus three subscription turns. Each run adds a session
 * transcript under ~/.claude/projects/ (temp workspace).
 * Run with a clean environment (no parent Claude Code session or live-app variables). From autobyteus-server-ts:
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" \
 *     AUTOBYTEUS_TEST_VAULT="$HOME/.autobyteus-test/vault" RUN_CLAUDE_PROMPT_CACHE_E2E=1 \
 *     ./node_modules/.bin/vitest run tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts --no-watch
 * Optional: CLAUDE_PROMPT_CACHE_E2E_MODEL (Claude runtime model identifier, default "haiku"),
 * CLAUDE_PROMPT_CACHE_E2E_GAP_MS (default 360000; keep it above 300000 so turn 2 can only find a 1-hour entry),
 * CLAUDE_PROMPT_CACHE_E2E_EVIDENCE_DIR (writes each case's calls and observations as JSON).
 */
import "reflect-metadata";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY } from "../../../src/runtime-management/claude/claude-prompt-cache-setting.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { LIVE_STRICT_GATE } from "../../../../test-support/test-vault/live-provider-test.js";
import { classifyProviderAccessError } from "../../../../test-support/test-vault/provider-access-classification.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const ENABLED = process.env.RUN_CLAUDE_PROMPT_CACHE_E2E === "1";
const describeLive = ENABLED ? describe : describe.skip;
const MODEL = process.env.CLAUDE_PROMPT_CACHE_E2E_MODEL?.trim() || "haiku";
const GAP_MS = Number(process.env.CLAUDE_PROMPT_CACHE_E2E_GAP_MS || 360_000);
const EVIDENCE_DIR = process.env.CLAUDE_PROMPT_CACHE_E2E_EVIDENCE_DIR?.trim() || null;
const TURN_TIMEOUT_MS = 240_000;
const AUTH_MODE_KEY = "CLAUDE_AGENT_SDK_AUTH_MODE";
const ONE_HOUR_VARIABLE = "ENABLE_PROMPT_CACHING_1H";
/** Variables that would decide the TTL before the AutoByteus default; the cases need them absent. */
const USER_TTL_VARIABLES = [ONE_HOUR_VARIABLE, "CLAUDE_CODE_PROMPT_CACHE_TTL", "CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL",
  "FORCE_PROMPT_CACHING_5M", "DISABLE_PROMPT_CACHING"];
/** Variables a parent Claude Code session injects; a standalone server never has them. */
const PARENT_CLAUDE_SESSION_VARIABLE = /^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID$|CLAUDE_EFFORT$|CLAUDE_AGENT_SDK_VERSION$)/u;

type Json = Record<string, unknown>;
type WsMessage = { type: string; payload: Json };
type Call = {
  model: string | null;
  input: number;
  cacheRead: number;
  cacheCreation: number;
  cacheCreation5m: number | null;
  cacheCreation1h: number | null;
  output: number;
};
type CliEnvObservation = { pid: number; executable: string; oneHourVariable: string | null };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const numOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/**
 * ENABLE_PROMPT_CACHING_1H of every Claude CLI process below this test process, or null when the platform does not
 * show process environments. Only that variable is extracted; nothing else of the environment is kept.
 */
const observeSpawnedCliOneHourVariable = (): CliEnvObservation[] | null => {
  if (process.platform !== "darwin" && process.platform !== "linux") return null;
  const table = spawnSync("ps", ["-A", "-o", "pid=,ppid=,comm="], { encoding: "utf-8" });
  if (table.status !== 0) return null;
  const rows = table.stdout.split("\n").map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/u)).filter(Boolean)
    .map((match) => ({ pid: Number(match![1]), ppid: Number(match![2]), executable: match![3]! }));
  const descendants = new Set<number>([process.pid]);
  for (let grew = true; grew;) {
    grew = false;
    for (const row of rows) {
      if (descendants.has(row.ppid) && !descendants.has(row.pid)) { descendants.add(row.pid); grew = true; }
    }
  }
  const prefix = `${ONE_HOUR_VARIABLE}=`;
  return rows.filter((row) => row.pid !== process.pid && descendants.has(row.pid) && /claude/iu.test(path.basename(row.executable)))
    .map((row) => {
      let entries: string[] = [];
      if (process.platform === "linux") {
        try { entries = readFileSync(`/proc/${row.pid}/environ`, "utf-8").split("\0"); } catch { entries = []; }
      } else {
        const shown = spawnSync("ps", ["-E", "-ww", "-o", "command=", "-p", String(row.pid)], { encoding: "utf-8" });
        entries = shown.status === 0 ? shown.stdout.split(/\s+/u) : [];
      }
      const entry = entries.find((value) => value.startsWith(prefix));
      return { pid: row.pid, executable: row.executable, oneHourVariable: entry === undefined ? null : entry.slice(prefix.length) };
    });
};

describeLive("Claude runtime prompt cache lifetime (live, autobyteus-273)", () => {
  const savedEnvironment = new Map<string, string | undefined>();
  const workspaces = new Set<string>();
  const runIds = new Set<string>();
  let dataDir: string | null = null;
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let agentDefinitionId = "";

  const gql = async <T>(query: string, variables?: Json): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const result = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || result.errors?.length || !result.data) throw new Error(JSON.stringify(result.errors ?? result));
    return result.data;
  };

  const saveSetting = async (key: string, value: string): Promise<void> => {
    const result = await gql<{ updateServerSetting: string }>(
      "mutation($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }", { key, value });
    expect(result.updateServerSetting).toContain("updated successfully");
    expect(process.env[key]).toBe(value);
  };

  const claudeModelIdentifier = async (): Promise<string> => {
    const result = await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind: "claude_agent_sdk" });
    const identifiers = result.providerModelCatalogSnapshots.flatMap((provider) => provider.llmModels.map((model) => model.modelIdentifier));
    expect(identifiers, `Claude runtime models: ${identifiers.join(", ")}`).toContain(MODEL);
    return MODEL;
  };

  const newWorkspace = async (label: string, claudeProjectSettings?: Json): Promise<string> => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), `claude-cache-ttl-${label}-`));
    workspaces.add(workspace);
    if (claudeProjectSettings) {
      await mkdir(path.join(workspace, ".claude"), { recursive: true });
      await writeFile(path.join(workspace, ".claude", "settings.json"), JSON.stringify(claudeProjectSettings, null, 2));
    }
    return workspace;
  };

  const startRun = async (workspaceRootPath: string) => {
    const created = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: await claudeModelIdentifier(),
        autoExecuteTools: true, runtimeKind: "claude_agent_sdk", llmConfig: null } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.add(runId);
    const messages: WsMessage[] = [];
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    socket.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Json });
      } catch { /* not JSON */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitFor(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { runId, socket, messages };
  };

  const waitFor = async (messages: WsMessage[], from: number, match: (message: WsMessage) => boolean, label: string,
    timeoutMs = TURN_TIMEOUT_MS): Promise<WsMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.slice(from).find(match);
      if (found) return found;
      if (messages.slice(from).some((message) => message.type === "ERROR" || message.payload.status === "error")) {
        await wait(500);
        // Code and message only (no run or turn ids), so a refusal is classified from the provider's words alone.
        const errors = messages.slice(from).filter((message) => message.type === "ERROR")
          .map((message) => `${String(message.payload.code)}: ${String(message.payload.message)}`);
        throw new Error(`${label}: run failed: ${errors.join(" | ").slice(0, 1200)}`);
      }
      await wait(250);
    }
    throw new Error(`Timed out waiting for ${label}`);
  };

  /** Sends one message and returns the turn's main-loop calls once the run is idle again. */
  const turn = async (run: Awaited<ReturnType<typeof startRun>>, content: string): Promise<Call[]> => {
    const from = run.messages.length;
    sendE2eSendMessageCommand(run.socket, { content });
    await waitFor(run.messages, from, (message) => message.type === "AGENT_COMMAND_ACK" && message.payload.accepted === true,
      "SEND_MESSAGE accepted", 30_000);
    await waitFor(run.messages, from, (message) => message.type === "AGENT_STATUS" && message.payload.status === "idle", "idle");
    return run.messages.slice(from)
      .filter((message) => message.type === "TOKEN_USAGE_UPDATED" && message.payload.run_id === run.runId
        && message.payload.ingestion_kind === "claude_sdk_call")
      .map(({ payload }) => ({
        model: typeof payload.model_identifier === "string" ? payload.model_identifier : null,
        input: num(payload.reported_input_tokens),
        cacheRead: num(payload.cache_read_input_tokens),
        cacheCreation: num(payload.cache_creation_input_tokens),
        cacheCreation5m: numOrNull(payload.cache_creation_5m_input_tokens),
        cacheCreation1h: numOrNull(payload.cache_creation_1h_input_tokens),
        output: num(payload.reported_output_tokens),
      }));
  };

  const closeRun = async (run: Awaited<ReturnType<typeof startRun>>): Promise<void> => {
    run.socket.close();
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: run.runId }).catch(() => undefined);
  };

  /** Every main-loop call reported its split, wrote something in total, and wrote only in `bucket`. */
  const expectWritesOnlyIn = (calls: Call[], bucket: "5m" | "1h", label: string): void => {
    expect(calls.length, `${label}: main-loop calls`).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.cacheCreation5m, `${label}: 5m split reported`).not.toBeNull();
      expect(call.cacheCreation1h, `${label}: 1h split reported`).not.toBeNull();
      expect(call.cacheCreation5m! + call.cacheCreation1h!).toBe(call.cacheCreation);
      expect(call.model ?? "", `${label}: model`).toMatch(new RegExp(MODEL === "haiku" ? "haiku" : ".", "iu"));
    }
    const written5m = calls.reduce((sum, call) => sum + call.cacheCreation5m!, 0);
    const written1h = calls.reduce((sum, call) => sum + call.cacheCreation1h!, 0);
    if (bucket === "1h") {
      expect(written1h, `${label}: 1h writes`).toBeGreaterThan(0);
      expect(written5m, `${label}: 5m writes`).toBe(0);
    } else {
      expect(written5m, `${label}: 5m writes`).toBeGreaterThan(0);
      expect(written1h, `${label}: 1h writes`).toBe(0);
    }
  };

  const expectSpawnedVariable = (observed: CliEnvObservation[] | null, expected: string | null, label: string): void => {
    if (observed === null || observed.length === 0) {
      console.warn(`[claude cache ttl] ${label}: spawned CLI environment not observable on this platform; bucket assertions only.`);
      return;
    }
    for (const entry of observed) expect(entry.oneHourVariable, `${label}: ${ONE_HOUR_VARIABLE} in pid ${entry.pid}`).toBe(expected);
  };

  const record = async (caseId: string, details: Json): Promise<void> => {
    console.info(`[claude cache ttl] ${caseId}`, JSON.stringify(details));
    if (EVIDENCE_DIR) {
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify({ caseId, at: new Date().toISOString(), ...details }, null, 2));
    }
  };

  beforeAll(async () => {
    for (const key of Object.keys(process.env)) {
      if (PARENT_CLAUDE_SESSION_VARIABLE.test(key)) { savedEnvironment.set(key, process.env[key]); delete process.env[key]; }
    }
    for (const key of [...USER_TTL_VARIABLES, CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, AUTH_MODE_KEY]) {
      savedEnvironment.set(key, process.env[key]);
      delete process.env[key];
    }
    dataDir = await mkdtemp(path.join(os.tmpdir(), "claude-cache-ttl-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
    const definition = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `claude-cache-ttl-e2e-${randomUUID().slice(0, 8)}`, role: "assistant",
        description: "Claude prompt cache lifetime live e2e", category: "runtime-e2e", toolNames: [], skillNames: [],
        instructions: "You are a test agent. Do not use tools. Reply with exactly the word you are asked for and nothing else." } });
    agentDefinitionId = definition.createAgentDefinition.id;
  }, 120_000);

  afterAll(async () => {
    if (runIds.size) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: [...runIds] } } });
    if (app) await app.close();
    await closeLiveServerVault();
    for (const workspace of workspaces) await rm(workspace, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
    for (const key of [CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, AUTH_MODE_KEY]) delete process.env[key];
    for (const [key, value] of savedEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const useApiBilling = async (context: TestContext): Promise<void> => {
    await requireLiveCapability(context, "provider.anthropic.api-key");
    await saveSetting(AUTH_MODE_KEY, "api-key");
  };

  /**
   * The first API-billed turn of a case. Anthropic refusing the vault key (billing, quota, credentials) is a provider
   * refusal, reported as a skip with its reason (a failure with AUTOBYTEUS_LIVE_STRICT=1), never a pass.
   */
  const firstApiBilledTurn = async (context: TestContext, run: Awaited<ReturnType<typeof startRun>>, content: string): Promise<Call[]> => {
    try {
      return await turn(run, content);
    } catch (error) {
      const refusal = classifyProviderAccessError(error)
        ?? (/credit balance is too low/iu.test(String(error)) ? "quota_or_billing_blocked" : null);
      if (!refusal) throw error;
      const reason = `provider refused Anthropic (Claude runtime, api-key mode): ${refusal}`;
      console.warn(`[live provider skip] ${reason}: ${String(error).slice(0, 300)}`);
      if (process.env[LIVE_STRICT_GATE] === "1") throw new Error(`LIVE_PROVIDER_UNAVAILABLE: ${reason}`, { cause: error });
      return context.skip(reason);
    }
  };

  it("CPC-E2E-001: API billing, toggle never saved: both turns write 1h, and turn 2 reads turn 1 back after more than 5 minutes (AC-001)", async (context) => {
    await useApiBilling(context);
    expect(process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY]).toBeUndefined();
    const run = await startRun(await newWorkspace("cpc-001"));
    try {
      const turn1 = await firstApiBilledTurn(context, run, "Reply with exactly the word AMBER.");
      const observed = observeSpawnedCliOneHourVariable();
      expectWritesOnlyIn(turn1, "1h", "turn 1");
      expectSpawnedVariable(observed, "1", "turn 1");
      const lastTurn1 = turn1.at(-1)!;
      const turn1Prefix = lastTurn1.cacheRead + lastTurn1.cacheCreation;
      const gapStartedAt = Date.now();
      await wait(GAP_MS);
      const turn2 = await turn(run, "Reply with exactly the word COBALT.");
      const gapMs = Date.now() - gapStartedAt;
      await record("CPC-E2E-001", { model: MODEL, gapMs, turn1, turn2, turn1Prefix, spawnedCli: observed });
      expect(gapMs).toBeGreaterThan(300_000);
      // A 5-minute entry would have expired: reading the whole turn-1 prefix back proves it was kept for longer.
      expect(turn2[0]!.cacheRead, "turn 2 first call reads the turn-1 prefix").toBeGreaterThanOrEqual(turn1Prefix);
      expect(turn2.reduce((sum, call) => sum + call.cacheCreation, 0), "turn 2 writes only the new part")
        .toBeLessThan(turn1.reduce((sum, call) => sum + call.cacheCreation, 0));
      expectWritesOnlyIn(turn2, "1h", "turn 2");
    } finally {
      await closeRun(run);
    }
  }, GAP_MS + 3 * TURN_TIMEOUT_MS);

  it("CPC-E2E-002: API billing, toggle saved false without restart: the next run writes 5m (AC-006, billing control)", async (context) => {
    await useApiBilling(context);
    await saveSetting(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, "false");
    const run = await startRun(await newWorkspace("cpc-002"));
    try {
      const calls = await firstApiBilledTurn(context, run, "Reply with exactly the word DENIM.");
      const observed = observeSpawnedCliOneHourVariable();
      await record("CPC-E2E-002", { model: MODEL, setting: "false", calls, spawnedCli: observed });
      expectSpawnedVariable(observed, null, "toggle off");
      expectWritesOnlyIn(calls, "5m", "toggle off");
    } finally {
      await closeRun(run);
    }
  }, 2 * TURN_TIMEOUT_MS);

  it("CPC-E2E-003: API billing, toggle on, workspace promptCacheTtl 5m: the user's setting wins (AC-002)", async (context) => {
    await useApiBilling(context);
    await saveSetting(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, "true");
    const run = await startRun(await newWorkspace("cpc-003", { promptCacheTtl: "5m" }));
    try {
      const calls = await firstApiBilledTurn(context, run, "Reply with exactly the word EMBER.");
      const observed = observeSpawnedCliOneHourVariable();
      await record("CPC-E2E-003", { model: MODEL, setting: "true", projectSettings: { promptCacheTtl: "5m" }, calls, spawnedCli: observed });
      expectSpawnedVariable(observed, "1", "promptCacheTtl 5m");
      expectWritesOnlyIn(calls, "5m", "promptCacheTtl 5m");
    } finally {
      await closeRun(run);
    }
  }, 2 * TURN_TIMEOUT_MS);

  it("CPC-E2E-004: subscription (cli mode), toggle on: the agent conversation writes 1h (AC-003)", async () => {
    await saveSetting(AUTH_MODE_KEY, "cli");
    await saveSetting(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, "true");
    const run = await startRun(await newWorkspace("cpc-004"));
    try {
      const calls = await turn(run, "Reply with exactly the word FERN.");
      const observed = observeSpawnedCliOneHourVariable();
      await record("CPC-E2E-004", { model: MODEL, authMode: "cli", setting: "true", calls, spawnedCli: observed });
      expectSpawnedVariable(observed, "1", "subscription");
      expectWritesOnlyIn(calls, "1h", "subscription");
    } finally {
      await closeRun(run);
    }
  }, 2 * TURN_TIMEOUT_MS);

  it("CPC-E2E-005: subscription, toggle saved false: AutoByteus adds nothing and the conversation keeps Claude Code's 1h (AC-006, AC-003)", async () => {
    await saveSetting(AUTH_MODE_KEY, "cli");
    await saveSetting(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, "false");
    const run = await startRun(await newWorkspace("cpc-005"));
    try {
      const calls = await turn(run, "Reply with exactly the word GRANITE.");
      const observed = observeSpawnedCliOneHourVariable();
      await record("CPC-E2E-005", { model: MODEL, authMode: "cli", setting: "false", calls, spawnedCli: observed });
      expectSpawnedVariable(observed, null, "subscription, toggle off");
      expectWritesOnlyIn(calls, "1h", "subscription, toggle off");
    } finally {
      await closeRun(run);
    }
  }, 2 * TURN_TIMEOUT_MS);

  it("CPC-E2E-006: subscription, toggle on, workspace promptCacheTtl 5m: the user's setting wins over the variable (AC-002)", async () => {
    await saveSetting(AUTH_MODE_KEY, "cli");
    await saveSetting(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY, "true");
    const run = await startRun(await newWorkspace("cpc-006", { promptCacheTtl: "5m" }));
    try {
      const calls = await turn(run, "Reply with exactly the word HAZEL.");
      const observed = observeSpawnedCliOneHourVariable();
      await record("CPC-E2E-006", { model: MODEL, authMode: "cli", setting: "true", projectSettings: { promptCacheTtl: "5m" }, calls, spawnedCli: observed });
      expectSpawnedVariable(observed, "1", "subscription, promptCacheTtl 5m");
      expectWritesOnlyIn(calls, "5m", "subscription, promptCacheTtl 5m");
    } finally {
      await closeRun(run);
    }
  }, 2 * TURN_TIMEOUT_MS);
});
