import {
  AgentStoppedEvent,
  BaseEvent,
  ShutdownRequestedEvent
} from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type {
  RuntimeLifecycleInboxMessage,
  RuntimeLifecycleMessageResult
} from '../agent-inbox-message.js';
import type { AgentMessageHandler } from './agent-message-handler.js';

export type ApplyLifecycleStatusEvent = (event: BaseEvent) => Promise<void>;
export type RequestWorkerStop = () => void;

export class RuntimeLifecycleMessageHandler implements AgentMessageHandler<RuntimeLifecycleInboxMessage> {
  readonly kind = 'runtime_lifecycle' as const;

  constructor(
    private readonly applyStatusEvent: ApplyLifecycleStatusEvent,
    private readonly requestStop: RequestWorkerStop
  ) {}

  async handle(message: RuntimeLifecycleInboxMessage, _context: AgentContext): Promise<RuntimeLifecycleMessageResult> {
    await this.applyStatusEvent(message.event);
    if (message.event instanceof ShutdownRequestedEvent || message.event instanceof AgentStoppedEvent) {
      this.requestStop();
      return { accepted: true, code: 'shutdown_requested', stopRequested: true };
    }
    return { accepted: true, code: 'lifecycle_applied' };
  }
}
