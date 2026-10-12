import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import type {
  RunModelSelectionValidationResult,
  RunModelSelectionValidator,
} from "../../llm-management/services/run-model-selection-service.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  ConfiguredLaunchLayer,
  LaunchConfigurationFallback,
  LaunchConfigurationSource,
} from "../domain/launch-configuration-source.js";
import type {
  CollaboratorDefinitionPlan,
  CollaboratorEntryPlan,
  CollaboratorEntryPlanMember,
} from "./collaborator-entry-builder.js";
import { CollaboratorAddError } from "./collaborator-errors.js";

type RuntimeAvailability = Pick<RuntimeAvailabilityService, "getRuntimeAvailability">;

/** A configured layer's verdict: its launch, or why it was skipped. */
type LayerVerdict =
  | Readonly<{ usable: true; launch: AgentLaunchConfiguration }>
  | Readonly<{ usable: false; fallback: LaunchConfigurationFallback }>;

/** One configured default to check, with the layer it was configured on. */
type ConfiguredCandidate = { layer: ConfiguredLaunchLayer; value: DefaultLaunchConfig; verdict?: LayerVerdict; launch?: AgentLaunchConfiguration };

const cloneLaunch = (value: AgentLaunchConfiguration): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig === null ? null : structuredClone(value.llmConfig),
  autoExecuteTools: value.autoExecuteTools,
  workspaceRootPath: value.workspaceRootPath,
});

const source = (origin: LaunchConfigurationSource["origin"], fallbacks: readonly LaunchConfigurationFallback[] = []): LaunchConfigurationSource =>
  Object.freeze({ origin, fallbacks: Object.freeze([...fallbacks]) });

const fallbackOf = (
  candidate: ConfiguredCandidate,
  reason: LaunchConfigurationFallback["reason"],
  detail: string,
): LayerVerdict => Object.freeze({ usable: false, fallback: Object.freeze({
  layer: candidate.layer,
  runtimeKind: candidate.value.runtimeKind,
  llmModelIdentifier: candidate.value.llmModelIdentifier,
  reason,
  detail,
}) });

const incompleteDetail = (value: DefaultLaunchConfig): string => !value.runtimeKind && !value.llmModelIdentifier
  ? "It names neither a runtime nor a model."
  : !value.runtimeKind ? "It names no runtime." : "It names no model.";

/** Today's runnability wording for a model check that did not pass (kept identical for the inherited layer). */
const invalidModelMessage = (launch: AgentLaunchConfiguration, result: RunModelSelectionValidationResult | undefined): string =>
  !result ? "Its model could not be checked."
    : result.kind === "model_unavailable" ? `The model '${launch.llmModelIdentifier}' is not available on ${launch.runtimeKind}.`
      : result.kind === "schema_unavailable" ? `The settings of model '${launch.llmModelIdentifier}' could not be checked.`
        : result.kind === "invalid" ? `Its model settings are invalid: ${result.errors.map((error) => error.message).join("; ")}`
          : "";

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * Turns new collaborator / catalog-copy definition plans into entry plans (DS-002). For each
 * agent the first usable layer wins, as one unit: its agent default, then (Team members) its
 * Team's default, then the run root's launch (REQ-001, REQ-002). A configured layer is usable
 * when it names a runtime and a model, the runtime is available and the model with its settings
 * is offered for the root workspace; the inherited layer keeps today's model check only. Skipped
 * configured layers are recorded as fallbacks (REQ-003). When an agent has no usable layer the
 * plan fails with today's `CollaboratorAddError` and nothing is added (REQ-004). One batch checks
 * each configured runtime's availability once and validates every candidate in one
 * `validateMany`, which shares the catalog evidence (QR-001).
 */
export class CollaboratorLaunchResolver {
  constructor(private readonly dependencies: Readonly<{
    availability: RuntimeAvailability;
    validator: RunModelSelectionValidator;
  }>) {}

