import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import {
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export interface TeamStreamMemberContextResolution {
  context: AgentContext;
  executionAddress: TeamExecutionAddress;
}

/** Read-only exact lookup after the task projection router has completed any ensure/repair. */
export const resolveTeamStreamMemberContext = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TeamStreamMemberContextResolution | null => {
  const payload = 'payload' in message && message.payload && typeof message.payload === 'object'
    ? message.payload as { execution_address?: unknown }
    : null;
  if (!payload?.execution_address) return null;
  try {
    const executionAddress = parseTeamExecutionAddress(payload.execution_address);
    if (executionAddress.rootTeamRunId !== teamContext.teamRunId) return null;
    const context = teamContext.agentExecutionsByKey.get(serializeTeamExecutionAddress(executionAddress)) ?? null;
    return context ? { context, executionAddress } : null;
  } catch {
    return null;
  }
};
