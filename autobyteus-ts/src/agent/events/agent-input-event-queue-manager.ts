import type {
  BaseEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  PendingToolInvocationEvent,
  ToolResultEvent,
  ToolExecutionApprovalEvent
} from './agent-events.js';

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

  tryGet(): T | undefined {
    return this.items.shift();
  }

  async get(): Promise<T> {
    const item = this.tryGet();
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

export class AgentInputEventQueueManager {
  userMessageInputQueue: AsyncQueue<UserMessageReceivedEvent>;
  interAgentMessageInputQueue: AsyncQueue<InterAgentMessageReceivedEvent>;
  toolInvocationRequestQueue: AsyncQueue<PendingToolInvocationEvent>;
  toolResultInputQueue: AsyncQueue<ToolResultEvent>;
  toolExecutionApprovalQueue: AsyncQueue<ToolExecutionApprovalEvent>;
  internalSystemEventQueue: AsyncQueue<BaseEvent>;

  private inputQueues: Array<[string, AsyncQueue<BaseEvent>]>;
  private readyBuffers: Map<string, BaseEvent[]>;
  private queuePriority: string[];
  private availabilityWaiters: Array<() => void> = [];

  constructor() {
    this.userMessageInputQueue = new AsyncQueue();
    this.interAgentMessageInputQueue = new AsyncQueue();
    this.toolInvocationRequestQueue = new AsyncQueue();
    this.toolResultInputQueue = new AsyncQueue();
    this.toolExecutionApprovalQueue = new AsyncQueue();
    this.internalSystemEventQueue = new AsyncQueue();

    this.inputQueues = [
      ['userMessageInputQueue', this.userMessageInputQueue as unknown as AsyncQueue<BaseEvent>],
      ['interAgentMessageInputQueue', this.interAgentMessageInputQueue as unknown as AsyncQueue<BaseEvent>],
      ['toolInvocationRequestQueue', this.toolInvocationRequestQueue as unknown as AsyncQueue<BaseEvent>],
      ['toolResultInputQueue', this.toolResultInputQueue as unknown as AsyncQueue<BaseEvent>],
      ['toolExecutionApprovalQueue', this.toolExecutionApprovalQueue as unknown as AsyncQueue<BaseEvent>],
      ['internalSystemEventQueue', this.internalSystemEventQueue]
    ];

    this.readyBuffers = new Map(this.inputQueues.map(([name]) => [name, []]));
    this.queuePriority = [
      'userMessageInputQueue',
      'interAgentMessageInputQueue',
      'toolResultInputQueue',
      'toolInvocationRequestQueue',
      'toolExecutionApprovalQueue',
      'internalSystemEventQueue'
    ];
  }

  private notifyAvailability(): void {
    const waiter = this.availabilityWaiters.shift();
    if (waiter) {
      waiter();
    }
  }

  async enqueueUserMessage(event: UserMessageReceivedEvent): Promise<void> {
    await this.userMessageInputQueue.put(event);
    this.notifyAvailability();
  }

  async enqueueInterAgentMessage(event: InterAgentMessageReceivedEvent): Promise<void> {
    await this.interAgentMessageInputQueue.put(event);
    this.notifyAvailability();
  }

  async enqueueToolInvocationRequest(event: PendingToolInvocationEvent): Promise<void> {
    await this.toolInvocationRequestQueue.put(event);
    this.notifyAvailability();
  }

  async enqueueToolResult(event: ToolResultEvent): Promise<void> {
    await this.toolResultInputQueue.put(event);
    this.notifyAvailability();
  }

  async enqueueToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<void> {
    await this.toolExecutionApprovalQueue.put(event);
    this.notifyAvailability();
  }

  async enqueueInternalSystemEvent(event: BaseEvent): Promise<void> {
    await this.internalSystemEventQueue.put(event);
    this.notifyAvailability();
  }

  async getNextInputEvent(): Promise<[string, BaseEvent] | null> {
    while (true) {
      for (const qname of this.queuePriority) {
        const buffer = this.readyBuffers.get(qname);
        if (buffer && buffer.length > 0) {
          return [qname, buffer.shift()!];
        }
      }

      let bufferedAny = false;
      for (const [name, queue] of this.inputQueues) {
        const item = queue.tryGet();
        if (item !== undefined) {
          this.readyBuffers.get(name)?.push(item);
          bufferedAny = true;
        }
      }

      if (bufferedAny) {
        continue;
      }

      await new Promise<void>((resolve) => this.availabilityWaiters.push(resolve));
    }
  }

  async getNextInternalEvent(): Promise<[string, BaseEvent] | null> {
    const qname = 'internalSystemEventQueue';
    const buffer = this.readyBuffers.get(qname);
    if (buffer && buffer.length > 0) {
      return [qname, buffer.shift()!];
    }

    const item = this.internalSystemEventQueue.tryGet();
    if (item !== undefined) {
      return [qname, item];
    }

    await new Promise<void>((resolve) => this.availabilityWaiters.push(resolve));
    const nextItem = await this.internalSystemEventQueue.get();
    return [qname, nextItem];
  }
}
