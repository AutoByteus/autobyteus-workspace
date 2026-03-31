import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  OPEN_PREVIEW_TOOL_NAME,
  buildOpenPreviewParameterSchema,
  toPreviewErrorPayload,
  toPreviewJsonString,
  type PreviewReadyState,
} from "./preview-tool-contract.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION =
  "Open a frontend preview window and return a stable preview_session_id for follow-up operations.";
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildOpenPreviewParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function openPreview(
  context: AgentContextLike,
  url: string,
  title?: string | null,
  reuse_existing?: boolean | null,
  wait_until?: PreviewReadyState | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`open_preview tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().openPreview({
      url,
      title,
      reuse_existing: reuse_existing ?? false,
      wait_until: wait_until ?? "load",
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(`open_preview failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerOpenPreviewTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(OPEN_PREVIEW_TOOL_NAME)) {
    cachedTool = tool({
      name: OPEN_PREVIEW_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(openPreview) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(OPEN_PREVIEW_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
