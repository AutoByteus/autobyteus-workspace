import type {
  DelegateTasksInput,
  DelegateTasksResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
  TaskDelegationContext,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

export const DELEGATE_TASKS_TOOL_NAME = "delegate_tasks";
export const SUBMIT_TASK_RESULT_TOOL_NAME = "submit_task_result";
export const REVIEW_TASK_RESULT_TOOL_NAME = "review_task_result";

export const TASK_DELEGATION_TOOL_NAME_LIST = [
  DELEGATE_TASKS_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
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
  [SUBMIT_TASK_RESULT_TOOL_NAME]: SubmitTaskResultInput;
  [REVIEW_TASK_RESULT_TOOL_NAME]: ReviewTaskResultInput;
};

export type TaskDelegationToolResults = {
  [DELEGATE_TASKS_TOOL_NAME]: DelegateTasksResult;
  [SUBMIT_TASK_RESULT_TOOL_NAME]: SubmitTaskResultResult;
  [REVIEW_TASK_RESULT_TOOL_NAME]: ReviewTaskResultResult;
};

export type TaskDelegationToolErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};
