import type { RootExecutionIdentity } from '../domain/root-execution-identity.js';
import type { TaskExecutionReference } from './task-execution-reference.js';

export type TaskExecutionPurpose = 'assignment' | 'delegation' | 'helper';
export type TaskExecutionLifetimeStamp = Readonly<{ lifetimeId: string; purpose: TaskExecutionPurpose }>;
export type TaskLifetimeAdmission = Readonly<{ assertOpen(): void; release(): void }>;
export type TaskExecutionLinkIdentity = Readonly<{
  root: RootExecutionIdentity; execution: TaskExecutionReference;
  ingressAgentRunId: string; purpose: TaskExecutionPurpose;
}>;
export type TaskExecutionReleaseOutcome = Readonly<{
  execution: TaskExecutionReference; cleanup: 'pending' | 'released' | 'failed';
  error?: Readonly<{ code: string; message: string }>;
}>;
export interface TaskExecutionLifetimePort {
  resolveDelegationWork(taskId: string, inheritedLifetimeId?: string): Promise<Readonly<{
    lifetimeId: string; description: string; referenceFiles: string[];
  }>>;
  assertOpen(lifetimeId: string): Promise<void>;
  assertClosed(lifetimeId: string): Promise<void>;
  assertExecutionLinked(lifetimeId: string, identity: TaskExecutionLinkIdentity): Promise<void>;
  recordCleanup(lifetimeId: string, root: RootExecutionIdentity, outcomes: readonly TaskExecutionReleaseOutcome[]): Promise<void>;
  acquireAdmission(lifetimeId: string): Promise<TaskLifetimeAdmission>;
  reserveExecution(lifetimeId: string, identity: TaskExecutionLinkIdentity, explicitTaskId?: string): Promise<void>;
  recordDispatch(lifetimeId: string, identity: TaskExecutionLinkIdentity,
    dispatch: 'admitted' | 'delivered' | 'failed', error?: Readonly<{ code: string; message: string }>): Promise<void>;
}
export const parseTaskLifetimeStamp = (value: unknown): TaskExecutionLifetimeStamp => {
  const v = value as Partial<TaskExecutionLifetimeStamp> | null;
  if (!v || typeof v !== 'object' || typeof v.lifetimeId !== 'string' || !v.lifetimeId.trim()
    || !['assignment', 'delegation', 'helper'].includes(v.purpose ?? '')) {
    throw new Error('TASK_LIFETIME_INVALID: execution ownership stamp is invalid.');
  }
  return Object.freeze({ lifetimeId: v.lifetimeId, purpose: v.purpose! });
};
