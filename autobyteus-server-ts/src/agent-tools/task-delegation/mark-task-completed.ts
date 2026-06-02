import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import { MARK_TASK_COMPLETED_TOOL_NAME } from "./task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "./task-delegation-tool-manifest.js";
import { buildMarkTaskCompletedParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import {
  toTaskDelegationJsonString,
  toTaskDelegationToolErrorPayload,
} from "./task-delegation-tool-serialization.js";
import { getTaskDelegationToolService } from "./task-delegation-tool-service.js";
import {
  buildTaskDelegationToolContextFromNativeContext,
  type NativeTaskDelegationToolExecutionContext,
} from "./task-delegation-autobyteus-context.js";

export class ServerOwnedMarkTaskCompletedTool extends BaseTool<NativeTaskDelegationToolExecutionContext, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return MARK_TASK_COMPLETED_TOOL_NAME;
  }

  static getDescription(): string {
    return getTaskDelegationToolManifestEntry(MARK_TASK_COMPLETED_TOOL_NAME).description;
  }

  static getArgumentSchema() {
    return buildMarkTaskCompletedParameterSchema();
  }

  protected async _execute(
    context: NativeTaskDelegationToolExecutionContext,
    kwargs: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const entry = getTaskDelegationToolManifestEntry(MARK_TASK_COMPLETED_TOOL_NAME);
      const toolContext = buildTaskDelegationToolContextFromNativeContext(context);
      const result = await entry.execute(
        getTaskDelegationToolService(),
        toolContext,
        entry.parseInput(kwargs),
      );
      return toTaskDelegationJsonString(result);
    } catch (error) {
      throw new Error(toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(error)));
    }
  }
}

export function registerMarkTaskCompletedTool(): BaseTool {
  registerToolClass(ServerOwnedMarkTaskCompletedTool);
  return defaultToolRegistry.createTool(MARK_TASK_COMPLETED_TOOL_NAME) as BaseTool;
}
