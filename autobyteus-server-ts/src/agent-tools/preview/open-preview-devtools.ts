import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
  buildOpenPreviewDevToolsParameterSchema,
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "./preview-tool-contract.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION =
  "Open detached DevTools for an existing preview session.";
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildOpenPreviewDevToolsParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function openPreviewDevTools(
  context: AgentContextLike,
  preview_session_id: string,
  mode?: "detach" | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`open_preview_devtools tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().openPreviewDevTools({
      preview_session_id,
      mode: mode ?? "detach",
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `open_preview_devtools failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerOpenPreviewDevToolsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(OPEN_PREVIEW_DEVTOOLS_TOOL_NAME)) {
    cachedTool = tool({
      name: OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(openPreviewDevTools) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(OPEN_PREVIEW_DEVTOOLS_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}

