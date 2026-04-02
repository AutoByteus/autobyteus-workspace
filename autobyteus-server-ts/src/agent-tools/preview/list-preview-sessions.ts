import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildListPreviewSessionsParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildListPreviewSessionsParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function listPreviewSessions(
  context: AgentContextLike,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`list_preview_sessions tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().listPreviewSessions();
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `list_preview_sessions failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerListPreviewSessionsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(LIST_PREVIEW_SESSIONS_TOOL_NAME)) {
    cachedTool = tool({
      name: LIST_PREVIEW_SESSIONS_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(listPreviewSessions) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(LIST_PREVIEW_SESSIONS_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
