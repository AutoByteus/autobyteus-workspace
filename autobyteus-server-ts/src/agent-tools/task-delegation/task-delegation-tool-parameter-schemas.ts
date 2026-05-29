import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  UPDATE_TASK_STATUS_TOOL_NAME,
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
    description: "Required rich work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance. Put all task instructions here.",
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
      description: "One or more rich task envelopes to delegate. Each item must include member_name and non-empty description.",
      required: true,
      arrayItemSchema: buildTaskItemSchema(),
    }),
  ]);

export const buildUpdateTaskStatusParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "status",
      type: ParameterType.ENUM,
      description: "New task status. Use completed or failed for terminal reporting.",
      required: true,
      enumValues: ["in_progress", "completed", "failed"],
    }),
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Optional progress, completion, or failure message for the delegated task bound to this task-agent instance.",
      required: false,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional file or artifact paths relevant to this status update.",
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
  if (toolName === UPDATE_TASK_STATUS_TOOL_NAME) {
    return buildUpdateTaskStatusParameterSchema();
  }
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
