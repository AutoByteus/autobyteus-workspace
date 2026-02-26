import type { BaseAgentTeamEvent, ProcessUserMessageEvent } from './agent-team-events.js';

class AsyncQueue<T> {
  private items: T[] = [];
  private waiters: Array<(value: T) => void> = [];

  async put(item: T): Promise<void> {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(item);
      return;
    }
    this.items.push(item);
  }

  async get(): Promise<T> {
    const item = this.items.shift();
    if (item !== undefined) {
      return item;
    }
    return new Promise<T>((resolve) => this.waiters.push(resolve));
  }

  qsize(): number {
    return this.items.length;
  }

  empty(): boolean {
    return this.items.length === 0;
  }
}

export class AgentTeamInputEventQueueManager {
  userMessageQueue: AsyncQueue<ProcessUserMessageEvent>;
  internalSystemEventQueue: AsyncQueue<BaseAgentTeamEvent>;

  constructor(queueSize: number = 0) {
    void queueSize;
    this.userMessageQueue = new AsyncQueue<ProcessUserMessageEvent>();
    this.internalSystemEventQueue = new AsyncQueue<BaseAgentTeamEvent>();
    console.info('AgentTeamInputEventQueueManager initialized.');
  }

  async enqueueUserMessage(event: ProcessUserMessageEvent): Promise<void> {
    await this.userMessageQueue.put(event);
  }

  async enqueueInternalSystemEvent(event: BaseAgentTeamEvent): Promise<void> {
    await this.internalSystemEventQueue.put(event);
  }
}
