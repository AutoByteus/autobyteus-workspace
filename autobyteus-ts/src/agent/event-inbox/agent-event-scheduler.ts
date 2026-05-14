import {
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentRuntimeState } from '../context/agent-runtime-state.js';
import type { InboxLane } from './inbox-queue-store.js';
import type { AgentEventInbox } from './agent-event-inbox.js';
import type {
  AgentEventInboxEntry,
  AgentEventProcessorResult,
  ActiveTurnEventInboxEntry,
  RuntimeLifecycleEventInboxEntry,
  TurnStartEventInboxEntry
} from './agent-event-inbox-entry.js';
import type { AgentEventProcessor } from './processors/agent-event-processor.js';

const ACTIVE_TURN_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn'] as const;
const IDLE_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;

export type AgentEventSchedulerProcessors = {
  turnStartProcessor: AgentEventProcessor<TurnStartEventInboxEntry>;
  lifecycleProcessor: AgentEventProcessor<RuntimeLifecycleEventInboxEntry>;
  toolApprovalProcessor: AgentEventProcessor<ActiveTurnEventInboxEntry>;
  toolResultProcessor: AgentEventProcessor<ActiveTurnEventInboxEntry>;
};

type CancellableWait = { promise: Promise<void>; cancel: () => void };

export class AgentEventScheduler {
  private dispatchabilityWaiters: Array<() => void> = [];
  private dispatchabilityVersion = 0;

  constructor(
    private readonly context: AgentContext,
    private readonly processors: AgentEventSchedulerProcessors
  ) {}

  async nextDispatchable(input: {
    inbox: AgentEventInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentEventInboxEntry> {
    while (true) {
      const entry = this.claimNextDispatchable(input.inbox, input.runtimeState);
      if (entry) {
        return entry;
      }
      await this.waitForAvailabilityOrDispatchability(input.inbox, input.runtimeState, input.signal);
    }
  }

  async dispatch(entry: AgentEventInboxEntry): Promise<AgentEventProcessorResult> {
    try {
      const result = await this.processorFor(entry).process(entry as never, this.context);
      this.context.state.agentEventInbox?.resolveAwaitable(entry, result);
      return result;
    } catch (error) {
      this.context.state.agentEventInbox?.rejectAwaitable(entry, error);
      throw error;
    }
  }

  wakeDispatchabilityChanged(): void {
    this.dispatchabilityVersion += 1;
    const waiters = this.dispatchabilityWaiters;
    this.dispatchabilityWaiters = [];
    for (const waiter of waiters) {
      waiter();
    }
  }

  private claimNextDispatchable(
    inbox: AgentEventInbox,
    runtimeState: AgentRuntimeState
  ): AgentEventInboxEntry | null {
    const priority = runtimeState.activeTurn || runtimeState.activeTurnTask ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
    for (const lane of priority) {
      const entry = inbox.claimFirst(lane);
      if (entry) {
        return entry;
      }
    }
    return null;
  }

  private processorFor(entry: AgentEventInboxEntry): AgentEventProcessor<any> {
    const event = entry.event;
    if (event instanceof UserMessageReceivedEvent || event instanceof InterAgentMessageReceivedEvent) {
      return this.processors.turnStartProcessor;
    }
    if (event instanceof ToolExecutionApprovalEvent) {
      return this.processors.toolApprovalProcessor;
    }
    if (event instanceof ToolResultEvent) {
      return this.processors.toolResultProcessor;
    }
    if (event instanceof LifecycleEvent) {
      return this.processors.lifecycleProcessor;
    }
    throw new Error(`Unsupported agent event inbox entry event '${event.constructor.name}'.`);
  }

  private async waitForAvailabilityOrDispatchability(
    inbox: AgentEventInbox,
    runtimeState: AgentRuntimeState,
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Agent event scheduler wait aborted.');
    }

    if (this.hasDispatchable(inbox, runtimeState)) {
      return;
    }

    const availabilityVersion = inbox.availabilityVersion;
    const dispatchabilityVersion = this.dispatchabilityVersion;
    const availabilityWait = inbox.createAvailabilityWaiter({ signal });
    const dispatchabilityWait = this.createDispatchabilityWaiter(signal);
    const cleanup = () => {
      availabilityWait.cancel();
      dispatchabilityWait.cancel();
    };

    if (
      this.hasDispatchable(inbox, runtimeState) ||
      inbox.availabilityVersion !== availabilityVersion ||
      this.dispatchabilityVersion !== dispatchabilityVersion
    ) {
      cleanup();
      return;
    }

    try {
      await Promise.race([availabilityWait.promise, dispatchabilityWait.promise]);
    } finally {
      cleanup();
    }
  }

  private hasDispatchable(inbox: AgentEventInbox, runtimeState: AgentRuntimeState): boolean {
    const priority = runtimeState.activeTurn || runtimeState.activeTurnTask ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
    return priority.some((lane) => inbox.peekFirst(lane) !== null);
  }

  private createDispatchabilityWaiter(signal?: AbortSignal): CancellableWait {
    if (signal?.aborted) {
      return {
        promise: Promise.reject(new Error('Agent event scheduler wait aborted.')),
        cancel: () => undefined
      };
    }

    let settled = false;
    let waiter!: () => void;
    let onAbort!: () => void;
    const cleanup = () => {
      this.dispatchabilityWaiters = this.dispatchabilityWaiters.filter((entry) => entry !== waiter);
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
        reject(new Error('Agent event scheduler wait aborted.'));
      };
      this.dispatchabilityWaiters.push(waiter);
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
}
