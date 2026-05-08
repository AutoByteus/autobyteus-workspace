class AsyncQueue<T> {
  private items: T[] = [];
  private waiters: Array<() => void> = [];

  async put(item: T): Promise<void> {
    this.items.push(item);
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter();
    }
  }

  tryGet(): T | undefined {
    return this.items.shift();
  }

  qsize(): number {
    return this.items.length;
  }

  empty(): boolean {
    return this.items.length === 0;
  }

  drain(): T[] {
    const drained = this.items;
    this.items = [];
    return drained;
  }
}

export class AgentInputEventQueueManager<T> {
  private readonly queues = new Map<string, AsyncQueue<T>>();
  private availabilityWaiters: Array<() => void> = [];

  constructor(queueNames: readonly string[]) {
    if (!Array.isArray(queueNames) || queueNames.length === 0) {
      throw new Error('AgentInputEventQueueManager requires at least one queue name.');
    }
    for (const queueName of queueNames) {
      this.assertQueueName(queueName);
      if (this.queues.has(queueName)) {
        throw new Error(`Duplicate queue name '${queueName}'.`);
      }
      this.queues.set(queueName, new AsyncQueue<T>());
    }
  }

  get queueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  async enqueue(queueName: string, item: T): Promise<void> {
    await this.getQueue(queueName).put(item);
    this.notifyAvailability();
  }

  tryGetNext(queuePriority: readonly string[] = this.queueNames): [string, T] | null {
    for (const queueName of queuePriority) {
      const queue = this.getQueue(queueName);
      const item = queue.tryGet();
      if (item !== undefined) {
        return [queueName, item];
      }
    }
    return null;
  }

  async getNext(
    queuePriority: readonly string[] = this.queueNames,
    options: { signal?: AbortSignal } = {}
  ): Promise<[string, T]> {
    while (true) {
      const next = this.tryGetNext(queuePriority);
      if (next) {
        return next;
      }
      await this.waitForAvailability(options.signal);
    }
  }

  qsize(queueName?: string): number {
    if (queueName) {
      return this.getQueue(queueName).qsize();
    }
    return Array.from(this.queues.values()).reduce((total, queue) => total + queue.qsize(), 0);
  }

  empty(queueName?: string): boolean {
    return this.qsize(queueName) === 0;
  }

  drain(queuePriority: readonly string[] = this.queueNames): T[] {
    const drained: T[] = [];
    for (const queueName of queuePriority) {
      drained.push(...this.getQueue(queueName).drain());
    }
    return drained;
  }

  private getQueue(queueName: string): AsyncQueue<T> {
    this.assertQueueName(queueName);
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Unknown queue '${queueName}'.`);
    }
    return queue;
  }

  private assertQueueName(queueName: string): void {
    if (typeof queueName !== 'string' || queueName.trim().length === 0) {
      throw new Error('Queue name must be a non-empty string.');
    }
  }

  private notifyAvailability(): void {
    const waiter = this.availabilityWaiters.shift();
    if (waiter) {
      waiter();
    }
  }

  private async waitForAvailability(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Queue wait aborted.');
    }
    await new Promise<void>((resolve, reject) => {
      const waiter = () => {
        cleanup();
        resolve();
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('Queue wait aborted.'));
      };
      const cleanup = () => {
        this.availabilityWaiters = this.availabilityWaiters.filter((entry) => entry !== waiter);
        signal?.removeEventListener('abort', onAbort);
      };
      this.availabilityWaiters.push(waiter);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
