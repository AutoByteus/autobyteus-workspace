import { ToolExecutionApprovalEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolApprovalResult } from '../../tool-approval-result.js';
import type { ActiveTurnEventInboxEntry, AgentEventInboxEntry } from '../agent-event-inbox-entry.js';
import type { InboxEventHandler } from './inbox-event-handler.js';

export type ApplyAgentStatusEvent = (event: ToolExecutionApprovalEvent) => Promise<void>;

export class ToolApprovalInboxEventHandler implements InboxEventHandler<ActiveTurnEventInboxEntry> {
  constructor(private readonly applyStatusEvent: ApplyAgentStatusEvent) {}

  canHandle(entry: AgentEventInboxEntry): entry is ActiveTurnEventInboxEntry {
    return entry.lane === 'active_turn' && entry.event instanceof ToolExecutionApprovalEvent;
  }

  async handle(entry: ActiveTurnEventInboxEntry, context: AgentContext): Promise<PostToolApprovalResult> {
    if (!(entry.event instanceof ToolExecutionApprovalEvent)) {
      throw new TypeError('ToolApprovalInboxEventHandler requires a ToolExecutionApprovalEvent.');
    }
    const result = context.state.routeToolApprovalToActiveTurn(entry.event);
    if (result.accepted) {
      entry.event.turnId = result.turnId;
      await this.applyStatusEvent(entry.event);
    }
    return result;
  }
}
