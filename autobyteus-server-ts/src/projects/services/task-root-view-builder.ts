import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskRootStatus, TaskRootView } from "../domain/models.js";
import type { TaskExecutionResource, TaskExecutionResourceFile } from "../domain/task-execution-resources.js";

/**
 * The hosting root's answer for a task execution's own live status (composition-bound: the active
 * root directory): `null` when that root is not active; an active root that does not know the run
 * (or no longer admits) answers `offline`. It never wakes anything.
 */
export type TaskWorkerStatusResolver = (hostRoot: RootExecutionIdentity, execution: TaskExecutionReference) => TaskRootStatus | null;

/** The Task's root: its latest `assigned` entry (file order is link order); null when never assigned. */
export const latestAssignedEntry = (file: TaskExecutionResourceFile | null): TaskExecutionResource | null => {
  const entries = file?.executionResources ?? [];
  for (let index = entries.length - 1; index >= 0; index -= 1) if (entries[index]!.role === "assigned") return entries[index]!;
  return null;
};

/**
 * The worker's live status (DEC-006): `offline` when closed (Task DONE or CANCELLED), failed to start, or its hosting
 * root is not active; else the hosting root's answer. A root still `starting` in an active host has
 * no live run yet and reads `initializing` (design: "Initializing while starting"); a start left
 * behind by a stopped host reads `offline`, never a permanent Initializing.
 */
export const rootWorkerStatus = (entry: TaskExecutionResource, resolve: TaskWorkerStatusResolver): TaskRootStatus => {
  if (entry.closedAt !== null || entry.start === "failed") return "offline";
  let status: TaskRootStatus | null;
  try { status = resolve(entry.hostRoot, entry.execution); }
  catch (error) { console.warn("TASK_ROOT_STATUS_UNAVAILABLE", error); return "offline"; }
  if (status === null) return "offline";
  return entry.start === "starting" && status === "offline" ? "initializing" : status;
};

export const buildTaskRootView = (entry: TaskExecutionResource, resolve: TaskWorkerStatusResolver): TaskRootView => {
  const team = "teamRunId" in entry.execution;
  return {
    kind: team ? "team" : "agent",
    recipientAddress: entry.recipientAddress ?? null,
    ingressAgentRunId: "agentRunId" in entry.execution ? entry.execution.agentRunId : entry.teamCoordinatorAgentRunId!,
    teamRunId: "teamRunId" in entry.execution ? entry.execution.teamRunId : null,
    hostRoot: { kind: entry.hostRoot.rootSubjectKind, runId: entry.hostRoot.rootRunId },
    start: entry.start,
    startError: entry.startError ? { code: entry.startError.code, message: entry.startError.message } : null,
    closed: entry.closedAt !== null,
    status: rootWorkerStatus(entry, resolve),
  };
};
