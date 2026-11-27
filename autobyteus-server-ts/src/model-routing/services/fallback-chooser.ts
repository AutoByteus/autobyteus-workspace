import type { NodeRuntimesReading } from "../../available-agent-runtimes/available-agent-runtimes-report.js";
import type { UsageLimitReachedData } from "../../run-events/run-event-types.js";
import { readModelRouterLaunch, readModelRoutingEnabled } from "../model-routing-settings.js";
import type {
  AgentLaunchHistoryEntry,
  RuntimeSwitchRequest,
  RuntimeSwitchRequestOutcome,
  SwitchChosenBy,
  SwitchLaunch,
  SwitchRecord,
  UsableRuntime,
} from "../domain/runtime-switch-types.js";
import { AGENT_LAUNCH_HISTORY_DAYS_MS } from "../domain/runtime-switch-types.js";

/** The history safety net's reason (C-2 `reason`). */
export const HISTORY_CHOICE_REASON = "most used by this agent in the last 30 days";
/** The node fallback's reasons (R-17): its usable history, else its runtime list's order. */
export const NODE_HISTORY_CHOICE_REASON = "most used on this node in the last 30 days";
export const NODE_FIRST_USABLE_CHOICE_REASON = "the first usable runtime on this node";

/** A fallback launch and who chose it (C-2 `chosenBy`, R-19's launch origin). */
export type ChosenLaunch = Readonly<{ launch: SwitchLaunch; chosenBy: SwitchChosenBy; reason: string }>;

/** Which models are exhausted now (C-3); the exhaustion view, read structurally (model-routing imports no listener). */
export type ExhaustionReading = Readonly<{
  isExhausted(runtimeKind: string, llmModelIdentifier: string): Readonly<{ until: string }> | null;
}>;

export type FallbackChoice =
  | Readonly<{ kind: "chosen"; launch: SwitchLaunch; chosenBy: SwitchChosenBy; reason: string; routerFailure: string | null }>
  | Readonly<{ kind: "no_fallback"; routerFailure: string | null }>;

export type FallbackRequest = Readonly<{
  agentDefinitionId: string;
  agentName: string;
  agentDescription: string | null;
  why: UsageLimitReachedData;
}>;

/**
 * The runtimes and models usable now (C-7, REQ-004): in the node's report (so installed and signed in), not blocked by
 * a used-up limit, and not exhausted (C-3). A runtime without a usable model is left out.
 */
export const usableRuntimesNow = (facts: NodeRuntimesReading, exhaustion: ExhaustionReading): readonly UsableRuntime[] =>
  Object.freeze(facts.report.agentRuntimes.flatMap((entry) => {
    const models = "providers" in entry
      ? entry.providers.flatMap((provider) => typeof provider.models === "string" ? [] : provider.models)
      : typeof entry.models === "string" ? [] : entry.models;
    const usable = [...new Set(models.filter((model) => !model.blocked && !exhaustion.isExhausted(entry.runtime, model.id))
      .map((model) => model.id))];
    return usable.length ? [Object.freeze({ runtimeKind: entry.runtime, models: Object.freeze(usable) })] : [];
  }));

/**
 * The history safety net (C-8): of this agent's launches that are usable now, the runtime with the most runs (ties: the
 * most recently used), with the model it last used there. Null when none of its launches is usable now.
 */
export const historyPick = (history: readonly AgentLaunchHistoryEntry[], usable: readonly UsableRuntime[]): SwitchLaunch | null => {
  const runtimes = new Map<string, { runs: number; lastUsedAt: string; model: string; modelUsedAt: string }>();
  for (const entry of history) {
    if (!usable.some((runtime) => runtime.runtimeKind === entry.runtimeKind && runtime.models.includes(entry.llmModelIdentifier))) continue;
    const known = runtimes.get(entry.runtimeKind);
    if (!known) {
      runtimes.set(entry.runtimeKind, { runs: entry.runs, lastUsedAt: entry.lastUsedAt, model: entry.llmModelIdentifier, modelUsedAt: entry.lastUsedAt });
      continue;
    }
    known.runs += entry.runs;
    if (entry.lastUsedAt > known.lastUsedAt) known.lastUsedAt = entry.lastUsedAt;
    if (entry.lastUsedAt > known.modelUsedAt) { known.model = entry.llmModelIdentifier; known.modelUsedAt = entry.lastUsedAt; }
  }
  const best = [...runtimes.entries()].sort(([, left], [, right]) => right.runs - left.runs || right.lastUsedAt.localeCompare(left.lastUsedAt))[0];
  return best ? Object.freeze({ runtimeKind: best[0], llmModelIdentifier: best[1].model }) : null;
};

/**
 * The node fallback (R-17): of the node's launches across all agents that are usable now, the runtime and model with the
 * most runs (ties: the most recently used); when none is usable, the first usable runtime in the node's runtime list
 * (the report's order) with its first usable model. Deterministic, never random. Null when nothing is usable.
 */
export const nodeFallbackPick = (nodeHistory: readonly AgentLaunchHistoryEntry[], usable: readonly UsableRuntime[]): ChosenLaunch | null => {
  const used = nodeHistory.find((entry) => usable.some((runtime) => runtime.runtimeKind === entry.runtimeKind && runtime.models.includes(entry.llmModelIdentifier)));
  if (used) return { launch: { runtimeKind: used.runtimeKind, llmModelIdentifier: used.llmModelIdentifier }, chosenBy: "node_fallback", reason: NODE_HISTORY_CHOICE_REASON };
  const first = usable.find((runtime) => runtime.models.length);
  return first ? { launch: { runtimeKind: first.runtimeKind, llmModelIdentifier: first.models[0]! }, chosenBy: "node_fallback", reason: NODE_FIRST_USABLE_CHOICE_REASON } : null;
};

