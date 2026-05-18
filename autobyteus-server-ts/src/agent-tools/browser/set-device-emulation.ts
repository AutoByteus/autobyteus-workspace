import { tool, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  SET_DEVICE_EMULATION_TOOL_NAME,
  type BrowserDeviceEmulationMode,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";
import { buildSetDeviceEmulationParameterSchema } from "./browser-tool-parameter-schemas.js";
import { toBrowserToolErrorPayload, toBrowserJsonString } from "./browser-tool-serialization.js";
import { getBrowserToolService } from "./browser-tool-service.js";

const DESCRIPTION = getBrowserToolManifestEntry(
  SET_DEVICE_EMULATION_TOOL_NAME,
).description;
const TOOL_CATEGORY = "Browser";
const argumentSchema = buildSetDeviceEmulationParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  agentId?: string;
};

export async function setDeviceEmulation(
  context: AgentContextLike,
  tab_id: string,
  mode: BrowserDeviceEmulationMode,
  width?: number | null,
  height?: number | null,
  device_scale_factor?: number | null,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`set_device_emulation tool invoked by agent run ${agentRunId}.`);

  try {
    const result = await getBrowserToolService().setDeviceEmulation({
      tab_id,
      mode,
      width: width ?? undefined,
      height: height ?? undefined,
      device_scale_factor: device_scale_factor ?? undefined,
    });
    return toBrowserJsonString(result);
  } catch (error) {
    const payload = toBrowserToolErrorPayload(error);
    logger.error(
      `set_device_emulation failed for agent run ${agentRunId}: ${payload.error.message}`,
    );
    throw new Error(toBrowserJsonString(payload));
  }
}

let cachedTool: BaseTool | null = null;

export function registerSetDeviceEmulationTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(SET_DEVICE_EMULATION_TOOL_NAME)) {
    cachedTool = tool({
      name: SET_DEVICE_EMULATION_TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: TOOL_CATEGORY,
    })(setDeviceEmulation) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(SET_DEVICE_EMULATION_TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
