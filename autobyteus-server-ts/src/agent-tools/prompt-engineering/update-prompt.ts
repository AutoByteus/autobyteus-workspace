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
  "Replaces the entire content of a prompt by creating a new revision.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The ID of the prompt to update.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "new_content",
    type: ParameterType.STRING,
    description: "The complete new content to replace the existing prompt content.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

type AgentContextLike = { agentId?: string };

export async function updatePrompt(
  context: AgentContextLike,
  prompt_id: string,
  new_content: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`update_prompt tool invoked by agent ${agentId} for prompt ID '${prompt_id}'.`);

  if (!prompt_id) {
    throw new Error("prompt_id is a required argument.");
  }
  if (!new_content) {
    throw new Error("new_content is a required argument.");
  }

  try {
    const promptService = new PromptService();
    const originalPrompt = await promptService.getPromptById(prompt_id);
    logger.debug(
      `Found original prompt: ID=${String(originalPrompt.id)}, version=${String(
        originalPrompt.version,
      )}`,
    );

    const newPrompt = await promptService.addNewPromptRevision(
      prompt_id,
      new_content.trim(),
    );

    return (
      `Successfully updated prompt '${originalPrompt.name}' (ID: ${prompt_id}). ` +
      `New revision ID: ${String(newPrompt.id)} (version ${String(
        newPrompt.version ?? "?",
      )}). ` +
      `Note: The new revision is NOT active. Use \`activate_prompt\` with ID=${String(
        newPrompt.id,
      )} to make it active.`
    );
  } catch (error) {
    logger.error(`Error updating prompt ID '${prompt_id}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "update_prompt";
let cachedTool: BaseTool | null = null;

export function registerUpdatePromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(updatePrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
