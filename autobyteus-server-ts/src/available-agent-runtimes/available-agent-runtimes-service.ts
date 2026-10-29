import os from "node:os";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelCatalogService } from "../llm-management/services/model-catalog-service.js";
import type { LlmProviderService } from "../llm-management/llm-providers/services/llm-provider-service.js";
import type { ProviderCredentialSetting } from "../llm-management/llm-providers/domain/models.js";
import { ProviderUsageUnreadableError, type ProviderUsageReading } from "../llm-management/provider-usage/provider-usage-reader.js";
import type { ProviderUsageReaders } from "../llm-management/provider-usage/provider-usage-readers.js";
import {
  createReadDeadline, DeadlineExceededError, isDeadlineExceeded, raceDeadline, timeLeft, type ReadDeadline,
} from "../runtime-management/read-deadline.js";
import { RuntimeKind } from "../runtime-management/runtime-kind-enum.js";
import type { AgentRuntimeSignInReader } from "../runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import type { AgentRuntimeStrategy, RuntimeClientHold } from "../runtime-management/agent-runtimes/agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "../runtime-management/agent-runtimes/agent-runtime-types.js";
import type {
  AutoByteusEntry, AutoByteusProviderEntry, AvailableAgentRuntimeEntry, AvailableAgentRuntimesReport, AvailableModel,
  ExternalAgentRuntimeEntry, NodeRuntimesReading, UnknownText, UsageLimitView,
} from "./available-agent-runtimes-report.js";
import { resolveLimitCoverage } from "./usage-limit-model-matching.js";
import {
  UsageLimitsUnreadableError, type RuntimeUsageLimit, type UsageLimitsReading,
} from "../runtime-management/agent-runtimes/usage-limits/usage-limits-reading.js";

/**
 * Each runtime's steps run within fixed caps (REQ-010): install 4 s → sign-in 6 s → models ‖ limits 8 s each, 18 s
 * at most; AutoByteus: its provider list 4 s → per provider its discovered models ‖ its usage, 8 s each, all providers
 * in parallel.
 */
export type AvailableAgentRuntimesStepCaps = Readonly<{
  installMs: number;
  signInMs: number;
  modelsMs: number;
  limitsMs: number;
  providerListMs: number;
  providerModelsMs: number;
  providerUsageMs: number;
}>;

export const AVAILABLE_AGENT_RUNTIMES_STEP_CAPS: AvailableAgentRuntimesStepCaps = Object.freeze({
  installMs: 4_000, signInMs: 6_000, modelsMs: 8_000, limitsMs: 8_000,
  providerListMs: 4_000, providerModelsMs: 8_000, providerUsageMs: 8_000,
});

/** A step that ignores its deadline still ends here, and is recorded as timed out. */
const BACKSTOP_MS = 500;

/** Local model servers have no key: they are usable when they answer with models now. */
const LOCAL_PROVIDERS: ReadonlySet<string> = new Set([LLMProvider.OLLAMA, LLMProvider.LMSTUDIO]);

/** A discovered source whose last discovery failed (`STALE_ERROR` keeps the previous rows): it did not answer now. */
const FAILED_SOURCE_STATES: ReadonlySet<string> = new Set(["ERROR", "STALE_ERROR"]);

/** One provider's models for this read: read now, or the REQ-007 text saying why not. */
type ProviderModels = Readonly<{ state: "read"; models: readonly ModelInfo[] }> | Readonly<{ state: "unknown"; text: UnknownText }>;

export type AvailableAgentRuntimesServiceDependencies = Readonly<{
  strategies: readonly AgentRuntimeStrategy[];
  signInReader: Pick<AgentRuntimeSignInReader, "read">;
  modelCatalog: Pick<ModelCatalogService, "runtimeModelSelectionCatalog" | "reloadProviderModelCatalog">;
  providerCredentials: Pick<LlmProviderService, "listProviderCredentialSettings">;
  providerUsageReaders: ProviderUsageReaders;
  /** The folder runtimes read their config from (Codex); the home folder by default. */
  homeDirectory?: string;
  stepCaps?: AvailableAgentRuntimesStepCaps;
}>;

type StepOutcome<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: unknown }>;

