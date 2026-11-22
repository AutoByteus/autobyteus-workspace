import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import {
  ASSIGNER_ONLY_REACTIVATION_MESSAGE, runReferenceOf, type NewTaskExecutionLinkInput, type PeerRunMember, type RunDelegatedFrom, type TaskExecutionRole,
} from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { ProjectError } from "./project-errors.js";

/**
 * One Task's record of one delegated run (contract §2.1): the one record of the delegation on this node. Never stores
 * liveness, shutdown state or descriptions. Persisted names differ (only the schema module knows them).
 */
export type TaskExecutionResource = Readonly<{
  role: TaskExecutionRole;
  /** Which run and which agent delegated the run (one hop). The same on every entry of one run. */
  delegatedFrom: RunDelegatedFrom;
  /** The address the run was delegated to (e.g. `/product_team`), its name under its delegating run; on every entry. */
  recipientAddress: string;
  execution: TaskExecutionReference;
  /** Only for a Team copy: its coordinator agent run (the Team's ingress). */
  teamCoordinatorAgentRunId?: string;
  linkedAt: string;
  start: "starting" | "started" | "failed";
  /** Only when `start` is `failed`. */
  startError?: Readonly<{ code: string; message: string }>;
  closedAt: string | null;
  /** Only for a run on a peer node: the node (absent means this node); this node cannot read that run. */
  nodeId?: string;
  /** Only for a team run on a peer node: its members. */
  members?: readonly PeerRunMember[];
  /**
   * autobyteus-591 DN-3: only on a run on a peer node, only when true: its delegation state is owed to its node (sent,
   * not yet confirmed). Set on the run's current entry, cleared from all its entries on the node's confirmation.
   */
  peerNoticeOwed?: true;
}>;
/** The delegator of an entry: who may continue it after a reopen and give it a follow-up Task (on `assigned`). */
export const assignerOf = (entry: TaskExecutionResource): string => entry.delegatedFrom.delegatorAgentRunId;
/** `<projectId>/tasks/<taskId>/agent_run_resources.json`. */
export type TaskExecutionResourceFile = Readonly<{ taskId: string; executionResources: readonly TaskExecutionResource[] }>;

export type TaskAssignmentOutcome = "accepted" | "not_confirmed" | "failed";
/** A Task's assignment of an Agent copy, by its agent run ID. */
export type AgentAssignmentView = Readonly<{ kind: "agent"; agentRunId: string; assignedBy: string; outcome: TaskAssignmentOutcome }>;
/** A Task's assignment of a Team copy: its team run ID and its coordinator's agent run ID. */
export type TeamAssignmentView = Readonly<{
  kind: "team"; teamRunId: string; teamCoordinatorAgentRunId: string; assignedBy: string; outcome: TaskAssignmentOutcome;
}>;
export type TaskAssignmentView = AgentAssignmentView | TeamAssignmentView;

export const emptyTaskExecutionResourceFile = (taskId: string): TaskExecutionResourceFile => ({ taskId, executionResources: [] });
/**
 * The copy's last entry in this file. A copy may have several entries in one file (one per
 * assignment period, A → B → A); only its last entry can be open, so every rule acts on it.
 */
export const latestEntryIndexOf = (file: TaskExecutionResourceFile, execution: TaskExecutionReference): number => {
  const key = taskExecutionReferenceKey(execution);
  for (let index = file.executionResources.length - 1; index >= 0; index -= 1) {
    if (taskExecutionReferenceKey(file.executionResources[index]!.execution) === key) return index;
  }
  return -1;
};
export const latestEntryOf = (file: TaskExecutionResourceFile, execution: TaskExecutionReference): TaskExecutionResource | undefined =>
  file.executionResources[latestEntryIndexOf(file, execution)];
