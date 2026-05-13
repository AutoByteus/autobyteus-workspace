import { SenderType } from '../sender-type.js';
import {
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import type { ToolApprovalInputMessage, PostToolApprovalResult } from '../tool-approval-command.js';
import type { ToolResultInputMessage, PostToolResultResult } from '../tool-result-command.js';
import { InboxQueueStore, type CancellableWait, type InboxLane } from './inbox-queue-store.js';
import type {
  AgentInboxCandidateSnapshot,
  AgentInboxMessage,
  AgentMessageHandlerResult,
  InterAgentInboxMessage,
  RuntimeLifecycleInboxMessage,
  ToolApprovalInboxMessage,
  ToolResultInboxMessage,
  UserInboxMessage
} from './agent-inbox-message.js';

const INBOX_LANES: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;
const DRAIN_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;

let nextMessageSequence = 0;

const nextMessageId = (prefix: string): string => {
  nextMessageSequence += 1;
  return `${prefix}-${Date.now()}-${nextMessageSequence}`;
};

export class AgentMessageInbox {
  constructor(private readonly store = new InboxQueueStore<AgentInboxMessage>(INBOX_LANES)) {}

  async post(message: AgentInboxMessage): Promise<void> {
    this.assertAcceptedMessage(message);
    this.store.enqueue(message.lane, message);
  }

  async postUserMessage(event: UserMessageReceivedEvent): Promise<void> {
    await this.post(this.createUserMessage(event));
  }

  async postInterAgentMessage(event: InterAgentMessageReceivedEvent): Promise<void> {
    await this.post(this.createInterAgentMessage(event));
  }

  async postLifecycleMessage(event: LifecycleEvent): Promise<void> {
    await this.post(this.createLifecycleMessage(event));
  }

  async postToolApproval(input: ToolApprovalInputMessage): Promise<PostToolApprovalResult> {
    return this.postAwaitable(this.createToolApprovalMessage(input)) as Promise<PostToolApprovalResult>;
  }

  async postToolResult(input: ToolResultInputMessage): Promise<PostToolResultResult> {
    return this.postAwaitable(this.createToolResultMessage(input)) as Promise<PostToolResultResult>;
  }

  async postAwaitable(message: AgentInboxMessage): Promise<AgentMessageHandlerResult> {
    this.assertAcceptedMessage(message);
    return new Promise<AgentMessageHandlerResult>((resolve, reject) => {
      message.awaitable = { resolve, reject };
      this.store.enqueue(message.lane, message);
    });
  }

  waitForAvailability(options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.store.waitForAvailability(options.signal);
  }

  createAvailabilityWaiter(options: { signal?: AbortSignal } = {}): CancellableWait {
    return this.store.createAvailabilityWaiter(options.signal);
  }

  get availabilityVersion(): number {
    return this.store.version;
  }

  wakeAvailability(): void {
    this.store.wakeAvailability();
  }

  peekCandidates(): AgentInboxCandidateSnapshot {
    return this.store.snapshot();
  }

  peekFirst(lane: InboxLane): AgentInboxMessage | null {
    return this.store.peekFirst(lane);
  }

  claim(messageId: string): AgentInboxMessage | null {
    return this.store.claim(messageId);
  }

  claimFirst(lane: InboxLane): AgentInboxMessage | null {
    const candidate = this.peekFirst(lane);
    return candidate ? this.claim(candidate.messageId) : null;
  }

  resolveAwaitable(message: AgentInboxMessage, result: AgentMessageHandlerResult): void {
    message.awaitable?.resolve(result);
    message.awaitable = undefined;
  }

  rejectAwaitable(message: AgentInboxMessage, error: unknown): void {
    message.awaitable?.reject(error);
    message.awaitable = undefined;
  }

  drainForShutdown(): AgentInboxMessage[] {
    return this.store.drain(DRAIN_PRIORITY);
  }

  settleQueuedAwaitablesForShutdown(agentId: string): AgentInboxMessage[] {
    const drained = this.drainForShutdown();
    for (const message of drained) {
      if (!message.awaitable) {
        continue;
      }
      switch (message.kind) {
        case 'tool_approval':
          this.resolveAwaitable(message, {
            accepted: false,
            code: 'runtime_stopped',
            invocationId: message.input.invocationId,
            message: `Agent '${agentId}' runtime is stopping.`
          });
          break;
        case 'tool_result':
          this.resolveAwaitable(message, {
            accepted: false,
            code: 'runtime_stopped',
            invocationId: message.input.invocationId,
            message: `Agent '${agentId}' runtime is stopping.`
          });
          break;
        case 'user_message':
        case 'inter_agent_message':
          this.resolveAwaitable(message, {
            accepted: false,
            code: 'runtime_stopping',
            message: `Agent '${agentId}' runtime is stopping.`
          });
          break;
        case 'runtime_lifecycle':
          this.resolveAwaitable(message, {
            accepted: true,
            code: 'shutdown_requested',
            stopRequested: true
          });
          break;
      }
    }
    return drained;
  }

  qsize(lane?: InboxLane): number {
    return this.store.qsize(lane);
  }

  private createUserMessage(event: UserMessageReceivedEvent): UserInboxMessage {
    return { messageId: nextMessageId('user'), lane: 'turn_start', kind: 'user_message', event };
  }

  private createInterAgentMessage(event: InterAgentMessageReceivedEvent): InterAgentInboxMessage {
    return { messageId: nextMessageId('inter-agent'), lane: 'turn_start', kind: 'inter_agent_message', event };
  }

  private createLifecycleMessage(event: LifecycleEvent): RuntimeLifecycleInboxMessage {
    return { messageId: nextMessageId('lifecycle'), lane: 'runtime_lifecycle', kind: 'runtime_lifecycle', event };
  }

  private createToolApprovalMessage(input: ToolApprovalInputMessage): ToolApprovalInboxMessage {
    return { messageId: nextMessageId('tool-approval'), lane: 'active_turn', kind: 'tool_approval', input };
  }

  private createToolResultMessage(input: ToolResultInputMessage): ToolResultInboxMessage {
    return { messageId: nextMessageId('tool-result'), lane: 'active_turn', kind: 'tool_result', input };
  }

  private assertAcceptedMessage(message: AgentInboxMessage): void {
    if (!message || typeof message !== 'object' || typeof message.kind !== 'string') {
      throw new TypeError('AgentMessageInbox message must be a discriminated object.');
    }

    if (message.kind === 'user_message') {
      if (message.lane !== 'turn_start' || !(message.event instanceof UserMessageReceivedEvent)) {
        throw new TypeError('user_message requires the turn_start lane and a UserMessageReceivedEvent.');
      }
      if (message.event.agentInputUserMessage.senderType === SenderType.TOOL) {
        throw new Error('AgentMessageInbox rejects same-turn TOOL continuations; route them through TurnToolInputPort/turn runner flow.');
      }
      return;
    }

    if (message.kind === 'inter_agent_message') {
      if (message.lane !== 'turn_start' || !(message.event instanceof InterAgentMessageReceivedEvent)) {
        throw new TypeError('inter_agent_message requires the turn_start lane and an InterAgentMessageReceivedEvent.');
      }
      return;
    }

    if (message.kind === 'runtime_lifecycle') {
      if (message.lane !== 'runtime_lifecycle') {
        throw new TypeError('runtime_lifecycle requires the runtime_lifecycle lane.');
      }
      if (message.event instanceof ToolExecutionApprovalEvent || message.event instanceof ToolResultEvent) {
        throw new Error('AgentMessageInbox rejects operational tool events on the lifecycle lane; use active-turn tool messages.');
      }
      if (!(message.event instanceof LifecycleEvent)) {
        throw new TypeError('runtime_lifecycle requires a LifecycleEvent.');
      }
      return;
    }

    if (message.kind === 'tool_approval') {
      if (message.lane !== 'active_turn' || message.input.kind !== 'tool_approval') {
        throw new TypeError('tool_approval requires the active_turn lane and ToolApprovalInputMessage input.');
      }
      return;
    }

    if (message.kind === 'tool_result') {
      if (message.lane !== 'active_turn' || message.input.kind !== 'tool_result') {
        throw new TypeError('tool_result requires the active_turn lane and ToolResultInputMessage input.');
      }
      return;
    }

    throw new Error(`Unsupported AgentMessageInbox message kind '${(message as { kind?: unknown }).kind}'.`);
  }
}
