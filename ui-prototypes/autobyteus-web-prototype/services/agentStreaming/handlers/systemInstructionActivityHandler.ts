import type { AgentContext } from '~/types/agent/AgentContext';
import type { SystemInstructionsSuppliedPayload } from '../protocol/messageTypes';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

export const handleSystemInstructionsSupplied = (
  payload: SystemInstructionsSuppliedPayload,
  context: AgentContext,
): boolean => useAgentActivityStore().upsertSystemInstructionActivity(context.state.runId, {
  kind: 'system_instruction',
  activityId: payload.trace_id,
  content: payload.content,
  timestamp: new Date(payload.ts * 1000),
});
