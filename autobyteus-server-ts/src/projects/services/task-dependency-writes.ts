import type { ProjectStore } from "../stores/project-store.js";
import type { ProjectChangeMarks } from "../changes/project-change-publisher.js";
import { assertDependenciesValid, normalizeDependsOn, notAProjectDependency } from "../domain/task-dependencies.js";
import type { TaskReferences } from "./task-references.js";

type DependencyPersistence = Pick<ProjectStore, "listTasks" | "updateTask" | "withTaskDependencies">;

/**
 * ProjectTaskService's "depends on" writes over the store: the Project's current Tasks validate a new or
 * replaced list before anything else of the write happens, replacements are serialized per Project so
 * concurrent edits cannot close a loop, and a deleted Task is dropped from its dependents.
 * Used only by ProjectTaskService, which stays the Task subject boundary.
 */
export class TaskDependencyWrites {
  constructor(
    private readonly store: () => DependencyPersistence,
    private readonly changes: () => Pick<ProjectChangeMarks, "taskChanged">,
    private readonly references: TaskReferences,
  ) {}

  /**
   * Agent-tool dependencies: each reference (a key or long ID) resolved to the stored ID of a Task of this
   * Project, duplicates collapsed (a key, the same key in another letter case and the long ID are one Task). One that names no such Task (unknown, another Project's, a Task with no Project) is a
   * TASK_DEPENDENCY_INVALID, so nothing is written.
   */
  async idsOf(projectId: string, references: readonly string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const reference of references) {
      const match = await this.references.projectTask(reference).catch((error: unknown) => {
        if (["TASK_NOT_FOUND", "TASK_ID_AMBIGUOUS"].includes((error as { code?: string }).code ?? "")) return null;
        throw error;
      });
      if (!match || match.projectId !== projectId) throw notAProjectDependency(reference);
      ids.push(match.task.taskId);
    }
    return normalizeDependsOn(ids);
  }

  /** A new Task's dependencies: each a current Task of the Project. A new Task cannot close a loop (nothing depends on it yet). */
  async forNewTask(projectId: string, raw: readonly unknown[] | null | undefined): Promise<string[]> {
    const ids = normalizeDependsOn(raw ?? []);
    if (ids.length) assertDependenciesValid(null, ids, await this.store().listTasks(projectId));
    return ids;
  }

  /** Validates the Task's replacement list, then runs `write`, both under the Project's dependency lock. */
  replace<T>(projectId: string, taskId: string, ids: readonly string[], write: () => Promise<T>): Promise<T> {
    return this.store().withTaskDependencies(projectId, async () => {
      assertDependenciesValid(taskId, ids, await this.store().listTasks(projectId));
      return write();
    });
  }

  /**
   * After a delete: every Task that lists the deleted one loses it. The dependent keeps its `updatedAt`
   * (the user did not edit it) and is republished. A failing cleanup is logged and never fails the delete;
   * readers ignore an ID that names no current Task.
   */
  async removeDeleted(projectId: string, taskId: string): Promise<void> {
    try {
      for (const dependent of (await this.store().listTasks(projectId)).filter((task) => task.dependsOnTaskIds.includes(taskId))) {
        try {
          await this.store().updateTask(projectId, dependent.taskId, (task) => ({ ...task, dependsOnTaskIds: task.dependsOnTaskIds.filter((id) => id !== taskId) }));
          this.changes().taskChanged({ projectId, taskId: dependent.taskId });
        } catch (error) {
          console.warn("TASK_DEPENDENCY_CLEANUP_FAILED", { projectId, taskId, dependentTaskId: dependent.taskId, error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      console.warn("TASK_DEPENDENCY_CLEANUP_FAILED", { projectId, taskId, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
