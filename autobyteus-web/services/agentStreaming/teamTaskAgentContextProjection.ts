import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import {
  createTeamExecutionAddress,
  memberAddressBasename,
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import {
  applyTaskDelegationProjectionDetails,
  captureTaskExecutionNavigationSnapshot,
  deriveTaskExecutionProjectionMutation,
  type TaskDelegationProjectionDetails,
  type TaskExecutionProjectionMutation,
} from './teamTaskExecutionProjection';
import { findTeamExecutionNode, materializeTaskAgentProjectionNode, removeTaskExecutionProjection } from './teamTaskExecutionTree';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export interface TaskAgentStreamIdentity {
  executionAddress: TeamExecutionAddress;
  taskAgentRunId: string;
}
const identityByContext = new WeakMap<AgentContext, TaskAgentStreamIdentity>();
const cloneIdentity = (identity: TaskAgentStreamIdentity): TaskAgentStreamIdentity => ({
  taskAgentRunId: identity.taskAgentRunId,
  executionAddress: createTeamExecutionAddress(identity.executionAddress),
});
export const getTaskAgentIdentityFromContext = (context: AgentContext): TaskAgentStreamIdentity | null => {
  const identity = identityByContext.get(context); return identity ? cloneIdentity(identity) : null;
};
export const extractTaskAgentIdentity = (message: ServerMessage): TaskAgentStreamIdentity | null => {
  const raw = 'payload' in message && message.payload && typeof message.payload === 'object'
    ? (message.payload as { execution_address?: unknown }).execution_address
    : null;
  if (!raw) return null;
  try {
    const executionAddress = parseTeamExecutionAddress(raw);
    return executionAddress.taskAgentRunId
      ? { executionAddress, taskAgentRunId: executionAddress.taskAgentRunId }
      : null;
  } catch { return null; }
};
const logicalContext = (team: AgentTeamContext, address: TeamExecutionAddress): AgentContext | null => {
  for (const [key, context] of team.agentExecutionsByKey) {
    try {
      const candidate = JSON.parse(key) as TeamExecutionAddress;
      if (!candidate.taskAgentRunId && candidate.memberAddress === address.memberAddress) return context;
    } catch { /* exact serialized execution-address keys only */ }
  }
  return null;
};
const fallbackConfig = (team: AgentTeamContext, identity: TaskAgentStreamIdentity): AgentRunConfig => {
  const base = logicalContext(team, identity.executionAddress);
  if (base) return { ...base.config, agentDefinitionName: `${base.config.agentDefinitionName} · task`, isLocked: true };
  return {
    agentDefinitionId: 'task-agent', agentDefinitionName: `${memberAddressBasename(identity.executionAddress.memberAddress)} · task`,
    llmModelIdentifier: '', runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, workspaceId: null,
    workspaceMetadata: null, autoExecuteTools: false, skillAccessMode: 'NONE', isLocked: true, llmConfig: null,
  };
};
export const ensureTaskAgentContext = (team: AgentTeamContext, identity: TaskAgentStreamIdentity): AgentContext => {
  const key = serializeTeamExecutionAddress(identity.executionAddress);
  const existing = team.agentExecutionsByKey.get(key);
  if (existing) { identityByContext.set(existing, cloneIdentity(identity)); return existing; }
  const config = fallbackConfig(team, identity);
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: key, messages: [], createdAt: now, updatedAt: now,
    agentDefinitionId: config.agentDefinitionId, agentName: config.agentDefinitionName,
    llmModelIdentifier: config.llmModelIdentifier,
  };
  const context = new AgentContext(config, new AgentRunState(identity.taskAgentRunId, conversation));
  context.isSubscribed = true;
  identityByContext.set(context, cloneIdentity(identity));
  team.agentExecutionsByKey = new Map(team.agentExecutionsByKey).set(key, context);
  primeRecentEventMonitorBaseline(context);
  return context;
};
export const ensureTaskAgentProjection = (
  team: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
  details: TaskDelegationProjectionDetails | null = null,
): { node: AgentTeamMemberNode; context: AgentContext; mutation: TaskExecutionProjectionMutation } | null => {
  const before = captureTaskExecutionNavigationSnapshot(team);
  const node = materializeTaskAgentProjectionNode(team, identity.executionAddress);
  if (!node) return null;
  const context = ensureTaskAgentContext(team, identity);
  applyTaskDelegationProjectionDetails(node, details);
  return {
    node,
    context,
    mutation: deriveTaskExecutionProjectionMutation(before, team, 'ensure task-agent execution'),
  };
};
export const applyTaskAgentDelegationDetails = (
  team: AgentTeamContext,
  taskAgentRunId: string,
  details: TaskDelegationProjectionDetails | null,
): { node: AgentTeamMemberNode; mutation: TaskExecutionProjectionMutation } | null => {
  const before = captureTaskExecutionNavigationSnapshot(team);
  const context = getTaskAgentContextByRunId(team, taskAgentRunId);
  const identity = context ? getTaskAgentIdentityFromContext(context) : null;
  const node = identity ? findTeamExecutionNode(team, identity.executionAddress) : null;
  if (!node || node.kind !== 'agent') return null;
  applyTaskDelegationProjectionDetails(node, details);
  return { node, mutation: deriveTaskExecutionProjectionMutation(before, team, 'update task-agent execution') };
};
export const getTaskAgentContextByRunId = (team: AgentTeamContext, agentRunId: string): AgentContext | null => {
  for (const context of team.agentExecutionsByKey.values()) {
    if (getTaskAgentIdentityFromContext(context)?.taskAgentRunId === agentRunId) return context;
  }
  return null;
};
export const removeTaskAgentContext = (
  team: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
): TaskExecutionProjectionMutation => {
  const before = captureTaskExecutionNavigationSnapshot(team);
  const context = team.agentExecutionsByKey.get(serializeTeamExecutionAddress(identity.executionAddress));
  if (context) resetRecentEventMonitorBaseline(context);
  removeTaskExecutionProjection(team, identity.executionAddress);
  return deriveTaskExecutionProjectionMutation(before, team, 'remove task-agent execution');
};
export const shouldRemoveTaskAgentAfterMessage = (message: ServerMessage, identity: TaskAgentStreamIdentity | null): boolean =>
  Boolean(identity && message.type === 'AGENT_STATUS' && message.payload.status === AgentStatus.Offline);
