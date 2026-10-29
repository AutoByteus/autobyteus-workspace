import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import {
  AVAILABLE_AGENT_RUNTIMES_STEP_CAPS, AvailableAgentRuntimesService, type AvailableAgentRuntimesStepCaps,
} from "../../../src/available-agent-runtimes/available-agent-runtimes-service.js";
import { AgentRuntimeSignInReader, type SignInReading } from "../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import type { AgentRuntimeStrategy } from "../../../src/runtime-management/agent-runtimes/agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "../../../src/runtime-management/agent-runtimes/agent-runtime-types.js";
import type { ExternalAgentRuntimeEntry, AutoByteusEntry } from "../../../src/available-agent-runtimes/available-agent-runtimes-report.js";
import { parseAntigravityUsageLimits } from "../../../src/runtime-management/agent-runtimes/usage-limits/antigravity-usage-limits.js";
import { parseClaudeUsageLimits } from "../../../src/runtime-management/agent-runtimes/usage-limits/claude-usage-limits.js";
import { parseCodexUsageLimits } from "../../../src/runtime-management/agent-runtimes/usage-limits/codex-usage-limits.js";
import { parseGrokUsageLimits } from "../../../src/runtime-management/agent-runtimes/usage-limits/grok-usage-limits.js";
import type { RuntimeUsageLimit, UsageLimitsReading } from "../../../src/runtime-management/agent-runtimes/usage-limits/usage-limits-reading.js";
import { DeadlineExceededError, type ReadDeadline } from "../../../src/runtime-management/read-deadline.js";
import type { ProviderCredentialSetting } from "../../../src/llm-management/llm-providers/domain/models.js";
import type { LocalProviderModelCatalogSnapshot } from "../../../src/llm-management/services/model-catalog-service.js";
import {
  ProviderUsageUnreadableError, type ProviderUsageReader, type ProviderUsageReading,
} from "../../../src/llm-management/provider-usage/provider-usage-reader.js";
import { UsageLimitsUnreadableError } from "../../../src/runtime-management/agent-runtimes/usage-limits/usage-limits-reading.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/usage-limits");
const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

const model = (id: string, name: string, providerId = "X", context: number | null = null): ModelInfo => ({
  model_identifier: id, display_name: name, value: id, canonical_name: id, provider_id: providerId,
  provider_name: providerId, provider_type: providerId as LLMProvider, runtime: "api",
  max_context_tokens: context, active_context_tokens: null, max_input_tokens: null, max_output_tokens: null,
  resolved_model_metadata: null,
});

const MODELS: Record<string, ModelInfo[]> = {
  [RuntimeKind.CODEX_APP_SERVER]: [model("gpt-5.6", "GPT-5.6", "OPENAI", 400_000), model("gpt-5.6-mini", "GPT-5.6 mini")],
  [RuntimeKind.CLAUDE_AGENT_SDK]: [model("opus[1m]", "Opus (1M context)"), model("claude-fable-5[1m]", "Fable")],
  [RuntimeKind.ANTIGRAVITY_CLI]: [
    model("claude-sonnet-5-5-medium", "Claude Sonnet 5.5 (Medium)"),
    model("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)"),
    model("gemini-3.8-flash-high", "Gemini 3.8 Flash (High)"),
    model("gemini-4-argon-high", "Gemini 4 Argon (High)"),
  ],
  [RuntimeKind.GROK_BUILD]: [model("grok-4.7", "Grok 4.7", "GROK", 256_000)],
  [RuntimeKind.AUTOBYTEUS]: [
    model("deepseek-v4", "DeepSeek V4", LLMProvider.DEEPSEEK),
    model("kimi-k3", "Kimi K3", LLMProvider.KIMI),
    model("claude-sonnet-5-5", "Claude Sonnet 5.5", LLMProvider.ANTHROPIC),
    model("gpt-6", "GPT-6", LLMProvider.OPENAI),
    model("mistral-large", "Mistral Large", LLMProvider.MISTRAL),
  ],
};

