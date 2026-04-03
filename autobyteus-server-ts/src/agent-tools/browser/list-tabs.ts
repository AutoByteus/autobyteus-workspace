import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  LIST_TABS_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildListTabsParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(
  LIST_TABS_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildListTabsParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function listTabs(
  context: AgentContextLike,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`list_tabs tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().listTabs();
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `list_tabs failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerListTabsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(LIST_TABS_TOOL_NAME)) {
    cachedTool = tool({
      name: LIST_TABS_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(listTabs) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(LIST_TABS_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
