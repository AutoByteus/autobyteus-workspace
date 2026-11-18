import type { ProjectTask } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import type { ProjectStore } from "../stores/project-store.js";
import type { ProjectTaskContextStore } from "../context/project-task-context-store.js";

type OwnershipStore = Pick<ProjectStore, "readProject" | "readTask" | "updateTask">;

/** Task context housekeeping: a failure is logged and never fails the operation it follows. */
export const bestEffortContextCleanup = async (operation: () => Promise<unknown>): Promise<void> => {
  try { await operation(); } catch (e) { console.warn("Task context cleanup failed.", e); }
};

/**
 * The two checks Task writes and context drafts share: the Project (and Task) exist, and a Task's unpublished
 * context bytes are reclaimed before a new draft or context change. Its owners pass their own stores.
 */
export class TaskContextOwnership {
  constructor(private readonly store: () => OwnershipStore, private readonly context: () => ProjectTaskContextStore) {}

  /** The Project exists and, when a Task is named, the Task exists in it (returned). */
  async assertOwner(projectId: string, taskId?: string): Promise<ProjectTask | undefined> {
    if (!(await this.store().readProject(projectId))) throw new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
    if (taskId === undefined) return undefined;
    const task = await this.store().readTask(projectId, taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found in this project.`);
    return task;
  }

  /** Under the Task's lock, removes saved bytes the Task's context list does not name. */
  async reclaimUnpublished(projectId: string, taskId: string): Promise<void> {
    await this.store().updateTask(projectId, taskId, async (task) => {
      // Failed membership proof preserves bytes; housekeeping failure is non-fatal.
      await bestEffortContextCleanup(() => this.context().reclaimUnpublished(projectId, taskId, new Set(task.contextFiles?.map((f) => f.storedFilename))));
      return task;
    });
  }
}
