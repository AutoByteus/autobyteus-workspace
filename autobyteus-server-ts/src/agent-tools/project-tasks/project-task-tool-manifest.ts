import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import { getProjectTaskSearchService } from "../../projects/search/project-task-search-service.js";
import type { EmbeddingReadiness } from "../../embeddings/embedding-index.js";
import type { Project, ProjectTaskStatus, ProjectTaskView, ProjectWorkspaceInput, TaskAcknowledgementView } from "../../projects/domain/models.js";
import type { TaskAssignmentView } from "../../projects/domain/task-execution-resources.js";
import type { TaskAssignmentViews } from "../../projects/services/task-execution-resource-service.js";
import type { ProjectTaskContextFile } from "../../projects/domain/project-task-context.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { compareTaskKeys } from "../../projects/domain/task-keys.js";
import { PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";

const projectAcknowledgement = ({projectId, name, description, workspaces}: Project) => ({
  projectId, name, description,
  workspaces: workspaces.map(({workspaceRootPath, description}) => ({workspaceRootPath, description})),
});

/**
 * Agent-facing Task IDs: a Project Task's `taskId` is its key; `dependsOn`, `partOf` and `parts` name its existing
 * dependencies, parent and parts by key, from the Project's Task list (an ID that names no current Task is left
 * out). The stored long ID never appears in a Task-ID field; saved context file data keeps its stored form.
 */
const relationKeys = (tasks: readonly ProjectTaskView[]) => {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const parts = new Map<string, string[]>();
  for (const task of tasks) if (task.partOfTaskId && byId.has(task.partOfTaskId)) parts.set(task.partOfTaskId, [...(parts.get(task.partOfTaskId) ?? []), task.taskKey]);
  return {
    dependsOn: (ids: readonly string[]) => ids.flatMap((id) => byId.get(id)?.taskKey ?? []),
    partOf: (id: string | null | undefined) => (id ? byId.get(id)?.taskKey : undefined) ?? null,
    /** In key order (`autobyteus-25` before `autobyteus-172`), as the app lists them. */
    parts: (taskId: string) => [...(parts.get(taskId) ?? [])].sort(compareTaskKeys),
  };
};
/** The Project's Task list, read only when an acknowledgement names another Task (a dependency or the parent). */
const projectTaskList = async ({ projectId, dependsOnTaskIds, partOfTaskId }: Pick<TaskAcknowledgementView, "projectId" | "dependsOnTaskIds" | "partOfTaskId">) =>
  projectId && (dependsOnTaskIds?.length || partOfTaskId) ? getProjectTaskService().listTasks(projectId) : [];
/**
 * Business read: open `assignments` and `closedAssignments` (explicit copy IDs: an Agent's `agentRunId`,
 * a Team's `teamRunId` and `teamCoordinatorAgentRunId`), or a marker when this Task's assignments can't be read.
 */
type TaskBusinessRead = Pick<ProjectTaskView, "projectId" | "taskId" | "description" | "status" | "contextFiles"> & { dependsOn: string[]; partOf: string | null; parts: string[] }
  & ({ assignments: TaskAssignmentView[]; closedAssignments: TaskAssignmentView[] } | { assignmentsUnavailable: true });
/**
 * `projectId` is null for a Task with no Project (whose `taskId` is its ID, without `dependsOn` and `partOf`);
 * `attachedContextFiles` only when this call attached files; `closedParts` only when it closed parts with their parent.
 */
const taskAcknowledgement = (ack: Pick<TaskAcknowledgementView, "projectId" | "taskReference" | "status" | "dependsOnTaskIds" | "partOfTaskId" | "closedPartReferences">,
  tasks: readonly ProjectTaskView[], attached: readonly ProjectTaskContextFile[] = []) => {
  const keys = relationKeys(tasks);
  return { projectId: ack.projectId, taskId: ack.taskReference, status: ack.status,
    ...(ack.projectId !== null ? { dependsOn: keys.dependsOn(ack.dependsOnTaskIds ?? []), partOf: keys.partOf(ack.partOfTaskId) } : {}),
    ...(attached.length ? { attachedContextFiles: attached.map(({ storedFilename, displayName }) => ({ storedFilename, displayName })) } : {}),
    ...(ack.closedPartReferences?.length ? { closedParts: [...ack.closedPartReferences] } : {}) };
};
const taskBusinessRead = ({ projectId, taskId, taskKey, description, status, dependsOnTaskIds, partOfTaskId, contextFiles }: ProjectTaskView,
  keys: ReturnType<typeof relationKeys>, assignments: TaskAssignmentViews | "unavailable" | undefined): TaskBusinessRead => ({
  projectId, taskId: taskKey, description, status, dependsOn: keys.dependsOn(dependsOnTaskIds), partOf: keys.partOf(partOfTaskId), parts: keys.parts(taskId), contextFiles,
  ...(assignments === "unavailable" ? { assignmentsUnavailable: true as const }
    : { assignments: assignments?.open ?? [], closedAssignments: assignments?.closed ?? [] }),
});

/** An agent waits up to this long for meaning search on first use, so "no such Task" is not concluded too early. */
const SEARCH_READY_WAIT_MS = 30_000;
const SUMMARY_MAX_CHARS = 160;
/** The description's first line, at most 160 characters. */
const summaryOf = (description: string): string => {
  const line = description.trim().split("\n", 1)[0]!.trim();
  return line.length > SUMMARY_MAX_CHARS ? `${line.slice(0, SUMMARY_MAX_CHARS - 1)}…` : line;
};
/** Whether meaning search was used; when not (fully), why, and what the results are. */
const meaningSearchNote = (readiness: EmbeddingReadiness) => {
  if (readiness.state === "ready") return { state: "ready" as const };
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
  console.error("Project tool operation failed.", error);
  return { error: { code: "PROJECT_OPERATION_FAILED", message: "Project operation failed." } };
};
export async function executeProjectTaskTool(name: ProjectTaskToolName, raw: unknown): Promise<unknown> {
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
    return { projectId, tasks: tasks.map(task => taskBusinessRead(task, keys, assignments.get(task.taskId))) };
  }
  if (name === "search_project_tasks") {
    const projectId = input.project_id as string;
    const result = await getProjectTaskSearchService().search(projectId, input.query as string,
      { limit: (input.limit as number | undefined) ?? 10, waitForReadyMs: SEARCH_READY_WAIT_MS });
    // Parents and parts are named from the whole Project list.
    const keys = relationKeys(await getProjectTaskService().listTasks(projectId));
    return { projectId, tasks: result.matches.map(({ task, match }) => ({ taskId: task.taskKey, status: task.status,
      partOf: keys.partOf(task.partOfTaskId), parts: keys.parts(task.taskId), summary: summaryOf(task.description), match })),
      meaningSearch: meaningSearchNote(result.meaningSearch) };
  }
  // The service may fail while producing its view AFTER the write. Neither a
  // fabricated acknowledgement nor a rollback claim is safe without its result.
  const localContextFiles = (input.context_files as string[] | undefined) ?? [];
  const dependsOn = input.depends_on as string[] | undefined;
  const partOf = input.part_of as string | undefined;
  try {
    if (name === "update_task") {
      const ack = await getProjectTaskService().updateTaskById({ taskId: input.task_id as string,
        ...(Object.hasOwn(input, "description") ? { description: input.description as string } : {}),
        ...(Object.hasOwn(input, "status") ? { status: input.status as ProjectTaskStatus } : {}),
        ...(localContextFiles.length ? { localContextFiles } : {}), ...(dependsOn ? { dependsOn } : {}), ...(partOf !== undefined ? { partOf } : {}) });
      return { task: taskAcknowledgement(ack, await projectTaskList(ack), ack.attachedContextFiles) };
    }
    const created = await getProjectTaskService().createTaskWithLocalContextFiles({
      projectId: input.project_id as string, description: input.description as string, localContextFiles, ...(dependsOn ? { dependsOn } : {}), ...(partOf !== undefined ? { partOf } : {}) });
    // Every context file of a new Task was attached by this call.
    return { task: taskAcknowledgement({ ...created, taskReference: created.taskKey }, await projectTaskList(created), created.contextFiles) };
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectMutationUnconfirmed("Task", error);
  }
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown) => executeProjectTaskTool(name, raw),
}));
