import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultLlmResponseProcessorRegistry } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const DESCRIPTION =
  "Lists all registered LLM Response Processors available in the system.";

const argumentSchema = new ParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function listLlmResponseProcessors(context: AgentContextLike): Promise<string> {
  const agentId = context?.agentId ?? "N/A";
  logger.info(`list_llm_response_processors tool invoked by agent ${agentId}.`);

  try {
    const definitions = Object.values(defaultLlmResponseProcessorRegistry.getAllDefinitions());
    if (definitions.length === 0) {
      return "[]";
    }

    const summaries = definitions.map((definition) => ({ name: definition.name }));
    summaries.sort((a, b) => a.name.localeCompare(b.name));
    return JSON.stringify(summaries, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorMessage = `An unexpected error occurred while listing LLM response processors: ${message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

const TOOL_NAME = "list_llm_response_processors";
let cachedTool: BaseTool | null = null;

export function registerListLlmResponseProcessorsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Tool Management",
    })(listLlmResponseProcessors) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
