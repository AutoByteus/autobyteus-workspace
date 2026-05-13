import type { AgentContext } from '../../context/agent-context.js';
import type { AgentInboxMessage, AgentMessageHandlerResult } from '../agent-inbox-message.js';

export interface AgentMessageHandler<T extends AgentInboxMessage = AgentInboxMessage> {
  readonly kind: T['kind'];
  handle(message: T, context: AgentContext): Promise<AgentMessageHandlerResult>;
}
