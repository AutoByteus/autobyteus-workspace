import type { AgentContext } from '../../context/agent-context.js';
import type { AgentEventInboxEntry, InboxEventHandlerResult } from '../agent-event-inbox-entry.js';

export interface InboxEventHandler<T extends AgentEventInboxEntry = AgentEventInboxEntry> {
  canHandle(entry: AgentEventInboxEntry): entry is T;
  handle(entry: T, context: AgentContext): Promise<InboxEventHandlerResult>;
}
