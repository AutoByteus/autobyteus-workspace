import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import type { ProjectTaskStatus, ProjectTaskView } from "../../projects/domain/models.js";
import type { TaskAssignment } from "../../projects/domain/task-agent-resources.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";

type TaskAcknowledgement = Pick<ProjectTaskView, "projectId" | "taskId" | "status">;
/** Business read: current (open) assignments, or a marker when this Task's assignments can't be read. */
type TaskBusinessRead = Pick<ProjectTaskView, "projectId" | "taskId" | "description" | "status" | "contextFiles">
  & ({ assignments: TaskAssignment[] } | { assignmentsUnavailable: true });
const taskAcknowledgement = ({ projectId, taskId, status }: ProjectTaskView): TaskAcknowledgement => ({ projectId, taskId, status });
const taskBusinessRead = ({ projectId, taskId, description, status, contextFiles }: ProjectTaskView,
  assignments: TaskAssignment[] | "unavailable" | undefined): TaskBusinessRead => ({
  projectId, taskId, description, status, contextFiles,
  ...(assignments === "unavailable" ? { assignmentsUnavailable: true as const } : { assignments: assignments ?? [] }),
});

class TaskMutationUnconfirmed extends Error {
  constructor(cause: unknown) { super("Task change could not be confirmed. Check the saved Task before repeating.", { cause }); }
}
export const projectTaskToolError = (error: unknown) => {
  if (error instanceof TaskMutationUnconfirmed) {
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
  const projectId = input.project_id as string;
  if (name === "list_project_tasks") {
    const tasks = await getProjectTaskService().listTasks(projectId, input.status as ProjectTaskStatus | undefined);
    const assignments = await getProjectTaskService().currentAssignments(tasks.map(task => task.taskId));
    return { projectId, tasks: tasks.map(task => taskBusinessRead(task, assignments.get(task.taskId))) };
  }
  // The service may fail while producing its view AFTER the write. Neither a
  // fabricated acknowledgement nor a rollback claim is safe without its result.
  try {
    const task = Object.hasOwn(input, "task_id")
      ? await getProjectTaskService().updateTask({ projectId, taskId: input.task_id as string,
        ...(Object.hasOwn(input, "description") ? { description: input.description as string } : {}),
        ...(Object.hasOwn(input, "status") ? { status: input.status as ProjectTaskStatus } : {}) })
      : await getProjectTaskService().createTask({ projectId, description: input.description as string });
    return { task: taskAcknowledgement(task) };
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new TaskMutationUnconfirmed(error);
  }
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown) => executeProjectTaskTool(name, raw),
}));
