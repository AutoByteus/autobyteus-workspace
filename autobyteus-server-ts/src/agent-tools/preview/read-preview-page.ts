import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  READ_PREVIEW_PAGE_TOOL_NAME,
  type PreviewReadPageCleaningMode,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildReadPreviewPageParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(READ_PREVIEW_PAGE_TOOL_NAME).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildReadPreviewPageParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function readPreviewPage(
  context: AgentContextLike,
  preview_session_id: string,
  cleaning_mode?: PreviewReadPageCleaningMode | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`read_preview_page tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().readPreviewPage({
      preview_session_id,
      cleaning_mode: cleaning_mode ?? "thorough",
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `read_preview_page failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerReadPreviewPageTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(READ_PREVIEW_PAGE_TOOL_NAME)) {
    cachedTool = tool({
      name: READ_PREVIEW_PAGE_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(readPreviewPage) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(READ_PREVIEW_PAGE_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
