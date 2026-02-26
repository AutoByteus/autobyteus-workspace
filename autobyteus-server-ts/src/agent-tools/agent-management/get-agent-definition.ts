import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

const DESCRIPTION = "Retrieves the complete and detailed configuration of a single agent definition.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "definition_id",
    type: ParameterType.STRING,
    description: "The unique ID of the agent definition to retrieve.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeDefinition = (definition: AgentDefinition): Record<string, unknown> => ({
  id: definition.id ?? null,
  name: definition.name,
  role: definition.role,
  description: definition.description,
  avatar_url: definition.avatarUrl ?? null,
  tool_names: definition.toolNames,
  input_processor_names: definition.inputProcessorNames,
  llm_response_processor_names: definition.llmResponseProcessorNames,
  system_prompt_processor_names: definition.systemPromptProcessorNames,
  tool_execution_result_processor_names: definition.toolExecutionResultProcessorNames,
  tool_invocation_preprocessor_names: definition.toolInvocationPreprocessorNames,
  lifecycle_processor_names: definition.lifecycleProcessorNames,
  skill_names: definition.skillNames,
  system_prompt_category: definition.systemPromptCategory ?? null,
  system_prompt_name: definition.systemPromptName ?? null,
});

export async function getAgentDefinition(
  context: AgentContextLike,
  definition_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`get_agent_definition tool invoked by agent ${agentId} for ID '${definition_id}'.`);

  if (!definition_id) {
    throw new Error("definition_id is a required argument.");
  }

  try {
    const service = AgentDefinitionService.getInstance();
    const definition = await service.getAgentDefinitionById(definition_id);
    if (!definition) {
      throw new Error(`Agent definition with ID ${definition_id} not found.`);
    }

    return JSON.stringify(serializeDefinition(definition), null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting agent definition ID '${definition_id}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "get_agent_definition";
let cachedTool: BaseTool | null = null;

export function registerGetAgentDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Management",
    })(getAgentDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
