import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import {
  applyTaskAgentDelegationDetails,
  ensureTaskAgentProjection,
  extractTaskAgentIdentity,
  type TaskAgentStreamIdentity,
} from './teamTaskAgentContextProjection';
import {
  ensureTaskTeamExecutionProjection,
  extractTaskTeamIdentity,
  updateTaskTeamExecutionProjectionFromEvent,
} from './teamTaskTeamExecutionProjection';
import {
  ensureTaskTeamChildProjection,
  hasTaskTeamScopedFields,
  resolveTaskTeamScopedMessage,
  updateTaskTeamChildStatus,
  type TaskTeamChildMemberProjectionIdentity,
} from './teamTaskTeamChildProjection';
import {
  extractTaskDelegationProjectionDetails,
  mergeTaskExecutionProjectionMutations,
  NO_TASK_EXECUTION_PROJECTION_MUTATION,
  type TaskExecutionProjectionMutation,
} from './teamTaskExecutionProjection';

interface TaskProjectionResultBase {
  mutation: TaskExecutionProjectionMutation;
}

export type TaskExecutionProjectionMessageResult =
  | (TaskProjectionResultBase & { outcome: 'continue'; taskAgentIdentity?: TaskAgentStreamIdentity | null })
  | (TaskProjectionResultBase & {
      outcome: 'handled';
      taskAgentIdentity?: TaskAgentStreamIdentity | null;
      cleanupTaskTeamRunId?: string | null;
    })
  | (TaskProjectionResultBase & { outcome: 'drop'; reason: string })
  | (TaskProjectionResultBase & {
      outcome: 'memberContext';
      context: AgentContext;
      memberRouteKey: string;
      taskAgentIdentity?: TaskAgentStreamIdentity | null;
    });

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
      {
        kind: 'member' as const,
        memberRouteKey: childIdentity.logicalTeamRouteKey ?? childIdentity.logicalTeamPath.join('/'),
      },
      { kind: 'task_team' as const, taskTeamRunId: childIdentity.parentTaskTeamRunId },
      { kind: 'member' as const, memberRouteKey: childIdentity.relativeMemberRouteKey },
    ]),
    { kind: 'task_agent' as const, taskAgentRunId: taskAgentIdentity.taskAgentRunId },
  ],
});

const ensureRootForScopedChild = (
  teamContext: AgentTeamContext,
  identity: TaskTeamChildMemberProjectionIdentity,
): TaskExecutionProjectionMutation => {
  if (teamContext.memberNodesByRouteKey.get(identity.parentTaskTeamRunId)?.isTaskTeamInstance) {
    return NO_TASK_EXECUTION_PROJECTION_MUTATION;
  }
  return ensureTaskTeamExecutionProjection(teamContext, {
    taskTeamRunId: identity.parentTaskTeamRunId,
    taskTeamInstanceId: identity.parentTaskTeamInstanceId,
    taskId: identity.parentTaskId,
    logicalTeamRouteKey: identity.logicalTeamRouteKey,
    logicalTeamPath: [...identity.logicalTeamPath],
    conversationTargetSegments: identity.conversationTargetSegments?.slice(0, 2),
  }, 'active').mutation;
};

const handleTaskTeamScopedProjectionMessage = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult | null => {
  if (!hasTaskTeamScopedFields(message)) return null;
  const scoped = resolveTaskTeamScopedMessage(teamContext, message);
  if (scoped.outcome === 'drop') {
    return { outcome: 'drop', reason: scoped.reason, mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }
  if (scoped.outcome === 'none') {
    return { outcome: 'continue', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }
  if (scoped.outcome === 'root') {
    return { outcome: 'handled', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }

  let mutation = ensureRootForScopedChild(teamContext, scoped.identity);
  const child = ensureTaskTeamChildProjection(teamContext, scoped.identity);
  if (!child) {
    return {
      outcome: 'drop',
      reason: 'Task-team scoped child projection could not be resolved.',
      mutation,
    };
  }
  mutation = mergeTaskExecutionProjectionMutations(mutation, child.mutation);
  mutation = mergeTaskExecutionProjectionMutations(
    mutation,
    updateTaskTeamChildStatus(teamContext, child.node, message),
  );

  const extractedTaskAgentIdentity = extractTaskAgentIdentity(message);
  if (extractedTaskAgentIdentity) {
    const identity = toScopedTaskAgentIdentity(extractedTaskAgentIdentity, scoped.identity);
    const ensured = ensureTaskAgentProjection(teamContext, identity);
    applyTaskAgentDelegationDetails(
      teamContext,
      identity.taskAgentRunId,
      extractTaskDelegationProjectionDetails(message),
    );
    return {
      outcome: 'memberContext',
      context: ensured.context,
      memberRouteKey: identity.taskAgentRunId,
      taskAgentIdentity: identity,
      mutation: mergeTaskExecutionProjectionMutations(mutation, ensured.mutation),
    };
  }
  if (child.context) {
    return {
      outcome: 'memberContext',
      context: child.context,
      memberRouteKey: scoped.identity.scopedMemberRouteKey,
      mutation,
    };
  }
  return { outcome: 'handled', mutation };
};

export const handleTaskExecutionProjectionMessage = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TaskExecutionProjectionMessageResult => {
  if (message.type === 'TASK_DELEGATION_EVENT') {
    if (extractTaskTeamIdentity(message)) {
      const updated = updateTaskTeamExecutionProjectionFromEvent(teamContext, message);
      return {
        outcome: 'handled',
        cleanupTaskTeamRunId: updated?.shouldCleanup ? updated.node.taskTeamRunId : null,
        mutation: updated?.mutation ?? NO_TASK_EXECUTION_PROJECTION_MUTATION,
      };
    }
    const scoped = handleTaskTeamScopedProjectionMessage(teamContext, message);
    if (scoped) {
      return scoped.outcome === 'memberContext'
        ? {
            outcome: 'handled',
            taskAgentIdentity: scoped.taskAgentIdentity,
            mutation: scoped.mutation,
          }
        : scoped;
    }
    const identity = extractTaskAgentIdentity(message);
    if (identity) {
      const ensured = ensureTaskAgentProjection(teamContext, identity);
      applyTaskAgentDelegationDetails(
        teamContext,
        identity.taskAgentRunId,
        extractTaskDelegationProjectionDetails(message),
      );
      return { outcome: 'handled', taskAgentIdentity: identity, mutation: ensured.mutation };
    }
    return { outcome: 'handled', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
  }

  const scoped = handleTaskTeamScopedProjectionMessage(teamContext, message);
  if (scoped) return scoped;
  const identity = extractTaskAgentIdentity(message);
  if (identity) {
    const ensured = ensureTaskAgentProjection(teamContext, identity);
    return {
      outcome: 'memberContext',
      context: ensured.context,
      memberRouteKey: identity.taskAgentRunId,
      taskAgentIdentity: identity,
      mutation: ensured.mutation,
    };
  }
  return { outcome: 'continue', mutation: NO_TASK_EXECUTION_PROJECTION_MUTATION };
};
