import type { AgentContext } from '../context/agent-context.js';
import type { AgentRuntimeState } from '../context/agent-runtime-state.js';
import type { InboxLane } from './inbox-queue-store.js';
import type { AgentEventInbox } from './agent-event-inbox.js';
import type {
  AgentEventInboxEntry,
  InboxEventHandlerResult,
  ActiveTurnEventInboxEntry,
  RuntimeLifecycleEventInboxEntry,
  TurnStartEventInboxEntry
} from './agent-event-inbox-entry.js';
import type { InboxEventHandler } from './handlers/inbox-event-handler.js';

const ACTIVE_TURN_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn'] as const;
const IDLE_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;

export type AgentEventSchedulerHandlers = {
  turnStartHandler: InboxEventHandler<TurnStartEventInboxEntry>;
  lifecycleHandler: InboxEventHandler<RuntimeLifecycleEventInboxEntry>;
  toolApprovalHandler: InboxEventHandler<ActiveTurnEventInboxEntry>;
  toolResultHandler: InboxEventHandler<ActiveTurnEventInboxEntry>;
};

type CancellableWait = { promise: Promise<void>; cancel: () => void };

export class AgentEventScheduler {
  private dispatchabilityWaiters: Array<() => void> = [];
  private dispatchabilityVersion = 0;

  constructor(
    private readonly context: AgentContext,
    private readonly handlers: AgentEventSchedulerHandlers
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

  async dispatch(entry: AgentEventInboxEntry): Promise<InboxEventHandlerResult> {
    try {
      const handler = this.handlerFor(entry);
      const result = await handler.handle(entry as never, this.context);
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
    const priority = runtimeState.activeTurn ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
    for (const lane of priority) {
      const entry = inbox.claimFirst(lane);
      if (entry) {
        return entry;
      }
    }
    return null;
  }

  private handlerFor(entry: AgentEventInboxEntry): InboxEventHandler<any> {
    const handlers: InboxEventHandler[] = [
      this.handlers.turnStartHandler,
      this.handlers.toolApprovalHandler,
      this.handlers.toolResultHandler,
      this.handlers.lifecycleHandler
    ];
    const handler = handlers.find((candidate) => candidate.canHandle(entry));
    if (!handler) {
      throw new Error(`Unsupported agent event inbox entry event '${entry.event.constructor.name}'.`);
    }
    return handler;
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
    const priority = runtimeState.activeTurn ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
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
