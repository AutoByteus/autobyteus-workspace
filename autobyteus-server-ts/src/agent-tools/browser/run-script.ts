import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  RUN_SCRIPT_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildRunScriptParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(
  RUN_SCRIPT_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildRunScriptParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function runScript(
  context: AgentContextLike,
  tab_id: string,
  javascript: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`run_script tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().runScript({
      tab_id,
      javascript,
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `run_script failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerRunScriptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(RUN_SCRIPT_TOOL_NAME)) {
    cachedTool = tool({
      name: RUN_SCRIPT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(runScript) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(RUN_SCRIPT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
