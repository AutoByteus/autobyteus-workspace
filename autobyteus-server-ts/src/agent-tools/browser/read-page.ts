import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  READ_PAGE_TOOL_NAME,
  type BrowserReadPageCleaningMode,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildReadPageParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(READ_PAGE_TOOL_NAME).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildReadPageParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function readPage(
  context: AgentContextLike,
  tab_id: string,
  cleaning_mode?: BrowserReadPageCleaningMode | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`read_page tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().readPage({
      tab_id,
      cleaning_mode: cleaning_mode ?? "thorough",
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `read_page failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerReadPageTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(READ_PAGE_TOOL_NAME)) {
    cachedTool = tool({
      name: READ_PAGE_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(readPage) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(READ_PAGE_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