/** Replaces only the copy's last entry in the file. */
const updateLatestEntry = (file: TaskExecutionResourceFile, execution: TaskExecutionReference,
  update: (entry: TaskExecutionResource) => TaskExecutionResource): TaskExecutionResourceFile => {
  const index = latestEntryIndexOf(file, execution);
  return { taskId: file.taskId, executionResources: file.executionResources.map((entry, at) => at === index ? update(entry) : entry) };
};
export const boundedError = (error: { code: string; message: string }) => ({
  code: error.code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 80),
  message: error.message.replace(/[\x00-\x1f]/g, " ").slice(0, 500),
});

const entryOf = (input: Readonly<{
  role: TaskExecutionRole; recipientAddress: string; delegatedFrom: RunDelegatedFrom;
  execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string; nodeId?: string; members?: readonly PeerRunMember[];
}>, now: string): TaskExecutionResource => {
  const team = "teamRunId" in input.execution;
  if (team && !input.teamCoordinatorAgentRunId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "A Team agent run needs its coordinator.");
  const { delegatingRun, delegatorAgentRunId } = input.delegatedFrom;
  return {
    role: input.role,
    delegatedFrom: { delegatingRun: { rootSubjectKind: delegatingRun.rootSubjectKind, rootRunId: delegatingRun.rootRunId } as typeof delegatingRun, delegatorAgentRunId },
    recipientAddress: input.recipientAddress,
    execution: "agentRunId" in input.execution ? { agentRunId: input.execution.agentRunId } : { teamRunId: input.execution.teamRunId },
    ...(team ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}),
    linkedAt: now, start: "starting", closedAt: null,
    ...(input.nodeId !== undefined ? { nodeId: input.nodeId, ...(input.members ? { members: input.members.map((member) => ({ ...member })) } : {}) } : {}),
  };
};

/**
 * Adds a `starting` entry for a new run. Preconditions are evaluated against the file content read under its lock: the
 * run is absent from the file, and sub-work's delegating run is present and open in it.
 */
export const linkNewTaskExecution = (file: TaskExecutionResourceFile, link: NewTaskExecutionLinkInput, now: string): TaskExecutionResourceFile => {
  if (latestEntryOf(file, link.execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is already linked to this Task.");
  if (link.role !== "assigned") {
    const creatorRun = runReferenceOf(link.delegatedFrom.delegatingRun);
    const creator = creatorRun ? latestEntryOf(file, creatorRun) : undefined;
    if (!creator || creator.closedAt !== null) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating Task agent run is closed (its Task is DONE or CANCELLED).");
  }
  return { taskId: file.taskId, executionResources: [...file.executionResources, entryOf(link, now)] };
};

/**
 * Assigns an existing copy to this Task: appends a new `starting` `assigned` entry (one entry per
 * assignment period). Precondition on the content read under the lock: every entry of the copy in
 * this file is closed. Earlier entries of the copy are kept exactly as they are.
 */
export const linkExistingTaskExecution = (file: TaskExecutionResourceFile, link: Readonly<{
  delegatedFrom: RunDelegatedFrom; recipientAddress: string; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string;
  /** A run on a peer node keeps its node, and a team run its members (autobyteus-591 DN-8). */
  nodeId?: string; members?: readonly PeerRunMember[];
}>, now: string): TaskExecutionResourceFile => {
  if (latestEntryOf(file, link.execution)?.closedAt === null) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "This task agent already works on this Task.");
  }
  return { taskId: file.taskId, executionResources: [...file.executionResources, entryOf({ ...link, role: "assigned" }, now)] };
};

/**
 * FU-003 (DS-007): a Team run on peer node `nodeId` changed its members there: every entry of this file naming that run on
 * that node takes them, and its coordinator. The same file back when no entry names it or nothing changes.
 */
