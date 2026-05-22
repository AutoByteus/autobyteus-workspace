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

  getBatchedEvents(): AsyncGenerator<string, void, void> {
    const queue = new AsyncQueue<QueueItem>();
    const collector = this.collect(queue);
    void collector.catch(() => undefined);

    let closed = false;
    let ended = false;
    let sourceCancellationStarted = false;

    const doneResult = (): IteratorResult<string, void> => ({
      done: true,
      value: undefined,
    });

    const cancelSource = (): void => {
      if (sourceCancellationStarted) {
        return;
      }
      sourceCancellationStarted = true;
      const cancellation = this.eventGenerator.return?.();
      if (cancellation) {
        void cancellation.catch(() => undefined);
      }
    };

    const close = (): void => {
      if (closed) {
        return;
      }
      closed = true;
      queue.push(null);
      cancelSource();
    };

    const next = async (): Promise<IteratorResult<string, void>> => {
      while (!closed) {
        if (ended) {
          close();
          return doneResult();
        }

        const firstEvent = await queue.pop();
        if (firstEvent === null || closed) {
          ended = true;
          close();
          return doneResult();
        }

        const batchedEvents = [firstEvent];
        await this.sleep(this.batchWindowMs);
        if (closed) {
          return doneResult();
        }

        while (queue.size > 0) {
          const nextItem = queue.tryPop();
          if (nextItem === null) {
            ended = true;
            break;
          }
          if (nextItem !== undefined) {
            batchedEvents.push(nextItem);
          }
        }
        if (closed) {
          return doneResult();
        }

        const composite = this.createCompositeEvent(batchedEvents);
        if (composite) {
          return {
            done: false,
            value: composite,
          };
        }

        if (ended) {
          close();
          return doneResult();
        }
      }

      return doneResult();
    };

    const iterator: AsyncGenerator<string, void, void> = {
      next,
      return: async () => {
        close();
        return doneResult();
      },
      throw: async (error?: unknown) => {
        close();
        throw error;
      },
      [Symbol.asyncDispose]: async () => {
        close();
      },
      [Symbol.asyncIterator]: () => iterator,
    };

    return iterator;
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
