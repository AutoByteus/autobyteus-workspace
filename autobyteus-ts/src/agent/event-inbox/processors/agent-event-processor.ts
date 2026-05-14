import type { AgentContext } from '../../context/agent-context.js';
import type { AgentEventInboxEntry, AgentEventProcessorResult } from '../agent-event-inbox-entry.js';

export interface AgentEventProcessor<T extends AgentEventInboxEntry = AgentEventInboxEntry> {
  process(entry: T, context: AgentContext): Promise<AgentEventProcessorResult>;
}
