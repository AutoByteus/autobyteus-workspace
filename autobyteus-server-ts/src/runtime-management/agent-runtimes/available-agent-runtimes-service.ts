import os from "node:os";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import type { LlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import type { ProviderCredentialSetting } from "../../llm-management/llm-providers/domain/models.js";
import type { ProviderUsageReading } from "../../llm-management/provider-usage/provider-usage-reader.js";
import type { ProviderUsageReaders } from "../../llm-management/provider-usage/provider-usage-readers.js";
import { createReadDeadline, timeLeft, type ReadDeadline } from "../read-deadline.js";
import { RuntimeKind } from "../runtime-kind-enum.js";
import type { AgentRuntimeSignInReader } from "./agent-runtime-sign-in-reader.js";
import type { AgentRuntimeStrategy } from "./agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "./agent-runtime-types.js";
import type {
  AutoByteusEntry, AutoByteusProviderEntry, AvailableAgentRuntimeEntry, AvailableAgentRuntimesReport, AvailableModel,
  ExternalAgentRuntimeEntry, UsageLimitView,
} from "./available-agent-runtimes-report.js";
import { resolveLimitCoverage } from "./usage-limits/usage-limit-model-matching.js";
import type { RuntimeUsageLimit, UsageLimitsReading } from "./usage-limits/usage-limits-reading.js";

/**
 * Each runtime's steps run within fixed caps (REQ-010): install 4 s → sign-in 6 s → models ‖ limits 8 s each, 18 s
 * at most; AutoByteus: its provider list 4 s → every keyed provider's usage 8 s, in parallel.
 */
export type AvailableAgentRuntimesStepCaps = Readonly<{
  installMs: number;
  signInMs: number;
  modelsMs: number;
  limitsMs: number;
  providerListMs: number;
  providerUsageMs: number;
}>;

export const AVAILABLE_AGENT_RUNTIMES_STEP_CAPS: AvailableAgentRuntimesStepCaps = Object.freeze({
  installMs: 4_000, signInMs: 6_000, modelsMs: 8_000, limitsMs: 8_000, providerListMs: 4_000, providerUsageMs: 8_000,
});

/** A step that ignores its deadline still ends here, and is recorded as timed out. */
const BACKSTOP_MS = 500;

const RUNTIME_NAMES: Readonly<Record<AgentRuntimeKind, string>> = {
  [RuntimeKind.CODEX_APP_SERVER]: "Codex",
  [RuntimeKind.CLAUDE_AGENT_SDK]: "Claude",
  [RuntimeKind.ANTIGRAVITY_CLI]: "Antigravity",
  [RuntimeKind.GROK_BUILD]: "Grok",
};

/** Local model servers have no key: they are usable when they offer models. */
const LOCAL_PROVIDERS: ReadonlySet<string> = new Set([LLMProvider.OLLAMA, LLMProvider.LMSTUDIO]);

export type AvailableAgentRuntimesServiceDependencies = Readonly<{
  strategies: readonly AgentRuntimeStrategy[];
  signInReader: Pick<AgentRuntimeSignInReader, "read">;
  modelCatalog: Pick<ModelCatalogService, "runtimeModelSelectionCatalog">;
  providerCredentials: Pick<LlmProviderService, "listProviderCredentialSettings">;
  providerUsageReaders: ProviderUsageReaders;
  /** The folder runtimes read their config from (Codex); the home folder by default. */
  homeDirectory?: string;
  stepCaps?: AvailableAgentRuntimesStepCaps;
}>;

type StepOutcome<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; timedOut: boolean }>;

