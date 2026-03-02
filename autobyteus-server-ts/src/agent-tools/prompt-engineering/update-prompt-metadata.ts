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
  "Updates prompt metadata (active flag) without changing content.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The unique ID of the prompt to update.",
    required: true,
  }),
);

argumentSchema.addParameter(
  new ParameterDefinition({
    name: "is_active",
    type: ParameterType.BOOLEAN,
    description: "Optional flag to activate/deactivate the prompt revision.",
    required: false,
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

export async function updatePromptMetadata(
  context: AgentContextLike,
  prompt_id: string,
  is_active?: boolean | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(
    `update_prompt_metadata tool invoked by agent run ${agentRunId} for prompt ID '${prompt_id}'.`,
  );

  if (is_active === undefined) {
    throw new Error(
      "At least one metadata field (is_active) must be provided to update.",
    );
  }

  try {
    const promptService = new PromptService();
    await promptService.updatePrompt({
      promptId: prompt_id,
      isActive: is_active ?? null,
    });
    const successMessage = `Prompt metadata for ID ${prompt_id} updated successfully.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    logger.error(`Error updating prompt metadata for ID '${prompt_id}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "update_prompt_metadata";
let cachedTool: BaseTool | null = null;

export function registerUpdatePromptMetadataTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(updatePromptMetadata) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
