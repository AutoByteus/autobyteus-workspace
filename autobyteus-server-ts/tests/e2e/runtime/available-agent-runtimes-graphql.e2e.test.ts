/**
 * `list_available_agent_runtimes` and Settings → Model Routing's `availableAgentRuntimes` on a test-owned studio server
 * reached over HTTP (autobyteus-303).
 *
 * Purpose: the node's report through the real composition — the four runtime strategies with their real child
 * processes and wire protocols, the sign-in reader, the model catalogs, the provider usage readers with keys from the
 * server's own vault — and the tool through a real Codex run's Agent Tools MCP session. Cases:
 *   AAR-01 the full answer (AC-001, AC-003…AC-007, AC-009; the Claude CLI never receives a user message, AC-005);
 *   AAR-02 availability rules: signed out / not installed left out, sign-in not checked, sign-in not required (REQ-002,
 *          REQ-007);
 *   AAR-03 slow steps end at their deadlines, the answer arrives within 20 s and the hung processes are gone; the next
 *          read works again (AC-008, AC-011, REQ-010);
 *   AAR-04 a Codex run whose definition lists the tool gets it over Agent Tools MCP with the same report; one whose
 *          definition does not, does not (AC-002, AC-012); several readers at once share one read and all get Codex
 *          (AC-013, SR-006);
 *   AAR-06 discovered providers are asked on every read: LM Studio answering is listed with its models though nothing
 *          loaded them before, LM Studio not answering is left out, a keyed custom endpoint not answering is listed with
 *          its models unknown (AC-007, REQ-002, REQ-007; SR-006).
 * Every response, the server's log file, its stdout/stderr and its data files are scanned for the synthetic provider
 * keys and every secret-looking value the fake CLIs printed (REQ-008).
 *
 * Prerequisites: none. The runtime CLIs are `tests/fixtures/agent-runtimes-fake-cli.mjs` linked as codex/claude/agy/grok
 * (their limit answers are the recorded, redacted ones in `tests/fixtures/usage-limits/`). Provider HTTP (DeepSeek,
 * Kimi, Anthropic, xAI), LM Studio's model list (`LMSTUDIO_HOSTS` → a fake host) and a custom endpoint's model list are
 * answered inside the test process; every other outside URL is refused, so the run is offline. Ollama is pointed at a
 * closed port; LM Studio answers only while a test switches it on.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { omitEmptyToolResultFields } from "autobyteus-ts/tools/tool-result-json.js";
import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { initializeRuntimeLoggerBootstrap } from "../../../src/logging/runtime-logger-bootstrap.js";
import type { LoggingConfig } from "../../../src/config/logging-config.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { getSecretVaultRuntime, resetSecretVaultRuntimeForTests } from "../../../src/secret-management/secret-vault-runtime.js";
import { fakeRuntimeState, isProcessAlive } from "../helpers/agent-runtimes-e2e-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  const prepared = prepareFakeRuntimes({ label: "available-agent-runtimes-e2e", grokInstalled: true });
  // No local model server answers: Ollama and LM Studio offer no models, so neither is listed.
  const previous = { ollama: process.env.OLLAMA_HOSTS, lmstudio: process.env.LMSTUDIO_HOSTS };
  process.env.OLLAMA_HOSTS = "http://127.0.0.1:9";
  process.env.LMSTUDIO_HOSTS = "http://lmstudio.e2e.test:1234";
  return {
    ...prepared,
    dispose: () => {
      for (const [key, value] of [["OLLAMA_HOSTS", previous.ollama], ["LMSTUDIO_HOSTS", previous.lmstudio]] as const) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      prepared.dispose();
    },
  };
});

const CODEX = "codex_app_server";
const CLAUDE = "claude_agent_sdk";
const AGY = "antigravity_cli";
const GROK = "grok_build";
const TOOL = "list_available_agent_runtimes";
const CODEX_MODEL = "gpt-5.6-luna";
const LOGGING: LoggingConfig = {
  pinoLogLevel: "trace", httpAccessLogMode: "all", includeNoisyHttpAccessRoutes: true, scopedLogLevelOverrides: [],
} as LoggingConfig;

/** Synthetic keys saved through the public API; they must never come back. */
const KEYS: Record<string, string> = {
  DEEPSEEK: "FAKE-SECRET-deepseek-key-4b1f",
  KIMI: "FAKE-SECRET-kimi-key-77c2",
  ANTHROPIC: "FAKE-SECRET-anthropic-key-a913",
  GROK: "FAKE-SECRET-xai-key-0d5e",
  OPENAI: "FAKE-SECRET-openai-key-e620",
};