const LIMITS: Record<AgentRuntimeKind, () => UsageLimitsReading> = {
  [RuntimeKind.CODEX_APP_SERVER]: () => parseCodexUsageLimits(JSON.parse(fixture("codex-rate-limits-exhausted.json"))),
  [RuntimeKind.CLAUDE_AGENT_SDK]: () => parseClaudeUsageLimits(JSON.parse(fixture("claude-get-usage.json"))),
  [RuntimeKind.ANTIGRAVITY_CLI]: () => parseAntigravityUsageLimits(fixture("antigravity-usage.json")),
  [RuntimeKind.GROK_BUILD]: () => parseGrokUsageLimits(JSON.parse(fixture("grok-billing.json"))),
};

type StrategyOverrides = Partial<Pick<AgentRuntimeStrategy, "readVersion" | "readSignIn" | "readUsageLimits" | "resolveExecutable">>;

const strategy = (runtimeKind: AgentRuntimeKind, overrides: StrategyOverrides = {}): AgentRuntimeStrategy => ({
  runtimeKind,
  signInRoute: "commandLine",
  installInstructionsUrl: "https://install.example",
  resolveExecutable: () => `/usr/local/bin/${runtimeKind}`,
  readVersion: async () => "1.0.0",
  readLatestVersion: async () => "1.0.0",
  readSignIn: async (): Promise<SignInReading> => ({ state: "signedIn" }),
  readUsageLimits: async () => LIMITS[runtimeKind](),
  updateArgv: (executable) => [executable, "update"],
  ...overrides,
});

const KINDS: AgentRuntimeKind[] = [
  RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.ANTIGRAVITY_CLI, RuntimeKind.GROK_BUILD,
];

const DISCOVERED_IDS = new Set<string>([LLMProvider.OLLAMA, LLMProvider.LMSTUDIO, "custom-endpoint"]);
const settings = (entries: Array<[string, string, boolean]>): ProviderCredentialSetting[] => entries.map(([id, name, key]) => ({
  provider: { id, name, providerType: (id === "custom-endpoint" ? LLMProvider.OPENAI_COMPATIBLE : id) as LLMProvider,
    isCustom: id === "custom-endpoint", baseUrl: null, catalogMode: DISCOVERED_IDS.has(id) ? "DISCOVERED" : "STATIC" },
  apiKeyConfigured: key,
}));

/** A discovered source's reload answer: its models now and its source state. */
const snapshot = (models: ModelInfo[], state = "READY", safeMessage: string | null = null): LocalProviderModelCatalogSnapshot => ({
  runtimeKind: "autobyteus", ownerProvider: {} as never, audioModels: [], imageModels: [], videoModels: [], llmModels: models,
  sources: [{ modelKind: "LLM", state: state as never, modelCount: models.length, successfulUnitCount: 1, failedUnitCount: 0, safeMessage }],
});
const DISCOVERED_MODELS: Record<string, ModelInfo[]> = {
  [LLMProvider.OLLAMA]: [model("qwen3:8b", "qwen3:8b", LLMProvider.OLLAMA)],
  [LLMProvider.LMSTUDIO]: [model("qwen/qwen3.6-35b-a3b", "Qwen 3.6 35B", LLMProvider.LMSTUDIO, 32_768)],
  "custom-endpoint": [model("my-model", "My Model", "custom-endpoint")],
};

const PROVIDER_SETTINGS = settings([
  [LLMProvider.ANTHROPIC, "Anthropic", true],
  [LLMProvider.DEEPSEEK, "DeepSeek", true],
  [LLMProvider.KIMI, "Kimi", true],
  [LLMProvider.MISTRAL, "Mistral", false],
  [LLMProvider.OLLAMA, "Ollama", false],
  [LLMProvider.OPENAI, "OpenAI", true],
]);

const PROVIDER_READINGS: Record<string, ProviderUsageReading> = {
  [LLMProvider.DEEPSEEK]: { state: "read", balance: { amount: "0.14", currency: "USD" }, blockedReason: null },
  [LLMProvider.KIMI]: { state: "read", balance: { amount: "0", currency: "USD" }, blockedReason: "no balance left" },
  [LLMProvider.ANTHROPIC]: { state: "read", balance: null, blockedReason: "credit balance too low" },
};

