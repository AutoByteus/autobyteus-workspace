import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  OPEN_TAB_TOOL_NAME,
  type BrowserReadyState,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildOpenTabParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(OPEN_TAB_TOOL_NAME).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildOpenTabParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function openTab(
  context: AgentContextLike,
  url: string,
  title?: string | null,
  reuse_existing?: boolean | null,
  wait_until?: BrowserReadyState | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`open_tab tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().openTab({
      url,
      title,
      reuse_existing: reuse_existing ?? false,
      wait_until: wait_until ?? "load",
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(`open_tab failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerOpenTabTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(OPEN_TAB_TOOL_NAME)) {
    cachedTool = tool({
      name: OPEN_TAB_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(openTab) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(OPEN_TAB_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
