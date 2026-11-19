import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskRootStatus, TaskRootView } from "../domain/models.js";
import type { TaskExecutionResource, TaskExecutionResourceFile } from "../domain/task-execution-resources.js";

/**
 * The run's own live status, from its own root (composition-bound: the active root directory): `null` when the run is
 * not active. It never wakes anything.
 */
export type TaskWorkerStatusResolver = (execution: TaskExecutionReference) => TaskRootStatus | null;
/** The run at the top of a run's tree (`DelegationIndex.topOf`, composition-bound, SR-080): where its row is listed. */
export type TaskTopRunResolver = (execution: TaskExecutionReference) => RootExecutionIdentity;
/**
 * A worker's name from the address it was delegated to (composition-bound, SR-091: the one `displayNameOf` that names its
 * row and its own view); null when the address was not kept. Projects keeps to the neutral contracts.
 */
export type TaskDisplayNameResolver = (recipientAddress: string | null) => string | null;

/** The Task's root: its latest `assigned` entry (file order is link order); null when never assigned. */
export const latestAssignedEntry = (file: TaskExecutionResourceFile | null): TaskExecutionResource | null => {
  const entries = file?.executionResources ?? [];
  for (let index = entries.length - 1; index >= 0; index -= 1) if (entries[index]!.role === "assigned") return entries[index]!;
  return null;
};

/**
 * The worker's live status (DEC-006): `offline` when closed (Task DONE or CANCELLED), failed to start, or not active;
 * else its own root's answer. A run still `starting` whose root is up but has no live agent yet reads `initializing`.
 */
export const rootWorkerStatus = (entry: TaskExecutionResource, resolve: TaskWorkerStatusResolver): TaskRootStatus => {
  if (entry.closedAt !== null || entry.start === "failed") return "offline";
  let status: TaskRootStatus | null;
  try { status = entry.nodeId !== undefined ? null : resolve(entry.execution); }
  catch (error) { console.warn("TASK_ROOT_STATUS_UNAVAILABLE", error); return "offline"; }
  // Not active: a start left behind (the run's root never came up) reads offline, never a permanent Initializing.
  if (status === null) return "offline";
  return entry.start === "starting" && status === "offline" ? "initializing" : status;
};

/** Where the worker opens (G-F1): its agent run, or its team run at the coordinator recorded when it started; a peer's on its node. */
const openTargetOfEntry = (entry: TaskExecutionResource): TaskRootView["openTarget"] => {
  const node = entry.nodeId !== undefined ? { nodeId: entry.nodeId } : {};
  // The same target a run tree row of the worker carries (`openTargetOf`); Projects keeps to the neutral contracts.
  if ("agentRunId" in entry.execution) {
    const agentRunId = entry.execution.agentRunId;
    return { runKind: "agent", runId: agentRunId, agentRunId, ...node };
  }
  if (!entry.teamCoordinatorAgentRunId) {
    console.warn(`Row error: team run '${entry.execution.teamRunId}' has no recorded coordinator; its Task card has no open target.`);
    return null;
  }
  return { runKind: "agent_team", runId: entry.execution.teamRunId, agentRunId: entry.teamCoordinatorAgentRunId, ...node };
};

export const buildTaskRootView = (entry: TaskExecutionResource, resolve: TaskWorkerStatusResolver, topOf: TaskTopRunResolver,
  nameOf: TaskDisplayNameResolver): TaskRootView => {
  const team = "teamRunId" in entry.execution;
  const top = topOf(entry.execution);
  return {
    kind: team ? "team" : "agent",
    recipientAddress: entry.recipientAddress ?? null,
    displayName: nameOf(entry.recipientAddress ?? null),
    ingressAgentRunId: "agentRunId" in entry.execution ? entry.execution.agentRunId : entry.teamCoordinatorAgentRunId!,
    teamRunId: "teamRunId" in entry.execution ? entry.execution.teamRunId : null,
    delegatingRun: { kind: entry.delegatedFrom.delegatingRun.rootSubjectKind, runId: entry.delegatedFrom.delegatingRun.rootRunId },
    topRun: { kind: top.rootSubjectKind, runId: top.rootRunId },
    openTarget: openTargetOfEntry(entry),
    start: entry.start,
    startError: entry.startError ? { code: entry.startError.code, message: entry.startError.message } : null,
    closed: entry.closedAt !== null,
    status: rootWorkerStatus(entry, resolve),
  };
};
