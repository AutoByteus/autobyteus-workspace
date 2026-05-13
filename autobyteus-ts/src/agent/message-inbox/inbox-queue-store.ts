export type InboxLane = 'turn_start' | 'active_turn' | 'runtime_lifecycle';

export type CancellableWait = {
  promise: Promise<void>;
  cancel: () => void;
};

class AsyncQueue<T extends { messageId: string }> {
  private items: T[] = [];

  put(item: T): void {
    this.items.push(item);
  }

  peek(): T | null {
    return this.items[0] ?? null;
  }

  claim(messageId: string): T | null {
    const index = this.items.findIndex((item) => item.messageId === messageId);
    if (index < 0) {
      return null;
    }
    const [item] = this.items.splice(index, 1);
    return item ?? null;
  }

  qsize(): number {
    return this.items.length;
  }

  drain(): T[] {
    const drained = this.items;
    this.items = [];
    return drained;
  }

  snapshot(): T[] {
    return [...this.items];
  }
}

export class InboxQueueStore<T extends { messageId: string }> {
  private readonly queues = new Map<InboxLane, AsyncQueue<T>>();
  private availabilityWaiters: Array<() => void> = [];
  private availabilityVersion = 0;

  constructor(lanes: readonly InboxLane[]) {
    if (!Array.isArray(lanes) || lanes.length === 0) {
      throw new Error('InboxQueueStore requires at least one lane.');
    }
    for (const lane of lanes) {
      if (this.queues.has(lane)) {
        throw new Error(`Duplicate inbox lane '${lane}'.`);
      }
      this.queues.set(lane, new AsyncQueue<T>());
    }
  }

  get laneNames(): InboxLane[] {
    return Array.from(this.queues.keys());
  }

  get version(): number {
    return this.availabilityVersion;
  }

  enqueue(lane: InboxLane, item: T): void {
    this.getQueue(lane).put(item);
    this.notifyAvailability();
  }

  peekFirst(lane: InboxLane): T | null {
    return this.getQueue(lane).peek();
  }

  claim(messageId: string): T | null {
    for (const queue of this.queues.values()) {
      const item = queue.claim(messageId);
      if (item) {
        return item;
      }
    }
    return null;
  }

  snapshot(): Record<InboxLane, T[]> {
    return {
      turn_start: this.getQueue('turn_start').snapshot(),
      active_turn: this.getQueue('active_turn').snapshot(),
      runtime_lifecycle: this.getQueue('runtime_lifecycle').snapshot()
    };
  }

  qsize(lane?: InboxLane): number {
    if (lane) {
      return this.getQueue(lane).qsize();
    }
    return Array.from(this.queues.values()).reduce((total, queue) => total + queue.qsize(), 0);
  }

  empty(lane?: InboxLane): boolean {
    return this.qsize(lane) === 0;
  }

  drain(lanePriority: readonly InboxLane[] = this.laneNames): T[] {
    const drained: T[] = [];
    for (const lane of lanePriority) {
      drained.push(...this.getQueue(lane).drain());
    }
    return drained;
  }

  wakeAvailability(): void {
    this.notifyAvailability();
  }

  async waitForAvailability(signal?: AbortSignal): Promise<void> {
    if (!this.empty()) {
      return;
    }
    const waiter = this.createAvailabilityWaiter(signal);
    await waiter.promise;
  }

  createAvailabilityWaiter(signal?: AbortSignal): CancellableWait {
    if (signal?.aborted) {
      return {
        promise: Promise.reject(new Error('Inbox queue wait aborted.')),
        cancel: () => undefined
      };
    }

    let settled = false;
    let waiter!: () => void;
    let onAbort!: () => void;
    const cleanup = () => {
      this.availabilityWaiters = this.availabilityWaiters.filter((entry) => entry !== waiter);
      signal?.removeEventListener('abort', onAbort);
    };

    const promise = new Promise<void>((resolve, reject) => {
      waiter = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Inbox queue wait aborted.'));
      };
      this.availabilityWaiters.push(waiter);
      signal?.addEventListener('abort', onAbort, { once: true });
    });

    return {
      promise,
      cancel: () => {
        if (settled) return;
        settled = true;
        cleanup();
      }
    };
  }

  private getQueue(lane: InboxLane): AsyncQueue<T> {
    const queue = this.queues.get(lane);
    if (!queue) {
      throw new Error(`Unknown inbox lane '${lane}'.`);
    }
    return queue;
  }

  private notifyAvailability(): void {
    this.availabilityVersion += 1;
    const waiters = this.availabilityWaiters;
    this.availabilityWaiters = [];
    for (const waiter of waiters) {
      waiter();
    }
  }
}