export const setPeerRunMembers = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, nodeId: string,
  members: readonly PeerRunMember[], coordinatorAgentRunId: string): TaskExecutionResourceFile => {
  const key = taskExecutionReferenceKey(execution);
  const same = (entry: TaskExecutionResource) => entry.teamCoordinatorAgentRunId === coordinatorAgentRunId && entry.members?.length === members.length
    && entry.members.every((member, index) => member.address === members[index]!.address && member.agentRunId === members[index]!.agentRunId);
  const named = (entry: TaskExecutionResource) => entry.nodeId === nodeId && taskExecutionReferenceKey(entry.execution) === key;
  if (!file.executionResources.some((entry) => named(entry) && !same(entry))) return file;
  return { taskId: file.taskId, executionResources: file.executionResources.map((entry) => !named(entry) || same(entry) ? entry
    : { ...entry, teamCoordinatorAgentRunId: coordinatorAgentRunId, members: members.map((member) => ({ address: member.address, agentRunId: member.agentRunId })) }) };
};

/**
 * autobyteus-591 DN-3: the run's delegation state is owed to its peer node (`owed`: on its last entry in this file), or
 * no longer (cleared from every entry of the run in this file). The same file back when nothing changes.
 */
export const setPeerNoticeOwed = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, owed: boolean): TaskExecutionResourceFile => {
  if (owed) {
    const latest = latestEntryOf(file, execution);
    return !latest || latest.nodeId === undefined || latest.peerNoticeOwed ? file : updateLatestEntry(file, execution, (r) => ({ ...r, peerNoticeOwed: true }));
  }
  const key = taskExecutionReferenceKey(execution);
  if (!file.executionResources.some((r) => r.peerNoticeOwed && taskExecutionReferenceKey(r.execution) === key)) return file;
  return { taskId: file.taskId, executionResources: file.executionResources.map((r) => {
    if (!r.peerNoticeOwed || taskExecutionReferenceKey(r.execution) !== key) return r;
    const { peerNoticeOwed: _owed, ...rest } = r;
    return rest;
  }) };
};

