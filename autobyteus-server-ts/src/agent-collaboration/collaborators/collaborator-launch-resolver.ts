import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import {
  LaunchModelCheckError,
  type LaunchUsabilityCheck,
  type LaunchVerdict,
} from "../../launch-preferences/launch-usability-check.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  DelegationRouting,
  DelegationWork,
  LaunchChoice,
  ModelRouterPort,
  RoutingAgentToChoose,
  RoutingCoveredAgent,
} from "../../model-routing/domain/model-routing-types.js";
import type {
  ConfiguredLaunchLayer,
  LaunchConfigurationFallback,
  LaunchConfigurationSource,
} from "../domain/launch-configuration-source.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type {
  CollaboratorDefinitionPlan,
  CollaboratorEntryPlan,
  CollaboratorEntryPlanMember,
} from "./collaborator-entry-builder.js";
import {
  CollaboratorAddError,
  CollaboratorNoDefaultLaunchError,
  CollaboratorRouterFailedError,
  type CopyRouterState,
} from "./collaborator-errors.js";
import type { CollaboratorLaunchBase } from "./collaborator-root-port.js";

/** A configured layer's verdict: its launch, a runtime-only default the router may complete, or why it was skipped. */
type LayerVerdict =
  | Readonly<{ usable: true; launch: AgentLaunchConfiguration }>
  | Readonly<{ usable: "runtime_only"; runtimeKind: string; fallback: LaunchConfigurationFallback }>
  | Readonly<{ usable: false; fallback: LaunchConfigurationFallback }>;

/** One agent of a plan (an Agent, or a Team member) on its way through the order. */
type AgentSlot = Readonly<{ key: object; address: AgentTeamAddress; name: string; description: string; role: string | null }>;

/**
 * Where an agent's launch comes from after steps 1–2: a configured layer, or the Model Router (with the layers skipped
 * before it and the runtime it must stay on), or nothing configured covers it and no router is asked.
 */
type SlotPlan =
  | Readonly<{ kind: "covered"; layer: ConfiguredLaunchLayer; launch: AgentLaunchConfiguration; fallbacks: readonly LaunchConfigurationFallback[] }>
  | Readonly<{ kind: "uncovered"; fallbacks: readonly LaunchConfigurationFallback[]; requiredRuntime: string | null }>;

/** What launch resolution answers. */
export type ResolvedCopies = Readonly<{ plans: CollaboratorEntryPlan[]; modelRoutingOn: boolean }>;

/** The final launch of one agent. */
type Resolved = Readonly<{ launch: AgentLaunchConfiguration; source: LaunchConfigurationSource }>;

const cloneLaunch = (value: AgentLaunchConfiguration): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig === null ? null : structuredClone(value.llmConfig),
  autoExecuteTools: value.autoExecuteTools,
  workspaceRootPath: value.workspaceRootPath,
});

const source = (origin: "agent_default" | "team_default" | "inherited", fallbacks: readonly LaunchConfigurationFallback[] = []): LaunchConfigurationSource =>
  Object.freeze({ origin, fallbacks: Object.freeze([...fallbacks]) });

const routedSource = (choice: LaunchChoice, fallbacks: readonly LaunchConfigurationFallback[]): LaunchConfigurationSource => Object.freeze({
  origin: "model_router", fallbacks: Object.freeze([...fallbacks]), choiceReason: choice.reason, taskKind: choice.taskKind,
});

const configuredFallback = (layer: ConfiguredLaunchLayer, value: DefaultLaunchConfig, verdict: Extract<LaunchVerdict, { usable: false }>): LaunchConfigurationFallback =>
  Object.freeze({ layer, runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier, reason: verdict.reason, detail: verdict.detail });

const routerFallback = (reason: "router_not_active" | "router_failed", detail: string): LaunchConfigurationFallback =>
  Object.freeze({ layer: "model_router", runtimeKind: null, llmModelIdentifier: null, reason, detail });

/** A layer that was configured but could not be used now, with its note fallback; null when none was configured. */
const skippedOf = (verdict: LayerVerdict | null, routerActive: boolean): LaunchConfigurationFallback | null =>
  !verdict || verdict.usable === true || (verdict.usable === "runtime_only" && routerActive) ? null : verdict.fallback;

/**
 * Turns new catalog-copy definition plans into entry plans (DS-001, supplement §§ 3–5). For each agent the first usable
 * layer wins, as one unit: its agent default, then (Team members) its Team's default, then the node's Model Router
 * (while Model Routing is on and the router is active), then (this node only) the run root's launch. With the
 * `defaults_only` base (a run started for a peer node) there is no run root's launch: an agent nothing covers refuses
 * the copy, with the router's state for the delegating node's wording (§ 6). Usability is `LaunchUsabilityCheck`'s:
 * U3 and U4b only while Model Routing is on (DEC-022). Skipped layers are recorded as fallbacks (REQ-003). One routing
 * request covers every agent of the delegation that steps 1–2 did not cover.
 */