type ServiceOptions = Readonly<{
  strategies?: AgentRuntimeStrategy[];
  catalog?: (kind: string, options: { deadline?: ReadDeadline }) => Promise<ModelInfo[]>;
  reload?: (providerId: string) => Promise<LocalProviderModelCatalogSnapshot>;
  providerSettings?: ProviderCredentialSetting[];
  providerReader?: ProviderUsageReader["read"];
  stepCaps?: AvailableAgentRuntimesStepCaps;
}>;

const service = (options: ServiceOptions = {}) => {
  const strategies = options.strategies ?? KINDS.map((kind) => strategy(kind));
  const providerReader: ProviderUsageReader["read"] = options.providerReader
    ?? (async (provider) => PROVIDER_READINGS[provider.id]!);
  return new AvailableAgentRuntimesService({
    strategies,
    signInReader: new AgentRuntimeSignInReader(strategies),
    modelCatalog: {
      runtimeModelSelectionCatalog: async (kind, _workspace, catalogOptions = {}) => {
        const offeredModels = await (options.catalog ?? (async (k: string) => MODELS[k]!))(String(kind), catalogOptions);
        return { offeredModels, findExactCurrent: () => null };
      },
      reloadProviderModelCatalog: async (providerId) =>
        (options.reload ?? (async (id: string) => snapshot(DISCOVERED_MODELS[id] ?? [])))(providerId),
    },
    providerCredentials: { listProviderCredentialSettings: async () => options.providerSettings ?? PROVIDER_SETTINGS },
    providerUsageReaders: {
      readerFor: (id) => (PROVIDER_READINGS[id] ? { read: providerReader } : null),
    },
    homeDirectory: "/home/test",
    stepCaps: options.stepCaps,
  });
};

const external = (entries: unknown[], runtime: string) =>
  entries.find((entry) => (entry as { runtime: string }).runtime === runtime) as ExternalAgentRuntimeEntry | undefined;
const autobyteus = (entries: unknown[]) =>
  entries.find((entry) => (entry as { runtime: string }).runtime === "autobyteus") as AutoByteusEntry;

const neverSettles = <T>(): Promise<T> => new Promise<T>(() => undefined);

