import type { ProjectTask } from '~/types/project'

/**
 * "Depends on" between Tasks of one Project, as derived for display. Only `dependsOnTaskIds` is stored;
 * "Blocked by", "Dependency cancelled" and "Required by" are computed here from the Project's Task list.
 * It informs and never prevents work. An ID that names no current Task is never shown or counted.
 */

/** The key's number (for ordering): the part after the key's last "-". */
export const taskKeyNumber = (task: Pick<ProjectTask, 'taskKey'>): number => Number(task.taskKey.slice(task.taskKey.lastIndexOf('-') + 1)) || 0
const byKey = (a: ProjectTask, b: ProjectTask) => taskKeyNumber(a) - taskKeyNumber(b)

/** The Tasks this Task depends on that still exist, in key order (Done ones included). */
export const dependenciesOf = (task: ProjectTask, tasks: readonly ProjectTask[]): ProjectTask[] => {
  const ids = new Set(task.dependsOnTaskIds)
  return tasks.filter((item) => ids.has(item.taskId) && item.taskId !== task.taskId).sort(byKey)
}

/** The Tasks that depend on this one ("Required by"), in key order. */
export const requiredByOf = (task: ProjectTask, tasks: readonly ProjectTask[]): ProjectTask[] =>
  tasks.filter((item) => item.taskId !== task.taskId && item.dependsOnTaskIds.includes(task.taskId)).sort(byKey)

export type DependencyBadge = { kind: 'blocked' | 'cancelled'; first: ProjectTask; more: number; all: ProjectTask[] }

/**
 * The card badge of an open Task (To Do / In Progress):
 * - "Blocked by <key>" while any dependency is To Do or In Progress (the lowest key first, +N for the other open ones);
 * - otherwise "Dependency cancelled: <key>" when a dependency was cancelled (+N);
 * - nothing when every dependency is Done, or for a Done / Cancelled Task.
 */
export const dependencyBadgeOf = (task: ProjectTask, tasks: readonly ProjectTask[]): DependencyBadge | null => {
  if (task.status === 'DONE' || task.status === 'CANCELLED') return null
  const all = dependenciesOf(task, tasks)
  const open = all.filter((item) => item.status === 'TODO' || item.status === 'IN_PROGRESS')
  if (open.length) return { kind: 'blocked', first: open[0]!, more: open.length - 1, all }
  const cancelled = all.filter((item) => item.status === 'CANCELLED')
  if (cancelled.length) return { kind: 'cancelled', first: cancelled[0]!, more: cancelled.length - 1, all }
  return null
}

/** Tasks that may not be chosen as this Task's dependency: itself and every Task that (in)directly depends on it. */
export const dependencyCycleIds = (taskId: string | undefined, tasks: readonly ProjectTask[]): Set<string> => {
  const blocked = new Set<string>()
  if (!taskId) return blocked
  blocked.add(taskId)
  let changed = true
  while (changed) {
    changed = false
    for (const item of tasks) {
      if (blocked.has(item.taskId)) continue
      if (item.dependsOnTaskIds.some((id) => blocked.has(id))) { blocked.add(item.taskId); changed = true }
    }
  }
  return blocked
}
