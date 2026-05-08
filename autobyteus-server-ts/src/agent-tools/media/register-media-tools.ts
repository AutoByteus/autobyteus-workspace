import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { MEDIA_TOOL_NAME_LIST } from "./media-tool-contract.js";
import {
  clearCachedMediaAutobyteusTools,
  registerMediaAutobyteusTools,
} from "./media-autobyteus-tools.js";

export function registerMediaTools(): void {
  registerMediaAutobyteusTools();
}

export function reloadMediaToolSchemas(): void {
  for (const toolName of MEDIA_TOOL_NAME_LIST) {
    defaultToolRegistry.getToolDefinition(toolName)?.reloadCachedSchema();
  }
}

export function unregisterMediaTools(): void {
  for (const toolName of MEDIA_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
  clearCachedMediaAutobyteusTools();
}
