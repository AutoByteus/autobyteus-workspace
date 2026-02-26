import { tool, ParameterSchema, ParameterDefinition, ParameterType, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

const DESCRIPTION =
  "Creates a new agent definition. Processor lists represent optional components only; mandatory processors are applied automatically at runtime.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "A unique name for the agent definition (e.g., 'CodeReviewerAgent').",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "role",
    type: ParameterType.STRING,
    description: "A description of the agent's role and personality.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "description",
    type: ParameterType.STRING,
    description: "A detailed description of the agent's purpose.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_category",
    type: ParameterType.STRING,
    description: "The category of the system prompt to be used.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_name",
    type: ParameterType.STRING,
    description: "The name of the system prompt to be used.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "avatar_url",
    type: ParameterType.STRING,
    description: "Optional avatar URL for this agent.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "tool_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of tool names for this agent.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "system_prompt_processor_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of optional system prompt processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "input_processor_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of optional input processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "llm_response_processor_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of optional LLM response processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "tool_execution_result_processor_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of optional tool result processor names.",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "lifecycle_processor_names",
    type: ParameterType.STRING,
    description: "A comma-separated string of optional lifecycle processor names.",
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

export async function createAgentDefinition(
  context: AgentContextLike,
  name: string,
  role: string,
  description: string,
  system_prompt_category: string,
  system_prompt_name: string,
  avatar_url?: string | null,
  tool_names?: string | null,
  system_prompt_processor_names?: string | null,
  input_processor_names?: string | null,
  llm_response_processor_names?: string | null,
  tool_execution_result_processor_names?: string | null,
  lifecycle_processor_names?: string | null,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`create_agent_definition tool invoked by agent ${agentId} for agent name '${name}'.`);

  try {
    const service = AgentDefinitionService.getInstance();
    const newDefinition = await service.createAgentDefinition({
      name,
      role,
      description,
      avatarUrl: avatar_url ?? undefined,
      systemPromptCategory: system_prompt_category,
      systemPromptName: system_prompt_name,
      toolNames: parseCsvList(tool_names),
      systemPromptProcessorNames: parseCsvList(system_prompt_processor_names),
      inputProcessorNames: parseCsvList(input_processor_names),
      llmResponseProcessorNames: parseCsvList(llm_response_processor_names),
      toolExecutionResultProcessorNames: parseCsvList(tool_execution_result_processor_names),
      lifecycleProcessorNames: parseCsvList(lifecycle_processor_names),
    });

    const successMessage = `Agent definition '${name}' created successfully with ID: ${String(
      newDefinition.id,
    )}.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error creating agent definition '${name}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "create_agent_definition";
let cachedTool: BaseTool | null = null;

export function registerCreateAgentDefinitionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Agent Management",
    })(createAgentDefinition) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
