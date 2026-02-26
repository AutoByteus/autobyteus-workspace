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

const DESCRIPTION = "Deletes an existing prompt from the system.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The unique ID of the prompt to delete.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function deletePrompt(
  context: AgentContextLike,
  prompt_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`delete_prompt tool invoked by agent ${agentId} for prompt ID '${prompt_id}'.`);

  try {
    const promptService = new PromptService();
    const result = await promptService.deletePrompt(prompt_id);
    if (result) {
      const successMessage = `Prompt with ID ${prompt_id} deleted successfully.`;
      logger.info(successMessage);
      return successMessage;
    }
    const notFoundMessage = `Prompt with ID ${prompt_id} could not be deleted (it may not exist).`;
    logger.warn(notFoundMessage);
    return notFoundMessage;
  } catch (error) {
    logger.error(`Error deleting prompt ID '${prompt_id}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "delete_prompt";
let cachedTool: BaseTool | null = null;

export function registerDeletePromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(deletePrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
