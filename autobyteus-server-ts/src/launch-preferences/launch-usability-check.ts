import type { AgentLaunchConfiguration } from "../agent-team-execution/domain/team-run-config.js";
import type { LaunchConfigurationFallbackReason } from "../agent-collaboration/domain/launch-configuration-source.js";
import type {
  AvailableModel,
  NodeRuntimesReading,
} from "../available-agent-runtimes/available-agent-runtimes-report.js";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type {
  RunModelSelectionValidationResult,
  RunModelSelectionValidator,
} from "../llm-management/services/run-model-selection-service.js";
import type { RuntimeAvailabilityService } from "../runtime-management/runtime-availability-service.js";
import type { RuntimeKind } from "../runtime-management/runtime-kind-enum.js";
import type { DefaultLaunchConfig } from "./default-launch-config.js";

/** Where a candidate takes its workspace and auto-approve from. */
export type LaunchUsabilityContext = Readonly<{ workspaceRootPath: string | null; autoExecuteTools: boolean }>;

/**
 * A candidate's verdict: its complete launch; or, with the node's facts given, a runtime-only default whose runtime is
 * usable (the Model Router then chooses a model on it, supplement § 3.2); or why it cannot be used.
 */
export type LaunchVerdict =
  | Readonly<{ usable: true; launch: AgentLaunchConfiguration }>
  | Readonly<{ usable: "runtime_only"; runtimeKind: string }>
  | Readonly<{ usable: false; reason: LaunchConfigurationFallbackReason; detail: string }>;

export type LaunchUsabilityResult = Readonly<{
  /** One per candidate, in order. */
  verdicts: readonly LaunchVerdict[];
  /** The inherited launch's model-check failure; null when it is usable or there is none. */
  inheritedFailure: string | null;
}>;

/** An exact error a batch check raises when the model check itself could not run. */
export class LaunchModelCheckError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "LaunchModelCheckError";
  }
}

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

const incompleteDetail = (value: DefaultLaunchConfig): string => !value.runtimeKind && !value.llmModelIdentifier
  ? "It names neither a runtime nor a model."
  : !value.runtimeKind ? "It names no runtime." : "It names no model.";

/** Today's runnability wording for a model check that did not pass (kept identical for the inherited layer). */
export const invalidModelMessage = (launch: AgentLaunchConfiguration, result: RunModelSelectionValidationResult | undefined): string =>
  !result ? "Its model could not be checked."
    : result.kind === "model_unavailable" ? `The model '${launch.llmModelIdentifier}' is not available on ${agentRuntimeName(launch.runtimeKind)}.`
      : result.kind === "schema_unavailable" ? `The settings of model '${launch.llmModelIdentifier}' could not be checked.`
        : result.kind === "invalid" ? `Its model settings are invalid: ${result.errors.map((error) => error.message).join("; ")}`
          : "";

/** "2026-10-30 20:57 UTC" for an ISO time; the text itself when it is not one. */
export const formatBlockTime = (iso: string): string => {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? `${new Date(time).toISOString().slice(0, 16).replace("T", " ")} UTC` : iso;
};

/** U4b's wording: "<model> is blocked until <time> (<limit>)." */
export const blockedDetail = (model: string, blocked: NonNullable<AvailableModel["blocked"]>): string =>
  blocked.until ? `${model} is blocked until ${formatBlockTime(blocked.until)} (${blocked.by}).` : `${model} is blocked (${blocked.by}).`;

/** The model `llmModelIdentifier` of `runtimeKind` in the node's report, when it lists it. */
export const reportedModel = (facts: NodeRuntimesReading, runtimeKind: string, llmModelIdentifier: string): AvailableModel | null => {
  for (const entry of facts.report.agentRuntimes) {
    if (entry.runtime !== runtimeKind) continue;
    const models = "providers" in entry
      ? entry.providers.flatMap((provider) => typeof provider.models === "string" ? [] : provider.models)
      : typeof entry.models === "string" ? [] : entry.models;
    return models.find((model) => model.id === llmModelIdentifier) ?? null;
  }
  return null;
};

/**
 * The one owner of "is this runtime/model usable on this node now" for delegated launches (supplement § 2): U1
 * complete, U2 available (each distinct runtime checked once, concurrently), U3 signed in, U4 offered and U5 settings
 * valid (one `validateMany` over the inherited launch and every remaining candidate, which shares the catalog
 * evidence, QR-001), U4b not blocked by a used-up limit. U3 and U4b come from the node's runtime facts and apply only
 * when they are given (Model Routing on, DEC-022); without them the check is today's. The inherited launch keeps
 * today's model check only.
 */
export class LaunchUsabilityCheck {
  constructor(private readonly dependencies: Readonly<{
    availability: Pick<RuntimeAvailabilityService, "getRuntimeAvailability">;
    validator: RunModelSelectionValidator;
  }>) {}

