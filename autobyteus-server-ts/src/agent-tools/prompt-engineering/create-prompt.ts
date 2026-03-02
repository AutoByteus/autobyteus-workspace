import {
  tool,
  ToolCategory,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { PromptService } from "../../prompt-engineering/services/prompt-service.js";

const DESCRIPTION =
  "Creates a new prompt template used to guide an AI model's behavior.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "The unique name for the prompt (e.g., 'CodeGenerator').",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "category",
    type: ParameterType.STRING,
    description: "The category for the prompt (e.g., 'Development', 'Testing').",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_content",
    type: ParameterType.STRING,
    description: "The main text content of the prompt.",
    required: true,
  }),
);


const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  // Core boundary from autobyteus-ts runtime; normalize immediately to `agentRunId` in local code.
  agentId?: string;
};

export async function createPrompt(
  context: AgentContextLike,
  name: string,
  category: string,
  prompt_content: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`create_prompt tool invoked by agent run ${agentRunId} for prompt name '${name}'.`);

  try {
    const promptService = new PromptService();
    const newPrompt = await promptService.createPrompt({
      name,
      category,
      promptContent: prompt_content,
    });
    const successMessage = `Prompt '${name}' created successfully with ID: ${String(
      newPrompt.id,
    )}.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    logger.error(`Error creating prompt '${name}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "create_prompt";
let cachedTool: BaseTool | null = null;

export function registerCreatePromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(createPrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
