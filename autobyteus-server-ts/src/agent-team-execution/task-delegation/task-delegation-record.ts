import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export const TASK_DELEGATION_LEDGER_STATUSES = [
  "not_started",
  "queued",
  "awaiting_acceptance",
  "accepted",
  "failed",
] as const;

export type TaskDelegationStatus =
  (typeof TASK_DELEGATION_LEDGER_STATUSES)[number];
export type TaskDelegationReportedTerminalStatus = "completed" | "failed";
export type TaskDelegationTerminalStatus = "accepted" | "failed";

export const isTaskDelegationTerminalStatus = (
  status: TaskDelegationStatus,
): status is TaskDelegationTerminalStatus =>
  status === "accepted" || status === "failed";

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

export type TaskDelegationDelegatorIdentity = TaskDelegationCallerIdentity;

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

export type MarkTaskCompletedInput = {
  message: string;
  reference_files?: string[];
};

export type MarkTaskFailedInput = {
  message: string;
  reference_files?: string[];
};

export type AcceptTaskInput = {
  task_id: string;
  message?: string | null;
};

export type TaskDelegationRecord = {
  taskId: string;
  taskLabel: string;
  description: string;
  status: TaskDelegationStatus;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: string[];
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  statusMessage: string | null;
  statusReferenceFiles: string[];
  acceptanceMessage: string | null;
  acceptedAt: string | null;
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
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  message: string | null;
  referenceFiles: string[];
  acceptanceMessage: string | null;
  acceptedAt: string | null;
  updatedAt: string;
  terminal: boolean;
};

export type TaskDelegationCompletionPayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  status: TaskDelegationReportedTerminalStatus;
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

export type TaskDelegationToolActionResult = {
  status: TaskDelegationStatus;
  terminal: boolean;
  message: string | null;
  reference_files_count: number;
  settlement_requested: boolean;
};

export type MarkTaskCompletedResult = TaskDelegationToolActionResult;
export type MarkTaskFailedResult = TaskDelegationToolActionResult;
export type AcceptTaskResult = TaskDelegationToolActionResult;

export class TaskDelegationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TaskDelegationError";
  }
}
