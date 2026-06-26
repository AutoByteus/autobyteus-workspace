import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import {
  ensureTaskAgentContext,
  extractTaskAgentIdentity,
  type TaskAgentStreamIdentity,
} from './teamTaskAgentContextProjection';
import {
  ensureTaskTeamExecutionProjection,
  extractTaskTeamIdentity,
  updateTaskTeamExecutionProjectionFromEvent,
  updateTaskTeamRootStatus,
} from './teamTaskTeamExecutionProjection';
import {
  ensureTaskTeamChildProjection,
  hasTaskTeamScopedFields,
  resolveTaskTeamScopedMessage,
  updateTaskTeamChildStatus,
  type TaskTeamChildMemberProjectionIdentity,
} from './teamTaskTeamChildProjection';

export type TaskExecutionProjectionMessageResult =
  | { outcome: 'continue'; taskAgentIdentity?: TaskAgentStreamIdentity | null }
  | { outcome: 'handled'; taskAgentIdentity?: TaskAgentStreamIdentity | null; cleanupTaskTeamRunId?: string | null }
  | { outcome: 'drop'; reason: string }
  | {
    outcome: 'memberContext';
    context: AgentContext;
    taskAgentIdentity?: TaskAgentStreamIdentity | null;
    cleanupTaskTeamRunId?: string | null;
  };

const toScopedTaskAgentIdentity = (
  taskAgentIdentity: TaskAgentStreamIdentity,
  childIdentity: TaskTeamChildMemberProjectionIdentity,
): TaskAgentStreamIdentity => ({
  ...taskAgentIdentity,
  logicalMemberRouteKey: childIdentity.scopedMemberRouteKey,
  logicalMemberPath: [...childIdentity.scopedMemberPath],
  parentTaskTeamRunId: childIdentity.parentTaskTeamRunId,
  parentTaskTeamInstanceId: childIdentity.parentTaskTeamInstanceId,
  parentTaskId: childIdentity.parentTaskId,
  taskTeamRelativeMemberRouteKey: childIdentity.relativeMemberRouteKey,
  taskTeamRelativeMemberPath: [...childIdentity.relativeMemberPath],
  structuralSourceRouteKey: childIdentity.structuralSourceRouteKey,
  structuralSourcePath: [...childIdentity.structuralSourcePath],
});

const ensureRootForScopedChild = (
  teamContext: AgentTeamContext,
  identity: TaskTeamChildMemberProjectionIdentity,
): void => {
  if (teamContext.memberNodesByRouteKey.get(identity.parentTaskTeamRunId)?.isTaskTeamInstance) {
    return;
  }
  ensureTaskTeamExecutionProjection(teamContext, {
    taskTeamRunId: identity.parentTaskTeamRunId,
    taskTeamInstanceId: identity.parentTaskTeamInstanceId,
    taskId: identity.parentTaskId,
    logicalTeamRouteKey: identity.logicalTeamRouteKey,
    logicalTeamPath: [...identity.logicalTeamPath],
  }, 'active');
};

export const handleTaskExecutionProjectionMessage = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult => {
  if (message.type === 'TASK_DELEGATION_EVENT') {
    const taskTeamIdentity = extractTaskTeamIdentity(message);
    if (taskTeamIdentity) {
      const updated = updateTaskTeamExecutionProjectionFromEvent(teamContext, message);
      return {
        outcome: 'handled',
        cleanupTaskTeamRunId: updated?.shouldCleanup ? updated.node.taskTeamRunId : null,
      };
    }
    const taskAgentIdentity = extractTaskAgentIdentity(message);
    if (taskAgentIdentity) {
      ensureTaskAgentContext(teamContext, taskAgentIdentity);
      return { outcome: 'handled', taskAgentIdentity };
    }
    return { outcome: 'handled' };
  }

  if (!hasTaskTeamScopedFields(message)) {
    return { outcome: 'continue' };
  }

  const scoped = resolveTaskTeamScopedMessage(teamContext, message);
  if (scoped.outcome === 'drop') {
    return { outcome: 'drop', reason: scoped.reason };
  }
  if (scoped.outcome === 'none') {
    return { outcome: 'continue' };
  }
  if (scoped.outcome === 'root') {
    if (message.type === 'TEAM_STATUS') {
      const shouldCleanup = updateTaskTeamRootStatus(teamContext, scoped.taskTeamRunId, message.payload.status);
      return {
        outcome: 'handled',
        cleanupTaskTeamRunId: shouldCleanup ? scoped.taskTeamRunId : null,
      };
    }
    return { outcome: 'handled' };
  }

  ensureRootForScopedChild(teamContext, scoped.identity);
  const childProjection = ensureTaskTeamChildProjection(teamContext, scoped.identity);
  if (!childProjection) {
    return { outcome: 'drop', reason: 'Task-team scoped child projection could not be resolved.' };
  }
  updateTaskTeamChildStatus(childProjection.node, message);

  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    const scopedTaskAgentIdentity = toScopedTaskAgentIdentity(taskAgentIdentity, scoped.identity);
    const taskAgentContext = ensureTaskAgentContext(teamContext, scopedTaskAgentIdentity);
    return {
      outcome: 'memberContext',
      context: taskAgentContext,
      taskAgentIdentity: scopedTaskAgentIdentity,
    };
  }

  if (childProjection.context) {
    return { outcome: 'memberContext', context: childProjection.context };
  }
  return { outcome: 'handled' };
};
