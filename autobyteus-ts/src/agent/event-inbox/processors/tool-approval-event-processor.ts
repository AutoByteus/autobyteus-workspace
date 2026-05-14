import { ToolExecutionApprovalEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolApprovalResult } from '../../tool-approval-result.js';
import type { ActiveTurnEventInboxEntry } from '../agent-event-inbox-entry.js';
import type { AgentEventProcessor } from './agent-event-processor.js';

export type ApplyAgentStatusEvent = (event: ToolExecutionApprovalEvent) => Promise<void>;

export class ToolApprovalEventProcessor implements AgentEventProcessor<ActiveTurnEventInboxEntry> {
  constructor(private readonly applyStatusEvent: ApplyAgentStatusEvent) {}

  async process(entry: ActiveTurnEventInboxEntry, context: AgentContext): Promise<PostToolApprovalResult> {
    if (!(entry.event instanceof ToolExecutionApprovalEvent)) {
      throw new TypeError('ToolApprovalEventProcessor requires a ToolExecutionApprovalEvent.');
    }
    const result = context.state.postToolApprovalEventToActiveTurn(entry.event);
    if (result.accepted) {
      entry.event.turnId = result.turnId;
      await this.applyStatusEvent(entry.event);
    }
    return result;
  }
}
