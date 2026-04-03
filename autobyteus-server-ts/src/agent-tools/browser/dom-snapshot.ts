import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  DOM_SNAPSHOT_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildDomSnapshotParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(DOM_SNAPSHOT_TOOL_NAME).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildDomSnapshotParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function domSnapshot(
  context: AgentContextLike,
  tab_id: string,
  include_non_interactive?: boolean | null,
  include_bounding_boxes?: boolean | null,
  max_elements?: number | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`dom_snapshot tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().domSnapshot({
      tab_id,
      include_non_interactive: include_non_interactive ?? false,
      include_bounding_boxes: include_bounding_boxes ?? true,
      max_elements: max_elements ?? 200,
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `dom_snapshot failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerDomSnapshotTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(DOM_SNAPSHOT_TOOL_NAME)) {
    cachedTool = tool({
      name: DOM_SNAPSHOT_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(domSnapshot) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(DOM_SNAPSHOT_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
