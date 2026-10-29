import { BaseTool, type ToolExecutionOptions } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { GET_PROJECT_TASK_TOOL_NAME, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";
import { executeProjectTaskTool, projectTaskToolError } from "./project-task-tool-manifest.js";
import { ANY_TASK_READ_SCOPE, taskReadScopeOf, type TaskReadScope } from "./project-task-read-scope.js";
export abstract class ProjectTaskNativeTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;
  async prepareExecution(context: unknown, args: Record<string, unknown> = {}, options: ToolExecutionOptions = {}) {
    let normalized: Record<string, unknown>;
    try { normalized = parseProjectTaskToolInput(this.getName() as ProjectTaskToolName, args); }
    catch (e) { throw new Error(toToolResultJson(projectTaskToolError(e))); }
    // Base preparation sees validated current values; abort/transport errors are not domain failures.
    return super.prepareExecution(context, normalized, options);
  }
  /** The caller's Task read scope; only `get_project_task` reads it (its bound tool overrides this). */
  protected taskReadScope(): TaskReadScope { return ANY_TASK_READ_SCOPE; }
  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    // The scope is asked inside the call, so a failure to tell it ends the call as a refusal (AR-008).
    try { return toToolResultJson(await executeProjectTaskTool(this.getName() as ProjectTaskToolName, args, this.taskReadScope())); }
    catch (e) { throw new Error(toToolResultJson(projectTaskToolError(e))); }
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
export class SearchProjectTasksTool extends ProjectTaskNativeTool {
  static getName() { return "search_project_tasks"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.search_project_tasks; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("search_project_tasks"); }
}
export class CreateProjectTool extends ProjectTaskNativeTool {
  static getName() { return "create_project"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.create_project; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("create_project"); }
}
export class UpdateProjectTool extends ProjectTaskNativeTool {
  static getName() { return "update_project"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.update_project; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("update_project"); }
}
export class CreateTaskTool extends ProjectTaskNativeTool {
  static getName() { return "create_task"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.create_task; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("create_task"); }
}
export class UpdateTaskTool extends ProjectTaskNativeTool {
  static getName() { return "update_task"; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.update_task; }
  static getArgumentSchema() { return buildProjectTaskToolSchema("update_task"); }
}
/**
 * `get_project_task` (REQ-014, REQ-015), bound to its caller: a worker reads only the Task it works on. It exists only
 * as a bound instance (`createBoundGetProjectTaskTool`); an instance the registry made without a binding refuses every
 * call rather than read with no scope (AR-008).
 */
export class GetProjectTaskTool extends ProjectTaskNativeTool {
  static getName() { return GET_PROJECT_TASK_TOOL_NAME; }
  static getDescription() { return PROJECT_TASK_TOOL_DESCRIPTIONS.get_project_task; }
  static getArgumentSchema() { return buildProjectTaskToolSchema(GET_PROJECT_TASK_TOOL_NAME); }
  constructor(config?: ToolConfig, private readonly caller?: { memberExecutionContext: MemberExecutionContext | null }) { super(config); }
  protected taskReadScope(): TaskReadScope {
    if (!this.caller) throw new Error("get_project_task was created without its caller.");
    return taskReadScopeOf(this.caller.memberExecutionContext);
  }
}
const GET_PROJECT_TASK_OWNER = "server-owned-project-tasks";
/** The registry entry (tool picker, exposure); instances come only from `createBoundGetProjectTaskTool`. */
export const ensureGetProjectTaskToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(GET_PROJECT_TASK_TOOL_NAME);
  if (existing?.metadata?.owner === GET_PROJECT_TASK_OWNER) return existing;
  const definition = new ToolDefinition(GET_PROJECT_TASK_TOOL_NAME, GetProjectTaskTool.getDescription(), ToolOrigin.LOCAL,
    ToolCategory.TASK_MANAGEMENT, () => GetProjectTaskTool.getArgumentSchema(), () => null,
    { toolClass: GetProjectTaskTool, metadata: { owner: GET_PROJECT_TASK_OWNER } });
  defaultToolRegistry.registerTool(definition);
  return definition;
};
/** `get_project_task` for this caller; `null` when the run has no member context (it works on no Task). */
export const createBoundGetProjectTaskTool = (memberExecutionContext: MemberExecutionContext | null): GetProjectTaskTool => {
  const tool = new GetProjectTaskTool(undefined, { memberExecutionContext });
  tool.definition = ensureGetProjectTaskToolRegistered();
  return tool;
};
/** Registers the Project Task tools; `get_project_task` only as its bound definition. */
export function registerProjectTaskTools(): void {
  ensureGetProjectTaskToolRegistered();
  registerToolClass(ListProjectsTool); registerToolClass(ListProjectTasksTool); registerToolClass(SearchProjectTasksTool);
  registerToolClass(CreateProjectTool); registerToolClass(UpdateProjectTool);
  registerToolClass(CreateTaskTool); registerToolClass(UpdateTaskTool);
}
