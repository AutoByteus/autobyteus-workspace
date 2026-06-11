import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";

const buildTaskItemSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: "member_name",
    type: ParameterType.STRING,
    description: "Exact logical team member/template name from the current team roster to receive this delegated task.",
    required: true,
  }),
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "Required rich ready-to-run work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance. Put task instructions here, but do not encode dependencies or lifecycle result/review fields.",
    required: true,
  }),
  new ParameterDefinition({
    name: "reference_files",
    type: ParameterType.ARRAY,
    description: "Optional file/artifact paths or references the task-agent should inspect.",
    required: false,
    arrayItemSchema: { type: "string" },
  }),
]);

export const buildDelegateTasksParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "tasks",
      type: ParameterType.ARRAY,
      description: "One or more ready-to-run rich task envelopes to delegate. Each item must include member_name and non-empty description. Do not pass delegator, task_name, dependencies, completion_criteria, expected_deliverables, or status; the framework derives the delegator from tool context. Task-agent results are submitted later with submit_task_result.",
      required: true,
      arrayItemSchema: buildTaskItemSchema(),
    }),
  ]);

export const buildSubmitTaskResultParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Required reviewable result message for the task bound to the current task-agent context. Do not pass task_id, task_name, member_name, status, or other selectors.",
      required: true,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional file/artifact paths or references that support this submitted result.",
      required: false,
      arrayItemSchema: { type: "string" },
    }),
  ]);

export const buildReviewTaskResultParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Required generated Task ID whose latest pending submission is being reviewed. Only the original delegator may review.",
      required: true,
    }),
    new ParameterDefinition({
      name: "decision",
      type: ParameterType.ENUM,
      enumValues: ["accept", "request_revision"],
      description: "Review decision for the latest pending submission. Use accept to finalize the task, or request_revision to return it to active work with system-delivered revision instructions.",
      required: true,
    }),
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Required when decision is request_revision; optional acceptance note when decision is accept.",
      required: false,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional file/artifact paths or references for revision instructions or acceptance context.",
      required: false,
      arrayItemSchema: { type: "string" },
    }),
  ]);

export const buildTaskDelegationToolParameterSchema = (
  toolName: TaskDelegationToolName,
): ParameterSchema => {
  if (toolName === DELEGATE_TASKS_TOOL_NAME) {
    return buildDelegateTasksParameterSchema();
  }
  if (toolName === SUBMIT_TASK_RESULT_TOOL_NAME) {
    return buildSubmitTaskResultParameterSchema();
  }
  if (toolName === REVIEW_TASK_RESULT_TOOL_NAME) {
    return buildReviewTaskResultParameterSchema();
  }
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
