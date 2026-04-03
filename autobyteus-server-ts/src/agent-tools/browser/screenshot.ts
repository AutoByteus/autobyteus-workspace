import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  SCREENSHOT_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildScreenshotParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(
  SCREENSHOT_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildScreenshotParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function takeScreenshot(
  context: AgentContextLike,
  tab_id: string,
  full_page?: boolean | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`screenshot tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().takeScreenshot({
      tab_id,
      full_page: full_page ?? false,
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `screenshot failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerScreenshotTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(SCREENSHOT_TOOL_NAME)) {
    cachedTool = tool({
      name: SCREENSHOT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(takeScreenshot) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(SCREENSHOT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
