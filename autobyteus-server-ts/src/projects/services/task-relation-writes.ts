import type { ProjectStore } from "../stores/project-store.js";
import type { ProjectChangeMarks } from "../changes/project-change-publisher.js";
import { assertDependenciesValid, normalizeDependsOn, notAProjectDependency } from "../domain/task-dependencies.js";
import { assertParentValid, normalizePartOf, notAProjectParent } from "../domain/task-parts.js";
import type { ProjectError } from "../domain/project-errors.js";
import type { TaskReferences } from "./task-references.js";

type RelationPersistence = Pick<ProjectStore, "listTasks" | "updateTask" | "withTaskRelations">;
/** Relations as a write supplies them (GraphQL IDs or resolved tool references), before normalization. */
export type SuppliedTaskRelations = Readonly<{ dependsOnTaskIds?: readonly unknown[] | null; partOfTaskId?: unknown }>;
/** The relations a write changes, normalized: a replacement dependency list and/or a parent (null clears it); an absent one is kept. */
export type TaskRelationChanges = Readonly<{ dependsOnTaskIds?: string[]; partOfTaskId?: string | null }>;

/**
 * ProjectTaskService's writes of the relations between Tasks of one Project ("depends on" and "part of") over
 * the store: the Project's current Tasks validate supplied relations before anything else of the write happens,
 * such writes are serialized per Project so concurrent edits cannot close a dependency loop or nest parts, and a
 * deleted Task is dropped from its dependents and its parts. Used only by ProjectTaskService, which stays the
 * Task subject boundary.
 */
export class TaskRelationWrites {
  constructor(
    private readonly store: () => RelationPersistence,
    private readonly changes: () => Pick<ProjectChangeMarks, "taskChanged">,
    private readonly references: TaskReferences,
  ) {}

  /**
   * Agent-tool dependencies: each reference (a key or long ID) resolved to the stored ID of a Task of this
   * Project, duplicates collapsed (a key, the same key in another letter case and the long ID are one Task). One that names no such Task (unknown, another Project's, a Task with no Project) is a
   * TASK_DEPENDENCY_INVALID, so nothing is written.
   */
  async dependencyIdsOf(projectId: string, references: readonly string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const reference of references) ids.push(await this.projectTaskIdOf(projectId, reference, notAProjectDependency));
    return normalizeDependsOn(ids);
  }

  /** An agent-tool parent (a key or long ID) as the stored ID of a Task of this Project, else TASK_PARENT_INVALID; null or "" stays null (clear). */
  async parentIdOf(projectId: string, raw: unknown): Promise<string | null> {
    const reference = normalizePartOf(raw);
    return reference === null ? null : this.projectTaskIdOf(projectId, reference, notAProjectParent);
  }

  /**
   * Supplied relations as the changes they make, decided by value: omitted (undefined) or null dependencies keep the
   * list; an omitted parent keeps it, null or "" clears it, an ID replaces it.
   */
  changesOf(supplied: SuppliedTaskRelations): TaskRelationChanges {
    return { ...(supplied.dependsOnTaskIds == null ? {} : { dependsOnTaskIds: normalizeDependsOn(supplied.dependsOnTaskIds) }),
      ...(supplied.partOfTaskId === undefined ? {} : { partOfTaskId: normalizePartOf(supplied.partOfTaskId) }) };
  }

  /**
   * Validates the supplied relations of a Task (`taskId` null for a new one) and then runs `write`, both under
   * the Project's relations lock. With no relation supplied, `write` runs alone. Never call it from inside
   * `write`: the lock is not reentrant.
   */
  write<T>(projectId: string, taskId: string | null, relations: TaskRelationChanges, write: () => Promise<T>): Promise<T> {
    const { dependsOnTaskIds, partOfTaskId } = relations;
    if (dependsOnTaskIds === undefined && partOfTaskId === undefined) return write();
    return this.store().withTaskRelations(projectId, async () => {
      const tasks = await this.store().listTasks(projectId);
      if (dependsOnTaskIds !== undefined) assertDependenciesValid(taskId, dependsOnTaskIds, tasks);
      if (partOfTaskId !== undefined) assertParentValid(taskId, partOfTaskId, tasks);
      return write();
    });
  }

  /**
   * After a delete: every Task that lists the deleted one loses it, and every part of it loses its parent. Each
   * keeps its `updatedAt` (the user did not edit it) and is republished. A failing cleanup is logged and never
   * fails the delete; readers ignore an ID that names no current Task.
   */
  async removeDeleted(projectId: string, taskId: string): Promise<void> {
    try {
      const related = (await this.store().listTasks(projectId)).filter((task) => task.dependsOnTaskIds.includes(taskId) || task.partOfTaskId === taskId);
      for (const { taskId: relatedTaskId } of related) {
        try {
          await this.store().updateTask(projectId, relatedTaskId, (task) => ({ ...task, dependsOnTaskIds: task.dependsOnTaskIds.filter((id) => id !== taskId),
            partOfTaskId: task.partOfTaskId === taskId ? null : task.partOfTaskId }));
          this.changes().taskChanged({ projectId, taskId: relatedTaskId });
        } catch (error) {
          console.warn("TASK_RELATION_CLEANUP_FAILED", { projectId, taskId, relatedTaskId, error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      console.warn("TASK_RELATION_CLEANUP_FAILED", { projectId, taskId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** One reference as the stored ID of a Task of this Project; one that names no such Task is `refusal(reference)`. */
  private async projectTaskIdOf(projectId: string, reference: string, refusal: (reference: string) => ProjectError): Promise<string> {
    const match = await this.references.projectTask(reference).catch((error: unknown) => {
      if (["TASK_NOT_FOUND", "TASK_ID_AMBIGUOUS"].includes((error as { code?: string }).code ?? "")) return null;
      throw error;
    });
    if (!match || match.projectId !== projectId) throw refusal(reference);
    return match.task.taskId;
  }
}
