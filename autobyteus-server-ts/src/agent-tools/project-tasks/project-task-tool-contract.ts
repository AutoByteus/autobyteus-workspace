import { ParameterSchema, ParameterDefinition, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
export const PROJECT_TASK_TOOL_NAMES = new Set(["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"] as const);
export type ProjectTaskToolName = "list_projects" | "list_project_tasks" | "create_or_update_project" | "create_or_update_task";
export const isProjectTaskToolName = (name: string): name is ProjectTaskToolName =>
  PROJECT_TASK_TOOL_NAMES.has(name as ProjectTaskToolName);
/** Automatic wherever `delegate_task` is: it closes the Task a delegation created (status DONE). */
export const CREATE_OR_UPDATE_TASK_TOOL_NAME = "create_or_update_task" satisfies ProjectTaskToolName;
const statuses = ["TODO", "IN_PROGRESS", "DONE"];
export const PROJECT_TASK_TOOL_DESCRIPTIONS: Record<ProjectTaskToolName, string> = {
  create_or_update_project: "Create a required-name Project or patch a known project_id on the current node. Omitted fields are preserved; blank description clears. Optional workspaces reference known registered workspace IDs: a supplied list replaces ALL links, [] unlinks only. Retained links preserve omitted descriptions. Unknown IDs fail. Returns saved metadata and links; does not register/delete workspaces or delegate work.",
  list_projects: "List every Project on the current node with its stable projectId, name and description. Does not select or change a Project.",
  list_project_tasks: "List all Tasks in the explicit project_id, optionally filtered by exact TODO, IN_PROGRESS or DONE status. Returns descriptions, saved context-file references and each Task's current assignments (the worker run to follow up with, whether it is an Agent or a Team, who assigned it, and whether the work was accepted); accepted work is not necessarily finished. A Task whose assignments can't be read is marked assignments unavailable.",
  create_or_update_task: "Create a Project Task, or patch any Task by its ID. Create: supply project_id and a required description (omit task_id and status); the new Task is TODO. Patch: supply task_id with description and/or TODO/IN_PROGRESS/DONE status, and never project_id; task_id may name a Project Task or a Task that delegate_task created (it has no Project). DONE closes the Task's delegated copies for good: they are stopped and removed from the run, and their history is kept. Unknown IDs fail; omitted fields and saved context are preserved. Returns the recorded Task identity (projectId is null for a Task with no Project) and status, not a work-completion assessment. Does not delegate work.",
};
export function buildProjectTaskToolSchema(name: ProjectTaskToolName): ParameterSchema {
  const p = (name: string, description: string, required = false, enumValues?: string[]) => new ParameterDefinition({
    name, description, required, type: enumValues ? ParameterType.ENUM : ParameterType.STRING, ...(enumValues ? { enumValues } : {}),
  });
  if (name === "create_or_update_project") return new ParameterSchema([
    p("project_id", "Known Project identity for patch; omit to create. Never resolved by name."),
    p("name", "Trimmed non-empty Project name; required for create, optional for patch."),
    p("description", "Project description; omit to preserve on patch, blank to clear."),
    new ParameterDefinition({
      name: "workspaces", type: ParameterType.ARRAY,
      description: "Complete desired workspace links, not append. Omit to preserve on patch; [] unlinks all without deleting folders. Use known registered node-local IDs.",
      arrayItemSchema: new ParameterSchema([
        p("workspace_id", "Known registered workspace identity on this node.", true),
        p("description", "Link description; omit to preserve a retained link, blank to clear. New links default to blank."),
      ]),
    }),
  ]);
  if (name === "create_or_update_task") return new ParameterSchema([
    p("project_id", "Project identity on the current node; required to create, forbidden with task_id."),
    p("task_id", "Known Task identity (with or without a Project) to patch; omit to create."),
    p("description", "Trimmed non-empty Task content; required for create."),
    p("status", "Explicit business status patch; forbidden during create.", false, statuses),
  ]);
  return new ParameterSchema(name === "list_projects" ? [] : [
    p("project_id", "Explicit Project identity on the current node.", true),
    p("status", "Optional exact business status filter.", false, statuses),
  ]);
}
const invalid = (message: string): never => { throw new ProjectError("PROJECT_TOOL_ARGUMENT_INVALID", message); };
const id = (raw: Record<string, unknown>, key: string): string => {
  if (typeof raw[key] !== "string" || !(raw[key] as string).trim()) invalid(`${key} must be a non-empty string.`);
  return (raw[key] as string).trim();
};
const plainObject = (raw: unknown): raw is Record<string, unknown> =>
  raw !== null && typeof raw === "object"
  && (Object.getPrototypeOf(raw) === Object.prototype || Object.getPrototypeOf(raw) === null);

function parseProjectMutation(raw: unknown): Record<string, unknown> {
  if (!plainObject(raw)) invalid("Tool arguments must be a plain object.");
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some(key => !["project_id", "name", "description", "workspaces"].includes(key))) invalid("Unsupported tool argument.");
  const result: Record<string, unknown> = {};
  const hasProject = Object.hasOwn(input, "project_id");
  if (hasProject) result.project_id = id(input, "project_id");
  if (Object.hasOwn(input, "name")) {
    if (typeof input.name !== "string") invalid("name must be a string.");
    if (!(input.name as string).trim()) throw new ProjectError("PROJECT_NAME_REQUIRED", "Project name is required.");
    result.name = (input.name as string).trim();
  }
  if (Object.hasOwn(input, "description")) {
    if (typeof input.description !== "string") invalid("description must be a string.");
    result.description = (input.description as string).trim();
  }
  if (Object.hasOwn(input, "workspaces")) {
    if (!Array.isArray(input.workspaces)) invalid("workspaces must be an array.");
    const rows = input.workspaces as unknown[];
    const seen = new Set<string>();
    // Array.from visits holes too; sparse rows must not bypass validation.
    result.workspaces = Array.from(rows, row => {
      if (!plainObject(row)) invalid("Each workspace must be a plain object.");
      const item = row as Record<string, unknown>;
      if (Object.keys(item).some(key => !["workspace_id", "description"].includes(key))) invalid("Unsupported workspace argument.");
      const workspaceId = id(item, "workspace_id");
      if (seen.has(workspaceId)) throw new ProjectError("WORKSPACE_ALREADY_LINKED", "Duplicate workspace links are not allowed.");
      seen.add(workspaceId);
      const link: Record<string, unknown> = {workspace_id: workspaceId};
      if (Object.hasOwn(item, "description")) {
        if (typeof item.description !== "string") invalid("Workspace description must be a string.");
        link.description = (item.description as string).trim();
      }
      return link;
    });
  }
  if (!hasProject && !Object.hasOwn(result, "name")) throw new ProjectError("PROJECT_NAME_REQUIRED", "Project name is required.");
  if (hasProject && !["name", "description", "workspaces"].some(key => Object.hasOwn(result, key))) {
    throw new ProjectError("PROJECT_PATCH_REQUIRED", "Supply name, description and/or workspaces to update a Project.");
  }
  return result;
}

