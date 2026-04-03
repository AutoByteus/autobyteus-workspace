import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  CLOSE_TAB_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildCloseTabParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(CLOSE_TAB_TOOL_NAME).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildCloseTabParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function closeTab(
  context: AgentContextLike,
  tab_id: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`close_tab tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().closeTab({
      tab_id,
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(`close_tab failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerCloseTabTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(CLOSE_TAB_TOOL_NAME)) {
    cachedTool = tool({
      name: CLOSE_TAB_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(closeTab) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(CLOSE_TAB_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
