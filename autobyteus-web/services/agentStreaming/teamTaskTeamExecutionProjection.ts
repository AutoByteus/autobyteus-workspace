import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, SubTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import {
  applyTaskDelegationProjectionDetails,
  extractTaskDelegationProjectionDetails,
} from './teamTaskExecutionProjection';
import {
  findTeamExecutionNode,
  materializeTaskTeamProjectionRoot,
  removeTaskExecutionProjection,
} from './teamTaskExecutionTree';

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

export interface TaskTeamExecutionProjectionIdentity { executionAddress: TeamExecutionAddress }

/** Extracts and cross-validates the exact task-Team root identity carried by a delegation event. */
export const extractTaskTeamIdentity = (message: ServerMessage): TaskTeamExecutionProjectionIdentity | null => {
  if (message.type !== 'TASK_DELEGATION_EVENT') return null;
  const payload = object(message.payload);
  const target = object(payload?.target);
  const execution = object(payload?.execution);
  const instance = object(execution?.taskTeamInstance);
  if (!payload || target?.kind !== 'agent_team' || execution?.kind !== 'task_team' || !instance) return null;
  let receiver: TeamExecutionAddress;
  try { receiver = parseTeamExecutionAddress(payload.execution_address); } catch { return null; }
  const teamAddress = text(target.address);
  const coordinatorAddress = text(target.coordinatorAddress);
  const taskTeamRunId = text(instance.taskTeamRunId);
  const parentTeamRunId = text(instance.parentTeamRunId);
  const taskId = text(instance.taskId);
  const payloadTaskId = text(payload.taskId)
    ?? (Array.isArray(payload.tasks) ? text(object(payload.tasks[0])?.taskId) : null);
  const expectedParent = receiver.taskTeamRunIds.at(-2) ?? receiver.rootTeamRunId;
  if (!teamAddress || !coordinatorAddress || receiver.memberAddress !== coordinatorAddress || receiver.taskAgentRunId
    || !taskTeamRunId || receiver.taskTeamRunIds.at(-1) !== taskTeamRunId
    || !parentTeamRunId || parentTeamRunId !== expectedParent || !taskId || taskId !== payloadTaskId) return null;
  try {
    return { executionAddress: createTeamExecutionAddress({
      rootTeamRunId: receiver.rootTeamRunId,
      taskTeamRunIds: receiver.taskTeamRunIds,
      memberAddress: teamAddress,
      taskAgentRunId: null,
    }) };
  } catch { return null; }
};

const stableAgentContext = (team: AgentTeamContext, memberAddress: string): AgentContext | null => {
  const key = serializeTeamExecutionAddress(createTeamExecutionAddress({
    rootTeamRunId: team.teamRunId,
    memberAddress,
  }));
  return team.agentExecutionsByKey.get(key) ?? null;
};

const ensureContextForNode = (team: AgentTeamContext, node: TeamMemberNode): void => {
  if (node.kind === 'agent_team') {
    node.children.forEach((child) => ensureContextForNode(team, child));
    return;
  }
  const address = node.executionAddress;
  if (!address) return;
  const key = serializeTeamExecutionAddress(address);
  if (team.agentExecutionsByKey.has(key)) return;
  const base = stableAgentContext(team, node.address);
  if (!base) return;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: key,
    messages: [],
    createdAt: now,
    updatedAt: now,
    agentDefinitionId: base.config.agentDefinitionId,
    agentName: base.config.agentDefinitionName,
    llmModelIdentifier: base.config.llmModelIdentifier,
  };
  const context = new AgentContext({ ...base.config, isLocked: true }, new AgentRunState(key, conversation));
  context.isSubscribed = true;
  team.agentExecutionsByKey = new Map(team.agentExecutionsByKey).set(key, context);
};

export const ensureTaskTeamMemberExecutionContext = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
  runtimeAgentRunId?: string | null,
): AgentContext | null => {
  const node = findTeamExecutionNode(team, address);
  if (!node || node.kind !== 'agent' || !node.isTaskExecution || address.taskAgentRunId) return null;
  ensureContextForNode(team, node);
  const context = team.agentExecutionsByKey.get(serializeTeamExecutionAddress(address)) ?? null;
  const runId = runtimeAgentRunId?.trim() ?? '';
  if (runId && context) {
    const current = node.agentRunId || context.state.runId;
    const placeholder = serializeTeamExecutionAddress(address);
    if (current !== placeholder && current !== runId) return null;
    node.agentRunId = runId;
    context.state.runId = runId;
  }
  return context;
};

export const ensureTaskTeamExecutionProjection = (
  team: AgentTeamContext,
  identity: TaskTeamExecutionProjectionIdentity,
): SubTeamMemberNode | null => {
  const node = materializeTaskTeamProjectionRoot(team, identity.executionAddress);
  if (!node) return null;
  ensureContextForNode(team, node);
  return node;
};

export const updateTaskTeamExecutionProjectionFromEvent = (team: AgentTeamContext, message: ServerMessage) => {
  const identity = extractTaskTeamIdentity(message);
  const node = identity ? ensureTaskTeamExecutionProjection(team, identity) : null;
  if (!identity || !node) return null;
  const details = extractTaskDelegationProjectionDetails(message);
  applyTaskDelegationProjectionDetails(node, details);
  return { node, identity, details };
};

export const removeTaskTeamExecutionProjection = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
): void => removeTaskExecutionProjection(team, address);
