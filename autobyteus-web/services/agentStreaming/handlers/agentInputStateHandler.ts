import type { AgentInputStateDto } from '@autobyteus/agent-presentation-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { upsertPendingUserMessage } from './userMessageProjection';

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
    upsertPendingUserMessage(context, entry, payload.run_instance_id);
  }
  return true;
}
