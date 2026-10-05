import type { RootExecutionIdentity } from '../domain/root-execution-identity.js';
import type { TaskExecutionReference } from './task-execution-reference.js';

export type TaskExecutionPurpose = 'assignment' | 'delegation' | 'helper';
export type TaskExecutionLifetimeStamp = Readonly<{ lifetimeId: string; purpose: TaskExecutionPurpose }>;
export type TaskLifetimeClosure = 'open' | 'closed';
/** Synchronous, I/O-free and non-throwing notice of durably committed lifetime closure. */
export interface TaskLifetimeClosureListener { onLifetimesClosed(lifetimeIds: readonly string[]): void }
/** A confirmed-open lifetime; it holds no count and needs no release. */
export type TaskLifetimeAdmission = Readonly<{ lifetimeId: string; assertOpen(): void }>;
export type TaskExecutionLinkIdentity = Readonly<{
  root: RootExecutionIdentity; execution: TaskExecutionReference;
  ingressAgentRunId: string; purpose: TaskExecutionPurpose;
}>;
export type TaskExecutionDispatch = 'reserved' | 'admitted' | 'delivered' | 'failed';
export type TaskExecutionReleaseOutcome = Readonly<{
  execution: TaskExecutionReference; cleanup: 'pending' | 'released' | 'failed';
  error?: Readonly<{ code: string; message: string }>;
}>;
/** `requested`: one per requested durable link. `unrequested`: stamped in the root for the lifetime, outside the request. */
export type TaskLifetimeReleaseReport = Readonly<{
  requested: readonly TaskExecutionReleaseOutcome[];
  unrequested: readonly TaskExecutionReleaseOutcome[];
}>;
/** Durable Task authority only; the runtime closure latch is TaskLifetimeGate. */
export interface TaskExecutionLifetimePort {
  resolveDelegationWork(taskId: string, inheritedLifetimeId?: string): Promise<Readonly<{
    lifetimeId: string; description: string; referenceFiles: string[];
  }>>;
  /** Unknown lifetime rejects TASK_LIFETIME_INVALID. */
  readLifetimeClosure(lifetimeId: string): Promise<TaskLifetimeClosure>;
  assertExecutionLinked(lifetimeId: string, identity: TaskExecutionLinkIdentity): Promise<void>;
  recordCleanup(lifetimeId: string, root: RootExecutionIdentity, report: TaskLifetimeReleaseReport): Promise<void>;
  reserveExecution(lifetimeId: string, identity: TaskExecutionLinkIdentity, explicitTaskId?: string): Promise<void>;
  /** Lock-free read of the exact link's dispatch state. */
  readExecutionDispatch(lifetimeId: string, identity: TaskExecutionLinkIdentity): Promise<TaskExecutionDispatch>;
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
