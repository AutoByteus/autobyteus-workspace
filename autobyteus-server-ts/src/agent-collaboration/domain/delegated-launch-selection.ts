import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import {
  effectiveCopyAgentLaunch,
  type TaskAgentExecution,
  type TaskExecution,
  type TaskTeamAgentExecution,
  type TaskTeamExecution,
  type UserLaunchSelection,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { applyRuntimeSelection, type RuntimeBindingState } from "../../run-history/domain/runtime-selection-rule.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentTeamAddress } from "./agent-team-address.js";

/**
 * Pure policy of the per-instance user model choice on delegated copies
 * (DS-001): which records a change addresses, what each must have stopped, the launch it is
 * validated against, and the tree mutation. Roots supply their tree's lists; each copy's started
 * launch is its own recorded `source`.
 */

/** A copy's run identity: exactly one of the two. */
export type DelegatedRunReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

/**
 * A user choice for one copy (or a stopped Agent root's own selection saved with its copies): the agent runtime to run on
 * (the copy's current one, the previous one for an undo, or another for a switch), the model and its settings.
 */
export type DelegatedLaunchSelectionValue = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

/** One requested change: an agent's own selection (`agentRunId`) or a Team-level one (`teamRunId`). */
export type DelegatedLaunchChange = Readonly<{
  agentRunId?: string | null;
  teamRunId?: string | null;
  selection: DelegatedLaunchSelectionValue;
}>;

/** Every place a tree records delegated copies. */
export type DelegatedLaunchForest = Readonly<{
  /** Every task-execution list of the tree (root and mounted Teams), as `taskExecutionListsOf`. */
  taskExecutionLists: readonly (readonly TaskExecution[])[];
}>;

/**
 * What must be stopped (offline) for a change to be saved (AR-001): a task copy is one unit (a
 * member of a Team copy is editable only while the whole copy is stopped).
 */
export type DelegatedStopUnit = Readonly<{ kind: "task_execution"; reference: DelegatedRunReference }>;

export type DelegatedLaunchTarget = Readonly<{
  /** Index of the change in the request. */
  index: number;
  scope: "agent" | "team";
  runId: string;
  address: AgentTeamAddress;
  /** The launch the change is validated against: the effective agent runtime, model and workspace of the copy right now. */
  current: AgentLaunchConfiguration;
  /** The copy's pending agent runtime switch before this save, if any (its pending model has never run). */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
  selection: DelegatedLaunchSelectionValue;
  stopUnit: DelegatedStopUnit;
}>;

export class DelegatedLaunchTargetError extends Error {
  constructor(readonly index: number, message: string) {
    super(message);
    this.name = "DelegatedLaunchTargetError";
  }
}

/** Every task execution of the forest at any depth. */
const visitTaskExecutions = (
  forest: DelegatedLaunchForest,
  visit: (execution: TaskExecution) => void,
): void => {
  const visitTask = (task: TaskExecution): void => {
    visit(task);
    if ("teamRunId" in task) task.taskExecutions.forEach(visitTask);
  };
  forest.taskExecutionLists.forEach((list) => list.forEach(visitTask));
};

/**
 * Resolves each change to exactly one open copy record of the forest, its stop
 * unit and its current effective launch. Throws `DelegatedLaunchTargetError` for a change that
 * names no delegated copy (a configured member or the root, an unknown or closed
 * run), names both or neither identity, or repeats a target.
 */
export const resolveDelegatedLaunchTargets = (input: Readonly<{
  forest: DelegatedLaunchForest;
  changes: readonly DelegatedLaunchChange[];
  /** Closed copies (Task DONE or CANCELLED) are not editable. */
  isClosed?: (reference: DelegatedRunReference) => boolean;
}>): readonly DelegatedLaunchTarget[] => {
  const seen = new Set<string>();
  return Object.freeze(input.changes.map((change, index): DelegatedLaunchTarget => {
    const agentRunId = change.agentRunId?.trim() || null;
    const teamRunId = change.teamRunId?.trim() || null;
    if ((agentRunId === null) === (teamRunId === null)) {
      throw new DelegatedLaunchTargetError(index, "Each change names exactly one of agentRunId or teamRunId.");
    }
    const key = agentRunId ? `agent:${agentRunId}` : `team:${teamRunId}`;
    if (seen.has(key)) throw new DelegatedLaunchTargetError(index, `The change for '${agentRunId ?? teamRunId}' is repeated.`);
    seen.add(key);
    const target = agentRunId
      ? resolveAgentTarget(input, agentRunId)
      : resolveTeamTarget(input, teamRunId!);
    if (!target) {
      throw new DelegatedLaunchTargetError(index, `'${agentRunId ?? teamRunId}' is not an open delegated copy of this run.`);
    }
    if (input.isClosed?.(target.stopUnit.reference)) {
      throw new DelegatedLaunchTargetError(index, `'${agentRunId ?? teamRunId}' belongs to closed Task work.`);
    }
    return Object.freeze({ ...target, index, selection: change.selection });
  }));
};

type ResolvedTarget = Omit<DelegatedLaunchTarget, "index" | "selection">;

const resolveAgentTarget = (
  input: Parameters<typeof resolveDelegatedLaunchTargets>[0],
  agentRunId: string,
): ResolvedTarget | null => {
  let found: ResolvedTarget | null = null;
  visitTaskExecutions(input.forest, (task) => {
    if (found) return;
    if ("agentRunId" in task) {
      if (task.agentRunId !== agentRunId) return;
      found = { scope: "agent", runId: agentRunId, address: task.address,
        stopUnit: { kind: "task_execution", reference: { agentRunId } },
        current: effectiveCopyAgentLaunch({ started: task.source.launchConfiguration, agentSelection: task.userLaunchSelection }).launch,
        ...(task.pendingRuntimeSwitch ? { pendingRuntimeSwitch: task.pendingRuntimeSwitch } : {}) };
      return;
    }
    const member = task.members.find((candidate) => candidate.agentRunId === agentRunId);
    const recorded = member && task.source.members.find((candidate) => candidate.address === member.address);
    if (!member || !recorded) return;
    found = { scope: "agent", runId: agentRunId, address: member.address,
      stopUnit: { kind: "task_execution", reference: { teamRunId: task.teamRunId } },
      current: effectiveCopyAgentLaunch({
        started: recorded.launchConfiguration,
        followsTeam: recorded.followsTeam,
        teamSelection: task.userTeamLaunchSelection,
        agentSelection: member.userLaunchSelection,
      }).launch,
      ...(member.pendingRuntimeSwitch ? { pendingRuntimeSwitch: member.pendingRuntimeSwitch } : {}) };
  });
  return found;
};

const resolveTeamTarget = (
  input: Parameters<typeof resolveDelegatedLaunchTargets>[0],
  teamRunId: string,
): ResolvedTarget | null => {
  let found: ResolvedTarget | null = null;
  visitTaskExecutions(input.forest, (task) => {
    if (found || !("teamRunId" in task) || task.teamRunId !== teamRunId) return;
    found = { scope: "team", runId: teamRunId, address: task.address,
      stopUnit: { kind: "task_execution", reference: { teamRunId } },
      current: effectiveCopyAgentLaunch({ started: task.source.defaultLaunchConfiguration, followsTeam: true, teamSelection: task.userTeamLaunchSelection }).launch };
  });
  return found;
};

/** The selections to record, keyed by run ID; the validated (normalized) selection of each target. */
export type DelegatedLaunchSelections = Readonly<{
  agents: ReadonlyMap<string, UserLaunchSelection>;
  teams: ReadonlyMap<string, UserLaunchSelection>;
  /** Names a NEW pending switch a save records (autobyteus-348); a switch already pending keeps its own. */
  newSwitchId: () => string;
}>;

export const delegatedLaunchSelections = (
  targets: readonly Pick<DelegatedLaunchTarget, "scope" | "runId" | "selection">[],
  selectedAt: string,
  newSwitchId: () => string = randomUUID,
): DelegatedLaunchSelections => {
  const agents = new Map<string, UserLaunchSelection>();
  const teams = new Map<string, UserLaunchSelection>();
  for (const target of targets) {
    const selection: UserLaunchSelection = Object.freeze({
      runtimeKind: target.selection.runtimeKind,
      llmModelIdentifier: target.selection.llmModelIdentifier,
      llmConfig: target.selection.llmConfig === null ? null : structuredClone(target.selection.llmConfig),
      selectedAt,
    });
    (target.scope === "agent" ? agents : teams).set(target.runId, selection);
  }
  return Object.freeze({ agents, teams, newSwitchId });
};

/**
 * Records the selections on a task-execution list (any depth). The user's choice is recorded beside the started values
 * (`source`), which are never touched; a choice whose runtime is the started one carries no runtime. Every member whose
 * effective agent runtime changes through a choice (its own, or its Team's for a follower) also gets the shared switch rule
 * applied (autobyteus-348): a pending switch with the previous effective binding, no session ID, the undo when the previous
 * runtime is chosen again. The save reads no memory: whether there is a conversation to carry over is decided at activation.
 * A selection equal to the recorded one keeps the record unchanged.
 */
export const applyDelegatedLaunchSelectionsToTaskExecutions = (
  tasks: readonly TaskExecution[],
  selections: DelegatedLaunchSelections,
): TaskExecution[] => tasks.map((task): TaskExecution => {
  if ("agentRunId" in task) return applyToAgentCopy(task, selections);
  return applyToTeamCopy(task, selections);
});

/** The effective binding of a copy member as its record states it (the choice already applied) with its session ID. */
const bindingStateOf = (
  launch: AgentLaunchConfiguration,
  record: Readonly<{ platformAgentRunId: string | null; pendingRuntimeSwitch?: PendingRuntimeSwitch }>,
): RuntimeBindingState => ({
  binding: { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig, platformAgentRunId: record.platformAgentRunId },
  ...(record.pendingRuntimeSwitch ? { pendingRuntimeSwitch: record.pendingRuntimeSwitch } : {}),
});

/** A record with its session ID and pending switch replaced by the rule's result (the pending key is absent when none). */
const withSwitchState = <T extends Readonly<{ platformAgentRunId: string | null; pendingRuntimeSwitch?: PendingRuntimeSwitch }>>(
  record: T,
  next: RuntimeBindingState,
): T => {
  const { pendingRuntimeSwitch: _pending, ...rest } = record;
  return { ...rest, platformAgentRunId: next.binding.platformAgentRunId, ...(next.pendingRuntimeSwitch ? { pendingRuntimeSwitch: next.pendingRuntimeSwitch } : {}) } as unknown as T;
};

/** The choice as recorded: the runtime is written only when it is not the started one. */
const recordedChoice = (selection: UserLaunchSelection, started: AgentLaunchConfiguration): UserLaunchSelection => {
  const { runtimeKind, ...rest } = selection;
  return runtimeKind !== undefined && runtimeKind !== started.runtimeKind ? { runtimeKind, ...rest } : rest;
};

const applyToAgentCopy = (task: TaskAgentExecution, selections: DelegatedLaunchSelections): TaskAgentExecution => {
  const selection = selections.agents.get(task.agentRunId);
  if (!selection) return task;
  const started = task.source.launchConfiguration;
  const before = effectiveCopyAgentLaunch({ started, agentSelection: task.userLaunchSelection }).launch;
  const next = applyRuntimeSelection(bindingStateOf(before, task), recordedSelection(selection, started), selections.newSwitchId());
  const choice = recordedChoice(selection, started);
  const unchangedChoice = sameChoice(task.userLaunchSelection, choice);
  const unchangedSwitch = next.binding.platformAgentRunId === task.platformAgentRunId && isDeepStrictEqual(next.pendingRuntimeSwitch, task.pendingRuntimeSwitch);
  if (unchangedChoice && unchangedSwitch) return task;
  return withSwitchState({ ...task, userLaunchSelection: unchangedChoice ? task.userLaunchSelection : choice }, next);
};

const recordedSelection = (selection: UserLaunchSelection, started: AgentLaunchConfiguration) => ({
  runtimeKind: selection.runtimeKind ?? started.runtimeKind,
  llmModelIdentifier: selection.llmModelIdentifier,
  llmConfig: selection.llmConfig,
});

const applyToTeamCopy = (task: TaskTeamExecution, selections: DelegatedLaunchSelections): TaskTeamExecution => {
  const teamChoice = selections.teams.get(task.teamRunId);
  const nextTeamSelection = teamChoice && !sameChoice(task.userTeamLaunchSelection, recordedChoice(teamChoice, task.source.defaultLaunchConfiguration))
    ? recordedChoice(teamChoice, task.source.defaultLaunchConfiguration)
    : task.userTeamLaunchSelection;
  const members = task.members.map((member) => applyToTeamMember(task, member, nextTeamSelection, selections));
  return {
    ...task,
    ...(nextTeamSelection ? { userTeamLaunchSelection: nextTeamSelection } : {}),
    members,
    taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(task.taskExecutions, selections),
  };
};

const applyToTeamMember = (
  task: TaskTeamExecution,
  member: TaskTeamAgentExecution,
  teamSelection: UserLaunchSelection | undefined,
  selections: DelegatedLaunchSelections,
): TaskTeamAgentExecution => {
  const recorded = task.source.members.find((candidate) => candidate.address === member.address);
  if (!recorded) return member;
  const started = recorded.launchConfiguration;
  const own = selections.agents.get(member.agentRunId);
  const ownChoice = own ? recordedChoice(own, started) : undefined;
  const nextOwn = ownChoice && !sameChoice(member.userLaunchSelection, ownChoice) ? ownChoice : member.userLaunchSelection;
  const rule = (agentSelection: UserLaunchSelection | undefined, team: UserLaunchSelection | undefined) =>
    effectiveCopyAgentLaunch({ started, followsTeam: recorded.followsTeam, teamSelection: team, agentSelection }).launch;
  const before = rule(member.userLaunchSelection, task.userTeamLaunchSelection);
  const after = rule(nextOwn, teamSelection);
  const changedChoice = nextOwn !== member.userLaunchSelection;
  const reachedByTeam = teamSelection !== task.userTeamLaunchSelection && member.userLaunchSelection === undefined && recorded.followsTeam;
  if (!changedChoice && !reachedByTeam) return member;
  const next = applyRuntimeSelection(bindingStateOf(before, member), after, selections.newSwitchId());
  const unchangedSwitch = next.binding.platformAgentRunId === member.platformAgentRunId && isDeepStrictEqual(next.pendingRuntimeSwitch, member.pendingRuntimeSwitch);
  if (!changedChoice && unchangedSwitch) return member;
  return withSwitchState(changedChoice ? { ...member, userLaunchSelection: nextOwn } : member, next);
};

const sameChoice = (left: UserLaunchSelection | undefined, right: UserLaunchSelection): boolean =>
  left !== undefined && left.runtimeKind === right.runtimeKind && left.llmModelIdentifier === right.llmModelIdentifier
  && isDeepStrictEqual(left.llmConfig, right.llmConfig);

/** One saved choice as recorded on its copy record, for the live view (DS-001). */
export type DelegatedLaunchSelectionRecord = Readonly<{ reference: DelegatedRunReference; selection: UserLaunchSelection }>;

/**
 * The choices of these selections' run IDs as the forest now records them (a selection equal to
 * the recorded one kept the earlier record), in copy order.
 */
export const recordedDelegatedLaunchSelections = (
  forest: DelegatedLaunchForest,
  selections: DelegatedLaunchSelections,
): readonly DelegatedLaunchSelectionRecord[] => {
  const records: DelegatedLaunchSelectionRecord[] = [];
  const agent = (agentRunId: string, selection: UserLaunchSelection | undefined): void => {
    if (selection && selections.agents.has(agentRunId)) records.push({ reference: { agentRunId }, selection });
  };
  const team = (teamRunId: string, selection: UserLaunchSelection | undefined): void => {
    if (selection && selections.teams.has(teamRunId)) records.push({ reference: { teamRunId }, selection });
  };
  visitTaskExecutions(forest, (task) => {
    if ("agentRunId" in task) { agent(task.agentRunId, task.userLaunchSelection); return; }
    team(task.teamRunId, task.userTeamLaunchSelection);
    task.members.forEach((member) => agent(member.agentRunId, member.userLaunchSelection));
  });
  return Object.freeze(records);
};

/**
 * Every editable copy of the forest (agent-level and Team-level) with its current
 * effective launch, for the options query. Closed copies are left out.
 */
export const listDelegatedLaunchTargets = (input: Readonly<{
  forest: DelegatedLaunchForest;
  isClosed?: (reference: DelegatedRunReference) => boolean;
}>): readonly Omit<DelegatedLaunchTarget, "index" | "selection">[] => {
  const references: DelegatedRunReference[] = [];
  visitTaskExecutions(input.forest, (task) => {
    if ("agentRunId" in task) { references.push({ agentRunId: task.agentRunId }); return; }
    references.push({ teamRunId: task.teamRunId });
    task.members.forEach((member) => references.push({ agentRunId: member.agentRunId }));
  });
  const placeholder: DelegatedLaunchSelectionValue = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "-", llmConfig: null };
  return Object.freeze(references.flatMap((reference) => {
    try {
      const [target] = resolveDelegatedLaunchTargets({ ...input, changes: [{ ...reference, selection: placeholder }] });
      const { index: _index, selection: _selection, ...rest } = target!;
      return [Object.freeze(rest)];
    } catch (error) {
      if (error instanceof DelegatedLaunchTargetError) return [];
      throw error;
    }
  }));
};