/**
 * Presence matters: null/blank task_id is never a creation request. No coercion or hidden keys.
 * `create_or_update_task` has two strict modes: create `{project_id, description}` and patch
 * `{task_id, status?, description?}` (a Task ID is unique, so patch never takes project_id).
 */
export function parseProjectTaskToolInput(name: ProjectTaskToolName, raw: unknown): Record<string, unknown> {
  if (name === "create_or_update_project") return parseProjectMutation(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("Tool arguments must be an object.");
  const input = raw as Record<string, unknown>;
  const hasTask = name === "create_or_update_task" && Object.hasOwn(input, "task_id");
  const allowed = name === "list_projects" ? [] : name === "list_project_tasks" ? ["project_id", "status"]
    : hasTask ? ["task_id", "description", "status"] : ["project_id", "description", "status"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) invalid("Unsupported tool argument.");
  if (name === "list_projects") return {};
  const result: Record<string, unknown> = hasTask ? {task_id: id(input, "task_id")} : {project_id: id(input, "project_id")};
  const hasStatus = Object.hasOwn(input, "status");
  if (hasStatus) {
    if (typeof input.status !== "string" || !statuses.includes(input.status)) throw new ProjectError("TASK_STATUS_INVALID", "Task status must be TODO, IN_PROGRESS or DONE.");
    result.status = input.status;
  }
  if (name === "list_project_tasks") return result;
  const hasDescription = Object.hasOwn(input, "description");
  if (hasDescription) {
    if (typeof input.description !== "string") invalid("description must be a string.");
    if (!(input.description as string).trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
    result.description = (input.description as string).trim();
  }
  if (!hasTask) {
    if (hasStatus) throw new ProjectError("TASK_CREATE_STATUS_UNSUPPORTED", "Omit status when creating a TODO Task.");
    if (!hasDescription) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  } else if (!hasStatus && !hasDescription) throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description and/or status to update a Task.");
  return result;
}
