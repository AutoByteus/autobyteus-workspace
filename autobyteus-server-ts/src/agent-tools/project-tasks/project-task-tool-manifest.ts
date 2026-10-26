import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import { getProjectTaskSearchService } from "../../projects/search/project-task-search-service.js";
import type { EmbeddingReadiness } from "../../embeddings/embedding-index.js";
import type { Project, ProjectTaskStatus, ProjectTaskView, ProjectWorkspaceInput, TaskAcknowledgementView } from "../../projects/domain/models.js";
import type { TaskAssignmentViews } from "../../projects/services/task-execution-resource-service.js";
import type { ProjectTaskContextFileView } from "../../projects/domain/project-task-context.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { compareTaskKeys } from "../../projects/domain/task-keys.js";
import { AD_HOC_TASK_ID_PREFIX } from "../../projects/domain/ad-hoc-task.js";
import type { TaskExecutionOwner } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { GET_PROJECT_TASK_TOOL_NAME, PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";
import { ANY_TASK_READ_SCOPE, type TaskReadScope } from "./project-task-read-scope.js";

const projectAcknowledgement = ({projectId, name, description, workspaces}: Project) => ({
  projectId, name, description,
  workspaces: workspaces.map(({workspaceRootPath, description}) => ({workspaceRootPath, description})),
});

/**
 * Agent-facing Task IDs: a Project Task's `taskId` is its key; `dependsOn`, `partOf` and `parts` name its existing
 * dependencies, parent and parts by key, from the Project's Task list (an ID that names no current Task is left
 * out). The stored long ID never appears in a Task-ID field. Every result goes through the tool result rule, so a
 * field with no value is absent.
 */
const relationKeys = (tasks: readonly ProjectTaskView[]) => {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const parts = new Map<string, string[]>();
  for (const task of tasks) if (task.partOfTaskId && byId.has(task.partOfTaskId)) parts.set(task.partOfTaskId, [...(parts.get(task.partOfTaskId) ?? []), task.taskKey]);
  return {
    dependsOn: (ids: readonly string[]) => ids.flatMap((id) => byId.get(id)?.taskKey ?? []),
    partOf: (id: string | null | undefined) => (id ? byId.get(id)?.taskKey : undefined),
    /** In key order (`autobyteus-25` before `autobyteus-172`), as the app lists them. */
    parts: (taskId: string) => [...(parts.get(taskId) ?? [])].sort(compareTaskKeys),
  };
};
/** The Project's Task list, read only when an acknowledgement names another Task (a dependency or the parent). */
const projectTaskList = async ({ projectId, dependsOnTaskIds, partOfTaskId }: Pick<TaskAcknowledgementView, "projectId" | "dependsOnTaskIds" | "partOfTaskId">) =>
  projectId && (dependsOnTaskIds?.length || partOfTaskId) ? getProjectTaskService().listTasks(projectId) : [];
/** A saved context file as agents read it: its name and the local path to read it by (DEC-004, DEC-019). */
const contextFileEntry = ({ displayName, localPath }: ProjectTaskContextFileView) => ({ name: displayName, path: localPath });
/**
 * `create_task` / `update_task`: the recorded Task identity. A Task with no Project has no `projectId`, `title`,
 * `dependsOn` or `partOf`; `attachedContextFiles` names the files this call attached, `closedParts` the parts it closed
 * with their parent, `partsNotClosed` those it could not close. An added comment adds nothing: the call's success says it was added.
 */
const taskAcknowledgement = (ack: Omit<TaskAcknowledgementView, "taskId">, tasks: readonly ProjectTaskView[]) => {
  const keys = relationKeys(tasks);
  return { projectId: ack.projectId, taskId: ack.taskReference, title: ack.title, status: ack.status,
    dependsOn: keys.dependsOn(ack.dependsOnTaskIds ?? []), partOf: keys.partOf(ack.partOfTaskId),
    attachedContextFiles: (ack.attachedContextFiles ?? []).map(contextFileEntry),
    closedParts: ack.closedPartReferences, partsNotClosed: ack.partsNotClosedReferences };
};
type TaskAssignmentsRead = TaskAssignmentViews | "unavailable" | undefined;
/**
 * `list_project_tasks` short entry: the Task's identity, title, status, relations, comment count and open assignments
 * (explicit copy IDs: an Agent's `agentRunId`, a Team's `teamRunId` and `teamCoordinatorAgentRunId`), or a marker when
 * its assignments can't be read.
 */
const taskShortEntry = ({ taskId, taskKey, title, status, dependsOnTaskIds, partOfTaskId, comments }: ProjectTaskView,
  keys: ReturnType<typeof relationKeys>, assignments: TaskAssignmentsRead) => ({
  taskId: taskKey, title, status, dependsOn: keys.dependsOn(dependsOnTaskIds), partOf: keys.partOf(partOfTaskId), parts: keys.parts(taskId),
  commentCount: comments.length || undefined,
  ...(assignments === "unavailable" ? { assignmentsUnavailable: true as const } : { assignments: assignments?.open }),
});
/**
 * `get_project_task`: one Task in full (REQ-014): its identity, title and status, the description, relations, the
 * comments' texts (oldest first), context files and its open and closed assignments.
 */
const taskFullEntry = ({ projectId, taskId, taskKey, title, status, description, dependsOnTaskIds, partOfTaskId, comments, contextFiles }: ProjectTaskView,
  keys: ReturnType<typeof relationKeys>, assignments: TaskAssignmentsRead) => ({
  projectId, taskId: taskKey, title, status, description,
  dependsOn: keys.dependsOn(dependsOnTaskIds), partOf: keys.partOf(partOfTaskId), parts: keys.parts(taskId),
  comments: comments.map((comment) => comment.text), contextFiles: contextFiles.map(contextFileEntry),
  ...(assignments === "unavailable" ? { assignmentsUnavailable: true as const }
    : { assignments: assignments?.open, closedAssignments: assignments?.closed }),
});
/** A worker may read only the Task it works on (REQ-015): the refusal names that Task and carries no data of the other. */
const outOfScope = async (owner: TaskExecutionOwner, sameProject: readonly ProjectTaskView[]): Promise<ProjectError> => {
  if (owner.taskId.startsWith(AD_HOC_TASK_ID_PREFIX)) {
    return new ProjectError("TASK_READ_OUT_OF_SCOPE", "Your Task has no Project; get_project_task reads Project Tasks.");
  }
  const key = sameProject.find((task) => task.taskId === owner.taskId)?.taskKey ?? await getProjectTaskService().taskKeyOf(owner.taskId);
  return new ProjectError("TASK_READ_OUT_OF_SCOPE", `You work on ${key}; you can read only that Task.`);
};

/** An agent waits up to this long for meaning search on first use, so "no such Task" is not concluded too early. */
const SEARCH_READY_WAIT_MS = 30_000;
/** When meaning search was not (fully) used, why, and what the results are; nothing when it was used. */
const meaningSearchNote = (readiness: EmbeddingReadiness) => {
  if (readiness.state === "ready") return undefined;
  if (readiness.state === "unavailable") {
    return { state: "unavailable" as const, note: `Meaning search is unavailable (${readiness.reason}); results are exact text matches only.` };
  }
  return { state: "preparing" as const, note: readiness.phase === "indexing"
    ? `Meaning search is still preparing (${readiness.done} of ${readiness.total} Tasks indexed); Tasks not indexed yet are found by exact text only.`
    : `Meaning search is still preparing (${readiness.phase === "downloading" ? "downloading" : "loading"} the search model); results are exact text matches only.` };
};

class ProjectMutationUnconfirmed extends Error {
  constructor(subject: "Project" | "Task", cause: unknown) {
    super(`${subject} change could not be confirmed. Check the saved ${subject} before repeating.`, { cause });
  }
}
export const projectTaskToolError = (error: unknown) => {
  if (error instanceof ProjectMutationUnconfirmed) {
    console.error("Project Task mutation result unavailable.", error);
    return { error: { code: "PROJECT_OPERATION_UNCONFIRMED", message: error.message } };
  }
  if (error instanceof ProjectError) return { error: { code: error.code, message: error.message } };
  // The caller's Task read scope could not be told (damaged run data): a refusal with its code, never "any" (AR-008).
  if (error instanceof TaskDelegationError) return { error: { code: error.code, message: error.message } };
  console.error("Project tool operation failed.", error);
  return { error: { code: "PROJECT_OPERATION_FAILED", message: "Project operation failed." } };
};
/** Runs one Project Task tool. Only `get_project_task` reads `scope`, the caller's Task read scope. */
export async function executeProjectTaskTool(name: ProjectTaskToolName, raw: unknown, scope: TaskReadScope = ANY_TASK_READ_SCOPE): Promise<object> {
  const input = parseProjectTaskToolInput(name, raw);
  if (name === "list_projects") return { projects: await getProjectService().listProjectSummaries() };
  if (name === "create_project" || name === "update_project") {
    const fields = {
      ...(Object.hasOwn(input, "name") ? {name: input.name as string} : {}),
      ...(Object.hasOwn(input, "description") ? {description: input.description as string} : {}),
      ...(Object.hasOwn(input, "workspaces") ? {workspaces: (input.workspaces as Array<Record<string, unknown>>).map(row => ({
        workspaceRootPath: row.workspace_path as string,
        ...(Object.hasOwn(row, "description") ? {description: row.description as string} : {}),
      })) as ProjectWorkspaceInput[]} : {}),
    };
    try {
      const project = name === "update_project"
        ? await getProjectService().patchProjectRecord({projectId: input.project_id as string, ...fields})
        : await getProjectService().createProjectRecord({...fields, name: input.name as string});
      return {project: projectAcknowledgement(project)};
    } catch (error) {
      if (error instanceof ProjectError) throw error;
      throw new ProjectMutationUnconfirmed("Project", error);
    }
  }
  if (name === "list_project_tasks") {
    const projectId = input.project_id as string;
    // The whole Project list also names dependencies, parents and parts outside the status filter.
    const all = await getProjectTaskService().listTasks(projectId);
    const tasks = Object.hasOwn(input, "status") ? all.filter(task => task.status === input.status as ProjectTaskStatus) : all;
    const assignments = await getProjectTaskService().assignments(tasks.map(task => task.taskId));
    const keys = relationKeys(all);
    return { projectId, tasks: tasks.map(task => taskShortEntry(task, keys, assignments.get(task.taskId))) };
  }
  if (name === GET_PROJECT_TASK_TOOL_NAME) {
    const projectId = input.project_id as string;
    // Resolved within the Project first, then checked against the caller's scope, before any data is built.
    const task = await getProjectTaskService().readProjectTask(projectId, input.task_id as string);
    const all = await getProjectTaskService().listTasks(projectId);
    if (scope.kind === "owned" && scope.owner.taskId !== task.taskId) throw await outOfScope(scope.owner, all);
    const assignments = await getProjectTaskService().assignments([task.taskId]);
    return taskFullEntry(task, relationKeys(all), assignments.get(task.taskId));
  }
  if (name === "search_project_tasks") {
    const projectId = input.project_id as string;
    const result = await getProjectTaskSearchService().search(projectId, input.query as string,
      { limit: (input.limit as number | undefined) ?? 10, waitForReadyMs: SEARCH_READY_WAIT_MS });
    // Parents and parts are named from the whole Project list.
    const keys = relationKeys(await getProjectTaskService().listTasks(projectId));
    return { projectId, tasks: result.matches.map(({ task, match }) => ({ taskId: task.taskKey, status: task.status,
      partOf: keys.partOf(task.partOfTaskId), parts: keys.parts(task.taskId), title: task.title, match, commentCount: task.comments.length || undefined })),
      meaningSearch: meaningSearchNote(result.meaningSearch) };
  }
  // The service may fail while producing its view AFTER the write. Neither a
  // fabricated acknowledgement nor a rollback claim is safe without its result.
  const localContextFiles = (input.context_files as string[] | undefined) ?? [];
  const dependsOn = input.depends_on as string[] | undefined;
  const partOf = input.part_of as string | undefined;
  const addComment = input.add_comment as string | undefined;
  try {
    if (name === "update_task") {
      const ack = await getProjectTaskService().updateTaskById({ taskId: input.task_id as string,
        ...(Object.hasOwn(input, "title") ? { title: input.title as string } : {}),
        ...(Object.hasOwn(input, "description") ? { description: input.description as string } : {}),
        ...(Object.hasOwn(input, "status") ? { status: input.status as ProjectTaskStatus } : {}),
        ...(localContextFiles.length ? { localContextFiles } : {}), ...(dependsOn ? { dependsOn } : {}), ...(partOf !== undefined ? { partOf } : {}),
        ...(addComment !== undefined ? { addComment } : {}) });
      return { task: taskAcknowledgement(ack, await projectTaskList(ack)) };
    }
    const created = await getProjectTaskService().createTaskWithLocalContextFiles({
      projectId: input.project_id as string, title: input.title as string, description: input.description as string, localContextFiles, ...(dependsOn ? { dependsOn } : {}), ...(partOf !== undefined ? { partOf } : {}) });
    // Every context file of a new Task was attached by this call.
    return { task: taskAcknowledgement({ ...created, taskReference: created.taskKey, attachedContextFiles: created.contextFiles }, await projectTaskList(created)) };
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectMutationUnconfirmed("Task", error);
  }
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown, scope?: TaskReadScope) => executeProjectTaskTool(name, raw, scope),
}));
