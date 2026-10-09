import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_ID_DESCRIPTION,
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
  DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
  DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION,
  DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION,
} from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

export const buildDelegateTaskParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: "recipient_address",
    type: ParameterType.STRING,
    description: DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
    required: false,
  }),
  new ParameterDefinition({ name: "target_team_run_id", type: ParameterType.STRING, description: DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION, required: false }),
  new ParameterDefinition({ name: "target_agent_run_id", type: ParameterType.STRING, description: DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION, required: false }),
  new ParameterDefinition({ name: "task_id", type: ParameterType.STRING, description: DELEGATE_TASK_ID_DESCRIPTION, required: false }),
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
    required: false,
  }),
  new ParameterDefinition({
    name: "reference_files",
    type: ParameterType.ARRAY,
    description: DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
    required: false,
    arrayItemSchema: { type: "string" },
  }),
]);

export const buildTaskDelegationToolParameterSchema = (
  toolName: TaskDelegationToolName,
): ParameterSchema => {
  if (toolName === DELEGATE_TASK_TOOL_NAME) return buildDelegateTaskParameterSchema();
  throw new Error(`Unknown task delegation tool '${toolName}'.`);
};
