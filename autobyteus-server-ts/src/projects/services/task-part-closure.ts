import type { ProjectTaskStatus } from "../domain/models.js";
import { compareTaskKeys } from "../domain/task-keys.js";
import { isTerminalTaskStatus } from "../domain/task-status.js";
import type { ProjectStore } from "../stores/project-store.js";

/** The keys of the parts a parent's close closed, and of those it could not close, each in key order. */
export type PartClosureResult = Readonly<{ closed: string[]; notClosed: string[] }>;
export const NO_PART_CLOSURE: PartClosureResult = { closed: [], notClosed: [] };

/**
 * ProjectTaskService's parent-close cascade (REQ-016): after a parent's DONE or CANCELLED committed, each of its
 * parts still TODO or IN_PROGRESS takes the same status through the service's own update (`closePart`: its agent
 * runs closed and their release asked, as for any such change), one at a time in key order. A part that fails is
 * logged by name, skipped and reported in `notClosed`, so it never fails the parent or the other parts. Used only
 * by ProjectTaskService.
 */
export class TaskPartClosure {
  constructor(
    private readonly store: () => Pick<ProjectStore, "listTasks">,
    private readonly closePart: (projectId: string, taskId: string, status: ProjectTaskStatus) => Promise<unknown>,
  ) {}

  /** Closes the open parts of `parentId` with `status`; returns the keys of the parts it closed and of those it could not. */
  async closeOpenParts(projectId: string, parentId: string, status: ProjectTaskStatus): Promise<PartClosureResult> {
    const parts = (await this.store().listTasks(projectId)).filter((task) => task.partOfTaskId === parentId && !isTerminalTaskStatus(task.status));
    const closed: string[] = [], notClosed: string[] = [];
    for (const part of parts.sort((a, b) => compareTaskKeys(a.taskKey, b.taskKey))) {
      try {
        await this.closePart(projectId, part.taskId, status);
        closed.push(part.taskKey);
      } catch (error) {
        console.warn("TASK_PART_CLOSE_FAILED", { projectId, taskId: parentId, partTaskId: part.taskId, error: error instanceof Error ? error.message : String(error) });
        notClosed.push(part.taskKey);
      }
    }
    return { closed, notClosed };
  }
}
