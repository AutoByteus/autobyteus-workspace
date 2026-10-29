import type { ProjectTask } from '~/types/project'
import { taskKeyNumber } from '~/utils/projects/taskDependencies'

/**
 * "Part of" between Tasks of one Project, as derived for display. Only `partOfTaskId` is stored, on the part;
 * a Task's parts and the progress are computed here from the Project's Task list. One level only: a part has no
 * parts and a Task with parts is no part. It informs and never prevents work. A stored ID that names no
 * current Task is never shown or counted.
 */
const byKey = (a: ProjectTask, b: ProjectTask) => taskKeyNumber(a) - taskKeyNumber(b)

/** The Task this Task is a part of, when it still exists. */
export const parentOf = (task: ProjectTask, tasks: readonly ProjectTask[]): ProjectTask | null =>
  task.partOfTaskId && task.partOfTaskId !== task.taskId ? tasks.find((item) => item.taskId === task.partOfTaskId) ?? null : null

/** The Tasks that are part of this Task (every status), in key order. */
export const partsOf = (task: ProjectTask, tasks: readonly ProjectTask[]): ProjectTask[] =>
  tasks.filter((item) => item.taskId !== task.taskId && item.partOfTaskId === task.taskId).sort(byKey)

export type PartsProgress = { done: number; total: number; cancelled: number }

/** "N of M done": M counts the parts that are not Cancelled, N those that are Done. Cancelled parts are listed, not counted. */
export const partsProgressOf = (parts: readonly ProjectTask[]): PartsProgress => {
  const cancelled = parts.filter((item) => item.status === 'CANCELLED').length
  return { done: parts.filter((item) => item.status === 'DONE').length, total: parts.length - cancelled, cancelled }
}

/** Tasks that may not be chosen as this Task's parent: itself and every Task that is itself a part (one level only). */
export const partOfBlockedIds = (taskId: string | undefined, tasks: readonly ProjectTask[]): Set<string> => {
  const existing = new Set(tasks.map((item) => item.taskId))
  const blocked = new Set<string>(taskId ? [taskId] : [])
  for (const item of tasks) if (item.partOfTaskId && existing.has(item.partOfTaskId)) blocked.add(item.taskId)
  return blocked
}