describe("AvailableAgentRuntimesService", () => {
  it("lists the four runtimes and AutoByteus with its keyed providers, each with models (AC-001)", async () => {
    const report = await service().read();
    expect(report.agentRuntimes.map((entry) => entry.runtime))
      .toEqual(["codex_app_server", "claude_agent_sdk", "antigravity_cli", "grok_build", "autobyteus"]);
    expect(Date.parse(report.checkedAt)).not.toBeNaN();
    expect(external(report.agentRuntimes as unknown[], "grok_build")!.models)
      .toEqual([{ id: "grok-4.7", name: "Grok 4.7", contextTokens: 256_000 }]);
    expect(autobyteus(report.agentRuntimes as unknown[]).providers.map((provider) => provider.provider))
      .toEqual(["Anthropic", "DeepSeek", "Kimi", "Ollama", "OpenAI"]);
  });

  it("leaves out a runtime that is not installed or signed out (AC-001)", async () => {
    const report = await service({ strategies: [
      strategy(RuntimeKind.CODEX_APP_SERVER, { readVersion: async () => null }),
      strategy(RuntimeKind.CLAUDE_AGENT_SDK, { readSignIn: async () => ({ state: "signedOut", detail: "Not logged in" }) }),
      strategy(RuntimeKind.GROK_BUILD, { readSignIn: async () => ({ state: "notRequired" }) }),
    ] }).read();
    expect(report.agentRuntimes.map((entry) => entry.runtime)).toEqual(["grok_build", "autobyteus"]);
  });

  it("Codex used up without credits: limit Weekly 0% and every model blocked until its reset (AC-003)", async () => {
    const codex = external((await service().read()).agentRuntimes as unknown[], "codex_app_server")!;
    expect(codex.limits).toEqual([{ name: "Weekly", remainingPercent: 0, resetsAt: "2026-10-30T19:57:53.000Z" }]);
    expect(codex.models).toEqual([
      { id: "gpt-5.6", name: "GPT-5.6", contextTokens: 400_000, blocked: { until: "2026-10-30T19:57:53.000Z", by: "Weekly" } },
      { id: "gpt-5.6-mini", name: "GPT-5.6 mini", blocked: { until: "2026-10-30T19:57:53.000Z", by: "Weekly" } },
    ]);
    expect(codex).not.toHaveProperty("limitsNote");
  });

  it("Codex used up with credits: no model blocked and the limits note says so (AC-003, DEC-007)", async () => {
    const answer = JSON.parse(fixture("codex-rate-limits-exhausted.json"));
    answer.rateLimitsByLimitId.codex.credits = { hasCredits: true, unlimited: false, balance: "5" };
    const codex = external((await service({ strategies: [strategy(RuntimeKind.CODEX_APP_SERVER, {
      readUsageLimits: async () => parseCodexUsageLimits(answer),
    })] }).read()).agentRuntimes as unknown[], "codex_app_server")!;
    expect((codex.models as Array<{ blocked?: unknown }>).every((entry) => !entry.blocked)).toBe(true);
    expect(codex.limitsNote).toBe("Weekly limit used up; running on paid credits.");
  });

  it("Antigravity: Claude and GPT models blocked by their group, Gemini models not (AC-004)", async () => {
    const agy = external((await service().read()).agentRuntimes as unknown[], "antigravity_cli")!;
    expect(agy.limits).toEqual([
      { name: "Gemini Models · weekly", remainingPercent: 99, resetsAt: "2026-10-31T04:59:08.000Z" },
      { name: "Gemini Models · 5-hour", remainingPercent: 98, resetsAt: "2026-10-24T21:45:12.000Z" },
      { name: "Claude and GPT models · weekly", remainingPercent: 0, resetsAt: "2026-10-26T10:22:39.000Z" },
      { name: "Gemini 4 Argon · weekly", remainingPercent: 40, resetsAt: "2026-10-26T12:35:29.000Z" },
    ]);
    const block = { until: "2026-10-26T10:22:39.000Z", by: "Claude and GPT models · weekly" };
    expect(agy.models).toEqual([
      { id: "claude-sonnet-5-5-medium", name: "Claude Sonnet 5.5 (Medium)", blocked: block },
      { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B (Medium)", blocked: block },
      { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash (High)" },
      { id: "gemini-4-argon-high", name: "Gemini 4 Argon (High)" },
    ]);
  });

  it("Claude: 5-hour and weekly limits, nothing blocked; Grok: billing period with its note (AC-005, AC-006)", async () => {
    const report = await service().read();
    const claude = external(report.agentRuntimes as unknown[], "claude_agent_sdk")!;
    expect((claude.limits as Array<{ name: string; remainingPercent: number }>).map(({ name, remainingPercent }) => [name, remainingPercent]))
      .toEqual([["5-hour", 13], ["Weekly", 78], ["Weekly · Fable", 100]]);
    expect((claude.models as Array<{ blocked?: unknown }>).some((entry) => entry.blocked)).toBe(false);
    const grok = external(report.agentRuntimes as unknown[], "grok_build")!;
    expect(grok.limits).toEqual([{ name: "Billing period", remainingPercent: null, resetsAt: "2026-10-29T00:00:00.000Z" }]);
    expect(grok.limitsNote).toBe("Grok does not report how much of the period is used.");
  });

  it("the most specific family wins over all of a runtime's limits, before exhausted ones block (SR-007, C-02)", async () => {
    const limit = (name: string, families: string[], exhausted: boolean): RuntimeUsageLimit =>
      ({ name, remainingPercent: exhausted ? 0 : 40, resetsAt: "2026-10-26T10:22:39.000Z", exhausted, appliesTo: { kind: "modelFamilies", families } });
    const agy = external((await service({ strategies: [strategy(RuntimeKind.ANTIGRAVITY_CLI, {
      readUsageLimits: async () => ({ state: "read", limits: [
        limit("Gemini · weekly", ["Gemini"], true),
        limit("Gemini 4 Argon · weekly", ["Gemini 4 Argon"], false),
      ] }),
    })] }).read()).agentRuntimes as unknown[], "antigravity_cli")!;
    const blocked = Object.fromEntries((agy.models as Array<{ id: string; blocked?: unknown }>).map((entry) => [entry.id, Boolean(entry.blocked)]));
    // Argon belongs to its own group, which has quota left; Flash belongs only to the used-up "Gemini" group.
    expect(blocked["gemini-4-argon-high"]).toBe(false);
    expect(blocked["gemini-3.8-flash-high"]).toBe(true);
  });

  it("a scoped Claude limit used up blocks only its model", async () => {
    const answer = JSON.parse(fixture("claude-get-usage.json"));
    answer.rate_limits.limits[2].percent = 100;
    const claude = external((await service({ strategies: [strategy(RuntimeKind.CLAUDE_AGENT_SDK, {
      readUsageLimits: async () => parseClaudeUsageLimits(answer),
    })] }).read()).agentRuntimes as unknown[], "claude_agent_sdk")!;
    expect(claude.models).toEqual([
      { id: "opus[1m]", name: "Opus (1M context)" },
      { id: "claude-fable-5[1m]", name: "Fable", blocked: { until: "2026-10-31T16:00:00.000Z", by: "Weekly · Fable" } },
    ]);
  });

  it("AutoByteus: balances, provider blocks on every model, not reported, and no keyless providers (AC-007)", async () => {
    const providers = autobyteus((await service().read()).agentRuntimes as unknown[]).providers;
    expect(providers).toEqual([
      { provider: "Anthropic", blocked: "credit balance too low",
        models: [{ id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", blocked: { until: null, by: "credit balance too low" } }] },
      { provider: "DeepSeek", balance: "0.14 USD", models: [{ id: "deepseek-v4", name: "DeepSeek V4" }] },
      { provider: "Kimi", balance: "0 USD", blocked: "no balance left",
        models: [{ id: "kimi-k3", name: "Kimi K3", blocked: { until: null, by: "no balance left" } }] },
      { provider: "Ollama", limits: "not reported", models: [{ id: "qwen3:8b", name: "qwen3:8b" }] },
      { provider: "OpenAI", limits: "not reported", models: [{ id: "gpt-6", name: "GPT-6" }] },
    ]);
  });

  describe("a failing or slow step gives its REQ-007 entry and the rest still arrives (AC-008)", () => {
    const failing = (overrides: StrategyOverrides) => service({ strategies: [
      strategy(RuntimeKind.ANTIGRAVITY_CLI, overrides), strategy(RuntimeKind.GROK_BUILD),
    ] });

    it("install throws → not installed, left out", async () => {
      const report = await failing({ readVersion: async () => { throw new Error("spawn failed"); } }).read();
      expect(report.agentRuntimes.map((entry) => entry.runtime)).toEqual(["grok_build", "autobyteus"]);
    });

    it("sign-in throws or is unknown → listed with signIn: not checked", async () => {
      for (const readSignIn of [
        async (): Promise<SignInReading> => { throw new Error("boom"); },
        async (): Promise<SignInReading> => ({ state: "unknown", detail: "agy exited 3" }),
      ]) {
        const agy = external((await failing({ readSignIn }).read()).agentRuntimes as unknown[], "antigravity_cli")!;
        expect(agy.signIn).toBe("not checked");
        expect(Array.isArray(agy.models)).toBe(true);
      }
    });

    it("models throw or are empty → models unknown, never an empty list", async () => {
      const thrown = await service({ strategies: [strategy(RuntimeKind.ANTIGRAVITY_CLI)], catalog: async () => {
        throw new Error("AGY_MODEL_DISCOVERY_FAILED secret-token");
      } }).read();
      expect(external(thrown.agentRuntimes as unknown[], "antigravity_cli")!.models).toBe("unknown: Antigravity CLI model list could not be read");
      const empty = await service({ strategies: [strategy(RuntimeKind.ANTIGRAVITY_CLI)], catalog: async (kind) =>
        kind === RuntimeKind.ANTIGRAVITY_CLI ? [] : MODELS[kind]! }).read();
      expect(external(empty.agentRuntimes as unknown[], "antigravity_cli")!.models).toBe("unknown: no models could be read");
    });

    it("limits that fail or are not reported → the service's one wording; models stay unblocked (SR-007)", async () => {
      const limitsFailing = async (error: unknown) => external((await failing({ readUsageLimits: async () => { throw error; } })
        .read()).agentRuntimes as unknown[], "antigravity_cli")!;
      const timedOut = await limitsFailing(new Error("AGY_MODEL_DISCOVERY_TIMEOUT", { cause: new DeadlineExceededError() }));
      expect(timedOut.limits).toBe("unknown: Antigravity CLI usage limits timed out");
      expect((timedOut.models as Array<{ blocked?: unknown }>).every((entry) => !entry.blocked)).toBe(true);
      expect((await limitsFailing(new UsageLimitsUnreadableError("the answer was not in the expected form"))).limits)
        .toBe("unknown: Antigravity CLI usage limits could not be read: the answer was not in the expected form");
      // Any other failure's own text (vendor output, paths, keys) is never shown.
      expect((await limitsFailing(new Error("agy: token=abc /private/path"))).limits).toBe("unknown: Antigravity CLI usage limits could not be read");
      // An ordinary per-command time-out (not the step's deadline) is "could not be read" (SR-007 decision 3).
      expect((await limitsFailing(new Error("Command timed out after 3000ms."))).limits).toBe("unknown: Antigravity CLI usage limits could not be read");
      const notReported = external((await failing({ readUsageLimits: async () => ({ state: "not_reported" }) })
        .read()).agentRuntimes as unknown[], "antigravity_cli")!;
      expect(notReported.limits).toBe("not reported");
    });

    it("a provider reader that fails → limits unknown for that provider only, in the service's wording", async () => {
      const providersWith = async (failure: unknown) => autobyteus((await service({ providerReader: async (provider) => {
        if (provider.id === LLMProvider.KIMI) throw failure;
        return PROVIDER_READINGS[provider.id]!;
      } }).read()).agentRuntimes as unknown[]).providers;
      const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
      expect((await providersWith(timeout)).find((provider) => provider.provider === "Kimi")).toEqual({
        provider: "Kimi", limits: "unknown: Kimi usage timed out", models: [{ id: "kimi-k3", name: "Kimi K3" }],
      });
      expect((await providersWith(new ProviderUsageUnreadableError("unexpected answer (500)"))).find((provider) => provider.provider === "Kimi")!.limits)
        .toBe("unknown: Kimi usage could not be read: unexpected answer (500)");
      const providers = await providersWith(new Error("connect ECONNREFUSED sk-secret-key"));
      expect(providers.find((provider) => provider.provider === "Kimi")!.limits).toBe("unknown: Kimi usage could not be read");
      expect(providers.find((provider) => provider.provider === "DeepSeek")!.balance).toBe("0.14 USD");
    });
  });

  it("slow steps end at their caps, each step getting its own cap as a deadline; the answer still arrives (AC-011)", async () => {
    const caps = { installMs: 200, signInMs: 300, modelsMs: 400, limitsMs: 400, providerListMs: 200, providerModelsMs: 300, providerUsageMs: 300 };
    const received: Record<string, number> = {};
    const remember = (step: string, deadline: ReadDeadline | undefined) => { received[step] = deadline!.endsAt - Date.now(); };
    const slow = strategy(RuntimeKind.ANTIGRAVITY_CLI, {
      readVersion: async (_executable, options) => { remember("install", options?.deadline); return "1.0.0"; },
      readSignIn: async (_executable, _cwd, options) => { remember("signIn", options?.deadline); return neverSettles(); },
      readUsageLimits: async (_executable, _cwd, { deadline }) => { remember("limits", deadline); return neverSettles(); },
    });
    const startedAt = Date.now();
    const report = await service({
      strategies: [slow, strategy(RuntimeKind.GROK_BUILD)],
      stepCaps: caps,
      catalog: async (kind, options) => {
        if (kind !== RuntimeKind.ANTIGRAVITY_CLI) return MODELS[kind]!;
        remember("models", options.deadline);
        return neverSettles();
      },
      providerReader: async (provider, _models, { signal }) => {
        if (provider.id !== LLMProvider.DEEPSEEK) return PROVIDER_READINGS[provider.id]!;
        return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
      },
    }).read();
    const elapsed = Date.now() - startedAt;
    expect(elapsed).toBeLessThan(caps.installMs + caps.signInMs + caps.modelsMs + 3 * 500 + 500);
    for (const [step, cap] of Object.entries({ install: 200, signIn: 300, models: 400, limits: 400 })) {
      expect(received[step]).toBeGreaterThan(cap - 100);
      expect(received[step]).toBeLessThanOrEqual(cap);
    }
    const agy = external(report.agentRuntimes as unknown[], "antigravity_cli")!;
    expect(agy).toMatchObject({
      signIn: "not checked",
      limits: "unknown: Antigravity CLI usage limits timed out",
      models: "unknown: Antigravity CLI model list timed out",
    });
    expect(external(report.agentRuntimes as unknown[], "grok_build")!.models).toHaveLength(1);
    expect(autobyteus(report.agentRuntimes as unknown[]).providers.find((p) => p.provider === "DeepSeek")!.limits)
      .toBe("unknown: DeepSeek usage timed out");
  });

  describe("discovered AutoByteus providers are asked afresh on every read (CR-003, AC-007)", () => {
    const withDiscovered = settings([
      [LLMProvider.LMSTUDIO, "LM Studio", false],
      [LLMProvider.OLLAMA, "Ollama", false],
      ["custom-endpoint", "My Endpoint", true],
      ["custom-keyless", "Keyless Endpoint", false],
    ]);
    const providersOf = async (options: ServiceOptions) =>
      autobyteus((await service({ strategies: [], providerSettings: withDiscovered, ...options }).read()).agentRuntimes as unknown[]).providers;

    it("lists a local server that answers with models now, with them, even when nothing loaded it before", async () => {
      const reload = vi.fn(async (id: string) => snapshot(DISCOVERED_MODELS[id] ?? []));
      expect(await providersOf({ reload })).toEqual([
        { provider: "LM Studio", limits: "not reported", models: [{ id: "qwen/qwen3.6-35b-a3b", name: "Qwen 3.6 35B", contextTokens: 32_768 }] },
        { provider: "Ollama", limits: "not reported", models: [{ id: "qwen3:8b", name: "qwen3:8b" }] },
        { provider: "My Endpoint", limits: "not reported", models: [{ id: "my-model", name: "My Model" }] },
      ]);
      // Every discovered provider it considers is reloaded; a custom endpoint without a key is not considered.
      expect(reload.mock.calls.map(([id]) => id).sort()).toEqual(["LMSTUDIO", "OLLAMA", "custom-endpoint"]);
    });

    it("leaves out a local server that does not answer, fails, offers no model or times out", async () => {
      const providers = await providersOf({
        stepCaps: { ...AVAILABLE_AGENT_RUNTIMES_STEP_CAPS, providerModelsMs: 150 },
        reload: async (id) => id === LLMProvider.LMSTUDIO ? snapshot([], "ERROR", "LMSTUDIO_MODEL_DISCOVERY_UNAVAILABLE")
          : id === LLMProvider.OLLAMA ? neverSettles() : snapshot(DISCOVERED_MODELS[id]!),
      });
      expect(providers.map((provider) => provider.provider)).toEqual(["My Endpoint"]);
      const stale = await providersOf({ reload: async (id) => id === LLMProvider.LMSTUDIO
        ? snapshot(DISCOVERED_MODELS[id]!, "STALE_ERROR", "MODEL_DISCOVERY_UNAVAILABLE")
        : id === LLMProvider.OLLAMA ? snapshot([]) : snapshot(DISCOVERED_MODELS[id]!) });
      expect(stale.map((provider) => provider.provider)).toEqual(["My Endpoint"]);
    });

    it("lists a keyed custom endpoint that cannot be read now with models unknown and the reason (REQ-007)", async () => {
      const endpoint = async (answer: () => Promise<LocalProviderModelCatalogSnapshot>) => (await providersOf({
        stepCaps: { ...AVAILABLE_AGENT_RUNTIMES_STEP_CAPS, providerModelsMs: 150 },
        reload: async (id) => id === "custom-endpoint" ? answer() : snapshot([]),
      })).find((provider) => provider.provider === "My Endpoint")!.models;
      expect(await endpoint(async () => snapshot([], "ERROR", "MODEL_DISCOVERY_UNAVAILABLE")))
        .toBe("unknown: My Endpoint model list could not be read: MODEL_DISCOVERY_UNAVAILABLE");
      expect(await endpoint(async () => snapshot(DISCOVERED_MODELS["custom-endpoint"]!, "STALE_ERROR", "CUSTOM_PROVIDER_PROBE_FAILED")))
        .toBe("unknown: My Endpoint model list could not be read: CUSTOM_PROVIDER_PROBE_FAILED");
      expect(await endpoint(() => neverSettles())).toBe("unknown: My Endpoint model list timed out");
      expect(await endpoint(async () => { throw new Error("CUSTOM_PROVIDER_NOT_FOUND"); })).toBe("unknown: My Endpoint model list could not be read");
      expect(await endpoint(async () => snapshot([]))).toBe("unknown: My Endpoint model list could not be read: the endpoint listed no models");
    });

    it("keeps static keyed providers on the catalog, without a reload", async () => {
      const reload = vi.fn(async () => snapshot([]));
      const providers = autobyteus((await service({ strategies: [], reload, providerSettings: settings([[LLMProvider.OPENAI, "OpenAI", true]]) })
        .read()).agentRuntimes as unknown[]).providers;
      expect(providers).toEqual([{ provider: "OpenAI", limits: "not reported", models: [{ id: "gpt-6", name: "GPT-6" }] }]);
      expect(reload).not.toHaveBeenCalled();
    });
  });

  it("a step stopped by its own deadline is 'timed out' even with 1 ms still left on the wall clock (CR-002)", async () => {
    const realNow = Date.now.bind(Date);
    let pinned: number | null = null;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => pinned ?? realNow());
    try {
      const report = await service({
        strategies: [strategy(RuntimeKind.ANTIGRAVITY_CLI)],
        stepCaps: { ...AVAILABLE_AGENT_RUNTIMES_STEP_CAPS, modelsMs: 100 },
        catalog: async (kind, options) => {
          if (kind !== RuntimeKind.ANTIGRAVITY_CLI) return MODELS[kind]!;
          // The deadline's own kill fires while Date.now() still reads 1 ms before the end (API-03b).
          await new Promise((done) => setTimeout(done, 100));
          pinned = options.deadline!.endsAt - 1;
          throw new Error("AGY_MODEL_DISCOVERY_TIMEOUT", { cause: new DeadlineExceededError() });
        },
      }).read();
      expect(external(report.agentRuntimes as unknown[], "antigravity_cli")!.models).toBe("unknown: Antigravity CLI model list timed out");
    } finally {
      clock.mockRestore();
    }
  });

  it("the default caps keep the whole answer within 20 s (REQ-010)", () => {
    const caps = AVAILABLE_AGENT_RUNTIMES_STEP_CAPS;
    const backstops = 3 * 500;
    expect(caps.installMs + caps.signInMs + Math.max(caps.modelsMs, caps.limitsMs) + backstops).toBeLessThanOrEqual(20_000);
    expect(caps.providerListMs + Math.max(caps.providerModelsMs, caps.providerUsageMs) + 2 * 500).toBeLessThanOrEqual(20_000);
  });

  it("the answer carries no keys, emails or account identities (AC-009)", async () => {
    const leaky = strategy(RuntimeKind.CLAUDE_AGENT_SDK, {
      readSignIn: async () => ({ state: "unknown", detail: "user someone@example.com account 1234-abcd token sk-ant-secret" }),
    });
    const report = await service({
      strategies: [leaky],
      catalog: async (kind) => { if (kind === RuntimeKind.CLAUDE_AGENT_SDK) throw new Error("sk-ant-secret"); return MODELS[kind]!; },
    }).read();
    const text = JSON.stringify(report);
    for (const secret of ["sk-ant-secret", "someone@example.com", "1234-abcd", "account", "accountId", "email"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("starts nothing else for a runtime it leaves out", async () => {
    const readUsageLimits = vi.fn(async () => ({ state: "not_reported" }) as UsageLimitsReading);
    const catalog = vi.fn(async (kind: string) => MODELS[kind]!);
    await service({ strategies: [strategy(RuntimeKind.CODEX_APP_SERVER, {
      readSignIn: async () => ({ state: "signedOut", detail: "no logged-in account." }), readUsageLimits,
    })], catalog }).read();
    expect(readUsageLimits).not.toHaveBeenCalled();
    expect(catalog.mock.calls.map(([kind]) => kind)).toEqual([RuntimeKind.AUTOBYTEUS]);
  });
});
