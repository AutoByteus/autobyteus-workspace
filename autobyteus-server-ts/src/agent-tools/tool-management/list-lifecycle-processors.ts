import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import {
  defaultLifecycleEventProcessorRegistry,
  LifecycleEventProcessorDefinition,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const DESCRIPTION =
  "Lists all registered Lifecycle Event Processors available in the system.";

const argumentSchema = new ParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeProcessorSummary = (
  definition: LifecycleEventProcessorDefinition,
): Record<string, unknown> => {
  let isMandatory = false;
  let order = 0;
  try {
    const processorClass = definition.processorClass;
    isMandatory = processorClass?.isMandatory?.() ?? false;
    order = processorClass?.getOrder?.() ?? 0;
  } catch (error) {
    const name = definition?.processorClass?.name ?? "unknown";
    logger.warn(`Could not get properties from processor class '${name}': ${String(error)}`);
    isMandatory = false;
    order = 0;
  }

  return {
    name: definition.name,
    class_name: definition.processorClass.name,
    is_mandatory: isMandatory,
    order,
  };
};

export async function listLifecycleProcessors(context: AgentContextLike): Promise<string> {
  const agentId = context?.agentId ?? "N/A";
  logger.info(`list_lifecycle_processors tool invoked by agent ${agentId}.`);

  try {
    const definitions = Object.values(defaultLifecycleEventProcessorRegistry.getAllDefinitions());
    if (definitions.length === 0) {
      return "[]";
    }

    const summaries = definitions.map(serializeProcessorSummary);
    summaries.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    return JSON.stringify(summaries, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorMessage = `An unexpected error occurred while listing lifecycle processors: ${message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

const TOOL_NAME = "list_lifecycle_processors";
let cachedTool: BaseTool | null = null;

export function registerListLifecycleProcessorsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Tool Management",
    })(listLifecycleProcessors) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
