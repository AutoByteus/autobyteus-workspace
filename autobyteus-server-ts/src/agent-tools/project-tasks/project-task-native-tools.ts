import { BaseTool, type ToolExecutionOptions } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import { PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";
import { executeProjectTaskTool, projectTaskToolError } from "./project-task-tool-manifest.js";
abstract class ProjectTaskNativeTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;
  async prepareExecution(context: unknown, args: Record<string, unknown> = {}, options: ToolExecutionOptions = {}) {
    let normalized: Record<string, unknown>;
    try { normalized = parseProjectTaskToolInput(this.getName() as ProjectTaskToolName, args); }
    catch (e) { throw new Error(JSON.stringify(projectTaskToolError(e))); }
    // Base preparation sees validated current values; abort/transport errors are not domain failures.
    return super.prepareExecution(context, normalized, options);
  }
  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    try { return JSON.stringify(await executeProjectTaskTool(this.getName() as ProjectTaskToolName, args)); }
    catch (e) { throw new Error(JSON.stringify(projectTaskToolError(e))); }
  }
}
export class ListProjectsTool extends ProjectTaskNativeTool {
  static getName() { return "list_projects"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.list_projects; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("list_projects"); }
}
export class ListProjectTasksTool extends ProjectTaskNativeTool {
  static getName() { return "list_project_tasks"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.list_project_tasks; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("list_project_tasks"); }
}
export class CreateOrUpdateTaskTool extends ProjectTaskNativeTool {
  static getName() { return "create_or_update_task"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.create_or_update_task; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("create_or_update_task"); }
}
export function registerProjectTaskTools(): void {
  registerToolClass(ListProjectsTool); registerToolClass(ListProjectTasksTool); registerToolClass(CreateOrUpdateTaskTool);
}