  async resolve(plans: readonly CollaboratorDefinitionPlan[], inheritedLaunch: AgentLaunchConfiguration): Promise<CollaboratorEntryPlan[]> {
    if (plans.length === 0) return [];
    const inherited = cloneLaunch(inheritedLaunch);
    const candidates = new Map<object, ConfiguredCandidate>();
    const consider = (key: object, layer: ConfiguredLaunchLayer, value: DefaultLaunchConfig | null) => {
      if (value) candidates.set(key, { layer, value });
    };
    for (const plan of plans) {
      if (plan.kind === "agent") { consider(plan, "agent_default", plan.agentDefault); continue; }
      consider(plan, "team_default", plan.teamDefault);
      plan.members.forEach((member) => consider(member, "agent_default", member.agentDefault));
    }
    const inheritedFailure = await this.check([...candidates.values()], inherited, plans[0]!.name);

    const verdictOf = (key: object): LayerVerdict | null => candidates.get(key)?.verdict ?? null;
    const requireInherited = (planName: string): AgentLaunchConfiguration => {
      if (inheritedFailure !== null) throw new CollaboratorAddError(planName, inheritedFailure);
      return inherited;
    };

    return plans.map((plan): CollaboratorEntryPlan => {
      const identity = { name: plan.name, address: plan.address, addedAt: plan.addedAt, addedViaAgentRunId: plan.addedViaAgentRunId };
      if (plan.kind === "agent") {
        const own = verdictOf(plan);
        return Object.freeze({
          kind: "agent", ...identity, agentDefinitionId: plan.agentDefinitionId,
          ...(own?.usable
            ? { launchConfiguration: own.launch, launchSource: source("agent_default") }
            : { launchConfiguration: requireInherited(plan.name), launchSource: source("inherited", own ? [own.fallback] : []) }),
        });
      }
      const teamOwn = verdictOf(plan);
      const teamLevel = teamOwn?.usable
        ? { launch: teamOwn.launch, source: source("team_default") }
        : { launch: inheritedFailure === null ? inherited : null, source: source("inherited", teamOwn ? [teamOwn.fallback] : []) };
      const members = plan.members.map((member): CollaboratorEntryPlanMember => {
        const own = verdictOf(member);
        const layout = { address: member.address, agentDefinitionId: member.agentDefinitionId };
        if (own?.usable) return Object.freeze({ ...layout, launchConfiguration: own.launch, launchSource: source("agent_default") });
        if (!teamLevel.launch) requireInherited(plan.name);
        return Object.freeze(own ? { ...layout, launchSource: source(teamLevel.source.origin, [own.fallback]) } : layout);
      });
      return Object.freeze({
        kind: "agent_team", ...identity,
        teamDefinitionId: plan.teamDefinitionId,
        coordinatorAddress: plan.coordinatorAddress,
        members: Object.freeze(members),
        handoffs: plan.handoffs,
        // Unused by every member (each runs on its own default) when the inherited layer failed.
        defaultLaunchConfiguration: teamLevel.launch ?? inherited,
        defaultLaunchSource: teamLevel.source,
      });
    });
  }

  /**
   * Sets each configured candidate's verdict and returns the inherited layer's failure message
   * (null when it is usable): availability once per distinct configured runtime, concurrently,
   * then one `validateMany` over the inherited launch and every candidate on an available runtime.
   */
  private async check(candidates: ConfiguredCandidate[], inherited: AgentLaunchConfiguration, batchName: string): Promise<string | null> {
    const complete: ConfiguredCandidate[] = [];
    for (const candidate of candidates) {
      const { runtimeKind, llmModelIdentifier, llmConfig } = candidate.value;
      if (!runtimeKind || !llmModelIdentifier) {
        candidate.verdict = fallbackOf(candidate, "incomplete", incompleteDetail(candidate.value));
        continue;
      }
      candidate.launch = Object.freeze({
        runtimeKind: runtimeKind as RuntimeKind,
        llmModelIdentifier,
        llmConfig: llmConfig ? structuredClone(llmConfig) : null,
        autoExecuteTools: inherited.autoExecuteTools,
        workspaceRootPath: inherited.workspaceRootPath,
      });
      complete.push(candidate);
    }
    const runtimes = [...new Set(complete.map((candidate) => candidate.launch!.runtimeKind))];
    const availability = new Map(await Promise.all(runtimes.map(async (runtimeKind) => {
      try {
        const result = await this.dependencies.availability.getRuntimeAvailability(runtimeKind);
        return [runtimeKind, result.enabled ? null : result.reason ?? `Runtime '${runtimeKind}' is not available.`] as const;
      } catch (error) {
        return [runtimeKind, `Runtime '${runtimeKind}' could not be checked: ${messageOf(error)}`] as const;
      }
    })));
    const checked: ConfiguredCandidate[] = [];
    for (const candidate of complete) {
      const unavailable = availability.get(candidate.launch!.runtimeKind);
      if (unavailable) candidate.verdict = fallbackOf(candidate, "runtime_unavailable", unavailable);
      else checked.push(candidate);
    }
    const launches = [inherited, ...checked.map((candidate) => candidate.launch!)];
    let results: RunModelSelectionValidationResult[];
    try {
      results = await this.dependencies.validator.validateMany(launches.map((launch) => ({
        context: {
          runtimeKind: launch.runtimeKind,
          currentModelIdentifier: launch.llmModelIdentifier,
          workspaceRootPath: launch.workspaceRootPath ?? process.cwd(),
        },
        selection: { llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig },
      })));
    } catch (error) {
      throw new CollaboratorAddError(batchName, `Its model could not be checked: ${messageOf(error)}`);
    }
    checked.forEach((candidate, index) => {
      const result = results[index + 1];
      const launch = candidate.launch!;
      candidate.verdict = result?.kind === "valid"
        ? Object.freeze({ usable: true, launch })
        : fallbackOf(candidate, result?.kind === "model_unavailable" ? "model_unavailable" : "model_settings_invalid", invalidModelMessage(launch, result));
    });
    return results[0]?.kind === "valid" ? null : invalidModelMessage(inherited, results[0]);
  }
}
