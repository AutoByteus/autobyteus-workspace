import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

const DESCRIPTION = "Lists all available agent definitions, providing a summary for discovery.";

const argumentSchema = new ParameterSchema();

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

export async function listAgentDefinitions(context: AgentContextLike): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`list_agent_definitions tool invoked by agent ${agentId}.`);

  try {
    const service = AgentDefinitionService.getInstance();
    const definitions = await service.getAllAgentDefinitions();

    if (!definitions || definitions.length === 0) {
      return "[]";
    }

    return JSON.stringify(definitions.map(serializeDefinition), null, 2);
  } catch (error) {
    logger.error(`An unexpected error occurred while listing agent definitions: ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "list_agent_definitions";
let cachedTool: BaseTool | null = null;

export function registerListAgentDefinitionsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Management",
    })(listAgentDefinitions) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
