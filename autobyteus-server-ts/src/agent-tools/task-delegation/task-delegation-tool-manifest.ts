import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  parseDelegateTaskInput,
  parseReviewTaskResultInput,
  parseSubmitTaskResultInput,
} from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput =
  | DelegateTaskInput
  | SubmitTaskResultInput
  | ReviewTaskResultInput;
type TaskDelegationToolExecutionResult =
  | DelegateTaskResult
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
    name: DELEGATE_TASK_TOOL_NAME,
    description:
      "Delegate one ready-to-run task to any mounted Agent or AgentTeam in the same rooted AgentTeam. recipient_address must be one exact canonical absolute non-root address beginning with '/'; relative, bare, traversal, and backslash forms are invalid. Provide complete task details in description and optional absolute local reference_files. Agent targets start one fresh task Agent; AgentTeam targets start one fresh task Team through its configured coordinator.",
    parameterSchema: buildTaskDelegationToolParameterSchema(DELEGATE_TASK_TOOL_NAME),
    parseInput: parseDelegateTaskInput,
    execute: (service, context, input) =>
      service.delegateTask(context, input as DelegateTaskInput),
  },
  {
    name: SUBMIT_TASK_RESULT_TOOL_NAME,
    description:
      "Submit a reviewable result for the delegated task bound to the current task-agent or task-team ingress context. Provide a non-empty message and optional reference_files containing absolute local file paths only. The system records the submission, moves the task to awaiting_review, and notifies the task review owner.",
    parameterSchema: buildTaskDelegationToolParameterSchema(SUBMIT_TASK_RESULT_TOOL_NAME),
    parseInput: parseSubmitTaskResultInput,
    execute: (service, context, input) =>
      service.submitTaskResult(context, input as SubmitTaskResultInput),
  },
  {
    name: REVIEW_TASK_RESULT_TOOL_NAME,
    description:
      "Review the latest pending result submission for a delegated task this execution owns for review. Use decision=accept to finalize and request safe settlement, or decision=request_revision with a non-empty task-result comment describing the needed revisions for the same task-agent or task-team execution instance. Optional reference_files must be absolute local file paths.",
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