/** Runs one step within its cap: the step gets the deadline (so its processes stop); a backstop ends it regardless. */
const runStep = async <T>(capMs: number, work: (deadline: ReadDeadline) => Promise<T>): Promise<StepOutcome<T>> => {
  const deadline = createReadDeadline(capMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const backstop = new Promise<StepOutcome<T>>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, timedOut: true }), capMs + BACKSTOP_MS);
  });
  try {
    return await Promise.race([
      work(deadline).then(
        (value): StepOutcome<T> => ({ ok: true, value }),
        (): StepOutcome<T> => ({ ok: false, timedOut: timeLeft(deadline) === 0 }),
      ),
      backstop,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const toAvailableModel = (model: ModelInfo): AvailableModel => ({
  id: model.model_identifier,
  name: model.display_name,
  ...(typeof model.max_context_tokens === "number" && model.max_context_tokens > 0 ? { contextTokens: model.max_context_tokens } : {}),
});

/** A model is blocked by the exhausted limits covering it: until the latest reset (unknown → null), by that limit. */
const blockByLimits = (models: readonly AvailableModel[], limits: readonly RuntimeUsageLimit[]): AvailableModel[] => {
  const exhausted = limits.filter((limit) => limit.exhausted);
  if (!exhausted.length) return [...models];
  const coverage = resolveLimitCoverage(exhausted, models);
  return models.map((model) => {
    const blocking = exhausted.filter((limit) => coverage.get(limit)?.has(model.id));
    if (!blocking.length) return model;
    const last = blocking.reduce((latest, limit) =>
      latest.resetsAt === null || (limit.resetsAt !== null && limit.resetsAt <= latest.resetsAt) ? latest : limit);
    return { ...model, blocked: { until: last.resetsAt, by: last.name } };
  });
};

const toLimitViews = (limits: readonly RuntimeUsageLimit[]): UsageLimitView[] =>
  limits.map(({ name, remainingPercent, resetsAt }) => ({ name, remainingPercent, resetsAt }));

/**
 * "What can run on this node now": per agent runtime whether it is installed and not known to be signed out, its
 * offered models and its live usage limits, read with 0 tokens; per keyed AutoByteus provider its models and usage.
 * Owns the step order and caps, the available rule and the `signIn: "not checked"` mark, the failure entries (REQ-007),
 * and each model's `blocked`.
 * Stateless: every read asks the runtimes and providers again.
 */
export class AvailableAgentRuntimesService {
  private readonly caps: AvailableAgentRuntimesStepCaps;
  private readonly homeDirectory: string;

  constructor(private readonly dependencies: AvailableAgentRuntimesServiceDependencies) {
    this.caps = dependencies.stepCaps ?? AVAILABLE_AGENT_RUNTIMES_STEP_CAPS;
    this.homeDirectory = dependencies.homeDirectory ?? os.homedir();
  }

  async read(): Promise<AvailableAgentRuntimesReport> {
    const checkedAt = new Date().toISOString();
    const entries = await Promise.all([
      ...this.dependencies.strategies.map((strategy) => this.readExternalRuntime(strategy)),
      this.readAutoByteus(),
    ]);
    return { checkedAt, agentRuntimes: entries.filter((entry): entry is AvailableAgentRuntimeEntry => entry !== null) };
  }

  /** install → sign-in → models ‖ limits; null when not installed or signed out. */
  private async readExternalRuntime(strategy: AgentRuntimeStrategy): Promise<ExternalAgentRuntimeEntry | null> {
    const kind = strategy.runtimeKind;
    const name = RUNTIME_NAMES[kind];
    let executable: string;
    try {
      executable = strategy.resolveExecutable();
    } catch {
      return null;
    }
    // Installed: the Agent Runtimes page's rule; a failed or timed-out check counts as not installed (REQ-007).
    const install = await runStep(this.caps.installMs, (deadline) => strategy.readVersion(executable, { deadline }));
    if (!install.ok || install.value === null) return null;
    // The sign-in step ends (and Codex releases its app-server lease) before models and limits start.
    const signIn = await runStep(this.caps.signInMs, (deadline) =>
      this.dependencies.signInReader.read(kind, { cwd: this.homeDirectory, deadline }));
    if (signIn.ok && signIn.value.state === "signedOut") return null;
    const signInUnknown = !signIn.ok || signIn.value.state === "unknown";
    const [models, limits] = await Promise.all([
      runStep(this.caps.modelsMs, (deadline) =>
        this.dependencies.modelCatalog.runtimeModelSelectionCatalog(kind, this.homeDirectory, { deadline })),
      runStep(this.caps.limitsMs, (deadline) => strategy.readUsageLimits(executable, this.homeDirectory, { deadline })),
    ]);
    const limitsReading: UsageLimitsReading = limits.ok
      ? limits.value
      : { state: "unknown", reason: `${name} usage limits ${limits.timedOut ? "timed out" : "could not be read"}` };
    return {
      runtime: kind,
      name,
      ...(signInUnknown ? { signIn: "not checked" as const } : {}),
      limits: limitsReading.state === "read" ? toLimitViews(limitsReading.limits)
        : limitsReading.state === "not_reported" ? "not reported" : `unknown: ${limitsReading.reason}`,
      ...(limitsReading.state === "read" && limitsReading.note ? { limitsNote: limitsReading.note } : {}),
      models: this.modelsEntry(name, models, limitsReading),
    };
  }

  private modelsEntry(
    name: string,
    models: StepOutcome<Awaited<ReturnType<ModelCatalogService["runtimeModelSelectionCatalog"]>>>,
    limits: UsageLimitsReading,
  ): ExternalAgentRuntimeEntry["models"] {
    if (!models.ok) return `unknown: ${name} model list ${models.timedOut ? "timed out" : "could not be read"}`;
    // An available runtime always offers a model: an empty list is a failed read, not "no models".
    if (!models.value.offeredModels.length) return "unknown: no models could be read";
    const available = models.value.offeredModels.map(toAvailableModel);
    return limits.state === "read" ? blockByLimits(available, limits.limits) : available;
  }

  /** Providers with a key (or local providers with models), each with its models and usage; null when unlisted. */
  private async readAutoByteus(): Promise<AutoByteusEntry | null> {
    const listing = await runStep(this.caps.providerListMs, () => Promise.all([
      this.dependencies.providerCredentials.listProviderCredentialSettings(RuntimeKind.AUTOBYTEUS),
      this.dependencies.modelCatalog.runtimeModelSelectionCatalog(RuntimeKind.AUTOBYTEUS),
    ]));
    if (!listing.ok) {
      console.warn(`Available agent runtimes: AutoByteus providers could not be listed (${listing.timedOut ? "timed out" : "failed"}).`);
      return null;
    }
    const [settings, catalog] = listing.value;
    const providers = await Promise.all(settings.map((setting) => this.readProvider(setting, catalog.offeredModels)));
    return {
      runtime: "autobyteus",
      name: "AutoByteus",
      providers: providers.filter((provider): provider is AutoByteusProviderEntry => provider !== null),
    };
  }

  private async readProvider(
    setting: ProviderCredentialSetting,
    allModels: readonly ModelInfo[],
  ): Promise<AutoByteusProviderEntry | null> {
    const provider = setting.provider;
    const models = allModels.filter((model) => model.provider_id === provider.id);
    const available = LOCAL_PROVIDERS.has(provider.id) ? models.length > 0 : setting.apiKeyConfigured;
    if (!available) return null;
    const reader = this.dependencies.providerUsageReaders.readerFor(provider.id);
    const usage = reader
      ? await runStep(this.caps.providerUsageMs, (deadline) =>
        reader.read(provider, models, { signal: AbortSignal.timeout(Math.max(1, timeLeft(deadline))) }))
      : null;
    const reading: ProviderUsageReading = !usage ? { state: "not_reported" }
      : usage.ok ? usage.value
        : { state: "unknown", reason: usage.timedOut ? "timed out" : "could not be read" };
    const blocked = reading.state === "read" ? reading.blockedReason : null;
    return {
      provider: provider.name,
      ...(reading.state === "read" && reading.balance ? { balance: `${reading.balance.amount} ${reading.balance.currency}` } : {}),
      ...(blocked ? { blocked } : {}),
      ...(reading.state === "not_reported" ? { limits: "not reported" as const }
        : reading.state === "unknown" ? { limits: `unknown: ${reading.reason}` as const } : {}),
      models: models.map(toAvailableModel).map((model) => blocked ? { ...model, blocked: { until: null, by: blocked } } : model),
    };
  }
}

let configuredService: AvailableAgentRuntimesService | null = null;

/** Binds the node's service for the tool and GraphQL until `close()` (the server composition). */
export const configureAvailableAgentRuntimesService = (
  service: AvailableAgentRuntimesService,
): Readonly<{ close(): void }> => {
  if (configuredService) throw new Error("The available agent runtimes service is already configured.");
  configuredService = service;
  return Object.freeze({ close: () => { if (configuredService === service) configuredService = null; } });
};

/** The bound service; null on a server that does not compose it. */
export const findAvailableAgentRuntimesService = (): AvailableAgentRuntimesService | null => configuredService;