/** `start` is set once on the copy's last entry; an entry that already started or failed is left unchanged. */
export const settleTaskExecutionStart = (file: TaskExecutionResourceFile, execution: TaskExecutionReference,
  outcome: { start: "started" } | { start: "failed"; error: { code: string; message: string } }): TaskExecutionResourceFile => {
  if (!latestEntryOf(file, execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  return updateLatestEntry(file, execution, r => r.start !== "starting" ? r
    : outcome.start === "started" ? { ...r, start: "started" } : { ...r, start: "failed", startError: boundedError(outcome.error) });
};

/**
 * DONE or CANCELLED: every open entry is closed. A closed entry stays closed until its assigner reactivates it
 * (`reopenTaskExecution`); helper entries never reopen.
 */
export const closeTaskExecutionResources = (file: TaskExecutionResourceFile, now: string): TaskExecutionResourceFile =>
  ({ taskId: file.taskId, executionResources: file.executionResources.map(r => r.closedAt === null ? { ...r, closedAt: now } : r) });

/**
 * Reactivation preconditions on the copy's last entry in the file: it is an `assigned` entry,
 * `requestedBy` is its assigner, and it started. Task status and "is it the copy's current Task" are
 * the caller's concern.
 */
export const assertTaskExecutionReopenable = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResource => {
  const entry = latestEntryOf(file, execution);
  if (!entry) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  if (entry.role !== "assigned" || assignerOf(entry) !== requestedBy) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
  if (entry.start !== "started") {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", "This task agent never started, so there is nothing to continue. Delegate the task again.");
  }
  return entry;
};
/** Reactivation: the copy's last entry is open again; every other entry is unchanged. An open entry returns the same file. */
export const reopenTaskExecution = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResourceFile => {
  if (assertTaskExecutionReopenable(file, execution, requestedBy).closedAt === null) return file;
  return updateLatestEntry(file, execution, r => ({ ...r, closedAt: null }));
};

/**
 * What the Task side knows about one copy across every Task: its current entry (open, else the
 * latest linked) with that Task, and whether any of its entries ever started.
 */
export type TaskExecutionHistory = Readonly<{ currentTaskId: string; current: TaskExecutionResource; everStarted: boolean }>;
const copyIdField = (execution: TaskExecutionReference): string => "agentRunId" in execution
  ? `target_agent_run_id "${execution.agentRunId}"` : `target_team_run_id "${execution.teamRunId}"`;
/**
 * Assign-existing eligibility on the copy's history (Task readability and status are the caller's). Only an
 * `assigned` copy, by its most recent assigner, that ever started; it may hold other open Tasks. Its closed
 * current Task is not given again this way (it is continued by a reopen); a Task it already holds open is
 * refused by `linkExistingTaskExecution`. `taskId` is compared; texts name Tasks by their agent-facing references.
 */
export const assertTaskExecutionAssignable = (history: TaskExecutionHistory | null,
  input: Readonly<{ requestedBy: string; taskId: string; taskReference: string; ownDelegatorAgentRunId?: string }>): void => {
  const requested = input.taskReference;
  const onlyAssigner = () => new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "Only the agent that gave this task agent its most recent Task can give it a new one. "
    + `Delegate Task ${requested} to a new task agent with recipient_address instead.`);
  if (!history) {
    // Every Task of the run was deleted: the delegator its own file names may give it a new Task (SR-072 F-24, U11).
    if (input.ownDelegatorAgentRunId === undefined) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", `This task agent has no Task; delegate Task ${requested} with recipient_address instead.`);
    if (input.ownDelegatorAgentRunId !== input.requestedBy) throw onlyAssigner();
    return;
  }
  const { current, currentTaskId } = history;
  if (current.role !== "assigned") {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "This task agent works on part of another agent's Task, so you can't give it a Task. "
      + `Delegate Task ${requested} to a new task agent with recipient_address.`);
  }
  if (assignerOf(current) !== input.requestedBy) throw onlyAssigner();
  if (current.closedAt !== null && currentTaskId === input.taskId) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", `This task agent already has Task ${requested}. To continue it, `
      + `set Task ${requested} to TODO or IN_PROGRESS, then message the task agent's run id (for a task agent team, its coordinator's run id).`);
  }
  if (!history.everStarted) {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", `This task agent never started, so it has no conversation to continue. Delegate Task ${requested} to a new task agent with recipient_address instead.`);
  }
};
/** The reopen refusal when the reopened Task is not the copy's current Task (REQ-007): names both by reference and the working next step. */
export const notCurrentTaskMessage = (execution: TaskExecutionReference, current: Readonly<{ taskReference: string; status: string }>, reopenedTaskReference: string): string =>
  `This task agent's current Task is ${current.taskReference} (${current.status}); setting Task ${reopenedTaskReference} to TODO or IN_PROGRESS does not reach it. `
  + `To have this task agent continue Task ${reopenedTaskReference}, call delegate_task with ${copyIdField(execution)} and task_id "${reopenedTaskReference}".`;

const outcomes: Record<TaskExecutionResource["start"], TaskAssignmentOutcome> = { started: "accepted", starting: "not_confirmed", failed: "failed" };
const assignmentView = (r: TaskExecutionResource): TaskAssignmentView => "agentRunId" in r.execution
  ? { kind: "agent", agentRunId: r.execution.agentRunId, assignedBy: assignerOf(r), outcome: outcomes[r.start] }
  : { kind: "team", teamRunId: r.execution.teamRunId, teamCoordinatorAgentRunId: r.teamCoordinatorAgentRunId!, assignedBy: assignerOf(r), outcome: outcomes[r.start] };
/** The Manager's read of open assignments (`assigned` entries not closed). */
export const openAssignments = (file: TaskExecutionResourceFile): TaskAssignmentView[] =>
  file.executionResources.filter(r => r.role === "assigned" && r.closedAt === null).map(assignmentView);
/** Every closed assignment period, in link order (a returning copy appears once per earlier period). */
export const closedAssignments = (file: TaskExecutionResourceFile): TaskAssignmentView[] =>
  file.executionResources.filter(r => r.role === "assigned" && r.closedAt !== null).map(assignmentView);
