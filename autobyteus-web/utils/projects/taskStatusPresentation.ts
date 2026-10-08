import type { ProjectTaskStatus } from '~/types/project'

/**
 * How a Task status is shown. Status is read-only in the app (only agents change it).
 * CANCELLED means the Task was dropped as not needed, not completed; it is shown as "Cancelled",
 * apart from Done, and boards hide it until their Cancelled toggle is on.
 */

/** Translation key of each Project Task status label (shown as text, never colour alone). */
export const TASK_STATUS_LABEL_KEYS: Readonly<Record<ProjectTaskStatus, string>> = {
  TODO: 'projects.task.status.TODO',
  IN_PROGRESS: 'projects.task.status.IN_PROGRESS',
  DONE: 'projects.task.status.DONE',
  CANCELLED: 'projects.task.status.CANCELLED',
}

const PILL_CLASSES: Readonly<Record<ProjectTaskStatus, string>> = {
  TODO: 'bg-slate-100 text-slate-700 ring-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-800 ring-blue-200',
  DONE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELLED: 'bg-white text-slate-500 ring-slate-300',
}
/** Colour classes of a Project Task status pill (the caller adds shape and size). */
export const taskStatusPillClass = (status: ProjectTaskStatus): string => PILL_CLASSES[status]

/** TODO or IN_PROGRESS: the work has not ended (DONE and CANCELLED are not open). */
export const isOpenTaskStatus = (status: ProjectTaskStatus): boolean => status === 'TODO' || status === 'IN_PROGRESS'

/** The Project board's always-shown lanes; CANCELLED has its own lane, shown only on demand. */
export const BOARD_OPEN_LANES: readonly ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

/** Temp tasks (no Project) are grouped as Open or Done, plus Cancelled shown only on demand. */
export type TempLane = 'open' | 'done' | 'cancelled'
export const TEMP_LANES_OPEN: readonly TempLane[] = ['open', 'done']
export const tempTaskLaneOf = (status: ProjectTaskStatus): TempLane =>
  status === 'CANCELLED' ? 'cancelled' : status === 'DONE' ? 'done' : 'open'
/** Literal translation keys, so the localization audit resolves every label. */
export const TEMP_LANE_LABEL_KEYS: Readonly<Record<TempLane, string>> = {
  open: 'projects.temp.lane.open',
  done: 'projects.temp.lane.done',
  cancelled: 'projects.temp.lane.cancelled',
}
const TEMP_LANE_PILL_CLASSES: Readonly<Record<TempLane, string>> = {
  open: PILL_CLASSES.IN_PROGRESS,
  done: PILL_CLASSES.DONE,
  cancelled: PILL_CLASSES.CANCELLED,
}
/** Colour classes of a Temp task's status pill, by its lane. */
export const tempLanePillClass = (lane: TempLane): string => TEMP_LANE_PILL_CLASSES[lane]
