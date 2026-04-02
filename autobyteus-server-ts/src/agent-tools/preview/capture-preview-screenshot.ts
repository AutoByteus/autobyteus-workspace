import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildCapturePreviewScreenshotParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildCapturePreviewScreenshotParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function capturePreviewScreenshot(
  context: AgentContextLike,
  preview_session_id: string,
  full_page?: boolean | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`capture_preview_screenshot tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().capturePreviewScreenshot({
      preview_session_id,
      full_page: full_page ?? false,
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `capture_preview_screenshot failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerCapturePreviewScreenshotTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME)) {
    cachedTool = tool({
      name: CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(capturePreviewScreenshot) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
