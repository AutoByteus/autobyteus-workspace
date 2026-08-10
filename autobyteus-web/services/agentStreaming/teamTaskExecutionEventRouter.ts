import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import {
  ensureTaskAgentProjection,
  extractTaskAgentIdentity,
  type TaskAgentStreamIdentity,
} from './teamTaskAgentContextProjection';
import {
  ensureTaskTeamMemberExecutionContext,
  updateTaskTeamExecutionProjectionFromEvent,
} from './teamTaskTeamExecutionProjection';
import { createTeamExecutionAddress, parseTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  extractTaskDelegationProjectionDetails,
  isTerminalTaskExecutionProjectionStatus,
} from './teamTaskExecutionProjection';

export type TaskExecutionProjectionMessageResult =
  | { outcome: 'continue'; taskAgentIdentity?: TaskAgentStreamIdentity | null }
  | { outcome: 'handled'; taskAgentIdentity?: TaskAgentStreamIdentity | null; cleanupExecutionAddress?: TeamExecutionAddress | null }
  | { outcome: 'drop'; reason: string }
  | { outcome: 'memberContext'; context: AgentContext; taskAgentIdentity?: TaskAgentStreamIdentity | null };

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

const taskAgentEventIdentity = (
  payload: Record<string, unknown>,
  receiverAddress: TeamExecutionAddress,
  taskId: string | null,
): TaskAgentStreamIdentity | null => {
  const target = object(payload.target);
  const execution = object(payload.execution);
  const instance = object(execution?.taskAgentInstance);
  const taskAgentRunId = text(instance?.taskAgentRunId);
  const expectedOwner = receiverAddress.taskTeamRunIds.at(-1) ?? receiverAddress.rootTeamRunId;
  if (target?.kind !== 'agent' || text(target.address) !== receiverAddress.memberAddress
    || execution?.kind !== 'task_agent' || !taskAgentRunId
    || receiverAddress.taskAgentRunId && receiverAddress.taskAgentRunId !== taskAgentRunId
    || text(instance?.owningTeamRunId) !== expectedOwner || !taskId || text(instance?.taskId) !== taskId) return null;
  return {
    taskAgentRunId,
    executionAddress: createTeamExecutionAddress({
      ...receiverAddress,
      taskAgentRunId,
    }),
  };
};

export const handleTaskExecutionProjectionMessage = (
  team: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult => {
  const payload = 'payload' in message ? object(message.payload) : null;
  const raw = payload?.execution_address;
  if (!raw) return message.type === 'TASK_DELEGATION_EVENT'
    ? { outcome: 'drop', reason: 'Task delegation event is missing execution_address.' }
    : { outcome: 'continue' };
  let address: TeamExecutionAddress;
  try { address = parseTeamExecutionAddress(raw); }
  catch { return { outcome: 'drop', reason: 'Team event contains an invalid execution_address.' }; }
  if (address.rootTeamRunId !== team.teamRunId) return { outcome: 'drop', reason: 'Team event execution_address selects another root TeamRun.' };

  if (message.type === 'TASK_DELEGATION_EVENT') {
    const details = extractTaskDelegationProjectionDetails(message);
    if (!details) return { outcome: 'drop', reason: 'Task delegation event details are invalid.' };
    const eventTaskAgentIdentity = payload ? taskAgentEventIdentity(payload, address, details.taskId) : null;
    if (object(payload?.execution)?.kind === 'task_agent') {
      if (!eventTaskAgentIdentity) return { outcome: 'drop', reason: 'Task Agent delegation event identity is inconsistent.' };
      const node = ensureTaskAgentProjection(team, eventTaskAgentIdentity, details);
      if (!node) return { outcome: 'drop', reason: `No exact task Agent source exists at '${address.memberAddress}'.` };
      return {
        outcome: 'handled',
        taskAgentIdentity: eventTaskAgentIdentity,
        cleanupExecutionAddress: isTerminalTaskExecutionProjectionStatus(details.taskExecutionStatus)
          ? eventTaskAgentIdentity.executionAddress
          : null,
      };
    }
    if (address.taskTeamRunIds.length) {
      const updated = updateTaskTeamExecutionProjectionFromEvent(team, message);
      if (!updated) return { outcome: 'drop', reason: 'Task Team delegation event identity is inconsistent.' };
      return {
        outcome: 'handled',
        cleanupExecutionAddress: isTerminalTaskExecutionProjectionStatus(details.taskExecutionStatus)
          ? updated.identity.executionAddress
          : null,
      };
    }
    return { outcome: 'drop', reason: 'Task delegation event does not select a task execution.' };
  }

  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    const node = ensureTaskAgentProjection(team, taskAgentIdentity);
    if (!node) return { outcome: 'drop', reason: `No exact task Agent source exists at '${address.memberAddress}'.` };
    const context = team.agentExecutionsByKey.get(serializeTeamExecutionAddress(taskAgentIdentity.executionAddress));
    return context
      ? { outcome: 'memberContext', context, taskAgentIdentity }
      : { outcome: 'drop', reason: 'Task Agent execution context is unavailable.' };
  }
  if (address.taskTeamRunIds.length) {
    const context = ensureTaskTeamMemberExecutionContext(team, address, text(payload?.agent_id));
    return context
      ? { outcome: 'memberContext', context }
      : { outcome: 'drop', reason: `No exact task Team Agent execution exists at '${address.memberAddress}'.` };
  }
  return { outcome: 'continue' };
};
