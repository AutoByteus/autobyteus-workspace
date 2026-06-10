import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  DelegateTasksInput,
  DelegateTasksResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  parseDelegateTasksInput,
  parseReviewTaskResultInput,
  parseSubmitTaskResultInput,
} from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput =
  | DelegateTasksInput
  | SubmitTaskResultInput
  | ReviewTaskResultInput;
type TaskDelegationToolExecutionResult =
  | DelegateTasksResult
  | SubmitTaskResultResult
  | ReviewTaskResultResult;

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
      "Delegate one or more ready-to-run task work packets to exact logical team members. The framework derives you as delegator from tool context and starts one concrete task-agent per task. Task-agents submit reviewable results with submit_task_result; delegators accept or request revision with review_task_result.",
    parameterSchema: buildTaskDelegationToolParameterSchema(DELEGATE_TASKS_TOOL_NAME),
    parseInput: parseDelegateTasksInput,
    execute: (service, context, input) =>
      service.delegateTasks(context, input as DelegateTasksInput),
  },
  {
    name: SUBMIT_TASK_RESULT_TOOL_NAME,
    description:
      "Submit a reviewable result for the delegated task bound to the current task-agent context. This tool is task-agent-only and selector-free: do not pass task_id, member_name, task_name, status, or generic completion fields. The system records the submission, moves the task to awaiting_review, and notifies the original delegator.",
    parameterSchema: buildTaskDelegationToolParameterSchema(SUBMIT_TASK_RESULT_TOOL_NAME),
    parseInput: parseSubmitTaskResultInput,
    execute: (service, context, input) =>
      service.submitTaskResult(context, input as SubmitTaskResultInput),
  },
  {
    name: REVIEW_TASK_RESULT_TOOL_NAME,
    description:
      "Review the latest pending result submission for a delegated task as the original delegator. Use decision=accept to finalize and request safe settlement, or decision=request_revision with a non-empty message to send system revision instructions to the same task-agent.",
    parameterSchema: buildTaskDelegationToolParameterSchema(REVIEW_TASK_RESULT_TOOL_NAME),
    parseInput: parseReviewTaskResultInput,
    execute: (service, context, input) =>
      service.reviewTaskResult(context, input as ReviewTaskResultInput),
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