const LMSTUDIO_MODELS_URL = "http://lmstudio.e2e.test:1234/api/v1/models";
const CUSTOM_BASE_URL = "https://gateway.e2e.test/v1";
const CUSTOM_MODELS_URL = `${CUSTOM_BASE_URL}/models`;
const CUSTOM_KEY = "FAKE-SECRET-custom-gateway-key-51aa";

type ProviderRequest = { url: string; method: string; authorization: string | null; body: string | null };

/** Provider usage endpoints answered in this process (the probed shapes, A-19); every other outside URL is refused. */
const installProviderStub = () => {
  const realFetch = globalThis.fetch;
  const requests: ProviderRequest[] = [];
  const refused: string[] = [];
  const answers: Record<string, { status: number; body: unknown }> = {
    "https://api.deepseek.com/user/balance": { status: 200, body: { is_available: true, balance_infos: [{ currency: "USD", total_balance: "0.14", granted_balance: "0.00", topped_up_balance: "0.14" }] } },
    "https://api.moonshot.ai/v1/users/me/balance": { status: 200, body: { code: 0, data: { available_balance: 0, voucher_balance: 0, cash_balance: 0 }, scode: "0x0", status: true } },
    "https://api.anthropic.com/v1/messages/count_tokens": { status: 400, body: { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } } },
    "https://api.x.ai/v1/api-key": { status: 200, body: { redacted_api_key: "xai-…0d5e", user_id: "FAKE-SECRET-xai-user-id", team_id: "FAKE-SECRET-xai-team-id", api_key_blocked: false, api_key_disabled: false, team_blocked: false } },
  };
  /** Discovered model servers (SR-006), each answering only while switched on. */
  const discovered = { lmStudio: false, customEndpoint: false };
  const discoveredAnswer = (url: string): { status: number; body: unknown } | null => {
    if (url === LMSTUDIO_MODELS_URL) return discovered.lmStudio
      ? { status: 200, body: { models: [{ key: "qwen/qwen3.6-35b-a3b", type: "llm", max_context_length: 262144 }, { key: "google/gemma-4-26b-a4b", type: "llm", max_context_length: 131072 }] } }
      : { status: 503, body: { error: "not running" } };
    if (url === CUSTOM_MODELS_URL) return discovered.customEndpoint
      ? { status: 200, body: { object: "list", data: [{ id: "gateway-model-a", object: "model" }, { id: "gateway-model-b", object: "model" }] } }
      : { status: 503, body: { error: "unavailable" } };
    return null;
  };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const host = new URL(url).hostname;
    if (host === "127.0.0.1" || host === "localhost") return realFetch(input, init);
    const headers = new Headers(init?.headers);
    const answer = answers[url] ?? discoveredAnswer(url);
    if (!answer) { refused.push(url); return new Response("offline test", { status: 503 }); }
    requests.push({ url, method: init?.method ?? "GET", authorization: headers.get("authorization") ?? headers.get("x-api-key"), body: typeof init?.body === "string" ? init.body : null });
    return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { realFetch, requests, refused, discovered, restore: () => { globalThis.fetch = realFetch; } };
};

type Report = { checkedAt: string; agentRuntimes: Array<Record<string, any>> };

