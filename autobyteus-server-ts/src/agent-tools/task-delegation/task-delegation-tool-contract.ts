import type {
  DelegateTasksInput,
  DelegateTasksResult,
  TaskDelegationContext,
  UpdateTaskStatusInput,
  UpdateTaskStatusResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

export const DELEGATE_TASKS_TOOL_NAME = "delegate_tasks";
export const UPDATE_TASK_STATUS_TOOL_NAME = "update_task_status";

export const TASK_DELEGATION_TOOL_NAME_LIST = [
  DELEGATE_TASKS_TOOL_NAME,
  UPDATE_TASK_STATUS_TOOL_NAME,
] as const;

export type TaskDelegationToolName =
  (typeof TASK_DELEGATION_TOOL_NAME_LIST)[number];

export const TASK_DELEGATION_TOOL_NAMES = new Set<string>(
  TASK_DELEGATION_TOOL_NAME_LIST,
);

export const isTaskDelegationToolName = (value: string | null | undefined): boolean =>
  typeof value === "string" && TASK_DELEGATION_TOOL_NAMES.has(value.trim());

export type TaskDelegationToolContext = TaskDelegationContext;

export type TaskDelegationToolInputs = {
  [DELEGATE_TASKS_TOOL_NAME]: DelegateTasksInput;
  [UPDATE_TASK_STATUS_TOOL_NAME]: UpdateTaskStatusInput;
};

export type TaskDelegationToolResults = {
  [DELEGATE_TASKS_TOOL_NAME]: DelegateTasksResult;
  [UPDATE_TASK_STATUS_TOOL_NAME]: UpdateTaskStatusResult;
};

export type TaskDelegationToolErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};
