import type { ProjectTaskStatus } from '~/types/project'

/** Translation key of each Project Task status label (shown as text, never colour alone). */
export const TASK_STATUS_LABEL_KEYS: Readonly<Record<ProjectTaskStatus, string>> = {
  TODO: 'projects.task.status.TODO',
  IN_PROGRESS: 'projects.task.status.IN_PROGRESS',
  DONE: 'projects.task.status.DONE',
}
