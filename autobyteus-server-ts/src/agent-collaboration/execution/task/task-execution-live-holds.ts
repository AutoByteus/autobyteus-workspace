import { TaskDelegationError } from "./task-delegation-command.js";

/**
 * What holds a root's task executions (by execution key): live leases (a delivery or command
 * holding a chain live between wake and input) and user Stops in progress (SR-006). Owned by
 * `RootTaskExecutionLifecycle`; it orders nothing itself (the lifecycle's queue does).
 */
export class TaskExecutionLiveHolds {
  private readonly leases = new Map<string, number>();
  private readonly stopping = new Map<string, Promise<void>>();
  /** Re-checked whenever a lease is released (a Stop drains held leases outside the queue). */
  private leaseWaiters: Array<() => void> = [];

  /** `onRelease`: told after every lease release (a peer-started Team's idle schedule re-arms on it, DS-004). */
  constructor(private readonly onRelease?: () => void) {}

  isLeased(key: string): boolean { return this.leases.has(key); }
  /** Any live lease is held in the root. */
  hasLeases(): boolean { return this.leases.size > 0; }
  isStopping(key: string): boolean { return this.stopping.has(key); }

  /** Takes one lease on each key; the returned release is idempotent. */
  lease(keys: readonly string[]): () => void {
    keys.forEach((key) => this.leases.set(key, (this.leases.get(key) ?? 0) + 1));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const key of keys) {
        const next = (this.leases.get(key) ?? 1) - 1;
        if (next > 0) this.leases.set(key, next);
        else this.leases.delete(key);
      }
      const waiters = this.leaseWaiters;
      this.leaseWaiters = [];
      waiters.forEach((check) => check());
      this.onRelease?.();
    };
  }

  /** Refuses a new lease on a chain that contains an execution being stopped. */
  assertNotStopping(chainKeys: readonly string[]): void {
    if (this.stopping.size && chainKeys.some((key) => this.stopping.has(key))) {
      throw new TaskDelegationError("TASK_EXECUTION_STOPPING", "The user is stopping this task agent.");
    }
  }

  /**
   * Marks the keys stopping (after an overlapping Stop has settled) and resolves once the leases
   * already held on them are released. `end()` clears this Stop's marks; call it in `finally`.
   */
  async beginStop(keys: readonly string[]): Promise<Readonly<{ drained: Promise<void>; end(): void }>> {
    for (;;) {
      const overlapping = [...new Set(keys.flatMap((key) => this.stopping.get(key) ?? []))];
      if (!overlapping.length) break;
      await Promise.allSettled(overlapping);
    }
    let settle!: () => void;
    const attempt = new Promise<void>((resolve) => { settle = resolve; });
    keys.forEach((key) => this.stopping.set(key, attempt));
    return Object.freeze({
      drained: this.released(keys),
      end: () => {
        keys.forEach((key) => { if (this.stopping.get(key) === attempt) this.stopping.delete(key); });
        settle();
      },
    });
  }

  private released(keys: readonly string[]): Promise<void> {
    const held = () => keys.some((key) => this.leases.has(key));
    if (!held()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const check = () => { if (held()) this.leaseWaiters.push(check); else resolve(); };
      this.leaseWaiters.push(check);
    });
  }
}
