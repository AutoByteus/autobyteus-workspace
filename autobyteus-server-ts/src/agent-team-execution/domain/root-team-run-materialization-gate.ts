/** Root-private barrier for operations that can change the materialized Team tree. */
export class RootTeamRunMaterializationGate {
  private open = true;
  private admitted = 0;
  private drainWaiters: Array<() => void> = [];

  constructor(private readonly options: { rootTeamRunId: string; canEnter(): boolean }) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.open || !this.options.canEnter()) {
      throw new Error(`RootTeamRun '${this.options.rootTeamRunId}' is not accepting materializing operations.`);
    }
    this.admitted += 1;
    try {
      return await operation();
    } finally {
      this.admitted -= 1;
      if (this.admitted === 0) {
        const waiters = this.drainWaiters;
        this.drainWaiters = [];
        waiters.forEach((resolve) => resolve());
      }
    }
  }

  closeAndDrain(): Promise<void> {
    this.open = false;
    if (this.admitted === 0) return Promise.resolve();
    return new Promise<void>((resolve) => this.drainWaiters.push(resolve));
  }
}
