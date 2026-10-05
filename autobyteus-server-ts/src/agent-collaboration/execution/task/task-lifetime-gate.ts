import { TaskDelegationError } from './task-delegation-command.js';
import type { TaskExecutionLifetimePort, TaskLifetimeAdmission, TaskLifetimeClosureListener } from './task-execution-lifetime.js';

/**
 * The single process-wide runtime closure owner for Task lifetimes. Each lifetime moves
 * irreversibly from unknown → confirmed-open → closed, derived from the durable closure:
 * a durable read confirms or latches it, and the Task commit listener latches it at once.
 * It keeps no admitted count and never drains; release relies on the latch plus exact cancel/stop.
 */
export class TaskLifetimeGate implements TaskLifetimeClosureListener {
  private readonly states = new Map<string, 'confirmed-open' | 'closed'>();
  constructor(private readonly source: Pick<TaskExecutionLifetimePort, 'readLifetimeClosure'>) {}

  /** Durable read on every admission; a DONE commit landing during the read still wins. */
  async admit(lifetimeId: string): Promise<TaskLifetimeAdmission> {
    this.rejectIfClosed(lifetimeId);
    if (await this.source.readLifetimeClosure(lifetimeId) === 'closed') this.states.set(lifetimeId, 'closed');
    this.rejectIfClosed(lifetimeId);
    this.states.set(lifetimeId, 'confirmed-open');
    return Object.freeze({ lifetimeId, assertOpen: () => this.assertOpen(lifetimeId) });
  }

  /** Synchronous input fence: closed if latched, unavailable if never confirmed open in this process. */
  assertOpen(lifetimeId: string): void {
    this.rejectIfClosed(lifetimeId);
    if (this.states.get(lifetimeId) !== 'confirmed-open') {
      throw new TaskDelegationError('TASK_LIFETIME_UNAVAILABLE', 'Owned input requires a current durable lifetime admission.');
    }
  }

  /** Root release precondition: the durable closure must already be committed. */
  async confirmClosed(lifetimeId: string): Promise<void> {
    if (await this.source.readLifetimeClosure(lifetimeId) !== 'closed') {
      throw new TaskDelegationError('TASK_LIFETIME_INVALID', 'Scoped completion requires a closed lifetime.');
    }
    this.states.set(lifetimeId, 'closed');
  }

  onLifetimesClosed(lifetimeIds: readonly string[]): void {
    for (const lifetimeId of lifetimeIds) this.states.set(lifetimeId, 'closed');
  }

  private rejectIfClosed(lifetimeId: string): void {
    if (this.states.get(lifetimeId) === 'closed') {
      throw new TaskDelegationError('TASK_LIFETIME_CLOSED', 'The Task execution lifetime is permanently closed.');
    }
  }
}

/** Neutral binding handed to collaboration roots by the composition; absent means linked work is unavailable. */
export type TaskLifetimeRuntime = Readonly<{ port: TaskExecutionLifetimePort; gate: TaskLifetimeGate }>;
