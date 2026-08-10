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
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import {
  extractTaskDelegationProjectionDetails,
  isTerminalTaskExecutionProjectionStatus,
  NO_TASK_EXECUTION_PROJECTION_MUTATION,
  type TaskExecutionProjectionMutation,
} from './teamTaskExecutionProjection';

interface TaskProjectionResultBase { mutation: TaskExecutionProjectionMutation }
export type TaskExecutionProjectionMessageResult =
  | (TaskProjectionResultBase & { outcome: 'continue'; taskAgentIdentity?: TaskAgentStreamIdentity | null })
  | (TaskProjectionResultBase & { outcome: 'handled'; taskAgentIdentity?: TaskAgentStreamIdentity | null; cleanupExecutionAddress?: TeamExecutionAddress | null })
  | (TaskProjectionResultBase & { outcome: 'drop'; reason: string })
  | (TaskProjectionResultBase & { outcome: 'memberContext'; context: AgentContext; executionAddress: TeamExecutionAddress; taskAgentIdentity?: TaskAgentStreamIdentity | null });

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
    executionAddress: createTeamExecutionAddress({ ...receiverAddress, taskAgentRunId }),
  };
};

export const handleTaskExecutionProjectionMessage = (
  team: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult => {
  const payload = 'payload' in message ? object(message.payload) : null;
  const raw = payload?.execution_address;
  if (!raw) return message.type === 'TASK_DELEGATION_EVENT'
    ? { outcome: 'drop', reason: 'Task delegation event is missing execution_address.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION }
    : { outcome: 'continue', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  let address: TeamExecutionAddress;
  try { address = parseTeamExecutionAddress(raw); }
  catch { return { outcome: 'drop', reason: 'Team event contains an invalid execution_address.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION }; }
  if (address.rootTeamRunId !== team.teamRunId) {
    return { outcome: 'drop', reason: 'Team event execution_address selects another root TeamRun.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }

  if (message.type === 'TASK_DELEGATION_EVENT') {
    const details = extractTaskDelegationProjectionDetails(message);
    if (!details) return { outcome: 'drop', reason: 'Task delegation event details are invalid.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
    const eventTaskAgentIdentity = payload ? taskAgentEventIdentity(payload, address, details.taskId) : null;
    if (object(payload?.execution)?.kind === 'task_agent') {
      if (!eventTaskAgentIdentity) {
        return { outcome: 'drop', reason: 'Task Agent delegation event identity is inconsistent.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
      }
      const ensured = ensureTaskAgentProjection(team, eventTaskAgentIdentity, details);
      if (!ensured) {
        return { outcome: 'drop', reason: `No exact task Agent source exists at '${address.memberAddress}'.`, mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
      }
      return {
        outcome: 'handled',
        taskAgentIdentity: eventTaskAgentIdentity,
        cleanupExecutionAddress: isTerminalTaskExecutionProjectionStatus(details.taskExecutionStatus)
          ? eventTaskAgentIdentity.executionAddress
          : null,
        mutation: ensured.mutation,
      };
    }
    if (address.taskTeamRunIds.length) {
      const updated = updateTaskTeamExecutionProjectionFromEvent(team, message);
      if (!updated) {
        return { outcome: 'drop', reason: 'Task Team delegation event identity is inconsistent.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
      }
      return {
        outcome: 'handled',
        cleanupExecutionAddress: updated.cleanupExecutionAddress,
        mutation: updated.mutation,
      };
    }
    return { outcome: 'drop', reason: 'Task delegation event does not select a task execution.', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }

  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    const ensured = ensureTaskAgentProjection(team, taskAgentIdentity);
    return ensured
      ? {
          outcome: 'memberContext',
          context: ensured.context,
          executionAddress: taskAgentIdentity.executionAddress,
          taskAgentIdentity,
          mutation: ensured.mutation,
        }
      : { outcome: 'drop', reason: `No exact task Agent source exists at '${address.memberAddress}'.`, mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }
  if (address.taskTeamRunIds.length) {
    const ensured = ensureTaskTeamMemberExecutionContext(team, address, text(payload?.agent_id));
    return ensured
      ? { outcome: 'memberContext', context: ensured.context, executionAddress: address, mutation: ensured.mutation }
      : { outcome: 'drop', reason: `No exact task Team Agent execution exists at '${address.memberAddress}'.`, mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }
  return { outcome: 'continue', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
};
