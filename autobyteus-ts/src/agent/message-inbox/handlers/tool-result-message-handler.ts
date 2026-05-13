import type { AgentContext } from '../../context/agent-context.js';
import type { PostToolResultResult } from '../../tool-result-command.js';
import type { ToolResultInboxMessage } from '../agent-inbox-message.js';
import type { AgentMessageHandler } from './agent-message-handler.js';

export class ToolResultMessageHandler implements AgentMessageHandler<ToolResultInboxMessage> {
  readonly kind = 'tool_result' as const;

  async handle(message: ToolResultInboxMessage, context: AgentContext): Promise<PostToolResultResult> {
    return context.state.postToolResultToActiveTurn(message.input);
  }
}
