import type { ProjectTask } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import type { ProjectStore } from "../stores/project-store.js";

type ReferencePersistence = Pick<ProjectStore, "findTask" | "findTaskByKey" | "listTasks">;
export type ProjectTaskMatch = Readonly<{ projectId: string; task: ProjectTask }>;

const notExactlyOne = (reference: string, found: number): ProjectError => new ProjectError(found ? "TASK_ID_AMBIGUOUS" : "TASK_NOT_FOUND",
  `Task '${reference}' must identify exactly one current node-local Task (found ${found}).`);

/**
 * ProjectTaskService's resolution of Project Task references to the stored identity. Agents name a Project
 * Task by its key (any letter case) or its long ID; once resolved, only the long ID travels inward.
 * Only ProjectTaskService uses this; no caller above it parses keys.
 */
export class TaskReferences {
  constructor(private readonly store: () => ReferencePersistence) {}

  /**
   * The one current Project Task with this long ID (exact); used where the ID is already canonical, after a
   * reference was resolved. Its refusal never echoes the stored ID into agent-facing text.
   */
  async byId(taskId: string): Promise<ProjectTaskMatch> {
    const matches = typeof taskId === "string" && taskId.trim() ? await this.store().findTask(taskId) : [];
    if (matches.length === 1) return matches[0]!;
    throw new ProjectError(matches.length ? "TASK_ID_AMBIGUOUS" : "TASK_NOT_FOUND", matches.length ? "The Task is not unique on this node." : "The Task was deleted.");
  }

  /**
   * A Project Task by its long ID, else by its key (keys and long IDs never collide: IDs contain "_", keys
   * never do). Unknown or ambiguous → TASK_NOT_FOUND / TASK_ID_AMBIGUOUS, as for an ID.
   */
  async projectTask(reference: string): Promise<ProjectTaskMatch> {
    if (typeof reference !== "string" || !reference.trim()) throw new ProjectError("TASK_NOT_FOUND", "Task ID must be nonblank.");
    const matches = await this.store().findTask(reference);
    if (matches.length === 1) return matches[0]!;
    const byKey = matches.length ? null : await this.store().findTaskByKey(reference.trim().toLowerCase());
    if (byKey) return byKey;
    throw notExactlyOne(reference, matches.length);
  }

  /** A Task of this Project by its long ID or its key (any letter case); unknown, or another Project's → TASK_NOT_FOUND. */
  async inProject(projectId: string, reference: string): Promise<ProjectTask> {
    const key = typeof reference === "string" ? reference.trim().toLowerCase() : "";
    const task = key ? (await this.store().listTasks(projectId)).find((t) => t.taskId === reference || t.taskKey === key) : undefined;
    if (!task) throw new ProjectError("TASK_NOT_FOUND", `Task '${reference}' was not found in this project.`);
    return task;
  }
}
