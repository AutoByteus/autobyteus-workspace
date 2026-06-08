import type {
  DelegateTasksInput,
  DelegateTasksResult,
  AcceptTaskInput,
  AcceptTaskResult,
  TaskDelegationContext,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

export const DELEGATE_TASKS_TOOL_NAME = "delegate_tasks";
export const ACCEPT_TASK_TOOL_NAME = "accept_task";

export const TASK_DELEGATION_TOOL_NAME_LIST = [
  DELEGATE_TASKS_TOOL_NAME,
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
  [ACCEPT_TASK_TOOL_NAME]: AcceptTaskInput;
};

export type TaskDelegationToolResults = {
  [DELEGATE_TASKS_TOOL_NAME]: DelegateTasksResult;
  [ACCEPT_TASK_TOOL_NAME]: AcceptTaskResult;
};

export type TaskDelegationToolErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};
