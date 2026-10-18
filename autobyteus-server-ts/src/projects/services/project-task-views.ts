import type { AdHocTask } from "../domain/ad-hoc-task.js";
import type { ProjectTask, ProjectTaskView, TaskRootView, TaskWithoutProjectView } from "../domain/models.js";
import { projectTaskFileLocator } from "../domain/project-task-context.js";
import type { ProjectTaskContextStore } from "../context/project-task-context-store.js";
import type { TaskExecutionResourceService } from "./task-execution-resource-service.js";
import { buildTaskRootView, type TaskWorkerStatusResolver } from "./task-root-view-builder.js";

/**
 * ProjectTaskService's client views of Tasks (GraphQL and the change feed): a Project Task with its key,
 * dependencies and saved context locators, a Task with no Project, and each Task's root.
 */
export class ProjectTaskViews {
  constructor(
    private readonly context: Pick<ProjectTaskContextStore, "savedFile">,
    private readonly resources: Pick<TaskExecutionResourceService, "latestAssignment">,
    private readonly workerStatus: TaskWorkerStatusResolver,
  ) {}

  async projectTask(projectId: string, task: ProjectTask): Promise<ProjectTaskView> {
    const contextFiles = await Promise.all((task.contextFiles ?? []).map(async (f) => {
      const localPath = await this.context.savedFile(projectId, task.taskId, f).catch(() => undefined);
      return { ...f, locator: projectTaskFileLocator(projectId, task.taskId, f.storedFilename), ...(localPath ? { localPath } : {}) };
    }));
    return { ...task, projectId, contextFiles, root: this.root(task.taskId) };
  }
  taskWithoutProject(task: AdHocTask): TaskWithoutProjectView {
    return { taskId: task.taskId, description: task.description, status: task.status, referenceFiles: [...task.referenceFiles],
      createdAt: task.createdAt, updatedAt: task.updatedAt, root: this.root(task.taskId) };
  }
  private root(taskId: string): TaskRootView | null {
    const root = this.resources.latestAssignment(taskId);
    return root ? buildTaskRootView(root, this.workerStatus) : null;
  }
}
