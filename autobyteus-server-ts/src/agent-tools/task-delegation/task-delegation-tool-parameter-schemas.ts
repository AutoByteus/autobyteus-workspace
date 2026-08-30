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
import {
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
  DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
} from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

export const buildDelegateTaskParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: "recipient_address",
    type: ParameterType.STRING,
    description: DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
    required: true,
  }),
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
    required: true,
  }),
  new ParameterDefinition({
    name: "reference_files",
    type: ParameterType.ARRAY,
    description: DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
    required: false,
    arrayItemSchema: { type: "string" },
  }),
]);

export const buildSubmitTaskResultParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Required reviewable result message for the task bound to the current task-agent or task-team ingress context.",
      required: true,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional absolute local file paths that support this submitted result. Use full filesystem paths, for example paths returned by file-writing tools or `realpath`; relative paths and URLs are rejected.",
      required: false,
      arrayItemSchema: { type: "string" },
    }),
  ]);

export const buildReviewTaskResultParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Required generated Task ID whose latest pending submission is being reviewed. Only the task review owner may review.",
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
      name: "comment",
      type: ParameterType.STRING,
      description: "Task-result review comment. Required when decision is request_revision; optional acceptance feedback when decision is accept.",
      required: false,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional absolute local file paths for revision instructions or acceptance context. Use full filesystem paths, for example paths returned by file-writing tools or `realpath`; relative paths and URLs are rejected.",
      required: false,
      arrayItemSchema: { type: "string" },
    }),
  ]);

export const buildTaskDelegationToolParameterSchema = (
  toolName: TaskDelegationToolName,
): ParameterSchema => {
  if (toolName === DELEGATE_TASK_TOOL_NAME) return buildDelegateTaskParameterSchema();
  if (toolName === SUBMIT_TASK_RESULT_TOOL_NAME) return buildSubmitTaskResultParameterSchema();
  if (toolName === REVIEW_TASK_RESULT_TOOL_NAME) return buildReviewTaskResultParameterSchema();
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
