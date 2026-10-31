import { isDeepStrictEqual } from "node:util";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import {
  effectiveCopyAgentLaunch,
  type TaskExecution,
  type UserLaunchSelection,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentTeamAddress } from "./agent-team-address.js";

/**
 * Pure policy of the per-instance user model choice on delegated copies
 * (DS-001): which records a change addresses, what each must have stopped, the launch it is
 * validated against, and the tree mutation. Roots supply their tree's lists; each copy's started
 * launch is its own recorded `source`.
 */

/** A copy's run identity: exactly one of the two. */
export type DelegatedRunReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

export type DelegatedLaunchSelectionValue = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

/** The stopped Agent root's own selection saved together with its copies' choices: it carries the agent runtime too (a host can switch). */
export type DelegatedHostSelectionValue = DelegatedLaunchSelectionValue & Readonly<{ runtimeKind: RuntimeKind }>;

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
  /** The launch the change is validated against: runtime and workspace stay; the current model is the effective one. */
  current: AgentLaunchConfiguration;
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
        current: effectiveCopyAgentLaunch({ started: task.source.launchConfiguration, agentSelection: task.userLaunchSelection }).launch };
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
      }).launch };
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
}>;

export const delegatedLaunchSelections = (
  targets: readonly Pick<DelegatedLaunchTarget, "scope" | "runId" | "selection">[],
  selectedAt: string,
): DelegatedLaunchSelections => {
  const agents = new Map<string, UserLaunchSelection>();
  const teams = new Map<string, UserLaunchSelection>();
  for (const target of targets) {
    const selection: UserLaunchSelection = Object.freeze({
      llmModelIdentifier: target.selection.llmModelIdentifier,
      llmConfig: target.selection.llmConfig === null ? null : structuredClone(target.selection.llmConfig),
      selectedAt,
    });
    (target.scope === "agent" ? agents : teams).set(target.runId, selection);
  }
  return Object.freeze({ agents, teams });
};

/**
 * Records the selections on a task-execution list (any depth). Only the selection fields change;
 * the started values (`source`) are never touched. A selection equal to the
 * recorded one (model and settings) keeps the record unchanged.
 */
export const applyDelegatedLaunchSelectionsToTaskExecutions = (
  tasks: readonly TaskExecution[],
  selections: DelegatedLaunchSelections,
): TaskExecution[] => tasks.map((task): TaskExecution => {
  if ("agentRunId" in task) {
    return withSelection(task, "userLaunchSelection", selections.agents.get(task.agentRunId));
  }
  return withSelection({
    ...task,
    members: task.members.map((member) => withSelection(member, "userLaunchSelection", selections.agents.get(member.agentRunId))),
    taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(task.taskExecutions, selections),
  }, "userTeamLaunchSelection", selections.teams.get(task.teamRunId));
});

const sameChoice = (left: UserLaunchSelection | undefined, right: UserLaunchSelection): boolean =>
  left !== undefined && left.llmModelIdentifier === right.llmModelIdentifier
  && isDeepStrictEqual(left.llmConfig, right.llmConfig);

const withSelection = <T extends object, K extends "userLaunchSelection" | "userTeamLaunchSelection">(
  record: T,
  key: K,
  selection: UserLaunchSelection | undefined,
): T => {
  if (!selection) return record;
  const current = (record as Record<string, unknown>)[key] as UserLaunchSelection | undefined;
  return sameChoice(current, selection) ? record : { ...record, [key]: selection };
};

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
  const placeholder: DelegatedLaunchSelectionValue = { llmModelIdentifier: "-", llmConfig: null };
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
