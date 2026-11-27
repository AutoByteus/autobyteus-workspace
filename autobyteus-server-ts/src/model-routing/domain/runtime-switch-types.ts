import type { UsageLimitReachedData } from "../../run-events/run-event-types.js";

/** A runtime and model, as a switch moves between them. */
export type SwitchLaunch = Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;

/** A runtime usable now and its usable models (installed, signed in, offered, not blocked, not exhausted). */
export type UsableRuntime = Readonly<{ runtimeKind: string; models: readonly string[] }>;

/** One agent definition's launches on one runtime and model in the last 30 days (C-8). */
export type AgentLaunchHistoryEntry = Readonly<{ runtimeKind: string; llmModelIdentifier: string; runs: number; lastUsedAt: string }>;

export type SwitchOutcomeKind = "switched" | "no_fallback" | "switch_failed";
export type SwitchChosenBy = "model_router" | "agent_history";

/**
 * One handled usage-limit event (autobyteus-646 C-2), in `<appData>/model-routing/switches_*.jsonl`. `to` is null when
 * there was no fallback, and so is `chosenBy` (nothing chose).
 */
export type SwitchRecord = Readonly<{
  at: string;
  agentRunId: string;
  agentDefinitionId: string;
  from: SwitchLaunch;
  to: SwitchLaunch | null;
  chosenBy: SwitchChosenBy | null;
  /** The router's one sentence, or "most used by this agent in the last 30 days". */
  reason: string | null;
  /** Why the router could not choose; null when it chose (or was not asked). */
  routerFailure: string | null;
  outcome: SwitchOutcomeKind;
}>;

/** What the Model Router is asked when an agent needs another runtime now (C-7). */
export type RuntimeSwitchRequest = Readonly<{
  agentName: string;
  agentDescription: string | null;
  why: UsageLimitReachedData;
  usable: readonly UsableRuntime[];
  history: readonly AgentLaunchHistoryEntry[];
  earlierSwitches: readonly SwitchRecord[];
}>;

/** The router's answer: a usable launch with its one-sentence reason, or why it could not choose. */
export type RuntimeSwitchRequestOutcome =
  | Readonly<{ kind: "chosen"; launch: SwitchLaunch; reason: string }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** How far back an agent's launches and earlier switches count (C-2 reads, C-8). */
export const AGENT_LAUNCH_HISTORY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
