import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "./task-delegation-tool-contract.js";
import { registerDelegateTaskTool } from "./delegate-task.js";

export function registerTaskDelegationTools(): void {
  registerDelegateTaskTool();
}

export function unregisterTaskDelegationTools(): void {
  for (const toolName of TASK_DELEGATION_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
}
