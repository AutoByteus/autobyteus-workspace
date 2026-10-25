import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import {
  LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME,
  LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE,
  buildListAvailableAgentRuntimesParameterSchema,
  listAvailableAgentRuntimes,
} from "./list-available-agent-runtimes-contract.js";

const OWNER = "server-owned-agent-runtimes";

/**
 * The opt-in `list_available_agent_runtimes` tool on the AutoByteus runtime: this node's report as JSON text, by the
 * one tool result rule (empty values left out).
 * Registered in the tool registry so it appears in the tool picker; an agent gets it only when its definition lists it.
 */
export class AutoByteusListAvailableAgentRuntimesTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.SYSTEM;

  static getName() { return LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME; }
  static getDescription() { return LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildListAvailableAgentRuntimesParameterSchema(); }

  protected async _execute(): Promise<string> {
    const report = await listAvailableAgentRuntimes();
    if (!report) throw new Error(LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE);
    return toToolResultJson(report);
  }
}

export const ensureListAvailableAgentRuntimesToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME,
    LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.SYSTEM,
    buildListAvailableAgentRuntimesParameterSchema,
    () => null,
    { toolClass: AutoByteusListAvailableAgentRuntimesTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};
