import {
  taskExecutionReferenceKey,
  type TaskExecutionReference,
} from "./task-execution-reference.js";

/** Injectable timer seam so grace-period behavior is testable with a controllable clock. */
export type TaskExecutionIdleTimers = Readonly<{
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}>;

const nodeTimers: TaskExecutionIdleTimers = Object.freeze({
  setTimeout: (callback: () => void, delayMs: number) => {
    const handle = setTimeout(callback, delayMs);
    handle.unref?.();
    return handle;
  },
  clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
});

/**
 * Per-execution grace timers for one root. Arming replaces any pending timer
 * with a fresh deadline (now + grace, read at arm time); cancelling removes it.
 * The owner decides what a fire means; this schedule owns only timer mechanics.
 */
export class TaskExecutionIdleShutdownSchedule {
  private readonly pending = new Map<string, unknown>();
  private disposed = false;

  constructor(private readonly options: Readonly<{
    gracePeriodMs(): number;
    onFire(reference: TaskExecutionReference): void;
    timers?: TaskExecutionIdleTimers;
  }>) {}

  arm(reference: TaskExecutionReference): void {
    if (this.disposed) return;
    const key = taskExecutionReferenceKey(reference);
    this.clear(key);
    const handle = this.timers.setTimeout(() => {
      if (this.pending.get(key) !== handle) return;
      this.pending.delete(key);
      if (!this.disposed) this.options.onFire(reference);
    }, this.options.gracePeriodMs());
    this.pending.set(key, handle);
  }

  cancel(reference: TaskExecutionReference): void {
    this.clear(taskExecutionReferenceKey(reference));
  }

  dispose(): void {
    this.disposed = true;
    for (const key of [...this.pending.keys()]) this.clear(key);
  }

  private clear(key: string): void {
    const handle = this.pending.get(key);
    if (handle === undefined) return;
    this.pending.delete(key);
    this.timers.clearTimeout(handle);
  }

  private get timers(): TaskExecutionIdleTimers { return this.options.timers ?? nodeTimers; }
}
