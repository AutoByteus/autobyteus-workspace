import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  CLOSE_PREVIEW_TOOL_NAME,
  buildClosePreviewParameterSchema,
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "./preview-tool-contract.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION =
  "Close an existing preview session and invalidate its preview_session_id for future use.";
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildClosePreviewParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function closePreview(
  context: AgentContextLike,
  preview_session_id: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`close_preview tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().closePreview({
      preview_session_id,
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(`close_preview failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerClosePreviewTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(CLOSE_PREVIEW_TOOL_NAME)) {
    cachedTool = tool({
      name: CLOSE_PREVIEW_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(closePreview) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(CLOSE_PREVIEW_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
