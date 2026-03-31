import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  buildGetPreviewConsoleLogsParameterSchema,
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "./preview-tool-contract.js";
import { getPreviewToolService } from "./preview-tool-service.js";

const DESCRIPTION =
  "Read console log entries from an existing preview session, optionally after a given sequence number.";
const TOOL_CATEGORY = "Preview";
const argumentSchema = buildGetPreviewConsoleLogsParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function getPreviewConsoleLogs(
  context: AgentContextLike,
  preview_session_id: string,
  since_sequence?: number | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`get_preview_console_logs tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getPreviewToolService().getPreviewConsoleLogs({
      preview_session_id,
      since_sequence: since_sequence ?? null,
    });
    return toPreviewJsonString(result);
  } catch (error) {
    const payload = toPreviewErrorPayload(error);
    logger.error(
      `get_preview_console_logs failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toPreviewJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerGetPreviewConsoleLogsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME)) {
    cachedTool = tool({
      name: GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(getPreviewConsoleLogs) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
