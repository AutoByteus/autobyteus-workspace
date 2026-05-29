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
    name: "task_name",
    type: ParameterType.STRING,
    description: "A unique, descriptive task name within this delegation ledger.",
    required: true,
  }),
  new ParameterDefinition({
    name: "assignee_name",
    type: ParameterType.STRING,
    description: "The exact team member name or member route key to receive this task.",
    required: true,
  }),
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "The full work packet description and context for the assignee.",
    required: true,
  }),
  new ParameterDefinition({
    name: "dependencies",
    type: ParameterType.ARRAY,
    description: "Optional task IDs or task names that must complete before this task runs.",
    required: false,
    arrayItemSchema: { type: "string" },
  }),
  new ParameterDefinition({
    name: "completion_criteria",
    type: ParameterType.STRING,
    description: "Optional concrete criteria the assignee should satisfy before reporting completion.",
    required: false,
  }),
  new ParameterDefinition({
    name: "expected_deliverables",
    type: ParameterType.ARRAY,
    description: "Optional expected deliverable names or descriptions.",
    required: false,
    arrayItemSchema: { type: "string" },
  }),
]);

const buildDeliverableSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: "file_path",
    type: ParameterType.STRING,
    description: "Path to a file or artifact produced for this task.",
    required: true,
  }),
  new ParameterDefinition({
    name: "summary",
    type: ParameterType.STRING,
    description: "Short summary of the deliverable content or change.",
    required: true,
  }),
]);

export const buildDelegateTasksParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "tasks",
      type: ParameterType.ARRAY,
      description: "One or more tasks to delegate. Use a one-item list for a single task.",
      required: true,
      arrayItemSchema: buildTaskItemSchema(),
    }),
  ]);

export const buildUpdateTaskStatusParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "task_id",
      type: ParameterType.STRING,
      description: "Exact task_id from the activation work packet.",
      required: true,
    }),
    new ParameterDefinition({
      name: "status",
      type: ParameterType.ENUM,
      description: "New task status. Use completed or failed for terminal reporting.",
      required: true,
      enumValues: ["in_progress", "completed", "failed"],
    }),
    new ParameterDefinition({
      name: "summary",
      type: ParameterType.STRING,
      description: "Optional progress/completion/failure summary.",
      required: false,
    }),
    new ParameterDefinition({
      name: "deliverables",
      type: ParameterType.ARRAY,
      description: "Optional file or artifact deliverables submitted with this update.",
      required: false,
      arrayItemSchema: buildDeliverableSchema(),
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
