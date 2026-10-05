import { rootExecutionIdentityKey } from '../../agent-collaboration/execution/domain/root-execution-identity.js';
import { taskExecutionReferenceKey } from '../../agent-collaboration/execution/task/task-execution-reference.js';
import type { TaskExecutionLinkIdentity } from '../../agent-collaboration/execution/task/task-execution-lifetime.js';
import type { ProjectState, ProjectTaskLifetime, ProjectTaskExecutionLink } from './project-task-execution.js';
import { ProjectError } from './project-errors.js';
export const executionLinkKey = (link: TaskExecutionLinkIdentity): string =>
  `${rootExecutionIdentityKey(link.root)}\0${taskExecutionReferenceKey(link.execution)}`;
export const requireLifetime = (state: ProjectState, id: string): ProjectTaskLifetime => {
  const lifetime = state.taskLifetimes.find(l => l.lifetimeId === id);
  if (!lifetime) throw new ProjectError('TASK_LIFETIME_INVALID', `Unknown Task lifetime '${id}'.`);
  return lifetime;
};
export const assertLifetimeOpen = (lifetime: ProjectTaskLifetime): void => {
  if (lifetime.completedAt !== null) throw new ProjectError('TASK_LIFETIME_CLOSED', `Task lifetime '${lifetime.lifetimeId}' is permanently closed.`);
};
export const uniqueTask = (state: ProjectState, id: string) => {
  const matches = state.projects.flatMap(p => p.tasks.filter(t => t.taskId === id).map(task => ({ project: p, task })));
  if (matches.length !== 1) throw new ProjectError(matches.length ? 'TASK_ID_AMBIGUOUS' : 'TASK_NOT_FOUND',
    `Task '${id}' must identify exactly one current node-local Task (found ${matches.length}).`);
  return matches[0]!;
};
export const reserveExecutionLink = (state: ProjectState, id: string, identity: TaskExecutionLinkIdentity, now: string): void => {
  const lifetime = requireLifetime(state, id); assertLifetimeOpen(lifetime);
  const key = executionLinkKey(identity);
  if (state.taskLifetimes.some(l => l.executions.some(e => executionLinkKey(e) === key))) {
    throw new ProjectError('TASK_LIFETIME_INVALID', 'Exact execution is already reserved; delegation is always a fresh copy.');
  }
  lifetime.executions.push({ ...identity, reservedAt: now, dispatch: 'reserved', cleanup: 'not_requested' });
};
export const requireExecutionLink = (state: ProjectState, id: string, identity: TaskExecutionLinkIdentity): ProjectTaskExecutionLink => {
  const lifetime = requireLifetime(state, id);
  const link = lifetime.executions.find(e => executionLinkKey(e) === executionLinkKey(identity));
  if (!link || link.ingressAgentRunId !== identity.ingressAgentRunId || link.purpose !== identity.purpose) {
    throw new ProjectError('TASK_LIFETIME_INVALID', 'Exact Task execution reservation does not match ingress/purpose.');
  }
  return link;
};
export const closeTaskLifetimes = (state: ProjectState, projectId: string, taskId: string, now: string): void => {
  for (const l of state.taskLifetimes.filter(l => l.projectId === projectId && l.taskId === taskId)) {
    l.completedAt ??= now;
    for (const e of l.executions) if (e.cleanup !== 'released') e.cleanup = 'pending';
  }
};
export const boundedTaskError = (error: { code: string; message: string }) => ({
  code: error.code.replace(/[^A-Z0-9_]/gi, '_').slice(0, 80),
  message: error.message.replace(/[\x00-\x1f]/g, ' ').slice(0, 500),
});
