import type { AgentInputStateDto } from '@autobyteus/agent-presentation-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildUserMessageFromProjectionPayload, upsertUserMessageByIdentity } from './userMessageProjection';

/** Same-live-run projection only. Never sends input or replays a historical queue. */
export function handleAgentInputState(payload: AgentInputStateDto, context: AgentContext): boolean {
  const previous = context.state.inputProjection;
  if (previous?.runInstanceId === payload.run_instance_id && payload.revision <= previous.revision) return false;
  context.state.inputProjection = { runInstanceId: payload.run_instance_id, revision: payload.revision };
  context.state.recoverableBlock = payload.recoverableBlock;
  if (payload.recoverableBlock) context.state.currentStatus = payload.recoverableBlock.state === 'recovering'
    ? AgentStatus.Running : AgentStatus.Error;
  for (const message of context.conversation.messages) if (message.type === 'user') delete message.pendingInput;
  for (const entry of payload.entries) {
    // Agent/system deliveries have their existing presentation owner; do not invent user bubbles.
    if (entry.sender_type !== 'user' || (!entry.message_id && !entry.dedupe_key)) continue;
    const message = buildUserMessageFromProjectionPayload({ content: entry.content,
      message_id: entry.message_id, dedupe_key: entry.dedupe_key,
      context_file_paths: entry.file_attachments.map(file => ({ path: file.uri, type: file.file_type })),
    });
    const existing = context.conversation.messages.find(item => item.type === 'user' && (
      !!entry.message_id && item.messageId === entry.message_id || !!entry.dedupe_key && item.dedupeKey === entry.dedupe_key));
    if (existing) message.timestamp = existing.timestamp;
    message.pendingInput = { runInstanceId: payload.run_instance_id, state: entry.state };
    upsertUserMessageByIdentity({ context, userMessage: message, retainExistingNonExecutableContextFiles: true });
  }
  return true;
}
