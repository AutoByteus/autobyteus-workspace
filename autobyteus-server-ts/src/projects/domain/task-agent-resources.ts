import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskAgentResourceLinkInput, TaskAgentResourceRole } from "../../agent-collaboration/execution/task/task-agent-resource-port.js";
import { ProjectError } from "./project-errors.js";

/** One agent run started for a Task. Never stores liveness, shutdown state, lineage or descriptions. */
export type TaskAgentResource = Readonly<{
  role: TaskAgentResourceRole;
  /** Only on `assigned`: the run that made the assignment. */
  assignedBy?: string;
  /**
   * Only on `assigned`: the address the assigner delegated to (e.g. `/product_team`), the root's
   * display name. Absent on assignments recorded before it was kept.
   */
  recipientAddress?: string;
  hostRoot: RootExecutionIdentity;
  agentRun: TaskExecutionReference;
  /** Only for a Team run: its coordinator, the ingress `delegate_task` returned. */
  coordinatorAgentRunId?: string;
  linkedAt: string;
  start: "starting" | "started" | "failed";
  /** Only when `start` is `failed`. */
  startError?: Readonly<{ code: string; message: string }>;
  closedAt: string | null;
}>;
/** `<projectId>/tasks/<taskId>/agent_run_resources.json`. */
export type TaskAgentResourceFile = Readonly<{ taskId: string; agentRunResources: readonly TaskAgentResource[] }>;

export type TaskAssignmentOutcome = "accepted" | "not_confirmed" | "failed";
export type TaskAssignment = Readonly<{
  targetAgentRunId: string; kind: "agent" | "team"; assignedBy: string; outcome: TaskAssignmentOutcome;
}>;

export const agentRunKey = (agentRun: TaskExecutionReference): string => taskExecutionReferenceKey(agentRun);
export const emptyTaskAgentResourceFile = (taskId: string): TaskAgentResourceFile => ({ taskId, agentRunResources: [] });
const find = (file: TaskAgentResourceFile, agentRun: TaskExecutionReference) =>
  file.agentRunResources.find(r => agentRunKey(r.agentRun) === agentRunKey(agentRun));
export const boundedError = (error: { code: string; message: string }) => ({
  code: error.code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 80),
  message: error.message.replace(/[\x00-\x1f]/g, " ").slice(0, 500),
});

/**
 * Adds a `starting` entry. Preconditions are evaluated against the file content read under its
 * lock: the agent run is new in the file, and an inherited entry's creator is present and open.
 */
export const linkTaskAgentResource = (file: TaskAgentResourceFile, link: TaskAgentResourceLinkInput, now: string): TaskAgentResourceFile => {
  if (find(file, link.agentRun)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is already linked to this Task.");
  if (link.role !== "assigned") {
    const creator = find(file, link.creator);
    if (!creator || creator.closedAt !== null) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating Task agent run is closed (its Task is DONE or CLOSED).");
  }
  const team = "teamRunId" in link.agentRun;
  if (team && !link.coordinatorAgentRunId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "A Team agent run needs its coordinator.");
  const entry: TaskAgentResource = {
    role: link.role,
    ...(link.role === "assigned" ? { assignedBy: link.assignedBy, ...(link.recipientAddress ? { recipientAddress: link.recipientAddress } : {}) } : {}),
    hostRoot: { rootSubjectKind: link.hostRoot.rootSubjectKind, rootRunId: link.hostRoot.rootRunId },
    agentRun: "agentRunId" in link.agentRun ? { agentRunId: link.agentRun.agentRunId } : { teamRunId: link.agentRun.teamRunId },
    ...(team ? { coordinatorAgentRunId: link.coordinatorAgentRunId } : {}),
    linkedAt: now, start: "starting", closedAt: null,
  };
  return { taskId: file.taskId, agentRunResources: [...file.agentRunResources, entry] };
};

/** `start` is set once; an entry that already started or failed is left unchanged. */
export const settleTaskAgentResourceStart = (file: TaskAgentResourceFile, agentRun: TaskExecutionReference,
  outcome: { start: "started" } | { start: "failed"; error: { code: string; message: string } }): TaskAgentResourceFile => {
  if (!find(file, agentRun)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  return { taskId: file.taskId, agentRunResources: file.agentRunResources.map(r =>
    agentRunKey(r.agentRun) !== agentRunKey(agentRun) || r.start !== "starting" ? r
      : outcome.start === "started" ? { ...r, start: "started" } : { ...r, start: "failed", startError: boundedError(outcome.error) }) };
};

/**
 * DONE or CLOSED: every open entry is closed. A closed entry stays closed until its assigner reactivates it
 * (`reopenTaskAgentResource`); helper entries never reopen.
 */
export const closeTaskAgentResources = (file: TaskAgentResourceFile, now: string): TaskAgentResourceFile =>
  ({ taskId: file.taskId, agentRunResources: file.agentRunResources.map(r => r.closedAt === null ? { ...r, closedAt: now } : r) });

export const ASSIGNER_ONLY_REACTIVATION_MESSAGE = "This Task work is closed. Only the run that assigned it can reactivate it: "
  + "move the Task to TODO or IN_PROGRESS with create_or_update_task, then message the run ID delegate_task returned.";
/**
 * Reactivation preconditions on the file content: the entry is an `assigned` entry of this Task,
 * `requestedBy` is its assigner, and it started. Task status is the caller's concern.
 */
export const assertTaskAgentResourceReopenable = (file: TaskAgentResourceFile, agentRun: TaskExecutionReference, requestedBy: string): TaskAgentResource => {
  const entry = find(file, agentRun);
  if (!entry) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  if (entry.role !== "assigned" || entry.assignedBy !== requestedBy) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
  if (entry.start !== "started") {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started, so there is nothing to reactivate. Delegate the work again.");
  }
  return entry;
};
/** Reactivation: the one assigned entry is open again; every other entry is unchanged. An open entry returns the same file. */
export const reopenTaskAgentResource = (file: TaskAgentResourceFile, agentRun: TaskExecutionReference, requestedBy: string): TaskAgentResourceFile => {
  if (assertTaskAgentResourceReopenable(file, agentRun, requestedBy).closedAt === null) return file;
  return { taskId: file.taskId, agentRunResources: file.agentRunResources.map(r =>
    agentRunKey(r.agentRun) === agentRunKey(agentRun) ? { ...r, closedAt: null } : r) };
};

const outcomes: Record<TaskAgentResource["start"], TaskAssignmentOutcome> = { started: "accepted", starting: "not_confirmed", failed: "failed" };
/** The Manager's read: open `assigned` entries only. */
export const currentAssignments = (file: TaskAgentResourceFile): TaskAssignment[] => file.agentRunResources
  .filter(r => r.role === "assigned" && r.closedAt === null)
  .map(r => ({
    targetAgentRunId: "agentRunId" in r.agentRun ? r.agentRun.agentRunId : r.coordinatorAgentRunId!,
    kind: "agentRunId" in r.agentRun ? "agent" as const : "team" as const,
    assignedBy: r.assignedBy!, outcome: outcomes[r.start],
  }));
