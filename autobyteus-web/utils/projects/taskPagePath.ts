import type { ProjectTask } from '~/types/project'

/** A Project Task's page URL, by its key (`/projects/<projectId>/tasks/autobyteus-42`); every in-app link to a Project Task uses it. */
export const taskPagePath = (projectId: string, task: Pick<ProjectTask, 'taskKey'>): string =>
  `/projects/${projectId}/tasks/${encodeURIComponent(task.taskKey)}`
