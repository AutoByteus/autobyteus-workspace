type QueueItem = string | null;

export class AsyncQueue<T> {
  private items: T[] = [];
  private resolvers: Array<(value: T) => void> = [];

  push(item: T): void {
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver(item);
    } else {
      this.items.push(item);
    }
  }

  async pop(): Promise<T> {
    if (this.items.length > 0) {
      return this.items.shift() as T;
    }
    return new Promise<T>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  tryPop(): T | undefined {
    return this.items.shift();
  }

  get size(): number {
    return this.items.length;
  }
}

export class EventBatcher {
  private eventGenerator: AsyncGenerator<string, void, void>;
  private batchWindowMs: number;

  constructor(eventGenerator: AsyncGenerator<string, void, void>, batchWindowSeconds = 0.25) {
    this.eventGenerator = eventGenerator;
    this.batchWindowMs = batchWindowSeconds * 1000;
  }

  async *getBatchedEvents(): AsyncGenerator<string, void, void> {
    const queue = new AsyncQueue<QueueItem>();
    const collector = this.collect(queue);

    let done = false;
    try {
      while (!done) {
        const firstEvent = await queue.pop();
        if (firstEvent === null) {
          break;
        }

        const batchedEvents = [firstEvent];
        await this.sleep(this.batchWindowMs);

        while (queue.size > 0) {
          const next = queue.tryPop();
          if (next === null) {
            done = true;
            break;
          }
          if (next !== undefined) {
            batchedEvents.push(next);
          }
        }

        const composite = this.createCompositeEvent(batchedEvents);
        if (composite) {
          yield composite;
        }
      }
    } finally {
      collector.catch(() => undefined);
    }
  }

  private async collect(queue: AsyncQueue<QueueItem>): Promise<void> {
    try {
      for await (const event of this.eventGenerator) {
        queue.push(event);
      }
    } finally {
      queue.push(null);
    }
  }

  private createCompositeEvent(events: string[]): string | null {
    const allChanges: Array<Record<string, unknown>> = [];
    for (const eventStr of events) {
      try {
        const data = JSON.parse(eventStr) as { changes?: unknown };
        if (Array.isArray(data.changes)) {
          allChanges.push(...(data.changes as Array<Record<string, unknown>>));
        }
      } catch {
        // ignore malformed JSON
      }
    }

    if (allChanges.length === 0) {
      return null;
    }

    return JSON.stringify({ changes: allChanges });
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
