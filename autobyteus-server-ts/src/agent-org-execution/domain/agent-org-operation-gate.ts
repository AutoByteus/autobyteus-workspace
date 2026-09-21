/** Org-private barrier for admitted handle construction and input publication. */
export class AgentOrgOperationGate {
  private open = true;
  private admitted = 0;
  private drainWaiters: Array<() => void> = [];

  constructor(private readonly options: Readonly<{ orgRunId: string; canEnter(): boolean }>) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.open || !this.options.canEnter()) {
      throw new Error(`AgentOrg '${this.options.orgRunId}' is not accepting execution operations.`);
    }
    this.admitted += 1;
    try {
      return await operation();
    } finally {
      this.admitted -= 1;
      if (this.admitted === 0) this.releaseDrainWaiters();
    }
  }

  closeAndDrain(): Promise<void> {
    this.open = false;
    if (this.admitted === 0) return Promise.resolve();
    return new Promise<void>((resolve) => this.drainWaiters.push(resolve));
  }

  private releaseDrainWaiters(): void {
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
