import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";

export const buildDelegateTaskParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: "member_name",
    type: ParameterType.STRING,
    description: "Exact logical team member/template name from the current team roster to receive this delegated task.",
    required: true,
  }),
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "Complete ready-to-run work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance.",
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

export const buildSubmitTaskResultParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Required reviewable result message for the task bound to the current task-agent context.",
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
  if (toolName === DELEGATE_TASK_TOOL_NAME) {
    return buildDelegateTaskParameterSchema();
  }
  if (toolName === SUBMIT_TASK_RESULT_TOOL_NAME) {
    return buildSubmitTaskResultParameterSchema();
  }
  if (toolName === REVIEW_TASK_RESULT_TOOL_NAME) {
    return buildReviewTaskResultParameterSchema();
  }
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
