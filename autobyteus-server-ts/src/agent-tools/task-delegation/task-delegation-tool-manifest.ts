import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  DelegateTasksInput,
  DelegateTasksResult,
  UpdateTaskStatusInput,
  UpdateTaskStatusResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  UPDATE_TASK_STATUS_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  parseDelegateTasksInput,
  parseUpdateTaskStatusInput,
} from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput = DelegateTasksInput | UpdateTaskStatusInput;
type TaskDelegationToolExecutionResult = DelegateTasksResult | UpdateTaskStatusResult;

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
    name: UPDATE_TASK_STATUS_TOOL_NAME,
    description:
      "Report progress/completion/failure for the delegated task bound to this task-agent instance, or accept a reported completion as the original delegator. Task-agent execution updates must not pass task selectors. Original-delegator acceptance must pass status=\"accepted\" with the framework-generated task_id from the completion notification.",
    parameterSchema: buildTaskDelegationToolParameterSchema(UPDATE_TASK_STATUS_TOOL_NAME),
    parseInput: parseUpdateTaskStatusInput,
    execute: (service, context, input) =>
      service.updateTaskStatus(context, input as UpdateTaskStatusInput),
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