export class CollaboratorLaunchResolver {
  constructor(private readonly dependencies: Readonly<{
    usability: Pick<LaunchUsabilityCheck, "check">;
    router: ModelRouterPort;
  }>) {}

  /** The entry plans, and whether Model Routing was on for this resolution (its decisions are then recorded, REQ-012). */
  async resolve(plans: readonly CollaboratorDefinitionPlan[], base: CollaboratorLaunchBase, work: DelegationWork): Promise<ResolvedCopies> {
    if (plans.length === 0) return { plans: [], modelRoutingOn: false };
    const routing = await this.dependencies.router.openDelegation();
    return { plans: await this.resolveWith(plans, base, work, routing), modelRoutingOn: routing !== null };
  }

  private async resolveWith(
    plans: readonly CollaboratorDefinitionPlan[],
    base: CollaboratorLaunchBase,
    work: DelegationWork,
    routing: DelegationRouting | null,
  ): Promise<CollaboratorEntryPlan[]> {
    const routerActive = routing !== null && routing.notActiveReason === null;
    const inherited = base.kind === "inherited" ? cloneLaunch(base.launch) : null;
    const verdicts = await this.checkConfigured(plans, base, inherited, routing);
    const verdictOf = (key: object): LayerVerdict | null => verdicts.layers.get(key) ?? null;

    // Steps 1–2 for every agent of every plan.
    const slots = new Map<object, SlotPlan>();
    for (const plan of plans) {
      if (plan.kind === "agent") { slots.set(plan, planSlot(verdictOf(plan), null, routerActive)); continue; }
      for (const member of plan.members) slots.set(member, planSlot(verdictOf(member), verdictOf(plan), routerActive));
    }

    // Step 3: one routing request for every uncovered agent, while Model Routing is on.
    const uncovered = agentSlots(plans).filter((slot) => slots.get(slot.key)?.kind === "uncovered");
    const choices = new Map<string, LaunchChoice>();
    let routerFailure: LaunchConfigurationFallback | null = null;
    if (uncovered.length && routing) {
      const outcome = await routing.route({
        work,
        target: { kind: plans[0]!.kind, name: plans[0]!.name, description: plans[0]!.description },
        agents: uncovered.map((slot): RoutingAgentToChoose => {
          const planned = slots.get(slot.key) as Extract<SlotPlan, { kind: "uncovered" }>;
          return {
            address: slot.address, name: slot.name, description: slot.description, role: slot.role,
            skipped: planned.fallbacks.flatMap((fallback) => fallback.layer === "model_router" ? [] : [{
              layer: fallback.layer, runtimeKind: fallback.runtimeKind, llmModelIdentifier: fallback.llmModelIdentifier, detail: fallback.detail,
            }]),
            requiredRuntime: planned.requiredRuntime,
          };
        }),
        covered: agentSlots(plans).flatMap((slot): RoutingCoveredAgent[] => {
          const planned = slots.get(slot.key);
          return planned?.kind === "covered" ? [{ address: slot.address, runtimeKind: planned.launch.runtimeKind,
            llmModelIdentifier: planned.launch.llmModelIdentifier, source: planned.layer }] : [];
        }),
        delegatingLaunch: inherited ? { runtimeKind: inherited.runtimeKind, llmModelIdentifier: inherited.llmModelIdentifier } : null,
      });
      if (outcome.kind === "chosen") outcome.choices.forEach((choice) => choices.set(choice.address, choice));
      else if (outcome.kind === "not_active") routerFailure = routerFallback("router_not_active", outcome.reason);
      else {
        if (base.kind === "defaults_only") throw new CollaboratorRouterFailedError(plans[0]!.name, uncovered[0]!.name, outcome.reason);
        routerFailure = routerFallback("router_failed", outcome.reason);
      }
    }
    const routerState: CopyRouterState = !routing ? { kind: "off" } : { kind: "not_active", reason: routerFailure?.detail ?? routing.notActiveReason ?? "" };
    // A routed launch takes the workspace and auto-approve every candidate takes (§ 3.3), with the model's default settings.
    const context = launchContextOf(base);

    /** Step 3's result, or step 4 / refusal, for one agent no configured layer covers. */
    const finish = (plan: CollaboratorDefinitionPlan, slot: AgentSlot, planned: Extract<SlotPlan, { kind: "uncovered" }>): Resolved => {
      const choice = choices.get(slot.address);
      if (choice) {
        return { launch: Object.freeze({ runtimeKind: choice.runtimeKind as RuntimeKind, llmModelIdentifier: choice.llmModelIdentifier,
          llmConfig: null, ...context }), source: routedSource(choice, planned.fallbacks) };
      }
      const fallbacks = routerFailure ? [...planned.fallbacks, routerFailure] : planned.fallbacks;
      if (!inherited) return noUsableLayer(plan, planned.fallbacks, routerState);
      if (verdicts.inheritedFailure !== null) throw new CollaboratorAddError(plan.name, verdicts.inheritedFailure);
      return { launch: inherited, source: source("inherited", fallbacks) };
    };

    return plans.map((plan): CollaboratorEntryPlan => {
      const identity = { name: plan.name, address: plan.address };
      if (plan.kind === "agent") {
        const planned = slots.get(plan)!;
        const resolved = planned.kind === "covered"
          ? { launch: planned.launch, source: source(planned.layer, planned.fallbacks) }
          : finish(plan, { key: plan, ...identity, description: plan.description, role: plan.role }, planned);
        return Object.freeze({ kind: "agent", ...identity, agentDefinitionId: plan.agentDefinitionId,
          launchConfiguration: resolved.launch, launchSource: resolved.source });
      }
      const team = verdictOf(plan);
      const teamFallback = skippedOf(team, routerActive);
      const members = plan.members.map((member): CollaboratorEntryPlanMember => {
        const planned = slots.get(member)!;
        const layout = { address: member.address, agentDefinitionId: member.agentDefinitionId };
        if (planned.kind === "covered" && planned.layer === "agent_default") {
          return Object.freeze({ ...layout, launchConfiguration: planned.launch, followsTeam: false, launchSource: source("agent_default") });
        }
        if (planned.kind === "covered") {
          // Follows its Team's default: a source only when its own default was skipped (as before).
          const follower = { ...layout, launchConfiguration: planned.launch, followsTeam: true };
          return Object.freeze(planned.fallbacks.length ? { ...follower, launchSource: source("team_default", planned.fallbacks) } : follower);
        }
        const resolved = finish(plan, { key: member, address: member.address, name: member.name, description: member.description, role: member.role }, planned);
        if (resolved.source.origin === "model_router") {
          return Object.freeze({ ...layout, launchConfiguration: resolved.launch, followsTeam: false, launchSource: resolved.source });
        }
        // The run root's launch: it follows the Team's launch, which is that launch (the Team default is not usable).
        const follower = { ...layout, launchConfiguration: resolved.launch, followsTeam: true };
        const ownNotes = resolved.source.fallbacks.filter((fallback) => fallback !== teamFallback);
        return Object.freeze(ownNotes.length ? { ...follower, launchSource: source("inherited", ownNotes) } : follower);
      });
      const teamLevel = this.teamLevel(plan, team, teamFallback, members, inherited);
      return Object.freeze({
        kind: "agent_team", ...identity,
        teamDefinitionId: plan.teamDefinitionId,
        coordinatorAddress: plan.coordinatorAddress,
        members: Object.freeze(members),
        handoffs: plan.handoffs,
        defaultLaunchConfiguration: teamLevel.launch,
        defaultLaunchSource: teamLevel.source,
      });
    });
  }

