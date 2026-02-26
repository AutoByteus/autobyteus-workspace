import {
  tool,
  ToolCategory,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { Prompt } from "../../prompt-engineering/domain/models.js";
import { PromptService } from "../../prompt-engineering/services/prompt-service.js";

const DESCRIPTION =
  "Lists available prompts with optional filters, returning summaries without prompt content.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "name",
    type: ParameterType.STRING,
    description: "Optional partial name to filter prompts by (case-insensitive).",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "category",
    type: ParameterType.STRING,
    description: "Optional partial category to filter prompts by (case-insensitive).",
    required: false,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "is_active",
    type: ParameterType.BOOLEAN,
    description:
      "Optional filter by active status. Accepts true/false (or string equivalents). Defaults to true.",
    required: false,
    defaultValue: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializePromptSummary = (prompt: Prompt): Record<string, unknown> => ({
  id: prompt.id,
  name: prompt.name,
  category: prompt.category,
  description: prompt.description ?? null,
  version: prompt.version ?? null,
  is_active: prompt.isActive,
  suitable_for_models: prompt.suitableForModels ?? null,
  parent_id: prompt.parentId ?? null,
  created_at: prompt.createdAt ? prompt.createdAt.toISOString() : null,
  updated_at: prompt.updatedAt ? prompt.updatedAt.toISOString() : null,
});

export async function listPrompts(
  context: AgentContextLike,
  name?: string | null,
  category?: string | null,
  is_active: boolean | string | null = true,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";

  let activeFilter: boolean | null | undefined;
  if (is_active === null || is_active === undefined) {
    activeFilter = is_active;
  } else if (typeof is_active === "string") {
    const normalized = is_active.toLowerCase();
    if (normalized === "true") {
      activeFilter = true;
    } else if (normalized === "false") {
      activeFilter = false;
    } else {
      activeFilter = null;
    }
  } else {
    activeFilter = is_active;
  }

  if (activeFilter === null) {
    activeFilter = undefined;
  }

  logger.info(
    `list_prompts tool invoked by agent ${agentId} with filters: name='${name}', category='${category}', is_active=${String(
      activeFilter,
    )}.`,
  );

  try {
    const promptService = new PromptService();
    const prompts = await promptService.findPrompts({
      name: name ?? undefined,
      category: category ?? undefined,
      isActive: activeFilter,
    });

    if (!prompts || prompts.length === 0) {
      return "[]";
    }

    const summaries = prompts.map(serializePromptSummary);
    return JSON.stringify(summaries, null, 2);
  } catch (error) {
    logger.error(`An unexpected error occurred while listing prompts: ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "list_prompts";
let cachedTool: BaseTool | null = null;

export function registerListPromptsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(listPrompts) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
