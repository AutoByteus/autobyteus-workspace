import { BaseTool, type ToolExecutionOptions } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import { SEARCH_MEMORY_TOOL_DESCRIPTION, SEARCH_MEMORY_TOOL_NAME, buildSearchMemoryToolSchema, parseSearchMemoryInput } from "./memory-tool-contract.js";
import { executeSearchMemoryTool, memoryToolError } from "./memory-tool-manifest.js";

/** `search_memory` as a native tool; the asking run is the agent that runs it. */
export class SearchMemoryTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.GENERAL;
  static getName() { return SEARCH_MEMORY_TOOL_NAME; }
  static getDescription() { return SEARCH_MEMORY_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildSearchMemoryToolSchema(); }

  async prepareExecution(context: unknown, args: Record<string, unknown> = {}, options: ToolExecutionOptions = {}) {
    let normalized: Record<string, unknown>;
    try { normalized = { ...parseSearchMemoryInput(args) }; }
    catch (error) { throw new Error(toToolResultJson(memoryToolError(error))); }
    return super.prepareExecution(context, normalized, options);
  }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    try { return toToolResultJson(await executeSearchMemoryTool(args, this.agentId)); }
    catch (error) { throw new Error(toToolResultJson(memoryToolError(error))); }
  }
}

export function registerMemoryTools(): void {
  registerToolClass(SearchMemoryTool);
}
