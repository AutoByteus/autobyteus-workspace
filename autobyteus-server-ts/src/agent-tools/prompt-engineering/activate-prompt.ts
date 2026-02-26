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
  "Activates a prompt revision, deactivating any previously active prompt in the same family.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The unique ID of the prompt revision to activate.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function activatePrompt(
  context: AgentContextLike,
  prompt_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`activate_prompt tool invoked by agent ${agentId} for prompt ID '${prompt_id}'.`);

  try {
    const promptService = new PromptService();
    const targetPrompt = await promptService.getPromptById(prompt_id);
    if (!targetPrompt) {
      throw new Error(`Prompt with ID ${prompt_id} not found.`);
    }

    const familyPrompts = await promptService.findAllByNameAndCategory(
      targetPrompt.name,
      targetPrompt.category,
      targetPrompt.suitableForModels ?? null,
    );

    let oldActivePromptId: string | null = null;
    for (const prompt of familyPrompts) {
      const isActive = (prompt as any).isActive ?? (prompt as any).is_active;
      const id = (prompt as any).id;
      if (isActive && id && id !== targetPrompt.id) {
        oldActivePromptId = id;
        break;
      }
    }

    const activatedPrompt = await promptService.markActivePrompt(prompt_id);

    if (oldActivePromptId) {
      return `Prompt ID ${String(
        activatedPrompt.id,
      )} has been activated. The previous active prompt (ID: ${oldActivePromptId}) has been automatically deactivated.`;
    }

    return `Prompt ID ${String(
      activatedPrompt.id,
    )} has been activated. There was no previously active prompt in this specific family to deactivate.`;
  } catch (error) {
    logger.error(`Error activating prompt ID '${prompt_id}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "activate_prompt";
let cachedTool: BaseTool | null = null;

export function registerActivatePromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(activatePrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