  /**
   * A Team's own launch, which its followers take: its default when usable; else the run root's (this node; unused by
   * every member when that failed, as before), or, on a peer node, its coordinator's.
   */
  private teamLevel(
    plan: Extract<CollaboratorDefinitionPlan, { kind: "agent_team" }>,
    team: LayerVerdict | null,
    teamFallback: LaunchConfigurationFallback | null,
    members: readonly CollaboratorEntryPlanMember[],
    inherited: AgentLaunchConfiguration | null,
  ): Resolved {
    if (team?.usable === true) return { launch: team.launch, source: source("team_default") };
    // A skipped Team default is noted at Team level unless every member without its own default was routed (each
    // routed member's note already names it).
    const routedOnly = members.some((member) => member.launchSource?.origin === "model_router") && !members.some((member) => member.followsTeam);
    const fallbacks = teamFallback && !routedOnly ? [teamFallback] : [];
    if (inherited) return { launch: inherited, source: source("inherited", fallbacks) };
    // Without a usable Team default every member runs on its own launch; the coordinator's stands in as the Team's
    // recorded default (autobyteus-247 decides Teams).
    const coordinator = members.find((member) => member.address === plan.coordinatorAddress) ?? members[0]!;
    const coordinatorSource = coordinator.launchSource;
    return {
      launch: coordinator.launchConfiguration,
      source: coordinatorSource?.origin === "model_router"
        ? Object.freeze({ ...coordinatorSource, fallbacks: Object.freeze(fallbacks) })
        : source("agent_default", fallbacks),
    };
  }

