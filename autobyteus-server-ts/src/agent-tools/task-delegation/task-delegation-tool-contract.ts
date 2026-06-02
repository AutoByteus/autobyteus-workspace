import type {
  DelegateTasksInput,
  DelegateTasksResult,
  AcceptTaskInput,
  AcceptTaskResult,
  MarkTaskCompletedInput,
  MarkTaskCompletedResult,
  MarkTaskFailedInput,
  MarkTaskFailedResult,
  TaskDelegationContext,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

export const DELEGATE_TASKS_TOOL_NAME = "delegate_tasks";
export const MARK_TASK_COMPLETED_TOOL_NAME = "mark_task_completed";
export const MARK_TASK_FAILED_TOOL_NAME = "mark_task_failed";
export const ACCEPT_TASK_TOOL_NAME = "accept_task";

export const TASK_DELEGATION_TOOL_NAME_LIST = [
  DELEGATE_TASKS_TOOL_NAME,
  MARK_TASK_COMPLETED_TOOL_NAME,
  MARK_TASK_FAILED_TOOL_NAME,
  ACCEPT_TASK_TOOL_NAME,
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
  [MARK_TASK_COMPLETED_TOOL_NAME]: MarkTaskCompletedInput;
  [MARK_TASK_FAILED_TOOL_NAME]: MarkTaskFailedInput;
  [ACCEPT_TASK_TOOL_NAME]: AcceptTaskInput;
};

export type TaskDelegationToolResults = {
  [DELEGATE_TASKS_TOOL_NAME]: DelegateTasksResult;
  [MARK_TASK_COMPLETED_TOOL_NAME]: MarkTaskCompletedResult;
  [MARK_TASK_FAILED_TOOL_NAME]: MarkTaskFailedResult;
  [ACCEPT_TASK_TOOL_NAME]: AcceptTaskResult;
};

export type TaskDelegationToolErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};
