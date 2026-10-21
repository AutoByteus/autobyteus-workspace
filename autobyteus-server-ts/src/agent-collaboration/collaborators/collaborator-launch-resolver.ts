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
import { CollaboratorAddError, CollaboratorNoDefaultLaunchError } from "./collaborator-errors.js";
import type { CollaboratorLaunchBase } from "./collaborator-root-port.js";

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

/** Where configured candidates take their workspace and auto-approve from. */
type CandidateContext = Readonly<{ workspaceRootPath: string | null; autoExecuteTools: boolean }>;

/**
 * Turns new collaborator / catalog-copy definition plans into entry plans (DS-002). For each
 * agent the first usable layer wins, as one unit: its agent default, then (Team members) its
 * Team's default, then the run root's launch (REQ-001, REQ-002). With the `defaults_only` base
 * (a run started for a peer node) there is no run root's launch: only the configured layers count,
 * with the base's workspace and auto-approve, and an agent no configured layer covers fails
 * (`CollaboratorNoDefaultLaunchError` when nothing complete is configured, else the layer's reason). A configured layer is usable
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

  async resolve(plans: readonly CollaboratorDefinitionPlan[], base: CollaboratorLaunchBase): Promise<CollaboratorEntryPlan[]> {
    if (plans.length === 0) return [];
    const candidates = new Map<object, ConfiguredCandidate>();
    const consider = (key: object, layer: ConfiguredLaunchLayer, value: DefaultLaunchConfig | null) => {
      if (value) candidates.set(key, { layer, value });
    };
    for (const plan of plans) {
      if (plan.kind === "agent") { consider(plan, "agent_default", plan.agentDefault); continue; }
      consider(plan, "team_default", plan.teamDefault);
      plan.members.forEach((member) => consider(member, "agent_default", member.agentDefault));
    }
    const verdictOf = (key: object): LayerVerdict | null => candidates.get(key)?.verdict ?? null;
    if (base.kind === "defaults_only") {
      await this.check([...candidates.values()], base, null, plans[0]!.name);
      return plans.map((plan) => resolveDefaultsOnly(plan, verdictOf));
    }
    const inherited = cloneLaunch(base.launch);
    const inheritedFailure = await this.check([...candidates.values()], inherited, inherited, plans[0]!.name);

    const requireInherited = (planName: string): AgentLaunchConfiguration => {
      if (inheritedFailure !== null) throw new CollaboratorAddError(planName, inheritedFailure);
      return inherited;
    };

    return plans.map((plan): CollaboratorEntryPlan => {
      const identity = { name: plan.name, address: plan.address };
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
        if (own?.usable) {
          return Object.freeze({ ...layout, launchConfiguration: own.launch, followsTeam: false, launchSource: source("agent_default") });
        }
        const teamLaunch = teamLevel.launch ?? requireInherited(plan.name);
        const follower = { ...layout, launchConfiguration: teamLaunch, followsTeam: true };
        return Object.freeze(own ? { ...follower, launchSource: source(teamLevel.source.origin, [own.fallback]) } : follower);
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
   * (null when it is usable or there is none): availability once per distinct configured runtime,
   * concurrently, then one `validateMany` over the inherited launch (when there is one) and every
   * candidate on an available runtime. Candidates take `context`'s workspace and auto-approve.
   */
  private async check(
    candidates: ConfiguredCandidate[],
    context: CandidateContext,
    inherited: AgentLaunchConfiguration | null,
    batchName: string,
  ): Promise<string | null> {
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
        autoExecuteTools: context.autoExecuteTools,
        workspaceRootPath: context.workspaceRootPath,
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
    const offset = inherited ? 1 : 0;
    const launches = [...(inherited ? [inherited] : []), ...checked.map((candidate) => candidate.launch!)];
    // Only `defaults_only` can have nothing to validate: the inherited launch is always checked.
    if (launches.length === 0) return null;
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
      const result = results[index + offset];
      const launch = candidate.launch!;
      candidate.verdict = result?.kind === "valid"
        ? Object.freeze({ usable: true, launch })
        : fallbackOf(candidate, result?.kind === "model_unavailable" ? "model_unavailable" : "model_settings_invalid", invalidModelMessage(launch, result));
    });
    if (!inherited) return null;
    return results[0]?.kind === "valid" ? null : invalidModelMessage(inherited, results[0]);
  }
}

type VerdictOf = (key: object) => LayerVerdict | null;
type UsableVerdict = Extract<LayerVerdict, { usable: true }>;
const isUsable = (verdict: LayerVerdict | null): verdict is UsableVerdict => verdict?.usable === true;

/**
 * No configured layer covers an agent of `plan` (`defaults_only`): a complete configured layer that could
 * not be used gives its reason; nothing complete configured is "no default runtime".
 */
const noUsableLayer = (plan: CollaboratorDefinitionPlan, layers: readonly (LayerVerdict | null)[]): never => {
  for (const layer of layers) {
    if (layer && !layer.usable && layer.fallback.reason !== "incomplete") throw new CollaboratorAddError(plan.name, layer.fallback.detail);
  }
  throw new CollaboratorNoDefaultLaunchError(plan.name, plan.kind);
};

/** One plan with the `defaults_only` base: the agent default, then (Team members) the Team default; nothing else. */
const resolveDefaultsOnly = (plan: CollaboratorDefinitionPlan, verdictOf: VerdictOf): CollaboratorEntryPlan => {
  const identity = { name: plan.name, address: plan.address };
  if (plan.kind === "agent") {
    const own = verdictOf(plan);
    if (!isUsable(own)) return noUsableLayer(plan, [own]);
    return Object.freeze({ kind: "agent", ...identity, agentDefinitionId: plan.agentDefinitionId,
      launchConfiguration: own.launch, launchSource: source("agent_default") });
  }
  const teamOwn = verdictOf(plan);
  const members = plan.members.map((member): CollaboratorEntryPlanMember => {
    const own = verdictOf(member);
    const layout = { address: member.address, agentDefinitionId: member.agentDefinitionId };
    if (isUsable(own)) return Object.freeze({ ...layout, launchConfiguration: own.launch, followsTeam: false, launchSource: source("agent_default") });
    if (!isUsable(teamOwn)) return noUsableLayer(plan, [own, teamOwn]);
    const follower = { ...layout, launchConfiguration: teamOwn.launch, followsTeam: true };
    return Object.freeze(own ? { ...follower, launchSource: source("team_default", [own.fallback]) } : follower);
  });
  // Without a usable Team default every member runs on its own default; the coordinator's stands in as the
  // Team's recorded default, as the inherited launch does today when it fails (autobyteus-247 decides Teams).
  const coordinator = members.find((member) => member.address === plan.coordinatorAddress) ?? members[0]!;
  return Object.freeze({
    kind: "agent_team", ...identity,
    teamDefinitionId: plan.teamDefinitionId,
    coordinatorAddress: plan.coordinatorAddress,
    members: Object.freeze(members),
    handoffs: plan.handoffs,
    defaultLaunchConfiguration: isUsable(teamOwn) ? teamOwn.launch : coordinator.launchConfiguration,
    defaultLaunchSource: isUsable(teamOwn) ? source("team_default") : source("agent_default", teamOwn ? [teamOwn.fallback] : []),
  });
};
