import { randomUUID } from "node:crypto";
import type {
  CreateProjectTaskCommand,
  DeleteProjectTaskCommand,
  Project,
  ProjectTask,
  ProjectTaskView,
  UpdateProjectTaskCommand,
} from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";

type ProjectPersistence = Pick<ProjectStore, "listRecords" | "updateRecords">;

type ProjectTaskServiceDependencies = {
  store?: ProjectPersistence;
  now?: () => Date;
  createId?: () => string;
};

const normalizeDescription = (description: string | null | undefined): string => {
  const normalized = (description ?? "").trim();
  if (!normalized) {
    throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  }
  return normalized;
};

/** Most recently updated first; `taskId` breaks ties so the order is stable. */
const compareTasks = (left: ProjectTask, right: ProjectTask): number => {
  const byUpdated = right.updatedAt.localeCompare(left.updatedAt);
  return byUpdated !== 0 ? byUpdated : left.taskId.localeCompare(right.taskId);
};

const findProjectIndex = (records: Project[], projectId: string): number => {
  const index = records.findIndex((record) => record.projectId === projectId);
  if (index < 0) {
    throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
  }
  return index;
};

const toView = (projectId: string, task: ProjectTask): ProjectTaskView => ({ ...task, projectId });

/**
 * Governing owner of Project Task invariants: description normalisation, identity,
 * timestamps, initial status and listing order. Tasks live inside their Project
 * record, so every write goes through the same locked store update as Projects.
 * Task writes change only `Project.tasks`; they never touch the Project's own
 * fields or its `updatedAt`. There is deliberately no status mutation: every new
 * Task is `TODO`, and status changes arrive with a later agent-facing operation.
 */
export class ProjectTaskService {
  constructor(private readonly deps: ProjectTaskServiceDependencies = {}) {}

  private get store(): ProjectPersistence {
    return this.deps.store ?? getProjectStore();
  }

  private nowIso(): string {
    return (this.deps.now?.() ?? new Date()).toISOString();
  }

  private createTaskId(): string {
    return this.deps.createId?.() ?? `project_task_${randomUUID()}`;
  }

  async listTasks(projectId: string): Promise<ProjectTaskView[]> {
    const records = await this.store.listRecords();
    const project = records[findProjectIndex(records, projectId)];
    return [...project.tasks].sort(compareTasks).map((task) => toView(projectId, task));
  }

  async createTask(command: CreateProjectTaskCommand): Promise<ProjectTaskView> {
    const description = normalizeDescription(command.description);
    const timestamp = this.nowIso();
    const task: ProjectTask = {
      taskId: this.createTaskId(),
      description,
      status: "TODO",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.updateTasks(command.projectId, (tasks) => [...tasks, task]);
    return toView(command.projectId, task);
  }

  async updateTaskDescription(command: UpdateProjectTaskCommand): Promise<ProjectTaskView> {
    const description = normalizeDescription(command.description);
    let updated: ProjectTask | undefined;

    await this.updateTasks(command.projectId, (tasks) => {
      const index = tasks.findIndex((task) => task.taskId === command.taskId);
      if (index < 0) {
        throw new ProjectError("TASK_NOT_FOUND", `Task '${command.taskId}' was not found in this project.`);
      }
      const next = [...tasks];
      updated = { ...tasks[index], description, updatedAt: this.nowIso() };
      next[index] = updated;
      return next;
    });

    return toView(command.projectId, updated as ProjectTask);
  }

  /** Removes one Task. Returns `false` when the Task does not exist in the Project. */
  async deleteTask(command: DeleteProjectTaskCommand): Promise<boolean> {
    let removed = false;
    await this.updateTasks(command.projectId, (tasks) => {
      const remaining = tasks.filter((task) => task.taskId !== command.taskId);
      removed = remaining.length !== tasks.length;
      return remaining;
    });
    return removed;
  }

  /**
   * Replaces one Project's Task list inside the locked store update. A throwing
   * change aborts the write and leaves the file intact.
   */
  private async updateTasks(
    projectId: string,
    change: (tasks: ProjectTask[]) => ProjectTask[],
  ): Promise<void> {
    await this.store.updateRecords((records) => {
      const index = findProjectIndex(records, projectId);
      const nextRecords = [...records];
      nextRecords[index] = { ...records[index], tasks: change(records[index].tasks) };
      return nextRecords;
    });
  }
}

let singleton: ProjectTaskService | null = null;

export const getProjectTaskService = (): ProjectTaskService => {
  singleton ??= new ProjectTaskService();
  return singleton;
};

export const resetProjectTaskServiceForTests = (): void => {
  singleton = null;
};
