import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, SubTeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export interface TaskTeamExecutionProjectionIdentity { executionAddress: TeamExecutionAddress }
export const extractTaskTeamIdentity = (message: ServerMessage): TaskTeamExecutionProjectionIdentity | null => {
  const raw = 'payload' in message && message.payload && typeof message.payload === 'object'
    ? (message.payload as { execution_address?: unknown }).execution_address
    : null;
  if (!raw) return null;
  try {
    const executionAddress = createTeamExecutionAddress(raw as never);
    return executionAddress.taskTeamRunIds.length ? { executionAddress } : null;
  } catch { return null; }
};
export const ensureTaskTeamMemberExecutionContext = (team: AgentTeamContext, address: TeamExecutionAddress): AgentContext | null => {
  const key = serializeTeamExecutionAddress(address);
  const existing = team.agentExecutionsByKey.get(key); if (existing) return existing;
  const node = team.memberNodesByAddress.get(address.memberAddress);
  if (!node || node.kind !== 'agent') return null;
  let base: AgentContext | null = null;
  for (const [candidateKey, context] of team.agentExecutionsByKey) {
    try { if ((JSON.parse(candidateKey) as TeamExecutionAddress).memberAddress === address.memberAddress) { base = context; break; } }
    catch { /* exact keys only */ }
  }
  if (!base) return null;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: key, messages: [], createdAt: now, updatedAt: now,
    agentDefinitionId: base.config.agentDefinitionId, agentName: base.config.agentDefinitionName,
    llmModelIdentifier: base.config.llmModelIdentifier,
  };
  const context = new AgentContext({ ...base.config, isLocked: true }, new AgentRunState(key, conversation));
  context.isSubscribed = true; team.agentExecutionsByKey = new Map(team.agentExecutionsByKey).set(key, context); return context;
};
export const ensureTaskTeamExecutionProjection = (team: AgentTeamContext, identity: TaskTeamExecutionProjectionIdentity): SubTeamMemberNode | null => {
  const node = team.memberNodesByAddress.get(identity.executionAddress.memberAddress); return node?.kind === 'agent_team' ? node : null;
};
export const updateTaskTeamExecutionProjectionFromEvent = (team: AgentTeamContext, message: ServerMessage) => {
  const identity = extractTaskTeamIdentity(message); const node = identity ? ensureTaskTeamExecutionProjection(team, identity) : null;
  return node ? { node, shouldCleanup: false } : null;
};
export const removeTaskTeamExecutionProjection = (team: AgentTeamContext, taskTeamRunId: string): void => {
  const next = new Map(team.agentExecutionsByKey);
  for (const key of next.keys()) {
    try { if ((JSON.parse(key) as TeamExecutionAddress).taskTeamRunIds.includes(taskTeamRunId)) next.delete(key); }
    catch { /* exact keys only */ }
  }
  team.agentExecutionsByKey = next;
};
