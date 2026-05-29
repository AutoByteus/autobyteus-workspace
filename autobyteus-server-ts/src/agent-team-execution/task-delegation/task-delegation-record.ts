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
};

export type TaskDelegationContext = {
  teamRunId: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  caller: TaskDelegationMemberIdentity;
  coordinatorMemberRouteKey?: string | null;
  members: TaskDelegationMemberIdentity[];
};

export type TaskDelegationTaskInput = {
  task_name: string;
  assignee_name: string;
  description: string;
  dependencies: string[];
  completion_criteria?: string | null;
  expected_deliverables: string[];
};

export type DelegateTasksInput = {
  tasks: TaskDelegationTaskInput[];
};

export type TaskDelegationDeliverable = {
  file_path: string;
  summary: string;
  author_agent_name: string;
  timestamp: string;
};

export type UpdateTaskStatusInput = {
  task_id: string;
  status: TaskDelegationModelToolStatus;
  summary?: string | null;
  deliverables: Array<{
    file_path: string;
    summary: string;
  }>;
};

export type TaskDelegationRecord = {
  taskId: string;
  taskName: string;
  description: string;
  status: TaskDelegationStatus;
  assignee: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  dependencyTaskIds: string[];
  completionCriteria: string | null;
  expectedDeliverables: string[];
  deliverables: TaskDelegationDeliverable[];
  terminalSummary: string | null;
  createdAt: string;
  updatedAt: string;
  queuedAt: string | null;
  terminalAt: string | null;
};

export type TaskDelegationActivationResult = {
  assignee: TaskDelegationMemberIdentity;
  taskIds: string[];
  accepted: boolean;
  message?: string | null;
};

export type TaskDelegationActivationPayload = {
  teamRunId: string;
  assignee: TaskDelegationMemberIdentity;
  taskIds: string[];
  tasks: Array<{
    taskId: string;
    taskName: string;
    status: TaskDelegationStatus;
    dependencyTaskIds: string[];
  }>;
  activatedAt: string;
};

export type TaskDelegationStatusUpdatePayload = {
  teamRunId: string;
  taskId: string;
  taskName: string;
  assignee: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  summary: string | null;
  deliverables: TaskDelegationDeliverable[];
  updatedAt: string;
  terminal: boolean;
};

export type TaskDelegationCompletionPayload = {
  teamRunId: string;
  taskId: string;
  taskName: string;
  assignee: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  status: TaskDelegationTerminalStatus;
  summary: string | null;
  deliverables: TaskDelegationDeliverable[];
  completedAt: string;
  activatedTaskIds: string[];
};

export type DelegateTasksResult = {
  createdTasks: Array<{
    task_id: string;
    task_name: string;
    assignee_name: string;
    status: TaskDelegationStatus;
    dependency_task_ids: string[];
  }>;
  activationResults: TaskDelegationActivationResult[];
};

export type UpdateTaskStatusResult = {
  task_id: string;
  task_name: string;
  status: TaskDelegationStatus;
  terminal: boolean;
  deliverables_count: number;
  activated_task_ids: string[];
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
