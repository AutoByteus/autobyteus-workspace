import { ParameterSchema, ParameterDefinition, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_STATUSES, validateTaskStatus } from "../../projects/domain/task-status.js";
export const PROJECT_TASK_TOOL_NAMES = new Set(["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"] as const);
export type ProjectTaskToolName = "list_projects" | "list_project_tasks" | "create_or_update_project" | "create_or_update_task";
export const isProjectTaskToolName = (name: string): name is ProjectTaskToolName =>
  PROJECT_TASK_TOOL_NAMES.has(name as ProjectTaskToolName);
/** Automatic wherever `delegate_task` is: it closes the Task a delegation created (status DONE or CANCELLED). */
export const CREATE_OR_UPDATE_TASK_TOOL_NAME = "create_or_update_task" satisfies ProjectTaskToolName;
const statuses: string[] = [...PROJECT_TASK_STATUSES];
export const PROJECT_TASK_TOOL_DESCRIPTIONS: Record<ProjectTaskToolName, string> = {
  create_or_update_project: "Create a required-name Project or patch a known project_id on the current node. Omitted fields are preserved; blank description clears. Optional workspaces reference absolute node-local folder paths: a supplied list replaces ALL links, [] unlinks only. Retained links preserve omitted descriptions. Returns saved metadata and links; does not register/delete workspaces or delegate work.",
  list_projects: "List every Project on the current node with its stable projectId, name and description. Does not select or change a Project.",
  list_project_tasks: "List all Tasks in the explicit project_id, optionally filtered by exact TODO, IN_PROGRESS, DONE or CANCELLED status (CANCELLED = dropped as not needed). Returns descriptions, saved context-file references, each Task's open assignments (assignments) and its closed ones (closedAssignments, one per earlier assignment period, so you can find the copy that did a DONE Task). Each assignment names the copy for what it is: {kind: agent, agentRunId} for an Agent copy, or {kind: team, teamRunId, teamCoordinatorAgentRunId} for a Team copy; plus who assigned it (assignedBy) and whether the work was accepted (outcome); accepted work is not necessarily finished. Give a follow-up Task to a copy with delegate_task and its target_team_run_id (teamRunId) or target_agent_run_id (agentRunId); message it with send_message_to and an agent run ID (agentRunId, or teamCoordinatorAgentRunId). A Task whose assignments can't be read is marked assignments unavailable.",
  create_or_update_task: "Create a Project Task, or patch any Task by its ID. Create: supply project_id and a required description (omit task_id and status); the new Task is TODO. Patch: supply task_id with description and/or TODO/IN_PROGRESS/DONE/CANCELLED status, and never project_id; task_id may name a Project Task or a Task that delegate_task created (it has no Project). DONE means the work is finished; CANCELLED means the Task was dropped as not needed (not completed). Both stop the copies whose current Task this is and remove them from the run (never a copy that has since been given another Task); their history is kept. To continue this Task with a copy later, set the Task to TODO or IN_PROGRESS first, then (as the run that assigned it) message the copy's agent run ID (for a Team copy, its coordinator's): that reactivates the copy with its conversation. To give a copy whose Task is DONE or CANCELLED a different Task, use delegate_task with its target_team_run_id or target_agent_run_id instead. A status change alone starts nothing. Optional context_files (create or patch): absolute local file paths copied into a Project Task as context files; patch appends and never removes. Same file types and 25 MiB limit as the app; not for a Task with no Project. Any invalid file fails the whole call with no change. Unknown IDs fail; omitted fields and saved context are preserved. Returns the recorded Task identity (projectId is null for a Task with no Project) and status, plus attachedContextFiles [{storedFilename, displayName}] when the call attached files; not a work-completion assessment. Does not delegate work.",
};
const CONTEXT_FILES_DESCRIPTION = "Absolute local file paths on this node to copy into the Project Task's saved context (appended on patch; never removes). Same file types and 25 MiB limit as the app.";
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
      description: "Complete desired workspace links, not append. Omit to preserve on patch; [] unlinks all without deleting folders. Use absolute folder paths on this node; registration and existence are not required.",
      arrayItemSchema: new ParameterSchema([
        p("workspace_path", "Absolute folder path on this node; no shell expansion or registration required.", true),
        p("description", "Link description; omit to preserve a retained link, blank to clear. New links default to blank."),
      ]),
    }),
  ]);
  if (name === "create_or_update_task") return new ParameterSchema([
    p("project_id", "Project identity on the current node; required to create, forbidden with task_id."),
    p("task_id", "Known Task identity (with or without a Project) to patch; omit to create."),
    p("description", "Trimmed non-empty Task content; required for create."),
    p("status", "Explicit business status patch; forbidden during create.", false, statuses),
    new ParameterDefinition({
      name: "context_files", type: ParameterType.ARRAY, description: CONTEXT_FILES_DESCRIPTION, required: false, arrayItemSchema: { type: "string" },
    }),
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
    // Array.from visits holes too; sparse rows must not bypass validation.
    result.workspaces = Array.from(rows, row => {
      if (!plainObject(row)) invalid("Each workspace must be a plain object.");
      const item = row as Record<string, unknown>;
      if (Object.keys(item).some(key => !["workspace_path", "description"].includes(key))) invalid("Unsupported workspace argument.");
      const workspacePath = id(item, "workspace_path");
      const link: Record<string, unknown> = {workspace_path: workspacePath};
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
 * `create_or_update_task` has two strict modes: create `{project_id, description, context_files?}` and
 * patch `{task_id, status?, description?, context_files?}` (a Task ID is unique, so patch never takes
 * project_id). context_files is shape-checked here only; the Task service owns file rules.
 */
export function parseProjectTaskToolInput(name: ProjectTaskToolName, raw: unknown): Record<string, unknown> {
  if (name === "create_or_update_project") return parseProjectMutation(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("Tool arguments must be an object.");
  const input = raw as Record<string, unknown>;
  const hasTask = name === "create_or_update_task" && Object.hasOwn(input, "task_id");
  const allowed = name === "list_projects" ? [] : name === "list_project_tasks" ? ["project_id", "status"]
    : hasTask ? ["task_id", "description", "status", "context_files"] : ["project_id", "description", "status", "context_files"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) invalid("Unsupported tool argument.");
  if (name === "list_projects") return {};
  const result: Record<string, unknown> = hasTask ? {task_id: id(input, "task_id")} : {project_id: id(input, "project_id")};
  const hasStatus = Object.hasOwn(input, "status");
  if (hasStatus) {
    result.status = validateTaskStatus(input.status);
  }
  if (name === "list_project_tasks") return result;
  const hasDescription = Object.hasOwn(input, "description");
  if (hasDescription) {
    if (typeof input.description !== "string") invalid("description must be a string.");
    if (!(input.description as string).trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
    result.description = (input.description as string).trim();
  }
  if (Object.hasOwn(input, "context_files")) {
    if (!Array.isArray(input.context_files)) invalid("context_files must be an array of absolute file paths.");
    // Array.from visits holes too; sparse entries must not bypass validation.
    result.context_files = Array.from(input.context_files as unknown[], (entry) => {
      if (typeof entry !== "string" || !entry.trim()) invalid("Each context_files entry must be a non-empty path string.");
      return (entry as string).trim();
    });
  }
  const hasContextFiles = ((result.context_files as string[] | undefined) ?? []).length > 0;
  if (!hasTask) {
    if (hasStatus) throw new ProjectError("TASK_CREATE_STATUS_UNSUPPORTED", "Omit status when creating a TODO Task.");
    if (!hasDescription) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  } else if (!hasStatus && !hasDescription && !hasContextFiles) {
    throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description, status and/or context_files to update a Task.");
  }
  return result;
}
