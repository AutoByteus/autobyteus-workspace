import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "./task-delegation-tool-contract.js";
import { registerAcceptTaskTool } from "./accept-task.js";
import { registerDelegateTasksTool } from "./delegate-tasks.js";
import { registerMarkTaskCompletedTool } from "./mark-task-completed.js";
import { registerMarkTaskFailedTool } from "./mark-task-failed.js";

export function registerTaskDelegationTools(): void {
  registerDelegateTasksTool();
  registerMarkTaskCompletedTool();
  registerMarkTaskFailedTool();
  registerAcceptTaskTool();
}

export function unregisterTaskDelegationTools(): void {
  for (const toolName of TASK_DELEGATION_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
}
