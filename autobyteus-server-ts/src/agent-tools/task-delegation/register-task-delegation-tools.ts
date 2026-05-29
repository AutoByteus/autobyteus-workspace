import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "./task-delegation-tool-contract.js";
import { registerDelegateTasksTool } from "./delegate-tasks.js";
import { registerUpdateTaskStatusTool } from "./update-task-status.js";

export function registerTaskDelegationTools(): void {
  registerDelegateTasksTool();
  registerUpdateTaskStatusTool();
}

export function unregisterTaskDelegationTools(): void {
  for (const toolName of TASK_DELEGATION_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
}
