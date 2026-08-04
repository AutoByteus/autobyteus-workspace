import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import { ensureTaskAgentContext, extractTaskAgentIdentity, type TaskAgentStreamIdentity } from './teamTaskAgentContextProjection';
import { ensureTaskTeamMemberExecutionContext } from './teamTaskTeamExecutionProjection';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export type TaskExecutionProjectionMessageResult =
  | { outcome: 'continue'; taskAgentIdentity?: TaskAgentStreamIdentity | null }
  | { outcome: 'handled'; taskAgentIdentity?: TaskAgentStreamIdentity | null; cleanupTaskTeamRunId?: string | null }
  | { outcome: 'drop'; reason: string }
  | { outcome: 'memberContext'; context: AgentContext; taskAgentIdentity?: TaskAgentStreamIdentity | null; cleanupTaskTeamRunId?: string | null };

export const handleTaskExecutionProjectionMessage = (
  team: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult => {
  const raw = 'payload' in message && message.payload && typeof message.payload === 'object'
    ? (message.payload as { execution_address?: unknown }).execution_address
    : null;
  if (!raw) return message.type === 'TASK_DELEGATION_EVENT' ? { outcome: 'handled' } : { outcome: 'continue' };
  let address;
  try { address = createTeamExecutionAddress(raw as never); }
  catch { return { outcome: 'drop', reason: 'Team event contains an invalid execution_address.' }; }
  if (address.rootTeamRunId !== team.teamRunId) return { outcome: 'drop', reason: 'Team event execution_address selects another root TeamRun.' };
  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    const context = ensureTaskAgentContext(team, taskAgentIdentity);
    return message.type === 'TASK_DELEGATION_EVENT'
      ? { outcome: 'handled', taskAgentIdentity }
      : { outcome: 'memberContext', context, taskAgentIdentity };
  }
  if (address.taskTeamRunIds.length) {
    const context = ensureTaskTeamMemberExecutionContext(team, address);
    if (!context) return message.type === 'TASK_DELEGATION_EVENT' ? { outcome: 'handled' } : { outcome: 'drop', reason: `No Agent exists at '${address.memberAddress}'.` };
    return message.type === 'TASK_DELEGATION_EVENT' ? { outcome: 'handled' } : { outcome: 'memberContext', context };
  }
  return message.type === 'TASK_DELEGATION_EVENT' ? { outcome: 'handled' } : { outcome: 'continue' };
};
