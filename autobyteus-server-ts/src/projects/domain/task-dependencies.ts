import { ProjectError } from "./project-errors.js";

/**
 * "Depends on": the one stored relationship between Tasks of the same Project, set on the later Task.
 * "Blocked by", "Dependency cancelled" and "Required by" are derived by readers and never stored.
 * Dependencies only inform; no create, update, status, delegate or reopen path checks them.
 */
type DependencyTask = Readonly<{ taskId: string; taskKey: string; dependsOnTaskIds: readonly string[] }>;

const invalid = (message: string): ProjectError => new ProjectError("TASK_DEPENDENCY_INVALID", message);
/** The rejection of a dependency that names no current Task of this Project (an unknown, another Project's or a Temp task). */
export const notAProjectDependency = (reference: string): ProjectError => invalid(`Task '${reference}' is not a current Task of this Project.`);

/** Trimmed Task IDs, duplicates collapsed, in submitted order (the order has no meaning). */
export const normalizeDependsOn = (raw: readonly unknown[]): string[] => {
  if (raw.some((id) => typeof id !== "string")) throw invalid("Dependencies must be Task IDs.");
  return [...new Set((raw as string[]).map((id) => id.trim()))];
};

/** Whether two dependency lists name the same Tasks. */
export const sameDependencies = (left: readonly string[], right: readonly string[]): boolean => {
  const set = new Set(left);
  return set.size === new Set(right).size && right.every((id) => set.has(id));
};

/**
 * Rejects, with no change, a dependency that is the Task itself, is not a current Task of this Project
 * (`tasks` are the Project's current Tasks), or would close a loop: the Task is reachable from a new
 * dependency over the current `dependsOnTaskIds` (IDs that name no current Task are ignored while walking).
 * `taskId` is null for a new Task, which nothing can depend on yet.
 */
export const assertDependenciesValid = (taskId: string | null, ids: readonly string[], tasks: readonly DependencyTask[]): void => {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  for (const id of ids) {
    if (id === taskId) throw invalid("A Task cannot depend on itself.");
    if (!byId.has(id)) throw notAProjectDependency(id);
  }
  if (taskId === null) return;
  for (const id of ids) {
    const seen = new Set<string>();
    const pending = [id];
    while (pending.length) {
      const current = byId.get(pending.pop()!);
      if (!current || seen.has(current.taskId)) continue;
      seen.add(current.taskId);
      if (current.dependsOnTaskIds.includes(taskId)) {
        throw invalid(`This Task cannot depend on ${byId.get(id)!.taskKey}: ${byId.get(id)!.taskKey} already depends on this Task, directly or through other Tasks.`);
      }
      pending.push(...current.dependsOnTaskIds);
    }
  }
};
