import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import { createTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { ensureTaskTeamMemberExecutionContext } from './teamTaskTeamExecutionProjection';

export interface TaskTeamChildMemberProjectionIdentity { executionAddress: TeamExecutionAddress }
export type TaskTeamScopedMessageResolution = { outcome: 'none' } | { outcome: 'root' } | { outcome: 'drop'; reason: string } | { outcome: 'child'; identity: TaskTeamChildMemberProjectionIdentity };
const addressFor = (message: ServerMessage): TeamExecutionAddress | null => {
  const raw = 'payload' in message && message.payload && typeof message.payload === 'object' ? (message.payload as { execution_address?: unknown }).execution_address : null;
  if (!raw) return null; try { return createTeamExecutionAddress(raw as never); } catch { return null; }
};
export const hasTaskTeamScopedFields = (message: ServerMessage): boolean => Boolean(addressFor(message)?.taskTeamRunIds.length);
export const resolveTaskTeamScopedMessage = (_team: AgentTeamContext, message: ServerMessage): TaskTeamScopedMessageResolution => {
  const executionAddress = addressFor(message); return executionAddress?.taskTeamRunIds.length ? { outcome: 'child', identity: { executionAddress } } : { outcome: 'none' };
};
export const cloneTaskTeamChildTree = (nodes: readonly TeamMemberNode[]): TeamMemberNode[] =>
  nodes.map((node) => structuredClone(node));
export const ensureTaskTeamChildProjection = (team: AgentTeamContext, identity: TaskTeamChildMemberProjectionIdentity): { node: TeamMemberNode; context: AgentContext | null } | null => {
  const node = team.memberNodesByAddress.get(identity.executionAddress.memberAddress); return node ? { node, context: ensureTaskTeamMemberExecutionContext(team, identity.executionAddress) } : null;
};
export const updateTaskTeamChildStatus = (_node: TeamMemberNode, _message: ServerMessage): void => undefined;
export const removeTaskTeamChildProjections = (_team: AgentTeamContext, _taskTeamRunId: string): void => undefined;
