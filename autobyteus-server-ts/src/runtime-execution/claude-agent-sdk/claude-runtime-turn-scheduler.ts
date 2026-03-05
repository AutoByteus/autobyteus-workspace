export class ClaudeRuntimeTurnScheduler {
  private readonly activeTurnTasks = new Map<string, Promise<void>>();
  private globalTurnQueue: Promise<void> = Promise.resolve();

  async waitForRunIdle(runId: string): Promise<void> {
    const active = this.activeTurnTasks.get(runId);
    if (active) {
      await active;
    }
  }

  schedule(runId: string, task: () => Promise<void>): Promise<void> {
    const wrapped = async () => {
      try {
        await task();
      } finally {
        this.activeTurnTasks.delete(runId);
      }
    };

    const queued = this.globalTurnQueue.then(wrapped, wrapped);
    this.globalTurnQueue = queued.catch(() => undefined);
    this.activeTurnTasks.set(runId, queued);
    return queued;
  }
}
