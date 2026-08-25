export class ApplicationExecutionEventDispatchQueue {
  private readonly pendingIds = new Set<string>();
  private readonly takers: Array<(applicationId: string | null) => void> = [];
  private accepting = true;

  enqueue(applicationId: string): void {
    if (!this.accepting) {
      return;
    }
    const normalized = applicationId.trim();
    if (!normalized || this.pendingIds.has(normalized)) {
      return;
    }
    this.pendingIds.add(normalized);
    this.publishNext();
  }

  take(): Promise<string | null> {
    const applicationId = this.takeNext();
    if (applicationId || !this.accepting) {
      return Promise.resolve(applicationId);
    }
    return new Promise((resolve) => this.takers.push(resolve));
  }

  stop(): void {
    if (!this.accepting) {
      return;
    }
    this.accepting = false;
    this.pendingIds.clear();
    for (const resolve of this.takers.splice(0)) {
      resolve(null);
    }
  }

  private takeNext(): string | null {
    const iterator = this.pendingIds.values().next();
    if (iterator.done) {
      return null;
    }
    this.pendingIds.delete(iterator.value);
    return iterator.value;
  }

  private publishNext(): void {
    while (this.takers.length > 0) {
      const applicationId = this.takeNext();
      if (!applicationId) {
        return;
      }
      this.takers.shift()!(applicationId);
    }
  }
}
