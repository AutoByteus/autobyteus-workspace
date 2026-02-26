import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry, ToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

const DESCRIPTION =
  "Lists all available tools in the system, providing a summary for discovery.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "category",
    type: ParameterType.STRING,
    description: "A specific category to filter tools by (e.g., 'File System', 'Web').",
    required: false,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeToolSummary = (definition: ToolDefinition): Record<string, unknown> => {
  const argSchema = definition.argumentSchema?.toJsonSchemaDict() ?? {};
  return {
    name: definition.name,
    category: definition.category,
    description: definition.description,
    argument_schema: argSchema,
  };
};

export async function listAvailableTools(
  context: AgentContextLike,
  category?: string | null,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `list_available_tools tool invoked by agent ${agentId} with category filter: '${category}'.`,
  );

  try {
    const registry = (defaultToolRegistry as ToolRegistry) ?? ToolRegistry.getInstance();
    const definitions = category ? registry.getToolsByCategory(category) : registry.listTools();

    if (!definitions || definitions.length === 0) {
      return "[]";
    }

    const summaries = definitions.map(serializeToolSummary);
    summaries.sort((a, b) => {
      const categoryA = String(a.category ?? "");
      const categoryB = String(b.category ?? "");
      if (categoryA === categoryB) {
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      }
      return categoryA.localeCompare(categoryB);
    });

    return JSON.stringify(summaries, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorMessage = `An unexpected error occurred while listing available tools: ${message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

const TOOL_NAME = "list_available_tools";
let cachedTool: BaseTool | null = null;

export function registerListAvailableToolsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Tool Management",
    })(listAvailableTools) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
