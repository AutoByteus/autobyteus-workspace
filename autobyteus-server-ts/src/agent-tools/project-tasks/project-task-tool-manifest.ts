import { getProjectService } from "../../projects/services/project-service.js";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import type { ProjectTaskStatus, ProjectTaskView } from "../../projects/domain/models.js";
import type { ProjectTaskExecutionLink } from "../../projects/domain/project-task-execution.js";
import type { TaskExecutionLinkIdentity } from "../../agent-collaboration/execution/task/task-execution-lifetime.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import { PROJECT_TASK_TOOL_NAMES, PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseProjectTaskToolInput, type ProjectTaskToolName } from "./project-task-tool-contract.js";

type TaskAcknowledgement = Pick<ProjectTaskView, "projectId" | "taskId" | "status">;
type TaskAssignment = Pick<TaskExecutionLinkIdentity, "root" | "execution" | "ingressAgentRunId"> & {
  dispatchOutcome: "accepted" | "not_confirmed" | "failed";
};
type TaskBusinessRead = Pick<ProjectTaskView, "projectId" | "taskId" | "description" | "status" | "contextFiles"> & {
  assignments: TaskAssignment[];
};
const dispatchOutcomes: Record<ProjectTaskExecutionLink["dispatch"], TaskAssignment["dispatchOutcome"]> = {
  delivered: "accepted", reserved: "not_confirmed", admitted: "not_confirmed", failed: "failed",
};
const taskAcknowledgement = ({ projectId, taskId, status }: ProjectTaskView): TaskAcknowledgement => ({ projectId, taskId, status });
const taskBusinessRead = ({ projectId, taskId, description, status, contextFiles, executionLifetimes }: ProjectTaskView): TaskBusinessRead => ({
  projectId, taskId, description, status, contextFiles,
  assignments: executionLifetimes.flatMap(lifetime => lifetime.executions
    .filter(link => link.purpose !== "helper")
    .map(link => ({ root: { rootSubjectKind: link.root.rootSubjectKind, rootRunId: link.root.rootRunId },
      execution: "agentRunId" in link.execution ? { agentRunId: link.execution.agentRunId } : { teamRunId: link.execution.teamRunId }, ingressAgentRunId: link.ingressAgentRunId,
      dispatchOutcome: dispatchOutcomes[link.dispatch] }))),
});

const isInternalStateError = (error: ProjectError): boolean =>
  error.code === "PROJECT_STATE_UNAVAILABLE" || error.code.startsWith("TASK_LIFETIME_");
class TaskMutationUnconfirmed extends Error {
  constructor(cause: unknown) { super("Task change could not be confirmed. Check the saved Task before repeating.", { cause }); }
}
export const projectTaskToolError = (error: unknown) => {
  if (error instanceof TaskMutationUnconfirmed) {
    console.error("Project Task mutation result unavailable.", error);
    return { error: { code: "PROJECT_OPERATION_UNCONFIRMED", message: error.message } };
  }
  if (error instanceof ProjectError && !isInternalStateError(error)) return { error: { code: error.code, message: error.message } };
  console.error("Project tool operation failed.", error);
  return { error: { code: error instanceof ProjectError ? error.code : "PROJECT_OPERATION_FAILED", message: "Project data could not be read." } };
};
export async function executeProjectTaskTool(name: ProjectTaskToolName, raw: unknown): Promise<unknown> {
  const input = parseProjectTaskToolInput(name, raw);
  if (name === "list_projects") return { projects: await getProjectService().listProjectSummaries() };
  const projectId = input.project_id as string;
  if (name === "list_project_tasks") return { projectId, tasks: (await getProjectTaskService().listTasks(projectId, input.status as ProjectTaskStatus | undefined)).map(taskBusinessRead) };
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
    if (error instanceof ProjectError && !isInternalStateError(error)) throw error;
    throw new TaskMutationUnconfirmed(error);
  }
}
export const PROJECT_TASK_TOOL_MANIFEST = [...PROJECT_TASK_TOOL_NAMES].map((name) => ({
  name, description: PROJECT_TASK_TOOL_DESCRIPTIONS[name], parameterSchema: buildProjectTaskToolSchema(name),
  execute: (raw: unknown) => executeProjectTaskTool(name, raw),
}));
