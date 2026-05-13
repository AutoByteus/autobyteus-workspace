import { ToolExecutionApprovalEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolApprovalResult } from '../../tool-approval-command.js';
import type { ToolApprovalInboxMessage } from '../agent-inbox-message.js';
import type { AgentMessageHandler } from './agent-message-handler.js';

export type ApplyAgentStatusEvent = (event: ToolExecutionApprovalEvent) => Promise<void>;

export class ToolApprovalMessageHandler implements AgentMessageHandler<ToolApprovalInboxMessage> {
  readonly kind = 'tool_approval' as const;

  constructor(private readonly applyStatusEvent: ApplyAgentStatusEvent) {}

  async handle(message: ToolApprovalInboxMessage, context: AgentContext): Promise<PostToolApprovalResult> {
    const result = context.state.postToolApprovalToActiveTurn(message.input);
    if (result.accepted) {
      await this.applyStatusEvent(
        new ToolExecutionApprovalEvent(
          result.invocationId,
          message.input.approved,
          message.input.reason ?? undefined,
          result.turnId
        )
      );
    }
    return result;
  }
}
