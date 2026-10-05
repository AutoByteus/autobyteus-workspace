import { ParameterSchema, ParameterDefinition, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
export const PROJECT_TASK_TOOL_NAMES = new Set(["list_projects", "list_project_tasks", "create_or_update_task"] as const);
export type ProjectTaskToolName = "list_projects" | "list_project_tasks" | "create_or_update_task";
export const isProjectTaskToolName = (name: string): name is ProjectTaskToolName =>
  PROJECT_TASK_TOOL_NAMES.has(name as ProjectTaskToolName);
const statuses = ["TODO", "IN_PROGRESS", "DONE"];
export const PROJECT_TASK_TOOL_DESCRIPTIONS: Record<ProjectTaskToolName, string> = {
  list_projects: "List every Project on the current node with its stable projectId, name and description. Does not select or change a Project.",
  list_project_tasks: "List all Tasks in the explicit project_id, optionally filtered by exact TODO, IN_PROGRESS or DONE status. Returns descriptions, saved context-file references and each Task's current assignments (the worker run to follow up with, whether it is an Agent or a Team, who assigned it, and whether the work was accepted); accepted work is not necessarily finished. A Task whose assignments can't be read is marked assignments unavailable.",
  create_or_update_task: "Create or explicitly patch one Project Task. Omit task_id to create a required-description TODO Task (omit status). Supply a known task_id to patch description and/or TODO/IN_PROGRESS/DONE status. Unknown IDs fail; omitted fields and saved context are preserved. Returns the recorded Task identity and status, not a work-completion assessment. Does not delegate work.",
};
export function buildProjectTaskToolSchema(name: ProjectTaskToolName): ParameterSchema {
  const p = (name: string, description: string, required = false, enumValues?: string[]) => new ParameterDefinition({
    name, description, required, type: enumValues ? ParameterType.ENUM : ParameterType.STRING, ...(enumValues ? { enumValues } : {}),
  });
  return new ParameterSchema(name === "list_projects" ? [] : [
    p("project_id", "Explicit Project identity on the current node.", true),
    ...(name === "create_or_update_task" ? [p("task_id", "Known Task identity for patch; omit to create."), p("description", "Trimmed non-empty Task content; required for create.")] : []),
    p("status", name === "list_project_tasks" ? "Optional exact business status filter." : "Explicit business status patch; forbidden during create.", false, statuses),
  ]);
}
const invalid = (message: string): never => { throw new ProjectError("PROJECT_TOOL_ARGUMENT_INVALID", message); };
const id = (raw: Record<string, unknown>, key: string): string => {
  if (typeof raw[key] !== "string" || !(raw[key] as string).trim()) invalid(`${key} must be a non-empty string.`);
  return (raw[key] as string).trim();
};
/** Presence matters: null/blank task_id is never a creation request. No coercion or hidden keys. */
export function parseProjectTaskToolInput(name: ProjectTaskToolName, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("Tool arguments must be an object.");
  const input = raw as Record<string, unknown>;
  const allowed = name === "list_projects" ? [] : name === "list_project_tasks" ? ["project_id", "status"] : ["project_id", "task_id", "description", "status"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) invalid("Unsupported tool argument.");
  if (name === "list_projects") return {};
  const result: Record<string, unknown> = {project_id: id(input, "project_id")};
  const hasStatus = Object.hasOwn(input, "status");
  if (hasStatus) {
    if (typeof input.status !== "string" || !statuses.includes(input.status)) throw new ProjectError("TASK_STATUS_INVALID", "Task status must be TODO, IN_PROGRESS or DONE.");
    result.status = input.status;
  }
  if (name === "list_project_tasks") return result;
  const hasTask = Object.hasOwn(input, "task_id");
  const hasDescription = Object.hasOwn(input, "description");
  if (hasTask) result.task_id = id(input, "task_id");
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
