import { ToolResultEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolResultResult } from '../../tool-result-posting.js';
import type { ActiveTurnEventInboxEntry, AgentEventInboxEntry } from '../agent-event-inbox-entry.js';
import type { InboxEventHandler } from './inbox-event-handler.js';

export class ToolResultInboxEventHandler implements InboxEventHandler<ActiveTurnEventInboxEntry> {
  canHandle(entry: AgentEventInboxEntry): entry is ActiveTurnEventInboxEntry {
    return entry.lane === 'active_turn' && entry.event instanceof ToolResultEvent;
  }

  async handle(entry: ActiveTurnEventInboxEntry, context: AgentContext): Promise<PostToolResultResult> {
    if (!(entry.event instanceof ToolResultEvent)) {
      throw new TypeError('ToolResultInboxEventHandler requires a ToolResultEvent.');
    }
    return context.state.routeToolResultToActiveTurn(entry.event);
  }
}
