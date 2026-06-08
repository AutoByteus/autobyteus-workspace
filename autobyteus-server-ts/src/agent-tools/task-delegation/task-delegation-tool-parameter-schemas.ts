import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
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
    description: "Required rich ready-to-run work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance. Put task instructions here, but do not encode dependencies; progress, blockers, completion reports, and revision feedback use send_message_to.",
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
      description: "One or more ready-to-run rich task envelopes to delegate. Each item must include member_name and non-empty description. Do not pass delegator; the framework derives the delegator from tool context. Task-agent communication after activation uses send_message_to; feedback to a concrete task-agent uses target_agent_run_id returned by the framework.",
      required: true,
      arrayItemSchema: buildTaskItemSchema(),
    }),
  ]);

export const buildAcceptTaskParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Required generated Task ID from delegate_tasks/activation events. Only the original delegator for that task may call accept_task.",
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
  if (toolName === ACCEPT_TASK_TOOL_NAME) {
    return buildAcceptTaskParameterSchema();
  }
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