/** Runs one step within its cap: the step gets the deadline (so its processes stop); a backstop ends it regardless. */
const runStep = async <T>(capMs: number, work: (deadline: ReadDeadline) => Promise<T>): Promise<StepOutcome<T>> => {
  const deadline = createReadDeadline(capMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const backstop = new Promise<StepOutcome<T>>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, error: new DeadlineExceededError() }), capMs + BACKSTOP_MS);
  });
  try {
    return await Promise.race([
      work(deadline).then(
        (value): StepOutcome<T> => ({ ok: true, value }),
        (error: unknown): StepOutcome<T> => ({ ok: false, error }),
      ),
      backstop,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/** A provider reader's abort signal ended the request (`AbortSignal.timeout`). */
const isAbortTimeout = (error: unknown): boolean => (error as { name?: unknown } | null)?.name === "TimeoutError";

/**
 * The one wording of a failed step (REQ-007, SR-007): "<subject> timed out" when the step's deadline (or a reader's
 * time-out signal) ended it; "<subject> could not be read: <reason>" for an answer a reader classified as unusable;
 * otherwise "<subject> could not be read". The error's own text (vendor output, a key, a path) is never kept.
 */
const failureText = (subject: string, error: unknown): UnknownText => {
  if (isDeadlineExceeded(error) || isAbortTimeout(error)) return `unknown: ${subject} timed out`;
  if (error instanceof UsageLimitsUnreadableError || error instanceof ProviderUsageUnreadableError) {
    return unreadableText(subject, error.reason);
  }
  return `unknown: ${subject} could not be read`;
};

/** "<subject> could not be read: <reason>", for a classified reason (a reader's, or a discovered source's state). */
const unreadableText = (subject: string, reason: string): UnknownText => `unknown: ${subject} could not be read: ${reason}`;

const toAvailableModel = (model: ModelInfo): AvailableModel => ({
  id: model.model_identifier,
  name: model.display_name,
  ...(typeof model.max_context_tokens === "number" && model.max_context_tokens > 0 ? { contextTokens: model.max_context_tokens } : {}),
});

/**
 * A model is blocked by the exhausted limits covering it: until the latest reset (unknown → null), by that limit.
 * Coverage is resolved over all of the runtime's limits first (the most specific family wins among every limit, SR-007),
 * and only then do the exhausted ones block.
 */
const blockByLimits = (models: readonly AvailableModel[], limits: readonly RuntimeUsageLimit[]): AvailableModel[] => {
  const exhausted = limits.filter((limit) => limit.exhausted);
  if (!exhausted.length) return [...models];
  const coverage = resolveLimitCoverage(limits, models);
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
  /** The read in progress, shared by every caller until it and its client releases settle (single-flight, SR-006). */
  private inProgress: Promise<NodeRuntimesReading> | null = null;

  constructor(private readonly dependencies: AvailableAgentRuntimesServiceDependencies) {
    this.caps = dependencies.stepCaps ?? AVAILABLE_AGENT_RUNTIMES_STEP_CAPS;
    this.homeDirectory = dependencies.homeDirectory ?? os.homedir();
  }

  /**
   * The node's report, read fresh. Concurrent callers (several agents' tool calls, the page) share the read in
   * progress, so their runtime processes never overlap. The answer resolves as soon as it is complete; the read stays
   * the one in progress until its client holds are released, so a following read never meets this read's closing
   * Codex client (CR-004).
   */
  async read(): Promise<AvailableAgentRuntimesReport> {
    return (await this.readWithSignIn()).report;
  }

  /**
   * The same read, with the runtimes it found installed but signed out (left out of the report). The launch usability
   * rule reads it for U3 "signed out" (autobyteus-32), so that fact is stated, never inferred from a runtime's absence.
   */
  readWithSignIn(): Promise<NodeRuntimesReading> {
    if (this.inProgress) return this.inProgress;
    const releases: Promise<void>[] = [];
    const answer = this.readOnce(releases);
    this.inProgress = answer;
    void answer.catch(() => undefined)
      .then(() => Promise.allSettled(releases))
      .finally(() => { if (this.inProgress === answer) this.inProgress = null; });
    return answer;
  }

  private async readOnce(releases: Promise<void>[]): Promise<NodeRuntimesReading> {
    const checkedAt = new Date().toISOString();
    const signedOut = new Set<AgentRuntimeKind>();
    const entries = await Promise.all([
      ...this.dependencies.strategies.map((strategy) => this.readExternalRuntime(strategy, releases, signedOut)),
      this.readAutoByteus(),
    ]);
    return {
      report: { checkedAt, agentRuntimes: entries.filter((entry): entry is AvailableAgentRuntimeEntry => entry !== null) },
      signedOutRuntimes: signedOut,
    };
  }

  /**
   * install → sign-in → models ‖ limits; null when not installed or signed out. After the install step the runtime's
   * shared client (Codex) is held for the rest of this runtime's steps, so they start it once; the hold's release is
   * added to `releases`.
   */
  private async readExternalRuntime(
    strategy: AgentRuntimeStrategy,
    releases: Promise<void>[],
    signedOut: Set<AgentRuntimeKind>,
  ): Promise<ExternalAgentRuntimeEntry | null> {
    let executable: string;
    try {
      executable = strategy.resolveExecutable();
    } catch {
      return null;
    }
    // Installed: the Agent Runtimes page's rule; a failed or timed-out check counts as not installed (REQ-007).
    const install = await runStep(this.caps.installMs, (deadline) => strategy.readVersion(executable, { deadline }));
    if (!install.ok || install.value === null) return null;
    const hold = this.holdClient(strategy);
    try {
      return await this.readInstalledRuntime(strategy, executable, signedOut);
    } finally {
      if (hold) releases.push(hold.release().catch(() => undefined));
    }
  }

  /** The runtime's shared client held for this read; null when it has none, or it cannot be held now (REQ-007 then). */
  private holdClient(strategy: AgentRuntimeStrategy): RuntimeClientHold | null {
    try {
      return strategy.holdClient?.(this.homeDirectory) ?? null;
    } catch {
      return null;
    }
  }

  private async readInstalledRuntime(
    strategy: AgentRuntimeStrategy,
    executable: string,
    signedOut: Set<AgentRuntimeKind>,
  ): Promise<ExternalAgentRuntimeEntry | null> {
    const kind = strategy.runtimeKind;
    const name = agentRuntimeName(kind);
    const signIn = await runStep(this.caps.signInMs, (deadline) =>
      this.dependencies.signInReader.read(kind, { cwd: this.homeDirectory, deadline }));
    if (signIn.ok && signIn.value.state === "signedOut") {
      signedOut.add(kind);
      return null;
    }
    const signInUnknown = !signIn.ok || signIn.value.state === "unknown";
    const [models, limits] = await Promise.all([
      runStep(this.caps.modelsMs, (deadline) =>
        this.dependencies.modelCatalog.runtimeModelSelectionCatalog(kind, this.homeDirectory, { deadline })),
      runStep(this.caps.limitsMs, (deadline) => strategy.readUsageLimits(executable, this.homeDirectory, { deadline })),
    ]);
    const limitsReading: UsageLimitsReading | null = limits.ok ? limits.value : null;
    return {
      runtime: kind,
      name,
      ...(signInUnknown ? { signIn: "not checked" as const } : {}),
      limits: !limits.ok ? failureText(`${name} usage limits`, limits.error)
        : limits.value.state === "read" ? toLimitViews(limits.value.limits) : "not reported",
      ...(limitsReading?.state === "read" && limitsReading.note ? { limitsNote: limitsReading.note } : {}),
      models: this.modelsEntry(name, models, limitsReading),
    };
  }

  private modelsEntry(
    name: string,
    models: StepOutcome<Awaited<ReturnType<ModelCatalogService["runtimeModelSelectionCatalog"]>>>,
    limits: UsageLimitsReading | null,
  ): ExternalAgentRuntimeEntry["models"] {
    if (!models.ok) return failureText(`${name} model list`, models.error);
    // An available runtime always offers a model: an empty list is a failed read, not "no models".
    if (!models.value.offeredModels.length) return "unknown: no models could be read";
    const available = models.value.offeredModels.map(toAvailableModel);
    return limits?.state === "read" ? blockByLimits(available, limits.limits) : available;
  }

  /**
   * Providers with a key, and local providers that answer with models, each with its models and usage; null when the
   * providers cannot be listed. Discovered providers (local servers, custom endpoints) are asked afresh (CR-003).
   */
  private async readAutoByteus(): Promise<AutoByteusEntry | null> {
    const listing = await runStep(this.caps.providerListMs, () => Promise.all([
      this.dependencies.providerCredentials.listProviderCredentialSettings(RuntimeKind.AUTOBYTEUS),
      this.dependencies.modelCatalog.runtimeModelSelectionCatalog(RuntimeKind.AUTOBYTEUS),
    ]));
    if (!listing.ok) {
      console.warn(`Available agent runtimes: AutoByteus providers could not be listed (${isDeadlineExceeded(listing.error) ? "timed out" : "failed"}).`);
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

  /**
   * One provider, by kind: static keyed → its catalog models; discovered local (Ollama, LM Studio) → listed only when its
   * reload answers with models now; discovered keyed (custom endpoint) → listed, its models read now or `unknown`.
   * Its models and its usage are read in parallel.
   */
  private async readProvider(
    setting: ProviderCredentialSetting,
    staticModels: readonly ModelInfo[],
  ): Promise<AutoByteusProviderEntry | null> {
    const provider = setting.provider;
    const local = LOCAL_PROVIDERS.has(provider.id);
    if (!local && !setting.apiKeyConfigured) return null;
    const discovered = provider.catalogMode === "DISCOVERED";
    const catalogModels = staticModels.filter((model) => model.provider_id === provider.id);
    const reader = this.dependencies.providerUsageReaders.readerFor(provider.id);
    const [modelsRead, usage] = await Promise.all([
      discovered
        ? this.readDiscoveredModels(provider.name, provider.id)
        : Promise.resolve<ProviderModels>({ state: "read", models: catalogModels }),
      reader
        ? runStep(this.caps.providerUsageMs, (deadline) =>
          reader.read(provider, catalogModels, { signal: AbortSignal.timeout(Math.max(1, timeLeft(deadline))) }))
        : Promise.resolve(null),
    ]);
    // A local server that does not answer with models now cannot run anything: left out, like a missing runtime.
    if (local && (modelsRead.state !== "read" || !modelsRead.models.length)) return null;
    const reading: ProviderUsageReading | null = !usage ? { state: "not_reported" } : usage.ok ? usage.value : null;
    const blocked = reading?.state === "read" ? reading.blockedReason : null;
    return {
      provider: provider.name,
      ...(reading?.state === "read" && reading.balance ? { balance: `${reading.balance.amount} ${reading.balance.currency}` } : {}),
      ...(blocked ? { blocked } : {}),
      ...(usage && !usage.ok ? { limits: failureText(`${provider.name} usage`, usage.error) }
        : reading?.state === "not_reported" ? { limits: "not reported" as const } : {}),
      models: providerModelsEntry(modelsRead, blocked),
    };
  }

  /**
   * A discovered provider's models now, through the catalog's own reload (which also refreshes the shared catalog).
   * A reload that failed now (source `ERROR` / `STALE_ERROR`) gives the source's safe message; one that answered with
   * no model is a failed read, never "no models" (REQ-007).
   */
  private async readDiscoveredModels(providerName: string, providerId: string): Promise<ProviderModels> {
    const subject = `${providerName} model list`;
    const reload = await runStep(this.caps.providerModelsMs, (deadline) => raceDeadline(
      this.dependencies.modelCatalog.reloadProviderModelCatalog(providerId, RuntimeKind.AUTOBYTEUS), deadline));
    if (!reload.ok) return { state: "unknown", text: failureText(subject, reload.error) };
    const failed = reload.value.sources.find((source) => FAILED_SOURCE_STATES.has(source.state));
    if (failed) return { state: "unknown", text: unreadableText(subject, failed.safeMessage ?? "discovery failed") };
    if (!reload.value.llmModels.length) return { state: "unknown", text: unreadableText(subject, "the endpoint listed no models") };
    return { state: "read", models: reload.value.llmModels };
  }
}

/** A provider entry's models, blocked with the provider's reason when it cannot run. */
const providerModelsEntry = (read: ProviderModels, blocked: string | null): AutoByteusProviderEntry["models"] =>
  read.state === "unknown" ? read.text
    : read.models.map(toAvailableModel).map((model) => blocked ? { ...model, blocked: { until: null, by: blocked } } : model);

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
