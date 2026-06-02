import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  AcceptTaskInput,
  AcceptTaskResult,
  DelegateTasksInput,
  DelegateTasksResult,
  MarkTaskCompletedInput,
  MarkTaskCompletedResult,
  MarkTaskFailedInput,
  MarkTaskFailedResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  MARK_TASK_COMPLETED_TOOL_NAME,
  MARK_TASK_FAILED_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  parseAcceptTaskInput,
  parseDelegateTasksInput,
  parseMarkTaskCompletedInput,
  parseMarkTaskFailedInput,
} from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput =
  | DelegateTasksInput
  | MarkTaskCompletedInput
  | MarkTaskFailedInput
  | AcceptTaskInput;
type TaskDelegationToolExecutionResult =
  | DelegateTasksResult
  | MarkTaskCompletedResult
  | MarkTaskFailedResult
  | AcceptTaskResult;

export type TaskDelegationToolManifestEntry = {
  name: TaskDelegationToolName;
  description: string;
  parameterSchema: ParameterSchema;
  parseInput: (rawArguments: Record<string, unknown>) => TaskDelegationToolParsedInput;
  execute: (
    service: TaskDelegationToolService,
    context: TaskDelegationToolContext,
    input: TaskDelegationToolParsedInput,
  ) => Promise<TaskDelegationToolExecutionResult>;
};

export const TASK_DELEGATION_TOOL_MANIFEST: TaskDelegationToolManifestEntry[] = [
  {
    name: DELEGATE_TASKS_TOOL_NAME,
    description:
      "Delegate one or more ready-to-run rich task work-packet envelopes to exact logical team members. When this tool is exposed to you, the framework derives you as the delegator from tool context; do not pass a delegator field. Do not encode dependencies in a task item; for dependent follow-up work, wait for the framework terminal/completion notification and then call delegate_tasks again.",
    parameterSchema: buildTaskDelegationToolParameterSchema(DELEGATE_TASKS_TOOL_NAME),
    parseInput: parseDelegateTasksInput,
    execute: (service, context, input) =>
      service.delegateTasks(context, input as DelegateTasksInput),
  },
  {
    name: MARK_TASK_COMPLETED_TOOL_NAME,
    description:
      "Report that the delegated task bound to this task-agent instance is completed and ready for the original delegator to accept. This tool is task-agent-only, requires a result message, may include reference_files, and must not pass status, task_id, task_name, title, or any task selector.",
    parameterSchema: buildTaskDelegationToolParameterSchema(MARK_TASK_COMPLETED_TOOL_NAME),
    parseInput: parseMarkTaskCompletedInput,
    execute: (service, context, input) =>
      service.markTaskCompleted(context, input as MarkTaskCompletedInput),
  },
  {
    name: MARK_TASK_FAILED_TOOL_NAME,
    description:
      "Report that the delegated task bound to this task-agent instance failed and cannot be completed. This tool is task-agent-only, requires a failure message, may include reference_files, and must not pass status, task_id, task_name, title, or any task selector.",
    parameterSchema: buildTaskDelegationToolParameterSchema(MARK_TASK_FAILED_TOOL_NAME),
    parseInput: parseMarkTaskFailedInput,
    execute: (service, context, input) =>
      service.markTaskFailed(context, input as MarkTaskFailedInput),
  },
  {
    name: ACCEPT_TASK_TOOL_NAME,
    description:
      "Accept a reported completed delegated task as its original delegator. Use the framework-generated task_id from the completion notification. This tool is not a worker result tool and does not accept status, reference_files, or task-agent result payloads; acceptance schedules settlement after safe idle gates.",
    parameterSchema: buildTaskDelegationToolParameterSchema(ACCEPT_TASK_TOOL_NAME),
    parseInput: parseAcceptTaskInput,
    execute: (service, context, input) =>
      service.acceptTask(context, input as AcceptTaskInput),
  },
];

export const getTaskDelegationToolManifestEntry = (
  toolName: TaskDelegationToolName,
): TaskDelegationToolManifestEntry => {
  const entry = TASK_DELEGATION_TOOL_MANIFEST.find(
    (candidate) => candidate.name === toolName,
  );
  if (!entry) {
    throw new Error(`Unknown task delegation tool '${toolName}'.`);
  }
  return entry;
};
