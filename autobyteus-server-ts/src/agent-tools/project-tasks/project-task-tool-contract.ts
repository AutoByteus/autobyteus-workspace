import { ParameterSchema, ParameterDefinition, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_STATUSES, validateTaskStatus } from "../../projects/domain/task-status.js";
export const PROJECT_TASK_TOOL_NAMES = new Set(["list_projects", "list_project_tasks", "search_project_tasks", "create_project", "update_project", "create_task", "update_task"] as const);
export type ProjectTaskToolName = "list_projects" | "list_project_tasks" | "search_project_tasks" | "create_project" | "update_project" | "create_task" | "update_task";
export const isProjectTaskToolName = (name: string): name is ProjectTaskToolName =>
  PROJECT_TASK_TOOL_NAMES.has(name as ProjectTaskToolName);
const statuses: string[] = [...PROJECT_TASK_STATUSES];
export const PROJECT_TASK_TOOL_DESCRIPTIONS: Record<ProjectTaskToolName, string> = {
  create_project: "Create a Project on the current node: required name, optional description and workspaces (absolute node-local folder paths; registration not required). Returns the saved Project (projectId, name, description, workspaces). Does not delegate work.",
  update_project: "Update a known Project by its project_id: name, description and/or workspaces. Omitted fields are kept; blank description clears. A supplied workspaces list replaces ALL links ([] unlinks all, folders are not deleted); retained links keep omitted descriptions. Returns the saved Project.",
  list_projects: "List every Project on the current node with its stable projectId, name and description. Does not select or change a Project.",
  list_project_tasks: "List all Tasks in the explicit project_id, optionally filtered by exact TODO, IN_PROGRESS, DONE or CANCELLED status (CANCELLED = dropped as not needed). Each Task's taskId is its key (e.g. autobyteus-42): use it as the Task's ID in every tool. Returns descriptions, the Tasks each one depends on (dependsOn, by taskId), the bigger Task it is part of (partOf, a taskId or null) and its parts (parts, by taskId), saved context-file references, each Task's open assignments (assignments) and its closed ones (closedAssignments, one per earlier assignment period, so you can find the task agent that did a DONE Task). Each assignment names the task agent: {kind: agent, agentRunId} for a task agent, or {kind: team, teamRunId, teamCoordinatorAgentRunId} for a task agent team; plus who assigned it (assignedBy) and whether the work was accepted (outcome); accepted work is not necessarily finished. Give a follow-up Task to a task agent with delegate_task and its target_agent_run_id (agentRunId) or target_team_run_id (teamRunId); talk with it using send_message_to and its run id (agentRunId, or teamCoordinatorAgentRunId for a task agent team). A Task whose assignments can't be read is marked assignments unavailable.",
  search_project_tasks: "Search the Tasks of the explicit project_id with a sentence or a few words (query) describing the work: by meaning (related wording, paraphrases) and by exact text. Returns the best-matching Tasks first, at most limit (default 10, 1 to 30), each with its taskId (its key, e.g. autobyteus-42), status, partOf and parts (as in list_project_tasks), a one-line summary (the description's first line) and match (exact: the description contains the query; meaning: related by meaning). meaningSearch says whether meaning search was used; when it is preparing or unavailable, note says why and which results are exact text matches only. Use it to check whether a Task already exists before creating one, and to find the Task the user refers to by description; use list_project_tasks when you need every Task or a Task's full details.",
  create_task: "Create a Project Task: supply project_id and a required description (omit status and task_id); the new Task is TODO and gets the Project's next key as its taskId (e.g. autobyteus-42). Optional context_files: absolute local file paths copied into the new Task as context files. Same file types and 25 MiB limit as the app. Any invalid file fails the whole call with no change. Optional depends_on: the taskIds of Tasks of the same Project that come first (or that this Task follows up); it only informs and never stops work. Optional part_of: the taskId of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts). Returns the recorded Task identity (projectId, taskId, status, dependsOn, partOf) plus attachedContextFiles [{storedFilename, displayName}] when files were attached. Does not delegate work; to give the Task to an agent, use delegate_task.",
  update_task: "Update a Task by its task_id: a Project Task (its key, e.g. autobyteus-42), or the Task a description-only delegate_task created (it has no Project; delegate_task returned its task_id). Supply description and/or status (TODO, IN_PROGRESS, DONE, CANCELLED) and/or context_files and/or depends_on and/or part_of; never project_id.\nDONE means the work is finished; CANCELLED means the Task was dropped as not needed (not finished). Both stop the task agents whose current Task this is (never a task agent that has since been given another Task); their history is kept. Close a Task you delegated when its work is done. Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way (stopping their task agents); closedParts lists them.\nTo continue a closed Task with the same task agent, first set the Task to TODO or IN_PROGRESS; then, if you assigned the Task, message the task agent's run id (for a task agent team, its coordinator's run id): it continues with its conversation. A status change alone starts nothing. To give a task agent whose Task is DONE or CANCELLED a different Task, use delegate_task with its target_agent_run_id or target_team_run_id.\nOptional depends_on (Project Tasks only): the complete list of taskIds of Tasks of the same Project this Task depends on; it replaces the saved list, [] clears it. It only informs and never stops work.\nOptional part_of (Project Tasks only): the taskId of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts); \"\" clears it.\nOptional context_files: absolute local file paths copied into a Project Task as context files; appended, never removed. Same file types and 25 MiB limit as the app; not for a Task with no Project. Any invalid file fails the whole call with no change. Unknown IDs fail; omitted fields, saved context, dependencies and the parent are kept. Returns the recorded Task identity (projectId is null for a Task with no Project) and status, plus dependsOn and partOf for a Project Task, attachedContextFiles when the call attached files and closedParts when it closed parts.",
};
const contextFilesDefinition = (description: string) => new ParameterDefinition({
  name: "context_files", type: ParameterType.ARRAY, description, required: false, arrayItemSchema: { type: "string" },
});
const dependsOnDefinition = (description: string) => new ParameterDefinition({
  name: "depends_on", type: ParameterType.ARRAY, description, required: false, arrayItemSchema: { type: "string" },
});
const partOfDefinition = (description: string) => new ParameterDefinition({ name: "part_of", type: ParameterType.STRING, description, required: false });
const p = (name: string, description: string, required = false, enumValues?: string[]) => new ParameterDefinition({
  name, description, required, type: enumValues ? ParameterType.ENUM : ParameterType.STRING, ...(enumValues ? { enumValues } : {}),
});
/** The one `workspaces` definition of both Project mutation tools; only the texts differ. */
const workspacesDefinition = (description: string, linkDescription: string) => new ParameterDefinition({
  name: "workspaces", type: ParameterType.ARRAY, description,
  arrayItemSchema: new ParameterSchema([
    p("workspace_path", "Absolute folder path on this node; no shell expansion or registration required.", true),
    p("description", linkDescription),
  ]),
});
export function buildProjectTaskToolSchema(name: ProjectTaskToolName): ParameterSchema {
  if (name === "create_project") return new ParameterSchema([
    p("name", "Trimmed non-empty Project name.", true),
    p("description", "Optional Project description."),
    workspacesDefinition("Optional workspace links. Use absolute folder paths on this node; registration and existence are not required.",
      "Optional link description."),
  ]);
  if (name === "update_project") return new ParameterSchema([
    p("project_id", "Known Project identity to update. Never resolved by name.", true),
    p("name", "Trimmed non-empty Project name; omit to keep."),
    p("description", "Project description; omit to keep, blank to clear."),
    workspacesDefinition("Complete desired workspace links, not append. Omit to keep; [] unlinks all without deleting folders. Use absolute folder paths on this node; registration and existence are not required.",
      "Link description; omit to keep a retained link's description, blank to clear. New links default to blank."),
  ]);
  if (name === "create_task") return new ParameterSchema([
    p("project_id", "Project identity on the current node.", true),
    p("description", "Trimmed non-empty Task content.", true),
    contextFilesDefinition("Absolute local file paths on this node to copy into the new Task's saved context. Same file types and 25 MiB limit as the app."),
    dependsOnDefinition("taskIds (keys, e.g. autobyteus-39) of Tasks in the same Project that this Task depends on."),
    partOfDefinition("The taskId (key, e.g. autobyteus-25) of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts)."),
  ]);
  if (name === "update_task") return new ParameterSchema([
    p("task_id", "The Task's ID: a Project Task's key (e.g. autobyteus-42), or the Task ID of a Task with no Project.", true),
    p("description", "Trimmed non-empty Task content; omit to preserve."),
    p("status", "Explicit business status patch; omit to preserve.", false, statuses),
    contextFilesDefinition("Absolute local file paths on this node to copy into the Project Task's saved context (appended; never removes). Same file types and 25 MiB limit as the app."),
    dependsOnDefinition("Project Tasks only: the complete list of taskIds of Tasks in the same Project this Task depends on; replaces the saved list, [] clears it, omit to keep."),
    partOfDefinition("Project Tasks only: the taskId of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts). Replaces the saved one; \"\" clears it; omit to keep."),
  ]);
  if (name === "search_project_tasks") return new ParameterSchema([
    p("project_id", "Explicit Project identity on the current node.", true),
    p("query", "A sentence or a few words describing the Task you are looking for.", true),
    new ParameterDefinition({ name: "limit", type: ParameterType.INTEGER, description: "Most Tasks returned, 1 to 30 (default 10).", required: false, minValue: 1, maxValue: 30 }),
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
const rejectUnsupported = (input: Record<string, unknown>, allowed: string[]): void => {
  if (Object.keys(input).some((key) => !allowed.includes(key))) invalid("Unsupported tool argument.");
};

const projectInput = (raw: unknown): Record<string, unknown> => {
  if (!plainObject(raw)) invalid("Tool arguments must be a plain object.");
  return raw as Record<string, unknown>;
};
const projectNameRequired = (): never => { throw new ProjectError("PROJECT_NAME_REQUIRED", "Project name is required."); };
/** Validates the optional `name`, `description` and `workspaces` fields, in that order, into `result`. */
function addProjectFields(input: Record<string, unknown>, result: Record<string, unknown>): void {
  if (Object.hasOwn(input, "name")) {
    if (typeof input.name !== "string") invalid("name must be a string.");
    if (!(input.name as string).trim()) projectNameRequired();
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
}

/** `create_project`: `{name, description?, workspaces?}`; `project_id` is rejected as unsupported. */
function parseCreateProjectInput(raw: unknown): Record<string, unknown> {
  const input = projectInput(raw);
  rejectUnsupported(input, ["name", "description", "workspaces"]);
  const result: Record<string, unknown> = {};
  addProjectFields(input, result);
  if (!Object.hasOwn(result, "name")) projectNameRequired();
  return result;
}

/** `update_project`: `{project_id, name?, description?, workspaces?}`. At least one change is required. */
function parseUpdateProjectInput(raw: unknown): Record<string, unknown> {
  const input = projectInput(raw);
  rejectUnsupported(input, ["project_id", "name", "description", "workspaces"]);
  const result: Record<string, unknown> = {project_id: id(input, "project_id")};
  addProjectFields(input, result);
  if (!["name", "description", "workspaces"].some(key => Object.hasOwn(result, key))) {
    throw new ProjectError("PROJECT_PATCH_REQUIRED", "Supply name, description and/or workspaces to update a Project.");
  }
  return result;
}

const plainInput = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("Tool arguments must be an object.");
  return raw as Record<string, unknown>;
};
const taskDescription = (input: Record<string, unknown>): string | undefined => {
  if (!Object.hasOwn(input, "description")) return undefined;
  if (typeof input.description !== "string") invalid("description must be a string.");
  if (!(input.description as string).trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  return (input.description as string).trim();
};
const taskContextFiles = (input: Record<string, unknown>): string[] | undefined => {
  if (!Object.hasOwn(input, "context_files")) return undefined;
  if (!Array.isArray(input.context_files)) invalid("context_files must be an array of absolute file paths.");
  // Array.from visits holes too; sparse entries must not bypass validation.
  return Array.from(input.context_files as unknown[], (entry) => {
    if (typeof entry !== "string" || !entry.trim()) invalid("Each context_files entry must be a non-empty path string.");
    return (entry as string).trim();
  });
};

/** depends_on: an array of non-empty Task references (keys or IDs); the Task service resolves and validates them. */
const taskDependsOn = (input: Record<string, unknown>): string[] | undefined => {
  if (!Object.hasOwn(input, "depends_on")) return undefined;
  if (!Array.isArray(input.depends_on)) invalid("depends_on must be an array of taskIds.");
  return Array.from(input.depends_on as unknown[], (entry) => {
    if (typeof entry !== "string" || !entry.trim()) invalid("Each depends_on entry must be a non-empty taskId.");
    return (entry as string).trim();
  });
};

/** part_of: one Task reference (a key or ID), trimmed; "" (clearing, update_task only) is kept as "". The Task service resolves and validates it. */
const taskPartOf = (input: Record<string, unknown>, clearable: boolean): string | undefined => {
  if (!Object.hasOwn(input, "part_of")) return undefined;
  if (typeof input.part_of !== "string") invalid("part_of must be a taskId string.");
  const reference = (input.part_of as string).trim();
  if (!reference && !clearable) invalid("part_of must be a non-empty taskId.");
  return reference;
};

/** `create_task`: `{project_id, description, context_files?, depends_on?, part_of?}`. `status` is rejected, and so is `task_id`. context_files and depends_on are shape-checked here only; the Task service owns their rules. */
export function parseCreateTaskInput(raw: unknown): Record<string, unknown> {
  const input = plainInput(raw);
  rejectUnsupported(input, ["project_id", "description", "status", "context_files", "depends_on", "part_of"]);
  const result: Record<string, unknown> = {project_id: id(input, "project_id")};
  const hasStatus = Object.hasOwn(input, "status");
  if (hasStatus) result.status = validateTaskStatus(input.status);
  const description = taskDescription(input);
  if (description !== undefined) result.description = description;
  const contextFiles = taskContextFiles(input);
  if (contextFiles !== undefined) result.context_files = contextFiles;
  const dependsOn = taskDependsOn(input);
  if (dependsOn !== undefined) result.depends_on = dependsOn;
  const partOf = taskPartOf(input, false);
  if (partOf !== undefined) result.part_of = partOf;
  if (hasStatus) throw new ProjectError("TASK_CREATE_STATUS_UNSUPPORTED", "Omit status when creating a TODO Task.");
  if (description === undefined) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  return result;
}

/** `update_task`: `{task_id, description?, status?, context_files?, depends_on?, part_of?}`; a Task ID or key is unique, so `project_id` is rejected. At least one change is required (`depends_on: []` and `part_of: ""` are one). */
export function parseUpdateTaskInput(raw: unknown): Record<string, unknown> {
  const input = plainInput(raw);
  rejectUnsupported(input, ["task_id", "description", "status", "context_files", "depends_on", "part_of"]);
  const result: Record<string, unknown> = {task_id: id(input, "task_id")};
  const hasStatus = Object.hasOwn(input, "status");
  if (hasStatus) result.status = validateTaskStatus(input.status);
  const description = taskDescription(input);
  if (description !== undefined) result.description = description;
  const contextFiles = taskContextFiles(input);
  if (contextFiles !== undefined) result.context_files = contextFiles;
  const dependsOn = taskDependsOn(input);
  if (dependsOn !== undefined) result.depends_on = dependsOn;
  const partOf = taskPartOf(input, true);
  if (partOf !== undefined) result.part_of = partOf;
  if (!hasStatus && description === undefined && !(contextFiles?.length) && dependsOn === undefined && partOf === undefined) {
    throw new ProjectError("TASK_PATCH_REQUIRED", "Supply description, status, context_files, depends_on and/or part_of to update a Task.");
  }
  return result;
}

/** `search_project_tasks`: `{project_id, query, limit?}`; a blank query and a limit outside 1–30 are argument errors. */
export function parseSearchProjectTasksInput(raw: unknown): Record<string, unknown> {
  const input = plainInput(raw);
  rejectUnsupported(input, ["project_id", "query", "limit"]);
  const result: Record<string, unknown> = {project_id: id(input, "project_id")};
  if (typeof input.query !== "string" || !input.query.trim()) invalid("query must be a non-empty string.");
  result.query = (input.query as string).trim();
  if (Object.hasOwn(input, "limit")) {
    if (!Number.isInteger(input.limit) || (input.limit as number) < 1 || (input.limit as number) > 30) invalid("limit must be a whole number from 1 to 30.");
    result.limit = input.limit;
  }
  return result;
}

/** Presence matters: no coercion or hidden keys. Project and Task mutation tools have one parser each. */
export function parseProjectTaskToolInput(name: ProjectTaskToolName, raw: unknown): Record<string, unknown> {
  if (name === "create_project") return parseCreateProjectInput(raw);
  if (name === "update_project") return parseUpdateProjectInput(raw);
  if (name === "create_task") return parseCreateTaskInput(raw);
  if (name === "update_task") return parseUpdateTaskInput(raw);
  if (name === "search_project_tasks") return parseSearchProjectTasksInput(raw);
  const input = plainInput(raw);
  rejectUnsupported(input, name === "list_projects" ? [] : ["project_id", "status"]);
  if (name === "list_projects") return {};
  const result: Record<string, unknown> = {project_id: id(input, "project_id")};
  if (Object.hasOwn(input, "status")) result.status = validateTaskStatus(input.status);
  return result;
}
