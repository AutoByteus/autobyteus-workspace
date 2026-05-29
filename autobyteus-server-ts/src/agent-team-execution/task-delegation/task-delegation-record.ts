import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export const TASK_DELEGATION_MODEL_TOOL_STATUSES = [
  "in_progress",
  "completed",
  "failed",
] as const;

export const TASK_DELEGATION_LEDGER_STATUSES = [
  "not_started",
  "queued",
  ...TASK_DELEGATION_MODEL_TOOL_STATUSES,
] as const;

export type TaskDelegationModelToolStatus =
  (typeof TASK_DELEGATION_MODEL_TOOL_STATUSES)[number];
export type TaskDelegationStatus =
  (typeof TASK_DELEGATION_LEDGER_STATUSES)[number];
export type TaskDelegationTerminalStatus = "completed" | "failed";

export const isTaskDelegationTerminalStatus = (
  status: TaskDelegationStatus,
): status is TaskDelegationTerminalStatus =>
  status === "completed" || status === "failed";

export type TaskDelegationMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind | null;
};

export type TaskDelegationCallerIdentity = TaskDelegationMemberIdentity & {
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
};

export type TaskDelegationContext = {
  teamRunId: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  caller: TaskDelegationCallerIdentity;
  coordinatorMemberRouteKey?: string | null;
  members: TaskDelegationMemberIdentity[];
};

export type TaskDelegationTaskInput = {
  member_name: string;
  description: string;
  reference_files?: string[];
};

export type DelegateTasksInput = {
  tasks: TaskDelegationTaskInput[];
};

export type UpdateTaskStatusInput = {
  status: TaskDelegationModelToolStatus;
  message?: string | null;
  reference_files?: string[];
};

export type TaskDelegationRecord = {
  taskId: string;
  taskLabel: string;
  description: string;
  status: TaskDelegationStatus;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  referenceFiles: string[];
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  statusMessage: string | null;
  statusReferenceFiles: string[];
  createdAt: string;
  updatedAt: string;
  queuedAt: string | null;
  terminalAt: string | null;
};

export type TaskDelegationActivationResult = {
  memberName: string;
  taskCount: number;
  accepted: boolean;
  message?: string | null;
};

export type TaskDelegationActivationPayload = {
  teamRunId: string;
  member: TaskDelegationMemberIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity;
  taskIds: string[];
  tasks: Array<{
    taskId: string;
    taskLabel: string;
    status: TaskDelegationStatus;
  }>;
  activatedAt: string;
};

export type TaskDelegationStatusUpdatePayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  message: string | null;
  referenceFiles: string[];
  updatedAt: string;
  terminal: boolean;
};

export type TaskDelegationCompletionPayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  status: TaskDelegationTerminalStatus;
  message: string | null;
  referenceFiles: string[];
  completedAt: string;
};

export type DelegateTasksResult = {
  createdTasks: Array<{
    member_name: string;
    status: TaskDelegationStatus;
  }>;
  activationResults: TaskDelegationActivationResult[];
};

export type UpdateTaskStatusResult = {
  status: TaskDelegationStatus;
  terminal: boolean;
  message: string | null;
  reference_files_count: number;
  settlement_requested: boolean;
};

export class TaskDelegationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TaskDelegationError";
  }
}
