import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  MARK_TASK_COMPLETED_TOOL_NAME,
  MARK_TASK_FAILED_TOOL_NAME,
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

const buildTaskAgentResultParameterSchema = (toolName: "mark_task_completed" | "mark_task_failed"): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: `${toolName} requires a concise result message for the delegated task bound to this task-agent instance. Do not pass status, task_id, task_name, title, or any other task selector; the framework resolves the task from this task-agent context.`,
      required: true,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: "Optional file or artifact paths produced by or relevant to this task result.",
      required: false,
      arrayItemSchema: { type: "string" },
    }),
  ]);

export const buildMarkTaskCompletedParameterSchema = (): ParameterSchema =>
  buildTaskAgentResultParameterSchema(MARK_TASK_COMPLETED_TOOL_NAME);

export const buildMarkTaskFailedParameterSchema = (): ParameterSchema =>
  buildTaskAgentResultParameterSchema(MARK_TASK_FAILED_TOOL_NAME);

export const buildAcceptTaskParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Required generated Task ID from the framework completion notification. Only the original delegator for that task may call accept_task.",
      required: true,
    }),
    new ParameterDefinition({
      name: "message",
      type: ParameterType.STRING,
      description: "Optional acceptance note from the original delegator. Do not pass worker result fields or reference_files here.",
      required: false,
    }),
  ]);

export const buildTaskDelegationToolParameterSchema = (
  toolName: TaskDelegationToolName,
): ParameterSchema => {
  if (toolName === DELEGATE_TASKS_TOOL_NAME) {
    return buildDelegateTasksParameterSchema();
  }
  if (toolName === MARK_TASK_COMPLETED_TOOL_NAME) {
    return buildMarkTaskCompletedParameterSchema();
  }
  if (toolName === MARK_TASK_FAILED_TOOL_NAME) {
    return buildMarkTaskFailedParameterSchema();
  }
  if (toolName === ACCEPT_TASK_TOOL_NAME) {
    return buildAcceptTaskParameterSchema();
  }
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