  /** Throws `LaunchModelCheckError` when the model check could not run at all. */
  async check(input: Readonly<{
    candidates: readonly DefaultLaunchConfig[];
    context: LaunchUsabilityContext;
    inherited: AgentLaunchConfiguration | null;
    facts: NodeRuntimesReading | null;
  }>): Promise<LaunchUsabilityResult> {
    const verdicts: (LaunchVerdict | null)[] = input.candidates.map(() => null);
    const launches = new Map<number, AgentLaunchConfiguration>();
    const runtimeOnly = new Map<number, string>();
    input.candidates.forEach((value, index) => {
      const { runtimeKind, llmModelIdentifier, llmConfig } = value;
      if (runtimeKind && !llmModelIdentifier && input.facts) {
        runtimeOnly.set(index, runtimeKind);
        return;
      }
      if (!runtimeKind || !llmModelIdentifier) {
        verdicts[index] = Object.freeze({ usable: false, reason: "incomplete", detail: incompleteDetail(value) });
        return;
      }
      launches.set(index, Object.freeze({
        runtimeKind: runtimeKind as RuntimeKind,
        llmModelIdentifier,
        llmConfig: llmConfig ? structuredClone(llmConfig) : null,
        autoExecuteTools: input.context.autoExecuteTools,
        workspaceRootPath: input.context.workspaceRootPath,
      }));
    });
    const unavailable = await this.unavailableRuntimes([
      ...new Set([...[...launches.values()].map((launch) => launch.runtimeKind), ...runtimeOnly.values()]),
    ] as RuntimeKind[]);
    for (const [index, runtimeKind] of runtimeOnly) {
      verdicts[index] = this.runtimeVerdict(runtimeKind, unavailable, input.facts) ?? Object.freeze({ usable: "runtime_only", runtimeKind });
    }
    const checked: number[] = [];
    for (const [index, launch] of launches) {
      const refused = this.runtimeVerdict(launch.runtimeKind, unavailable, input.facts);
      if (refused) verdicts[index] = refused;
      else checked.push(index);
    }
    const offset = input.inherited ? 1 : 0;
    const toValidate = [...(input.inherited ? [input.inherited] : []), ...checked.map((index) => launches.get(index)!)];
    if (toValidate.length === 0) return Object.freeze({ verdicts: Object.freeze(verdicts as LaunchVerdict[]), inheritedFailure: null });
    let results: RunModelSelectionValidationResult[];
    try {
      results = await this.dependencies.validator.validateMany(toValidate.map((launch) => ({
        context: {
          runtimeKind: launch.runtimeKind,
          currentModelIdentifier: launch.llmModelIdentifier,
          workspaceRootPath: launch.workspaceRootPath ?? process.cwd(),
        },
        selection: { llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig },
      })));
    } catch (error) {
      throw new LaunchModelCheckError(`Its model could not be checked: ${messageOf(error)}`);
    }
    checked.forEach((index, position) => {
      const result = results[position + offset];
      const launch = launches.get(index)!;
      if (result?.kind !== "valid") {
        verdicts[index] = Object.freeze({
          usable: false,
          reason: result?.kind === "model_unavailable" ? "model_unavailable" : "model_settings_invalid",
          detail: invalidModelMessage(launch, result),
        });
        return;
      }
      const blocked = input.facts ? reportedModel(input.facts, launch.runtimeKind, launch.llmModelIdentifier)?.blocked : undefined;
      verdicts[index] = blocked
        ? Object.freeze({ usable: false, reason: "blocked", detail: blockedDetail(launch.llmModelIdentifier, blocked) })
        : Object.freeze({ usable: true, launch });
    });
    const inheritedFailure = !input.inherited || results[0]?.kind === "valid" ? null : invalidModelMessage(input.inherited, results[0]);
    return Object.freeze({ verdicts: Object.freeze(verdicts as LaunchVerdict[]), inheritedFailure });
  }

  /** U2 available, then U3 signed in (only with the node's facts): why the runtime cannot be used, or null. */
  private runtimeVerdict(runtimeKind: string, unavailable: ReadonlyMap<string, string>, facts: NodeRuntimesReading | null): LaunchVerdict | null {
    const reason = unavailable.get(runtimeKind);
    if (reason) return Object.freeze({ usable: false, reason: "runtime_unavailable", detail: reason });
    if (facts?.signedOutRuntimes.has(runtimeKind)) {
      return Object.freeze({ usable: false, reason: "signed_out", detail: `${agentRuntimeName(runtimeKind)} is signed out.` });
    }
    return null;
  }

  /** Each distinct runtime's availability once, concurrently: the unavailable ones with their reason. */
  private async unavailableRuntimes(runtimes: readonly RuntimeKind[]): Promise<Map<RuntimeKind, string>> {
    const checked = await Promise.all(runtimes.map(async (runtimeKind) => {
      try {
        const result = await this.dependencies.availability.getRuntimeAvailability(runtimeKind);
        return [runtimeKind, result.enabled ? null : result.reason ?? `Runtime '${runtimeKind}' is not available.`] as const;
      } catch (error) {
        return [runtimeKind, `Runtime '${runtimeKind}' could not be checked: ${messageOf(error)}`] as const;
      }
    }));
    return new Map(checked.filter((entry): entry is readonly [RuntimeKind, string] => entry[1] !== null));
  }
}
