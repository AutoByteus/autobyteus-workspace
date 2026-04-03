import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  NAVIGATE_TO_TOOL_NAME,
  type BrowserReadyState,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildNavigateToParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(NAVIGATE_TO_TOOL_NAME).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildNavigateToParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function navigateTo(
  context: AgentContextLike,
  tab_id: string,
  url: string,
  wait_until?: BrowserReadyState | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`navigate_to tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().navigateTo({
      tab_id,
      url,
      wait_until: wait_until ?? "load",
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(`navigate_to failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerNavigateToTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(NAVIGATE_TO_TOOL_NAME)) {
    cachedTool = tool({
      name: NAVIGATE_TO_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(navigateTo) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(NAVIGATE_TO_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
