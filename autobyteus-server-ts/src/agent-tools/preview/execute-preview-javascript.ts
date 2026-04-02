import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";
import { buildExecutePreviewJavascriptParameterSchema } from "./preview-tool-parameter-schemas.js";
import { toPreviewErrorPayload, toPreviewJsonString } from "./preview-tool-serialization.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION = getPreviewToolManifestEntry(
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildExecutePreviewJavascriptParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function executePreviewJavascript(
  context: AgentContextLike,
  preview_session_id: string,
  javascript: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`execute_preview_javascript tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().executePreviewJavascript({
      preview_session_id,
      javascript,
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `execute_preview_javascript failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerExecutePreviewJavascriptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME)) {
    cachedTool = tool({
      name: EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(executePreviewJavascript) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
