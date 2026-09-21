export type RootTaskCommandKind =
  | "activate"
  | "submit_result"
  | "review_result"
  | "interrupt"
  | "settle";

export type RootTaskQueuedCommand<TResult = unknown> = Readonly<{
  kind: RootTaskCommandKind;
  executeAtQueueHead(): Promise<TResult>;
}>;

export type RootTaskShutdownCommand<TResult = unknown> =
  RootTaskQueuedCommand<TResult> & Readonly<{
    kind: "interrupt" | "settle";
  }>;

export class RootTaskFailStoppedError extends Error {
  constructor() {
    super("Task delegation stopped because root persistence authority is indeterminate.");
    this.name = "RootTaskFailStoppedError";
  }
}

type QueueEntry<TResult = unknown> = {
  command: RootTaskQueuedCommand<TResult>;
  resolve(value: TResult): void;
  reject(reason: unknown): void;
};

/**
 * The sole in-memory FIFO for one collaboration root. Policy and
 * persistence stay in the service-owned command closure; this owner only
 * admits, orders, closes, and drains commands.
 */
export class RootTaskLifecycleCommandQueue {
  private readonly entries: QueueEntry[] = [];
  private externalAdmissionOpen = true;
  private rootFailStopped = false;
  private running = false;
  private drainWaiters: Array<() => void> = [];

  submit<TResult>(command: RootTaskQueuedCommand<TResult>): Promise<TResult> {
    if (this.rootFailStopped) return Promise.reject(new RootTaskFailStoppedError());
    if (!this.externalAdmissionOpen) {
      return Promise.reject(new Error("Task delegation command admission is closed."));
    }
    return this.enqueue(command);
  }

  closeExternalAdmission(): void {
    this.externalAdmissionOpen = false;
    this.notifyDrainedIfIdle();
  }

  enterRootFailStop(): void {
    if (this.rootFailStopped) return;
    this.rootFailStopped = true;
    this.externalAdmissionOpen = false;
    const error = new RootTaskFailStoppedError();
    this.entries.splice(0).forEach((entry) => entry.reject(error));
    this.notifyDrainedIfIdle();
  }

  submitShutdown<TResult>(
    command: RootTaskShutdownCommand<TResult>,
  ): Promise<TResult> {
    if (this.rootFailStopped) return Promise.reject(new RootTaskFailStoppedError());
    if (command.kind !== "interrupt" && command.kind !== "settle") {
      return Promise.reject(new Error("Only interrupt or settle may use shutdown admission."));
    }
    return this.enqueue(command);
  }

  drain(): Promise<void> {
    if (!this.running && this.entries.length === 0) return Promise.resolve();
    return new Promise<void>((resolve) => this.drainWaiters.push(resolve));
  }

  private enqueue<TResult>(command: RootTaskQueuedCommand<TResult>): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this.entries.push({
        command,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.schedule();
    });
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
      if (this.entries.length > 0) {
        this.schedule();
      } else {
        this.notifyDrainedIfIdle();
      }
    }
  }

  private notifyDrainedIfIdle(): void {
    if (this.running || this.entries.length > 0) return;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
