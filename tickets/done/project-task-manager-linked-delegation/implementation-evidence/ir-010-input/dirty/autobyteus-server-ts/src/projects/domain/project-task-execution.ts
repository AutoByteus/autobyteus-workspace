import type { TaskExecutionLinkIdentity } from '../../agent-collaboration/execution/task/task-execution-lifetime.js';
import type { Project } from './models.js';
export type ProjectTaskExecutionLink = TaskExecutionLinkIdentity & {
  reservedAt: string; dispatch: 'reserved' | 'admitted' | 'delivered' | 'failed';
  cleanup: 'not_requested' | 'pending' | 'released' | 'failed';
  error?: Readonly<{ code: string; message: string }>;
};
export type ProjectTaskLifetime = {
  lifetimeId: string; projectId: string; taskId: string;
  openedAt: string; completedAt: string | null; executions: ProjectTaskExecutionLink[];
};
export type ProjectState = { projects: Project[]; taskLifetimes: ProjectTaskLifetime[] };
export const emptyProjectState = (): ProjectState => ({ projects: [], taskLifetimes: [] });
