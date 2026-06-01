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
    description: "Required rich ready-to-run work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance. Put task instructions here, but do not encode dependencies; dependent follow-up work should be delegated later after the framework terminal/completion notification.",
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
      description: "One or more ready-to-run rich task envelopes to delegate. Each item must include member_name and non-empty description. Do not pass delegator; the framework derives the delegator from tool context. Do not encode dependencies; delegate dependent follow-up work later after the framework terminal/completion notification.",
      required: true,
      arrayItemSchema: buildTaskItemSchema(),
    }),
  ]);

export const buildUpdateTaskStatusParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "status",
      type: ParameterType.ENUM,
      description: "New task status. Task-agents use in_progress, completed, or failed for execution updates. Original delegators use accepted with task_id from the completion notification.",
      required: true,
      enumValues: ["in_progress", "completed", "failed", "accepted"],
    }),
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Required only with status=accepted. Use the generated Task ID from the framework completion notification; task-agents must not pass task_id for execution updates.",
      required: false,
    }),
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Optional progress, completion, failure, or acceptance message.",
      required: false,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional file or artifact paths relevant to task-agent execution updates. Do not pass reference_files with status=accepted.",
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
