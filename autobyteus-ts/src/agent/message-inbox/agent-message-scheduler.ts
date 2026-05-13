import type { AgentContext } from '../context/agent-context.js';
import type { AgentRuntimeState } from '../context/agent-runtime-state.js';
import type { InboxLane } from './inbox-queue-store.js';
import type { AgentMessageInbox } from './agent-message-inbox.js';
import type {
  AgentInboxMessage,
  AgentMessageHandlerResult,
  InterAgentInboxMessage,
  RuntimeLifecycleInboxMessage,
  ToolApprovalInboxMessage,
  ToolResultInboxMessage,
  UserInboxMessage
} from './agent-inbox-message.js';
import type { AgentMessageHandler } from './handlers/agent-message-handler.js';

const ACTIVE_TURN_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn'] as const;
const IDLE_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;

export type AgentMessageSchedulerHandlers = {
  userMessageHandler: AgentMessageHandler<UserInboxMessage | InterAgentInboxMessage>;
  lifecycleHandler: AgentMessageHandler<RuntimeLifecycleInboxMessage>;
  toolApprovalHandler: AgentMessageHandler<ToolApprovalInboxMessage>;
  toolResultHandler: AgentMessageHandler<ToolResultInboxMessage>;
};

type CancellableWait = { promise: Promise<void>; cancel: () => void };

export class AgentMessageScheduler {
  private dispatchabilityWaiters: Array<() => void> = [];
  private dispatchabilityVersion = 0;

  constructor(
    private readonly context: AgentContext,
    private readonly handlers: AgentMessageSchedulerHandlers
  ) {}

  async nextDispatchable(input: {
    inbox: AgentMessageInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentInboxMessage> {
    while (true) {
      const message = this.claimNextDispatchable(input.inbox, input.runtimeState);
      if (message) {
        return message;
      }
      await this.waitForAvailabilityOrDispatchability(input.inbox, input.runtimeState, input.signal);
    }
  }

  async dispatch(message: AgentInboxMessage): Promise<AgentMessageHandlerResult> {
    try {
      const result = await this.handlerFor(message).handle(message as never, this.context);
      this.context.state.agentMessageInbox?.resolveAwaitable(message, result);
      return result;
    } catch (error) {
      this.context.state.agentMessageInbox?.rejectAwaitable(message, error);
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
    inbox: AgentMessageInbox,
    runtimeState: AgentRuntimeState
  ): AgentInboxMessage | null {
    const priority = runtimeState.activeTurn || runtimeState.activeTurnTask ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
    for (const lane of priority) {
      const message = inbox.claimFirst(lane);
      if (message) {
        return message;
      }
    }
    return null;
  }

  private handlerFor(message: AgentInboxMessage): AgentMessageHandler<any> {
    switch (message.kind) {
      case 'user_message':
      case 'inter_agent_message':
        return this.handlers.userMessageHandler;
      case 'runtime_lifecycle':
        return this.handlers.lifecycleHandler;
      case 'tool_approval':
        return this.handlers.toolApprovalHandler;
      case 'tool_result':
        return this.handlers.toolResultHandler;
      default:
        throw new Error(`Unsupported agent inbox message kind '${(message as { kind?: unknown }).kind}'.`);
    }
  }

  private async waitForAvailabilityOrDispatchability(
    inbox: AgentMessageInbox,
    runtimeState: AgentRuntimeState,
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Agent message scheduler wait aborted.');
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

  private hasDispatchable(inbox: AgentMessageInbox, runtimeState: AgentRuntimeState): boolean {
    const priority = runtimeState.activeTurn || runtimeState.activeTurnTask ? ACTIVE_TURN_PRIORITY : IDLE_PRIORITY;
    return priority.some((lane) => inbox.peekFirst(lane) !== null);
  }

  private createDispatchabilityWaiter(signal?: AbortSignal): CancellableWait {
    if (signal?.aborted) {
      return {
        promise: Promise.reject(new Error('Agent message scheduler wait aborted.')),
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
        reject(new Error('Agent message scheduler wait aborted.'));
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
