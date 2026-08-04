import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import { createTeamExecutionAddress, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export interface TeamStreamMemberContextResolution { context: AgentContext }

export const resolveTeamStreamMemberContext = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TeamStreamMemberContextResolution | null => {
  const payload = 'payload' in message && message.payload && typeof message.payload === 'object'
    ? message.payload as { execution_address?: unknown }
    : null;
  if (!payload?.execution_address) return null;
  try {
    const address = createTeamExecutionAddress(payload.execution_address as never);
    if (address.rootTeamRunId !== teamContext.teamRunId) return null;
    const context = teamContext.agentExecutionsByKey.get(serializeTeamExecutionAddress(address)) ?? null;
    return context ? { context } : null;
  } catch {
    return null;
  }
};