  /**
   * Every configured candidate's verdict and the inherited layer's failure, in one batch: the node's facts (U3, U4b)
   * only while Model Routing is on.
   */
  private async checkConfigured(
    plans: readonly CollaboratorDefinitionPlan[],
    base: CollaboratorLaunchBase,
    inherited: AgentLaunchConfiguration | null,
    routing: DelegationRouting | null,
  ): Promise<Readonly<{ layers: ReadonlyMap<object, LayerVerdict>; inheritedFailure: string | null }>> {
    const candidates: { key: object; layer: ConfiguredLaunchLayer; value: DefaultLaunchConfig }[] = [];
    const consider = (key: object, layer: ConfiguredLaunchLayer, value: DefaultLaunchConfig | null) => {
      if (value) candidates.push({ key, layer, value });
    };
    for (const plan of plans) {
      if (plan.kind === "agent") { consider(plan, "agent_default", plan.agentDefault); continue; }
      consider(plan, "team_default", plan.teamDefault);
      plan.members.forEach((member) => consider(member, "agent_default", member.agentDefault));
    }
    let result;
    try {
      result = await this.dependencies.usability.check({
        candidates: candidates.map((candidate) => candidate.value),
        context: launchContextOf(base),
        inherited,
        facts: routing?.facts ?? null,
      });
    } catch (error) {
      if (error instanceof LaunchModelCheckError) throw new CollaboratorAddError(plans[0]!.name, error.reason);
      throw error;
    }
    const layers = new Map<object, LayerVerdict>();
    candidates.forEach((candidate, index) => {
      const verdict = result.verdicts[index]!;
      layers.set(candidate.key, verdict.usable === true ? verdict
        : verdict.usable === "runtime_only"
          ? Object.freeze({ usable: "runtime_only", runtimeKind: verdict.runtimeKind, fallback: configuredFallback(candidate.layer, candidate.value,
            { usable: false, reason: "incomplete", detail: "It names no model." }) })
          : Object.freeze({ usable: false, fallback: configuredFallback(candidate.layer, candidate.value, verdict) }));
    });
    return { layers, inheritedFailure: result.inheritedFailure };
  }
}

/**
 * Steps 1–2 for one agent (supplement §§ 3.1–3.2): its own default; a usable runtime-only own default goes to the router
 * on that runtime while it is active; then (a Team member) the Team's default, likewise; else uncovered.
 */
const planSlot = (own: LayerVerdict | null, team: LayerVerdict | null, routerActive: boolean): SlotPlan => {
  if (own?.usable === true) return { kind: "covered", layer: "agent_default", launch: own.launch, fallbacks: [] };
  const ownSkipped = skippedOf(own, routerActive);
  const skipped = ownSkipped ? [ownSkipped] : [];
  if (own?.usable === "runtime_only" && routerActive) return { kind: "uncovered", fallbacks: [], requiredRuntime: own.runtimeKind };
  if (team?.usable === true) return { kind: "covered", layer: "team_default", launch: team.launch, fallbacks: skipped };
  if (team?.usable === "runtime_only" && routerActive) return { kind: "uncovered", fallbacks: skipped, requiredRuntime: team.runtimeKind };
  const teamSkipped = skippedOf(team, routerActive);
  return { kind: "uncovered", fallbacks: teamSkipped ? [...skipped, teamSkipped] : skipped, requiredRuntime: null };
};

const launchContextOf = (base: CollaboratorLaunchBase): Readonly<{ workspaceRootPath: string | null; autoExecuteTools: boolean }> =>
  base.kind === "inherited"
    ? { workspaceRootPath: base.launch.workspaceRootPath, autoExecuteTools: base.launch.autoExecuteTools }
    : { workspaceRootPath: base.workspaceRootPath, autoExecuteTools: base.autoExecuteTools };

/** Every agent of the plans, in order: an Agent, or each Team member. */
const agentSlots = (plans: readonly CollaboratorDefinitionPlan[]): AgentSlot[] => plans.flatMap((plan): AgentSlot[] => plan.kind === "agent"
  ? [{ key: plan, address: plan.address, name: plan.name, description: plan.description, role: plan.role }]
  : plan.members.map((member) => ({ key: member, address: member.address, name: member.name, description: member.description, role: member.role })));

/**
 * No layer covers an agent of `plan` (`defaults_only`): a complete configured layer that could not be used gives its
 * reason; nothing complete configured is "no default runtime". Both carry why the Model Router did not choose.
 */
const noUsableLayer = (plan: CollaboratorDefinitionPlan, fallbacks: readonly LaunchConfigurationFallback[], routerState: CopyRouterState): never => {
  for (const fallback of fallbacks) {
    if (fallback.reason !== "incomplete") throw new CollaboratorAddError(plan.name, fallback.detail, routerState);
  }
  throw new CollaboratorNoDefaultLaunchError(plan.name, plan.kind, routerState);
};
