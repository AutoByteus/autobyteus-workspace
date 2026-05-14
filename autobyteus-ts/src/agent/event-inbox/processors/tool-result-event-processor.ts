import { ToolResultEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolResultResult } from '../../tool-result-posting.js';
import type { ActiveTurnEventInboxEntry } from '../agent-event-inbox-entry.js';
import type { AgentEventProcessor } from './agent-event-processor.js';

export class ToolResultEventProcessor implements AgentEventProcessor<ActiveTurnEventInboxEntry> {
  async process(entry: ActiveTurnEventInboxEntry, context: AgentContext): Promise<PostToolResultResult> {
    if (!(entry.event instanceof ToolResultEvent)) {
      throw new TypeError('ToolResultEventProcessor requires a ToolResultEvent.');
    }
    return context.state.postToolResultEventToActiveTurn(entry.event);
  }
}
