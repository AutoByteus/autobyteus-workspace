import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildPreviewDomSnapshotParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(PREVIEW_DOM_SNAPSHOT_TOOL_NAME).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildPreviewDomSnapshotParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function previewDomSnapshot(
  context: AgentContextLike,
  preview_session_id: string,
  include_non_interactive?: boolean | null,
  include_bounding_boxes?: boolean | null,
  max_elements?: number | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`preview_dom_snapshot tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().previewDomSnapshot({
      preview_session_id,
      include_non_interactive: include_non_interactive ?? false,
      include_bounding_boxes: include_bounding_boxes ?? true,
      max_elements: max_elements ?? 200,
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `preview_dom_snapshot failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerPreviewDomSnapshotTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(PREVIEW_DOM_SNAPSHOT_TOOL_NAME)) {
    cachedTool = tool({
      name: PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(previewDomSnapshot) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(PREVIEW_DOM_SNAPSHOT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
