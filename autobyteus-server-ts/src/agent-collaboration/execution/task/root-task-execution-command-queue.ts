export type RootTaskExecutionCommandKind = "activate" | "wake" | "shutdown";

export type RootTaskExecutionQueuedCommand<TResult = unknown> = Readonly<{
  kind: RootTaskExecutionCommandKind;
  executeAtQueueHead(): Promise<TResult>;
}>;

export class RootTaskExecutionFailStoppedError extends Error {
  constructor() {
    super("Task delegation stopped because root persistence authority is indeterminate.");
    this.name = "RootTaskExecutionFailStoppedError";
  }
}

type QueueEntry<TResult = unknown> = {
  command: RootTaskExecutionQueuedCommand<TResult>;
  resolve(value: TResult): void;
  reject(reason: unknown): void;
};

/**
 * The sole in-memory FIFO for one collaboration root. Activation, wake and
 * idle shutdown of task executions are serialized here; this owner only
 * admits, orders, closes, and drains commands.
 */
export class RootTaskExecutionCommandQueue {
  private readonly entries: QueueEntry[] = [];
  private externalAdmissionOpen = true;
  private rootFailStopped = false;
  private running = false;
  private drainWaiters: Array<() => void> = [];

  submit<TResult>(command: RootTaskExecutionQueuedCommand<TResult>): Promise<TResult> {
    if (this.rootFailStopped) return Promise.reject(new RootTaskExecutionFailStoppedError());
    if (!this.externalAdmissionOpen) {
      return Promise.reject(new Error("Task execution command admission is closed."));
    }
    return new Promise<TResult>((resolve, reject) => {
      this.entries.push({ command, resolve: resolve as (value: unknown) => void, reject });
      this.schedule();
    });
  }

  closeExternalAdmission(): void {
    this.externalAdmissionOpen = false;
    this.notifyDrainedIfIdle();
  }

  enterRootFailStop(): void {
    if (this.rootFailStopped) return;
    this.rootFailStopped = true;
    this.externalAdmissionOpen = false;
    const error = new RootTaskExecutionFailStoppedError();
    this.entries.splice(0).forEach((entry) => entry.reject(error));
    this.notifyDrainedIfIdle();
  }

  drain(): Promise<void> {
    if (!this.running && this.entries.length === 0) return Promise.resolve();
    return new Promise<void>((resolve) => this.drainWaiters.push(resolve));
  }

  private schedule(): void {
    if (this.running) return;
    this.running = true;
    queueMicrotask(() => void this.run());
  }

  private async run(): Promise<void> {
    try {
      while (this.entries.length > 0) {
        const entry = this.entries.shift();
        if (!entry) continue;
        try {
          entry.resolve(await entry.command.executeAtQueueHead());
        } catch (error) {
          entry.reject(error);
        }
      }
    } finally {
      this.running = false;
      if (this.entries.length > 0) this.schedule();
      else this.notifyDrainedIfIdle();
    }
  }

  private notifyDrainedIfIdle(): void {
    if (this.running || this.entries.length > 0) return;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
