import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import type { Project, ProjectTaskStatus, ProjectTaskView, ProjectWorkspaceInput, TaskAcknowledgementView } from "../../projects/domain/models.js";
import type { TaskAssignmentView } from "../../projects/domain/task-execution-resources.js";
import type { TaskAssignmentViews } from "../../projects/services/task-execution-resource-service.js";
import type { ProjectTaskContextFile } from "../../projects/domain/project-task-context.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";

const projectAcknowledgement = ({projectId, name, description, workspaces}: Project) => ({
  projectId, name, description,
  workspaces: workspaces.map(({workspaceRootPath, description}) => ({workspaceRootPath, description})),
});

/**
 * Business read: open `assignments` and `closedAssignments` (explicit copy IDs: an Agent's `agentRunId`,
 * a Team's `teamRunId` and `teamCoordinatorAgentRunId`), or a marker when this Task's assignments can't be read.
 */
type TaskBusinessRead = Pick<ProjectTaskView, "projectId" | "taskId" | "description" | "status" | "contextFiles">
  & ({ assignments: TaskAssignmentView[]; closedAssignments: TaskAssignmentView[] } | { assignmentsUnavailable: true });
/** `projectId` is null for a Task with no Project; `attachedContextFiles` only when this call attached files. */
const taskAcknowledgement = ({ projectId, taskId, status }: Pick<TaskAcknowledgementView, "projectId" | "taskId" | "status">,
  attached: readonly ProjectTaskContextFile[] = []) => ({
  projectId, taskId, status,
  ...(attached.length ? { attachedContextFiles: attached.map(({ storedFilename, displayName }) => ({ storedFilename, displayName })) } : {}),
});
const taskBusinessRead = ({ projectId, taskId, description, status, contextFiles }: ProjectTaskView,
  assignments: TaskAssignmentViews | "unavailable" | undefined): TaskBusinessRead => ({
  projectId, taskId, description, status, contextFiles,
  ...(assignments === "unavailable" ? { assignmentsUnavailable: true as const }
    : { assignments: assignments?.open ?? [], closedAssignments: assignments?.closed ?? [] }),
});

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
  if (name === "create_or_update_project") {
    const fields = {
      ...(Object.hasOwn(input, "name") ? {name: input.name as string} : {}),
      ...(Object.hasOwn(input, "description") ? {description: input.description as string} : {}),
      ...(Object.hasOwn(input, "workspaces") ? {workspaces: (input.workspaces as Array<Record<string, unknown>>).map(row => ({
        workspaceRootPath: row.workspace_path as string,
        ...(Object.hasOwn(row, "description") ? {description: row.description as string} : {}),
      })) as ProjectWorkspaceInput[]} : {}),
    };
    try {
      const project = Object.hasOwn(input, "project_id")
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
    const tasks = await getProjectTaskService().listTasks(projectId, input.status as ProjectTaskStatus | undefined);
    const assignments = await getProjectTaskService().assignments(tasks.map(task => task.taskId));
    return { projectId, tasks: tasks.map(task => taskBusinessRead(task, assignments.get(task.taskId))) };
  }
  // The service may fail while producing its view AFTER the write. Neither a
  // fabricated acknowledgement nor a rollback claim is safe without its result.
  const localContextFiles = (input.context_files as string[] | undefined) ?? [];
  try {
    if (Object.hasOwn(input, "task_id")) {
      const ack = await getProjectTaskService().updateTaskById({ taskId: input.task_id as string,
        ...(Object.hasOwn(input, "description") ? { description: input.description as string } : {}),
        ...(Object.hasOwn(input, "status") ? { status: input.status as ProjectTaskStatus } : {}),
        ...(localContextFiles.length ? { localContextFiles } : {}) });
      return { task: taskAcknowledgement(ack, ack.attachedContextFiles) };
    }
    const created = await getProjectTaskService().createTaskWithLocalContextFiles({
      projectId: input.project_id as string, description: input.description as string, localContextFiles });
    // Every context file of a new Task was attached by this call.
    return { task: taskAcknowledgement(created, created.contextFiles) };
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectMutationUnconfirmed("Task", error);
  }
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown) => executeProjectTaskTool(name, raw),
}));
