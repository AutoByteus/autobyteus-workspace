import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { TASK_DELEGATION_TOOL_NAME_LIST } from "./task-delegation-tool-contract.js";
import { registerDelegateTasksTool } from "./delegate-tasks.js";
import { registerReviewTaskResultTool } from "./review-task-result.js";
import { registerSubmitTaskResultTool } from "./submit-task-result.js";

export function registerTaskDelegationTools(): void {
  registerDelegateTasksTool();
  registerSubmitTaskResultTool();
  registerReviewTaskResultTool();
}

export function unregisterTaskDelegationTools(): void {
  for (const toolName of TASK_DELEGATION_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
}
