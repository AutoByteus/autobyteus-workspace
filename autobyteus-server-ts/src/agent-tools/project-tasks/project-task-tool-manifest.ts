import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import type { ProjectTaskStatus, ProjectTaskView } from "../../projects/domain/models.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";
const taskResult = ({projectId, taskId, description, status, contextFiles}: ProjectTaskView) => ({projectId, taskId, description, status, contextFiles});
export const projectTaskToolError = (error: unknown) => {
  if (error instanceof ProjectError) return {error: {code: error.code, message: error.message}};
  console.error("Project tool operation failed.", error);
  return {error: {code: "PROJECT_OPERATION_FAILED", message: "Project operation failed."}};
};
export async function executeProjectTaskTool(name: ProjectTaskToolName, raw: unknown): Promise<unknown> {
  const input = parseProjectTaskToolInput(name, raw);
  if (name === "list_projects") return {projects: await getProjectService().listProjectSummaries()};
  const projectId = input.project_id as string;
  if (name === "list_project_tasks") return {projectId, tasks: (await getProjectTaskService().listTasks(projectId, input.status as ProjectTaskStatus | undefined)).map(taskResult)};
  const task = Object.hasOwn(input, "task_id")
    ? await getProjectTaskService().updateTask({projectId, taskId: input.task_id as string,
      ...(Object.hasOwn(input, "description") ? {description: input.description as string} : {}),
      ...(Object.hasOwn(input, "status") ? {status: input.status as ProjectTaskStatus} : {})})
    : await getProjectTaskService().createTask({projectId, description: input.description as string});
  return {task: taskResult(task)};
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown) => executeProjectTaskTool(name, raw),
}));
