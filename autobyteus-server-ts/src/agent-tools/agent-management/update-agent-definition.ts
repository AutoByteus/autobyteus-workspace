import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

const DESCRIPTION =
  "Modifies an existing agent definition. Only the arguments provided will be updated.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "definition_id",
    type: ParameterType.STRING,
    description: "The ID of the agent definition to update.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "The new unique name.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "role",
    type: ParameterType.STRING,
    description: "The new role description.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "The new detailed description.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "avatar_url",
    type: ParameterType.STRING,
    description: "The new avatar URL. Pass an empty string to clear the avatar.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_category",
    type: ParameterType.STRING,
    description: "The new system prompt category. Must be provided with system_prompt_name.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_name",
    type: ParameterType.STRING,
    description: "The new system prompt name. Must be provided with system_prompt_category.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "tool_names",
    type: ParameterType.STRING,
    description: "A new comma-separated string of tool names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "input_processor_names",
    type: ParameterType.STRING,
    description: "A new comma-separated string of input processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "llm_response_processor_names",
    type: ParameterType.STRING,
    description: "A new comma-separated string of LLM response processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_processor_names",
    type: ParameterType.STRING,
    description: "A new comma-separated string of system prompt processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "lifecycle_processor_names",
    type: ParameterType.STRING,
    description: "A new comma-separated string of lifecycle processor names.",
    required: false,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const parseCsvList = (value?: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export async function updateAgentDefinition(
  context: AgentContextLike,
  definition_id: string,
  name?: string | null,
  role?: string | null,
  description?: string | null,
  avatar_url?: string | null,
  system_prompt_category?: string | null,
  system_prompt_name?: string | null,
  tool_names?: string | null,
  input_processor_names?: string | null,
  llm_response_processor_names?: string | null,
  system_prompt_processor_names?: string | null,
  lifecycle_processor_names?: string | null,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`update_agent_definition tool invoked by agent ${agentId} for ID '${definition_id}'.`);

  const updateData: Record<string, unknown> = {};
  if (name !== null && name !== undefined) updateData.name = name;
  if (role !== null && role !== undefined) updateData.role = role;
  if (description !== null && description !== undefined) updateData.description = description;
  if (avatar_url !== null && avatar_url !== undefined) updateData.avatarUrl = avatar_url;
  if (system_prompt_category !== null && system_prompt_category !== undefined) {
    updateData.systemPromptCategory = system_prompt_category;
  }
  if (system_prompt_name !== null && system_prompt_name !== undefined) {
    updateData.systemPromptName = system_prompt_name;
  }
  if (tool_names !== null && tool_names !== undefined) updateData.toolNames = parseCsvList(tool_names);
  if (input_processor_names !== null && input_processor_names !== undefined) {
    updateData.inputProcessorNames = parseCsvList(input_processor_names);
  }
  if (llm_response_processor_names !== null && llm_response_processor_names !== undefined) {
    updateData.llmResponseProcessorNames = parseCsvList(llm_response_processor_names);
  }
  if (system_prompt_processor_names !== null && system_prompt_processor_names !== undefined) {
    updateData.systemPromptProcessorNames = parseCsvList(system_prompt_processor_names);
  }
  if (lifecycle_processor_names !== null && lifecycle_processor_names !== undefined) {
    updateData.lifecycleProcessorNames = parseCsvList(lifecycle_processor_names);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("At least one field must be provided to update the agent definition.");
  }

  try {
    const service = AgentDefinitionService.getInstance();
    await service.updateAgentDefinition(definition_id, updateData);
    const successMessage = `Agent definition with ID ${definition_id} updated successfully.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error updating agent definition ID '${definition_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "update_agent_definition";
let cachedTool: BaseTool | null = null;

export function registerUpdateAgentDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Management",
    })(updateAgentDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