describe("list_available_agent_runtimes / availableAgentRuntimes e2e (real studio server, scripted runtime CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  const captured: string[] = [];
  const responses: string[] = [];
  const workspace = path.join(fake.dataDir, "workspace");
  let fastify: FastifyInstance;
  let baseUrl: URL;
  let stub: ReturnType<typeof installProviderStub>;
  let restoreStreams: () => void;

  const post = async (query: string, variables?: Record<string, unknown>) => {
    const response = await stub.realFetch(new URL("/graphql", baseUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const text = await response.text();
    responses.push(text);
    const body = JSON.parse(text) as { data?: any; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const read = async (): Promise<{ report: Report; ms: number }> => {
    const started = Date.now();
    const data = await post("query AvailableAgentRuntimes { availableAgentRuntimes }");
    return { report: data.availableAgentRuntimes as Report, ms: Date.now() - started };
  };
  const byRuntime = (report: Report) => Object.fromEntries(report.agentRuntimes.map((entry) => [entry.runtime, entry]));
  const mcp = async (serverUrl: string, method: string, params: Record<string, unknown>) => {
    const response = await stub.realFetch(serverUrl, {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const text = await response.text();
    responses.push(text);
    return { status: response.status, body: JSON.parse(text) as { result?: any; error?: { code: number; message: string } } };
  };
  /** Evidence lines for the ticket's report (grep `AAR-EVIDENCE`). */
  const evidence = (label: string, value: unknown) => console.log(`AAR-EVIDENCE ${label} ${JSON.stringify(value)}`);
  const hungPids = (): Array<{ runtime: string; step: string; pid: number }> => (states.read("hung-pids.log") ?? "").split("\n").filter(Boolean)
    .map((line) => { const [runtime, step, pid] = line.split(" "); return { runtime: runtime!, step: step!, pid: Number(pid) }; });
  const resetCliState = () => {
    for (const [file, value] of Object.entries({
      "codex-account": "signedIn", "claude-account": "signedIn", "agy-account": "signedIn", "grok-account": "signedIn",
      "codex-rate-limits": "exhausted", "agy-models-mode": "", "agy-usage": "recorded", "grok-version-mode": "", "claude-auth": "",
    })) states.set(file, value);
    process.env.GROK_BUILD_COMMAND = path.join(fake.binDir, "grok");
  };

  beforeAll(async () => {
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => { captured.push(String(chunk)); return (stdoutWrite as any)(chunk, ...rest); }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => { captured.push(String(chunk)); return (stderrWrite as any)(chunk, ...rest); }) as typeof process.stderr.write;
    restoreStreams = () => { process.stdout.write = stdoutWrite; process.stderr.write = stderrWrite; };

    fs.mkdirSync(workspace, { recursive: true });
    resetCliState();
    states.set("codex-models", CODEX_MODEL);
    // Antigravity offers a Claude model (in the used-up "Claude and GPT models" group) and a Gemini one.
    states.set("agy-models", "claude-sonnet-5-5-medium\\tClaude Sonnet 5.5 (Medium)\\ngemini-3.8-flash-high\\tGemini 3.8 Flash (High)");
    fs.writeFileSync(path.join(fake.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    if (!appConfigProvider.config.isInitialized()) appConfigProvider.config.initialize();
    initializeRuntimeLoggerBootstrap({ logsDir: path.join(fake.dataDir, "logs"), loggingConfig: LOGGING });
    // The server's vault, as server startup opens it (provider keys are saved and read through it).
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize({ kind: "application", location: appConfigProvider.config.getOperationalDatabaseLocation() });
    stub = installProviderStub();
    const studio = await buildStudioServer({ appConfig: appConfigProvider.config, loggingConfig: LOGGING });
    await studio.applicationRuntime.lifecycle.prepareBeforeListen();
    await studio.agentToolsMcpHost.listen();
    await studio.credentialProxyHost.listen();
    const address = await studio.fastify.listen({ port: 0, host: "127.0.0.1" });
    await studio.applicationRuntime.lifecycle.recoverAfterListen();
    fastify = studio.fastify;
    baseUrl = new URL(address);
  }, 120_000);

  afterAll(async () => {
    await fastify?.close();
    await resetSecretVaultRuntimeForTests();
    stub?.restore();
    restoreStreams?.();
    await new Promise((resolve) => setTimeout(resolve, 500));
    fake.dispose();
  }, 120_000);

  it("AAR-01 lists the four runtimes and AutoByteus' keyed providers, each with models and live limits, read with 0 tokens (AC-001, AC-003…AC-007, AC-009)", async () => {
    // The first read on a freshly started server (cold provider registry, SCN-A4).
    const cold = await read();
    evidence("AAR-01 cold-read", { ms: cold.ms, runtimes: cold.report.agentRuntimes.map((entry) => entry.runtime) });
    expect(cold.report.agentRuntimes.map((entry) => entry.runtime), "AutoByteus is listed on the cold first read too").toContain("autobyteus");

    for (const [provider, apiKey] of Object.entries(KEYS)) {
      const saved = await post(`mutation($p:String!,$k:String!){ saveProviderApiKey(providerId:$p, apiKey:$k){ apiKeyConfigured } }`, { p: provider, k: apiKey });
      expect(saved.saveProviderApiKey.apiKeyConfigured, provider).toBe(true);
    }
    const { report, ms } = await read();
    evidence("AAR-01 report", report);
    evidence("AAR-01 elapsed-ms", ms);
    expect(ms, "whole answer within 20 s (REQ-010)").toBeLessThan(20_000);
    expect(Date.parse(report.checkedAt)).not.toBeNaN();
    expect(report.agentRuntimes.map((entry) => entry.runtime)).toEqual([CODEX, CLAUDE, AGY, GROK, "autobyteus"]);
    const entries = byRuntime(report);

    // AC-003: Codex weekly window used up, no credits → "Weekly" 0 % and every model blocked until its reset.
    const codexReset = new Date(1793390273 * 1000).toISOString();
    expect(entries[CODEX]).toEqual({
      runtime: CODEX, name: "Codex App Server",
      limits: [{ name: "Weekly", remainingPercent: 0, resetsAt: codexReset }],
      models: [expect.objectContaining({ id: CODEX_MODEL, blocked: { until: codexReset, by: "Weekly" } })],
    });

    // AC-005: Claude 5-hour 13 % and weekly 78 % left; no model blocked; its scoped weekly limit is named by model.
    expect(entries[CLAUDE]!.limits).toEqual([
      { name: "5-hour", remainingPercent: 13, resetsAt: "2026-10-24T21:10:00.354Z" },
      { name: "Weekly", remainingPercent: 78, resetsAt: "2026-10-31T16:00:00.354Z" },
      { name: "Weekly · Fable", remainingPercent: 100, resetsAt: "2026-10-31T16:00:00.000Z" },
    ]);
    expect(entries[CLAUDE]!.models.map((model: any) => model.id)).toContain("claude-fake-sonnet");
    expect(entries[CLAUDE]!.models.some((model: any) => model.blocked), "no Claude model is blocked").toBe(false);
    expect(entries[CLAUDE]).not.toHaveProperty("signIn");
    // The CLI was opened with an input that never yields: control requests only, never a user message (AC-005, C-15).
    const frames = (states.read("claude-stdin-frames.log") ?? "").split("\n").filter(Boolean);
    evidence("AAR-01 claude-stdin-frames", [...new Set(frames)]);
    expect(frames).toContain("control_request get_usage");
    expect(frames.filter((frame) => !frame.startsWith("control_request") && !frame.startsWith("control_response")), "only control frames").toEqual([]);

    // AC-004: Antigravity groups by family and window; the Claude/GPT group is used up → its models blocked, Gemini not.
    // Remaining percent rounds down (SR-006 O-1): 99.7 → 99, 98.9 → 98.
    expect(entries[AGY]!.limits).toEqual([
      { name: "Gemini Models · weekly", remainingPercent: 99, resetsAt: "2026-10-31T04:59:08.000Z" },
      { name: "Gemini Models · 5-hour", remainingPercent: 98, resetsAt: "2026-10-24T21:45:12.000Z" },
      { name: "Claude and GPT models · weekly", remainingPercent: 0, resetsAt: "2026-10-26T10:22:39.000Z" },
      { name: "Gemini 4 Argon · weekly", remainingPercent: 40, resetsAt: "2026-10-26T12:35:29.000Z" },
    ]);
    expect(entries[AGY]!.models).toEqual([
      { id: "claude-sonnet-5-5-medium", name: "Claude Sonnet 5.5 (Medium)", blocked: { until: "2026-10-26T10:22:39.000Z", by: "Claude and GPT models · weekly" } },
      { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash (High)" },
    ]);

    // AC-006: Grok "Billing period" resets at the period end; used % absent → null with its note.
    expect(entries[GROK]).toEqual({
      runtime: GROK, name: "Grok Build",
      limits: [{ name: "Billing period", remainingPercent: null, resetsAt: "2026-10-29T00:00:00.000Z" }],
      limitsNote: "Grok does not report how much of the period is used.",
      models: [{ id: "grok-4.7", name: "Grok 4.7", contextTokens: 256000 }],
    });

    // AC-007: keyed providers only; DeepSeek balance; Kimi and Anthropic blocked with their reasons; OpenAI not reported.
    const providers = Object.fromEntries((entries.autobyteus!.providers as any[]).map((provider) => [provider.provider, provider]));
    evidence("AAR-01 providers", Object.fromEntries(Object.entries(providers).map(([name, provider]) =>
      [name, { ...provider, models: `${provider.models.length} models, ${provider.models.filter((model: any) => model.blocked).length} blocked` }])));
    expect(Object.keys(providers).sort()).toEqual(["Anthropic", "DeepSeek", "Grok", "Kimi", "OpenAI"].sort());
    expect(providers.DeepSeek).toMatchObject({ balance: "0.14 USD" });
    expect(providers.DeepSeek).not.toHaveProperty("blocked");
    expect(providers.Kimi).toMatchObject({ balance: "0 USD", blocked: "no balance left" });
    expect(providers.Anthropic).toMatchObject({ blocked: "credit balance too low" });
    expect(providers.Anthropic).not.toHaveProperty("balance");
    expect(providers.Grok).not.toHaveProperty("blocked");
    expect(providers.Grok).not.toHaveProperty("limits");
    expect(providers.OpenAI).toMatchObject({ limits: "not reported" });
    for (const name of ["Kimi", "Anthropic"]) {
      expect(providers[name].models.length, `${name} has models`).toBeGreaterThan(0);
      expect(providers[name].models.every((model: any) => model.blocked?.until === null && model.blocked?.by === providers[name].blocked), `${name} models blocked`).toBe(true);
    }
    for (const name of ["DeepSeek", "Grok", "OpenAI"]) {
      expect(providers[name].models.length, `${name} has models`).toBeGreaterThan(0);
      expect(providers[name].models.some((model: any) => model.blocked), `${name} models not blocked`).toBe(false);
    }

    // Each provider was asked once, at its usage endpoint only, with its own key; Anthropic's call is count_tokens (free).
    evidence("AAR-01 provider-requests", stub.requests.map(({ url, method }) => `${method} ${url}`));
    evidence("AAR-01 refused-outside-urls", [...new Set(stub.refused)]);
    expect(stub.requests.map((request) => request.url).filter((url) => url !== LMSTUDIO_MODELS_URL).sort()).toEqual(Object.keys({
      "https://api.anthropic.com/v1/messages/count_tokens": 1, "https://api.deepseek.com/user/balance": 1,
      "https://api.moonshot.ai/v1/users/me/balance": 1, "https://api.x.ai/v1/api-key": 1,
    }).sort());
    const authorizationOf = (host: string) => stub.requests.find((request) => request.url.includes(host))!.authorization;
    expect(authorizationOf("deepseek")).toBe(`Bearer ${KEYS.DEEPSEEK}`);
    expect(authorizationOf("moonshot")).toBe(`Bearer ${KEYS.KIMI}`);
    expect(authorizationOf("anthropic")).toBe(KEYS.ANTHROPIC);
    expect(authorizationOf("x.ai")).toBe(`Bearer ${KEYS.GROK}`);
    expect(stub.refused.filter((url) => /completions|\/v1\/messages(?!\/count_tokens)|\/responses/.test(url)), "no model request").toEqual([]);

    // AC-009: no key, e-mail, account, user or team ID in the answer (the fakes printed account e-mails at sign-in).
    const text = JSON.stringify(report);
    for (const secret of [...Object.values(KEYS), ...states.emittedSecrets(), "FAKE-SECRET-xai-user-id", "FAKE-SECRET-xai-team-id"]) {
      expect(text.includes(secret), `answer leaks ${secret}`).toBe(false);
    }
    expect(text).not.toMatch(/@|subscription|planType|"plan"|credits|email|account|user_?id|team_?id/i);
  }, 90_000);

  it("AAR-02 leaves out signed-out and missing runtimes and providers without a key; marks a sign-in it could not check (REQ-002, REQ-007)", async () => {
    states.set("claude-account", "signedOut");
    process.env.GROK_BUILD_COMMAND = path.join(fake.root, "not-installed", "grok");
    states.set("codex-account", "error");
    const unchecked = await read();
    evidence("AAR-02 signed-out-missing-unchecked", unchecked.report.agentRuntimes.map(({ runtime, signIn }) => ({ runtime, signIn })));
    expect(unchecked.report.agentRuntimes.map((entry) => entry.runtime), "Claude signed out and Grok not installed are left out")
      .toEqual([CODEX, AGY, "autobyteus"]);
    const codex = byRuntime(unchecked.report)[CODEX]!;
    expect(codex.signIn, "sign-in could not be checked: listed with the mark (DEC-002)").toBe("not checked");
    expect(Array.isArray(codex.limits) && Array.isArray(codex.models), "the rest of its entry is still read").toBe(true);
    expect(byRuntime(unchecked.report)[AGY]).not.toHaveProperty("signIn");

    // Codex with no OpenAI sign-in required is available, without a mark.
    states.set("codex-account", "notRequired");
    const notRequired = byRuntime((await read()).report)[CODEX];
    expect(notRequired).toBeDefined();
    expect(notRequired).not.toHaveProperty("signIn");

    // Signed out Codex is left out as well.
    states.set("codex-account", "signedOut");
    expect((await read()).report.agentRuntimes.map((entry) => entry.runtime)).toEqual([AGY, "autobyteus"]);
    resetCliState();
  }, 90_000);

  it("AAR-03 slow steps end at their own deadlines: the answer arrives within 20 s, the hung processes are stopped and the next read works (AC-008, AC-011)", async () => {
    // Antigravity hangs on `agy models` (its sign-in and model steps) and on `/usage`; Grok's `--version` hangs (install);
    // Codex's app-server never answers `account/rateLimits/read`.
    states.set("agy-models-mode", "hang");
    states.set("agy-usage", "hang");
    states.set("grok-version-mode", "hang");
    states.set("codex-rate-limits", "hang");
    fs.rmSync(path.join(fake.stateDir, "hung-pids.log"), { force: true });
    const { report, ms } = await read();
    evidence("AAR-03 elapsed-ms", ms);
    evidence("AAR-03 report", report);
    const hung = hungPids();
    evidence("AAR-03 hung", hung);
    evidence("AAR-03 cli-calls", (states.read("cli-calls.log") ?? "").split("\n").filter((line) => / (agy|grok) /.test(line)).slice(-12));
    expect(ms, "whole answer within 20 s").toBeLessThan(20_000);
    expect(ms, "it did wait for the slow steps' caps (sign-in 6 s + models 8 s)").toBeGreaterThan(13_000);
    const entries = byRuntime(report);
    expect(report.agentRuntimes.map((entry) => entry.runtime), "an install check that timed out counts as not installed").toEqual([CODEX, CLAUDE, AGY, "autobyteus"]);
    expect(entries[AGY]).toEqual({
      runtime: AGY, name: "Antigravity CLI", signIn: "not checked",
      limits: "unknown: Antigravity CLI usage limits timed out",
      models: "unknown: Antigravity CLI model list timed out",
    });
    expect(entries[CODEX]!.limits).toBe("unknown: Codex App Server usage limits timed out");
    expect(entries[CODEX]!.models, "models read; no limits → nothing blocked").toEqual([expect.not.objectContaining({ blocked: expect.anything() })]);
    expect(Array.isArray(entries[CLAUDE]!.limits), "Claude is not held back by the others").toBe(true);

    // Every process told to hang is gone soon after the answer (its step's deadline stopped it).
    expect(hung.map(({ runtime, step }) => `${runtime} ${step}`).sort()).toEqual(
      expect.arrayContaining(["agy models", "agy models", "agy usage", "codex rateLimits", "grok version"]));
    const processes = hung.filter((entry) => entry.step !== "rateLimits");
    await until(() => processes.every((entry) => !isProcessAlive(entry.pid)), `hung CLI processes stopped: ${JSON.stringify(processes)}`, 5_000);
    // The Codex request was abandoned and its lease released: the app-server holding it closes (RSK-004).
    const codexServer = hung.find((entry) => entry.step === "rateLimits")!;
    await until(() => !isProcessAlive(codexServer.pid), `Codex app-server ${codexServer.pid} closed after the lease release`, 10_000);

    // The next read, with the CLIs answering again, gets everything (no lease or process left behind).
    resetCliState();
    const after = byRuntime((await read()).report);
    expect(after[CODEX]!.limits).toEqual([expect.objectContaining({ name: "Weekly", remainingPercent: 0 })]);
    expect(Array.isArray(after[AGY]!.models) && Array.isArray(after[AGY]!.limits)).toBe(true);
    expect(after[GROK]).toBeDefined();
  }, 90_000);

  it("AAR-04 over Agent Tools MCP: a Codex run whose definition lists the tool gets the same report; one whose definition does not, does not; several readers at once share one read and all get Codex (AC-002, AC-012, AC-013)", async () => {
    const defineAgent = async (name: string, toolNames: string[]) => (await post(
      `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: "autobyteus-303 e2e", instructions: "Help.", toolNames } })).createAgentDefinition.id as string;
    const configs = () => (states.read("codex-thread-start-configs.jsonl") ?? "").split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const startCodexRun = async (agentDefinitionId: string) => {
      const before = configs().length;
      const created = (await post(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, {
        input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: CODEX_MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: CODEX },
      })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      await until(() => configs().length === before + 1, "the run's Codex thread started");
      return { runId: created.runId as string, config: configs()[before] };
    };
    const agentToolsServer = (config: any) => config?.mcp_servers?.[AGENT_TOOLS_MCP_SERVER_NAME] as { url: string; enabled_tools: string[] } | undefined;
    const terminate = async (runId: string) => {
      const result = (await post(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun;
      expect(result.success, result.message).toBe(true);
    };

    // With the tool: Codex is given the Agent Tools MCP server with it enabled; the tool answers the node's report.
    const withTool = await startCodexRun(await defineAgent("Router agent", [TOOL]));
    const server = agentToolsServer(withTool.config);
    evidence("AAR-04 with-tool enabled_tools", server?.enabled_tools);
    expect(server?.enabled_tools).toContain(TOOL);
    const listed = await mcp(server!.url, "tools/list", {});
    const tool = (listed.body.result.tools as Array<{ name: string; inputSchema: unknown }>).find((entry) => entry.name === TOOL);
    expect(tool, "tools/list offers it").toBeDefined();
    const called = await mcp(server!.url, "tools/call", { name: TOOL, arguments: {} });
    expect(called.body.result.isError ?? false).toBe(false);
    const viaMcp = called.body.result.structuredContent as Report;
    expect(JSON.parse(called.body.result.content[0].text), "text and structured content are the same report").toEqual(viaMcp);
    const viaGraphql = (await read()).report;
    const withoutTime = (report: Report) => ({ ...report, checkedAt: "<time>" });
    expect(withoutTime(viaMcp), "the page's GraphQL answer by the one tool result rule (nulls left out)")
      .toEqual(omitEmptyToolResultFields(withoutTime(viaGraphql)));
    evidence("AAR-04 mcp-report-runtimes", viaMcp.agentRuntimes.map((entry) => entry.runtime));

    // Several readers at the same moment: three page reads and the agent's tool call (SCN-A2) share one read (AC-013).
    const appServersBefore = (states.read("codex-app-server.pids") ?? "").split("\n").filter(Boolean).length;
    const started = Date.now();
    const parallel = await Promise.all([
      read(), read(), read(),
      (async () => { const t0 = Date.now(); const result = await mcp(server!.url, "tools/call", { name: TOOL, arguments: {} }); return { report: result.body.result.structuredContent as Report, ms: Date.now() - t0 }; })(),
    ]);
    const codexFacts = (report: Report) => { const codex = byRuntime(report)[CODEX];
      return { limits: Array.isArray(codex?.limits) ? "read" : codex?.limits ?? "absent", models: Array.isArray(codex?.models) ? "read" : codex?.models ?? "absent" }; };
    const parallelFacts = parallel.map(({ report, ms }) => ({ ms, checkedAt: report.checkedAt, runtimes: report.agentRuntimes.map((entry) => entry.runtime), codex: codexFacts(report) }));
    const appServersStarted = (states.read("codex-app-server.pids") ?? "").split("\n").filter(Boolean).length - appServersBefore;
    evidence("AAR-04 parallel", { wallMs: Date.now() - started, appServersStarted, calls: parallelFacts });
    for (const facts of parallelFacts) {
      expect(facts.ms, "each within 20 s").toBeLessThan(20_000);
      expect(facts.runtimes).toEqual([CODEX, CLAUDE, AGY, GROK, "autobyteus"]);
      expect(facts.codex, "every caller gets Codex models and limits (AC-013)").toEqual({ limits: "read", models: "read" });
    }
    expect(new Set(parallelFacts.map((facts) => facts.checkedAt)).size, "one shared read").toBe(1);
    expect(appServersStarted, "the shared read starts Codex's app-server once").toBeLessThanOrEqual(1);
    // Two readers at once, ten times (the page and an agent), then back-to-back single reads: Codex is always read.
    const rounds: unknown[] = [];
    for (let round = 0; round < 10; round += 1) {
      const pair = await Promise.all([read(), read()]);
      rounds.push(pair.map(({ report }) => codexFacts(report)));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const sequential: unknown[] = [];
    for (let index = 0; index < 3; index += 1) sequential.push(codexFacts((await read()).report));
    evidence("AAR-04 two-reader-rounds", { rounds, sequential });
    expect([...rounds.flat(), ...sequential].every((facts) => JSON.stringify(facts) === JSON.stringify({ limits: "read", models: "read" })),
      `Codex read in every round: ${JSON.stringify({ rounds, sequential })}`).toBe(true);
    await terminate(withTool.runId);

    // Without it: the definition lists another Agent Tools MCP tool, so the run has a session, but not this tool.
    const withoutTool = await startCodexRun(await defineAgent("Plain agent", ["list_available_agents"]));
    const plainServer = agentToolsServer(withoutTool.config);
    evidence("AAR-04 without-tool enabled_tools", plainServer?.enabled_tools);
    expect(plainServer?.enabled_tools ?? []).not.toContain(TOOL);
    if (plainServer) {
      const plainList = await mcp(plainServer.url, "tools/list", {});
      expect((plainList.body.result.tools as Array<{ name: string }>).map((entry) => entry.name)).not.toContain(TOOL);
      const refused = await mcp(plainServer.url, "tools/call", { name: TOOL, arguments: {} });
      evidence("AAR-04 without-tool call", refused.body);
      expect(refused.body.error ?? (refused.body.result?.isError ? refused.body.result : undefined), "the call is refused").toBeDefined();
      expect(JSON.stringify(refused.body)).not.toContain("agentRuntimes");
    }
    await terminate(withoutTool.runId);
  }, 180_000);

  it("AAR-06 discovered providers are asked on every read: LM Studio answering is listed, not answering is left out; a keyed custom endpoint not answering is listed with its models unknown (AC-007, REQ-002, REQ-007)", async () => {
    // LM Studio starts answering; nothing has loaded its models before this read (no settings page, no reload).
    stub.discovered.lmStudio = true;
    const providersOf = (report: Report) => Object.fromEntries(((byRuntime(report).autobyteus?.providers ?? []) as any[]).map((provider) => [provider.provider, provider]));
    const answering = providersOf((await read()).report);
    evidence("AAR-06 lmstudio-answering", answering["LM Studio"] ?? null);
    expect(answering["LM Studio"]).toMatchObject({ limits: "not reported" });
    expect((answering["LM Studio"].models as any[]).map((model) => model.id).sort()).toEqual([
      "google/gemma-4-26b-a4b:lmstudio@lmstudio.e2e.test:1234", "qwen/qwen3.6-35b-a3b:lmstudio@lmstudio.e2e.test:1234"]);
    // LM Studio stops answering: it cannot run anything, so it is left out (its earlier models are not reused).
    stub.discovered.lmStudio = false;
    const stopped = providersOf((await read()).report);
    expect(stopped["LM Studio"], "LM Studio not answering is left out").toBeUndefined();

    // A keyed custom endpoint, created while it answers.
    stub.discovered.customEndpoint = true;
    const created = await post(`mutation($input: CustomProviderInputObject!){ createCustomProvider(input:$input){ provider { id name } apiKeyConfigured } }`,
      { input: { name: "E2E Gateway", baseUrl: CUSTOM_BASE_URL, apiKey: CUSTOM_KEY } });
    expect(created.createCustomProvider.apiKeyConfigured).toBe(true);
    const name = created.createCustomProvider.provider.name as string;
    const listed = providersOf((await read()).report)[name];
    evidence("AAR-06 custom-answering", listed ?? null);
    expect((listed?.models as any[] | undefined)?.map((model) => model.id).sort(), "the endpoint's models, read now").toEqual(
      expect.arrayContaining([expect.stringContaining("gateway-model-a"), expect.stringContaining("gateway-model-b")]));
    expect(listed).toMatchObject({ limits: "not reported" });
    // The endpoint stops answering: still listed (it has a key), its models unknown with a reason, nothing guessed.
    stub.discovered.customEndpoint = false;
    const down = providersOf((await read()).report)[name];
    evidence("AAR-06 custom-not-answering", down ?? null);
    expect(down, "a keyed custom endpoint stays listed").toBeDefined();
    expect(typeof down.models === "string" && down.models.startsWith(`unknown: ${name} model list `), `models unknown: ${JSON.stringify(down.models)}`).toBe(true);
    expect(JSON.stringify(down)).not.toContain(CUSTOM_KEY);
  }, 120_000);

  it("AAR-05 no provider key or account value in any response, the server's log file, its output or its data files (REQ-008, QR-002)", () => {
    const secrets = [...Object.values(KEYS), CUSTOM_KEY, ...states.emittedSecrets(), "FAKE-SECRET-xai-user-id", "FAKE-SECRET-xai-team-id"];
    expect(secrets.length).toBeGreaterThan(Object.keys(KEYS).length);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full); else files.push(full);
      }
    };
    walk(fake.dataDir);
    const logs = files.filter((file) => file.includes(`${path.sep}logs${path.sep}`));
    expect(logs.length, "the server wrote its log file").toBeGreaterThan(0);
    const haystacks: Array<[string, string]> = [
      ["responses", responses.join("\n")],
      ["stdout/stderr", captured.join("")],
      ...files.map((file) => [path.relative(fake.dataDir, file), fs.readFileSync(file).toString("latin1")] as [string, string]),
    ];
    evidence("AAR-05 scanned", { responses: responses.length, outputChunks: captured.length, files: files.map((file) => path.relative(fake.dataDir, file)), secrets: secrets.length });
    for (const [where, text] of haystacks) {
      for (const secret of secrets) expect(text.includes(secret), `${secret} in ${where}`).toBe(false);
    }
  });
});
