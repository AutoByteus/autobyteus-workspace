import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  NAVIGATE_PREVIEW_TOOL_NAME,
  type PreviewReadyState,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildNavigatePreviewParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(NAVIGATE_PREVIEW_TOOL_NAME).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildNavigatePreviewParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function navigatePreview(
  context: AgentContextLike,
  preview_session_id: string,
  url: string,
  wait_until?: PreviewReadyState | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`navigate_preview tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().navigatePreview({
      preview_session_id,
      url,
      wait_until: wait_until ?? "load",
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(`navigate_preview failed for agent run ${agentRunId}: ${payload.error.message}`);
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerNavigatePreviewTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(NAVIGATE_PREVIEW_TOOL_NAME)) {
    cachedTool = tool({
      name: NAVIGATE_PREVIEW_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(navigatePreview) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(NAVIGATE_PREVIEW_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
