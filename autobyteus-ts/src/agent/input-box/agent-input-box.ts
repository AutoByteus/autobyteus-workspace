import { SenderType } from '../sender-type.js';
import {
  BaseEvent,
  InterAgentMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import { AgentInputEventQueueManager } from '../events/agent-input-event-queue-manager.js';

export type ExternalUserInputMessage = {
  kind: 'external_user_message';
  event: UserMessageReceivedEvent;
};

export type InterAgentInputMessage = {
  kind: 'inter_agent_message';
  event: InterAgentMessageReceivedEvent;
};

export type RuntimeLifecycleInputMessage = {
  kind: 'runtime_lifecycle';
  event: BaseEvent;
};

export type AgentInputBoxMessage =
  | ExternalUserInputMessage
  | InterAgentInputMessage
  | RuntimeLifecycleInputMessage;

export type AgentInputBoxTrigger =
  | {
      kind: 'turn_trigger';
      source: 'user_message';
      event: UserMessageReceivedEvent;
    }
  | {
      kind: 'turn_trigger';
      source: 'inter_agent_message';
      event: InterAgentMessageReceivedEvent;
    };

export type AgentInputBoxLifecycleNotification = {
  kind: 'runtime_lifecycle';
  event: BaseEvent;
};

export type AgentInputBoxNextItem = AgentInputBoxTrigger | AgentInputBoxLifecycleNotification;

const QUEUE_NAMES = {
  user: 'externalUserMessages',
  interAgent: 'interAgentMessages',
  lifecycle: 'runtimeLifecycleMessages'
} as const;

const QUEUE_PRIORITY = [QUEUE_NAMES.user, QUEUE_NAMES.interAgent, QUEUE_NAMES.lifecycle] as const;

export class AgentInputBox {
  constructor(
    private readonly storage = new AgentInputEventQueueManager<AgentInputBoxMessage>(QUEUE_PRIORITY)
  ) {}

  async enqueue(message: AgentInputBoxMessage): Promise<void> {
    this.assertAcceptedMessage(message);
    await this.storage.enqueue(this.queueNameFor(message), message);
  }

  async enqueueUserMessage(event: UserMessageReceivedEvent): Promise<void> {
    await this.enqueue({ kind: 'external_user_message', event });
  }

  async enqueueInterAgentMessage(event: InterAgentMessageReceivedEvent): Promise<void> {
    await this.enqueue({ kind: 'inter_agent_message', event });
  }

  async enqueueLifecycleMessage(event: BaseEvent): Promise<void> {
    await this.enqueue({ kind: 'runtime_lifecycle', event });
  }

  async nextTurnTriggerWhenIdle(signal?: AbortSignal): Promise<AgentInputBoxNextItem> {
    const [, message] = await this.storage.getNext(QUEUE_PRIORITY, { signal });
    return this.toNextItem(message);
  }

  async drainOrPreserveForShutdown(): Promise<AgentInputBoxMessage[]> {
    return this.storage.drain(QUEUE_PRIORITY);
  }

  private queueNameFor(message: AgentInputBoxMessage): string {
    switch (message.kind) {
      case 'external_user_message':
        return QUEUE_NAMES.user;
      case 'inter_agent_message':
        return QUEUE_NAMES.interAgent;
      case 'runtime_lifecycle':
        return QUEUE_NAMES.lifecycle;
      default:
        throw new Error(`Unsupported AgentInputBox message kind '${(message as { kind?: unknown }).kind}'.`);
    }
  }

  private toNextItem(message: AgentInputBoxMessage): AgentInputBoxNextItem {
    switch (message.kind) {
      case 'external_user_message':
        return { kind: 'turn_trigger', source: 'user_message', event: message.event };
      case 'inter_agent_message':
        return { kind: 'turn_trigger', source: 'inter_agent_message', event: message.event };
      case 'runtime_lifecycle':
        return { kind: 'runtime_lifecycle', event: message.event };
      default:
        throw new Error(`Unsupported AgentInputBox message kind '${(message as { kind?: unknown }).kind}'.`);
    }
  }

  private assertAcceptedMessage(message: AgentInputBoxMessage): void {
    if (!message || typeof message !== 'object' || typeof message.kind !== 'string') {
      throw new TypeError('AgentInputBox message must be a discriminated object.');
    }

    if (message.kind === 'external_user_message') {
      if (!(message.event instanceof UserMessageReceivedEvent)) {
        throw new TypeError('external_user_message requires a UserMessageReceivedEvent.');
      }
      if (message.event.agentInputUserMessage.senderType === SenderType.TOOL) {
        throw new Error('AgentInputBox rejects same-turn TOOL continuations; route them through AgentTurnInputBox.');
      }
      return;
    }

    if (message.kind === 'inter_agent_message') {
      if (!(message.event instanceof InterAgentMessageReceivedEvent)) {
        throw new TypeError('inter_agent_message requires an InterAgentMessageReceivedEvent.');
      }
      return;
    }

    if (message.kind === 'runtime_lifecycle') {
      if (!(message.event instanceof BaseEvent)) {
        throw new TypeError('runtime_lifecycle requires a BaseEvent.');
      }
      if (message.event instanceof ToolExecutionApprovalEvent || message.event instanceof ToolResultEvent) {
        throw new Error('AgentInputBox rejects turn-local tool approvals/results; route them through AgentTurnInputBox.');
      }
      return;
    }

    throw new Error(`Unsupported AgentInputBox message kind '${(message as { kind?: unknown }).kind}'.`);
  }
}
