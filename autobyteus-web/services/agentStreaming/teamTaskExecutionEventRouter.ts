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
  parentLogicalTeamRouteKey: childIdentity.logicalTeamRouteKey,
  parentLogicalTeamPath: [...childIdentity.logicalTeamPath],
  conversationTargetSegments: [
    ...(childIdentity.conversationTargetSegments ?? [
      { kind: 'member' as const, memberRouteKey: childIdentity.logicalTeamRouteKey ?? childIdentity.logicalTeamPath.join('/') },
      { kind: 'task_team' as const, taskTeamRunId: childIdentity.parentTaskTeamRunId },
      { kind: 'member' as const, memberRouteKey: childIdentity.relativeMemberRouteKey },
    ]),
    { kind: 'task_agent' as const, taskAgentRunId: taskAgentIdentity.taskAgentRunId },
  ],
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
    conversationTargetSegments: identity.conversationTargetSegments
      ? identity.conversationTargetSegments.slice(0, 2)
      : undefined,
  }, 'active');
};

const handleTaskTeamScopedProjectionMessage = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult | null => {
  if (!hasTaskTeamScopedFields(message)) {
    return null;
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

    const scopedResult = handleTaskTeamScopedProjectionMessage(teamContext, message);
    if (scopedResult) {
      if (scopedResult.outcome === 'memberContext') {
        return {
          outcome: 'handled',
          taskAgentIdentity: scopedResult.taskAgentIdentity,
          cleanupTaskTeamRunId: scopedResult.cleanupTaskTeamRunId,
        };
      }
      return scopedResult;
    }

    const taskAgentIdentity = extractTaskAgentIdentity(message);
    if (taskAgentIdentity) {
      ensureTaskAgentContext(teamContext, taskAgentIdentity);
      return { outcome: 'handled', taskAgentIdentity };
    }
    return { outcome: 'handled' };
  }

  return handleTaskTeamScopedProjectionMessage(teamContext, message) ?? { outcome: 'continue' };
};
