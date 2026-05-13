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

export class AgentMessageScheduler {
  private dispatchabilityWaiters: Array<() => void> = [];

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
      await this.waitForAvailabilityOrDispatchability(input.inbox, input.signal);
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
    signal?: AbortSignal
  ): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Agent message scheduler wait aborted.');
    }

    await Promise.race([
      inbox.waitForAvailability({ signal }),
      this.waitForDispatchabilityChanged(signal)
    ]);
  }

  private async waitForDispatchabilityChanged(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Agent message scheduler wait aborted.');
    }
    await new Promise<void>((resolve, reject) => {
      const waiter = () => {
        cleanup();
        resolve();
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('Agent message scheduler wait aborted.'));
      };
      const cleanup = () => {
        this.dispatchabilityWaiters = this.dispatchabilityWaiters.filter((entry) => entry !== waiter);
        signal?.removeEventListener('abort', onAbort);
      };
      this.dispatchabilityWaiters.push(waiter);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