/**
 * Chooses where an agent continues when its runtime cannot (autobyteus-646 DS-003, REQ-004, R-17), in order: the Model
 * Router, when Model Routing is on and the router's own launch is not exhausted (C-7, 40 s, it may fail); this agent's
 * history (C-8); the node fallback; otherwise nothing is usable and there is no fallback. Also the delegation's layers
 * after an exhausted skip (R-2, R-17). It never switches anything.
 */
export class FallbackChooser {
  constructor(private readonly dependencies: Readonly<{
    readNodeRuntimes(): Promise<NodeRuntimesReading>;
    exhaustion: ExhaustionReading;
    history: Readonly<{
      launchesOf(agentDefinitionId: string): Promise<readonly AgentLaunchHistoryEntry[]>;
      launchesOfNode(): Promise<readonly AgentLaunchHistoryEntry[]>;
    }>;
    switchRecords: Readonly<{ recentOf(agentDefinitionId: string, since: Date): Promise<readonly SwitchRecord[]> }>;
    router: Readonly<{ requestSwitch(request: RuntimeSwitchRequest): Promise<RuntimeSwitchRequestOutcome> }>;
    now?: () => Date;
  }>) {}

  async choose(request: FallbackRequest): Promise<FallbackChoice> {
    const facts = await this.readFacts();
    if (!facts) return { kind: "no_fallback", routerFailure: null };
    const usable = usableRuntimesNow(facts, this.dependencies.exhaustion);
    if (!usable.length) return { kind: "no_fallback", routerFailure: null };
    const history = await this.dependencies.history.launchesOf(request.agentDefinitionId).catch((error: unknown) => {
      console.warn(`Runtime fallback: the launch history of '${request.agentDefinitionId}' could not be read (${String(error)}).`);
      return [] as const;
    });
    const routed = await this.askRouter(request, usable, history);
    if (routed.kind === "chosen") {
      return { kind: "chosen", launch: routed.launch, chosenBy: "model_router", reason: routed.reason, routerFailure: null };
    }
    const fromHistory = historyPick(history, usable);
    const picked: ChosenLaunch | null = fromHistory
      ? { launch: fromHistory, chosenBy: "agent_history", reason: HISTORY_CHOICE_REASON }
      : nodeFallbackPick(await this.nodeHistory(), usable);
    // Something is usable, so the node fallback always finds one; no_fallback is only "nothing is usable" (R-18).
    return picked ? { kind: "chosen", ...picked, routerFailure: routed.reason } : { kind: "no_fallback", routerFailure: routed.reason };
  }

  /**
   * The delegation's layers after an exhausted skip (R-2, R-17): this agent's history pick among what is usable now,
   * then (only when `withNodeFallback`, the inherited launch can't run either) the node fallback; null when none.
   */
  async fallbackLaunch(agentDefinitionId: string, withNodeFallback: boolean): Promise<ChosenLaunch | null> {
    const facts = await this.readFacts();
    if (!facts) return null;
    const usable = usableRuntimesNow(facts, this.dependencies.exhaustion);
    const history = await this.dependencies.history.launchesOf(agentDefinitionId).catch(() => []);
    const picked = historyPick(history, usable);
    if (picked) return { launch: picked, chosenBy: "agent_history", reason: HISTORY_CHOICE_REASON };
    return withNodeFallback ? nodeFallbackPick(await this.nodeHistory(), usable) : null;
  }

  private nodeHistory(): Promise<readonly AgentLaunchHistoryEntry[]> {
    return this.dependencies.history.launchesOfNode().catch((error: unknown) => {
      console.warn(`Runtime fallback: this node's launch history could not be read (${String(error)}).`);
      return [] as const;
    });
  }

  private async askRouter(request: FallbackRequest, usable: readonly UsableRuntime[], history: readonly AgentLaunchHistoryEntry[]):
    Promise<RuntimeSwitchRequestOutcome> {
    if (!readModelRoutingEnabled()) return { kind: "failed", reason: "Model Routing is off" };
    const routerLaunch = readModelRouterLaunch();
    const routerExhausted = routerLaunch ? this.dependencies.exhaustion.isExhausted(routerLaunch.runtimeKind, routerLaunch.llmModelIdentifier) : null;
    if (routerExhausted) return { kind: "failed", reason: `the Model Router's own runtime is exhausted until ${routerExhausted.until}` };
    const since = new Date(this.now().getTime() - AGENT_LAUNCH_HISTORY_DAYS_MS);
    const earlierSwitches = await this.dependencies.switchRecords.recentOf(request.agentDefinitionId, since).catch(() => []);
    const outcome = await this.dependencies.router.requestSwitch({
      agentName: request.agentName, agentDescription: request.agentDescription, why: request.why, usable, history, earlierSwitches,
    }).catch((error: unknown) => ({ kind: "failed" as const, reason: `the switch request failed (${String(error)})` }));
    // The router's answer was checked against this same usable list when it was submitted.
    return outcome;
  }

  private async readFacts(): Promise<NodeRuntimesReading | null> {
    return this.dependencies.readNodeRuntimes().catch((error: unknown) => {
      console.warn(`Runtime fallback: this node's runtimes could not be read (${String(error)}).`);
      return null;
    });
  }

  private now(): Date { return this.dependencies.now?.() ?? new Date(); }
}
