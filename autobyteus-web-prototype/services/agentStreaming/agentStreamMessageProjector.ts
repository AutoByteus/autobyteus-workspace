import type { AgentContext } from '~/types/agent/AgentContext';
import type { ServerMessage } from './protocol';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import {
  handleSegmentStart,
  handleSegmentContent,
  handleSegmentEnd,
  handleExternalUserMessage,
  handleMemberInputMessage,
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolDenied,
  handleToolExecutionStarted,
  handleToolExecutionSucceeded,
  handleToolExecutionFailed,
  handleToolExecutionInterrupted,
  handleToolLog,
  handleAgentStatus,
  handleCompactionStatus,
  handleTokenUsageUpdated,
  handleAssistantComplete,
  handleTurnCompleted,
  handleTurnInterrupted,
  handleTodoListUpdate,
  handleError,
  handleInterAgentMessage,
  handleFileChange,
  handleSystemTaskNotification,
  handleSystemInstructionsSupplied,
} from './handlers';
import { handleBrowserToolExecutionSucceeded } from './browser/browserToolExecutionSucceededHandler';
import {
  NO_AGENT_STREAM_MUTATION,
  conversationMutationEffects,
  mergeAgentStreamMutationEffects,
  presentationMutationEffects,
  type AgentStreamMutationEffects,
  type RecentEventMonitorEffect,
} from './agentStreamMutationEffects';
import { commitRecentEventMonitorEffect } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

export type AgentStreamProjectionTarget =
  | { kind: 'standalone'; context: AgentContext; runId: string }
  | {
      kind: 'team_member';
      context: AgentContext;
      teamRunId: string;
      agentRunId: string;
      memberAddress: AgentTeamAddress;
    };

const conversationResult = (
  changed: boolean,
  eventMonitor: RecentEventMonitorEffect,
): AgentStreamMutationEffects => changed
  ? {
      ...conversationMutationEffects(eventMonitor === 'NONE' ? 'PRESENTATION' : eventMonitor),
      eventMonitor,
    }
  : NO_AGENT_STREAM_MUTATION;

const dispatchToHandler = (
  message: ServerMessage,
  context: AgentContext,
): AgentStreamMutationEffects => {
  switch (message.type) {
    case 'SYSTEM_INSTRUCTIONS_SUPPLIED':
      return handleSystemInstructionsSupplied(message.payload, context)
        ? presentationMutationEffects()
        : NO_AGENT_STREAM_MUTATION;
    case 'SEGMENT_START': {
      const effect = handleSegmentStart(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'SEGMENT_CONTENT': {
      const effect = handleSegmentContent(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'SEGMENT_END': {
      const effect = handleSegmentEnd(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'EXTERNAL_USER_MESSAGE':
      return conversationResult(handleExternalUserMessage(message.payload, context), 'STRUCTURAL');
    case 'MEMBER_INPUT_MESSAGE':
      return conversationResult(handleMemberInputMessage(message.payload, context), 'STRUCTURAL');
    case 'TOOL_APPROVAL_REQUESTED':
    case 'TOOL_APPROVED':
    case 'TOOL_DENIED':
    case 'TOOL_EXECUTION_STARTED':
    case 'TOOL_EXECUTION_SUCCEEDED':
    case 'TOOL_EXECUTION_FAILED':
    case 'TOOL_EXECUTION_INTERRUPTED':
    case 'TOOL_LOG': {
      const result = message.type === 'TOOL_APPROVAL_REQUESTED'
        ? handleToolApprovalRequested(message.payload, context)
        : message.type === 'TOOL_APPROVED'
          ? handleToolApproved(message.payload, context)
          : message.type === 'TOOL_DENIED'
            ? handleToolDenied(message.payload, context)
            : message.type === 'TOOL_EXECUTION_STARTED'
              ? handleToolExecutionStarted(message.payload, context)
              : message.type === 'TOOL_EXECUTION_SUCCEEDED'
                ? handleToolExecutionSucceeded(message.payload, context)
                : message.type === 'TOOL_EXECUTION_FAILED'
                  ? handleToolExecutionFailed(message.payload, context)
                  : message.type === 'TOOL_EXECUTION_INTERRUPTED'
                    ? handleToolExecutionInterrupted(message.payload, context)
                    : handleToolLog(message.payload, context);
      if (message.type === 'TOOL_EXECUTION_SUCCEEDED') {
        void handleBrowserToolExecutionSucceeded(message.payload);
      }
      return conversationResult(result.conversationChanged, result.eventMonitor);
    }
    case 'AGENT_STATUS': {
      const result = handleAgentStatus(message.payload, context);
      return mergeAgentStreamMutationEffects(
        result.statusChanged ? presentationMutationEffects() : NO_AGENT_STREAM_MUTATION,
        conversationResult(result.conversationEffect !== 'NONE', result.conversationEffect),
      );
    }
    case 'AGENT_COMMAND_ACK': {
      if (message.payload.command_type !== 'SEND_MESSAGE') return NO_AGENT_STREAM_MUTATION;
      let effects = NO_AGENT_STREAM_MUTATION;
      if (message.payload.status) {
        const result = handleAgentStatus(message.payload.status, context);
        effects = mergeAgentStreamMutationEffects(
          effects,
          result.statusChanged ? presentationMutationEffects() : NO_AGENT_STREAM_MUTATION,
        );
        effects = mergeAgentStreamMutationEffects(
          effects,
          conversationResult(result.conversationEffect !== 'NONE', result.conversationEffect),
        );
      }
      if (!message.payload.accepted) {
        const eventMonitor = handleError({
          code: message.payload.code ?? 'AGENT_COMMAND_REJECTED',
          message: message.payload.message ?? 'Agent command was not accepted.',
          error_scope: null,
          error_effect: null,
          turn_id: null,
        }, context);
        effects = mergeAgentStreamMutationEffects(
          effects,
          conversationResult(eventMonitor !== 'NONE', eventMonitor),
        );
      }
      return effects;
    }
    case 'COMPACTION_STATUS': {
      const result = handleCompactionStatus(message.payload, context);
      return {
        ...(result.conversationChanged
          ? conversationMutationEffects('STRUCTURAL')
          : NO_AGENT_STREAM_MUTATION),
        eventMonitor: result.eventMonitor,
      };
    }
    case 'TOKEN_USAGE_UPDATED':
      return handleTokenUsageUpdated(message.payload, context)
        ? { ...NO_AGENT_STREAM_MUTATION, eventMonitor: 'PRESENTATION' }
        : NO_AGENT_STREAM_MUTATION;
    case 'TURN_COMPLETED': {
      const effect = handleTurnCompleted(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'TURN_INTERRUPTED': {
      const effect = handleTurnInterrupted(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'ASSISTANT_COMPLETE': {
      const effect = handleAssistantComplete(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'ERROR': {
      const effect = handleError(message.payload, context);
      return conversationResult(effect !== 'NONE', effect);
    }
    case 'INTER_AGENT_MESSAGE':
      return conversationResult(handleInterAgentMessage(message.payload, context), 'STRUCTURAL');
    case 'SYSTEM_TASK_NOTIFICATION':
      return conversationResult(handleSystemTaskNotification(message.payload, context), 'STRUCTURAL');
    case 'TODO_LIST_UPDATE':
      handleTodoListUpdate(message.payload, context);
      return NO_AGENT_STREAM_MUTATION;
    case 'FILE_CHANGE':
      handleFileChange(message.payload, context);
      return NO_AGENT_STREAM_MUTATION;
    case 'TURN_STARTED':
    case 'CONNECTED':
    case 'ARTIFACT_PERSISTED':
      return NO_AGENT_STREAM_MUTATION;
    default:
      console.warn('Unhandled agent stream message type:', (message as { type: string }).type);
      return NO_AGENT_STREAM_MUTATION;
  }
};

export const dispatchAgentStreamMessage = (
  message: ServerMessage,
  target: AgentStreamProjectionTarget,
): AgentStreamMutationEffects => {
  const effects = dispatchToHandler(message, target.context);
  if (effects.conversationChanged) {
    const occurredAt = effects.navigation.kind === 'ACTIVITY'
      ? effects.navigation.occurredAt
      : new Date().toISOString();
    target.context.conversation.updatedAt = occurredAt;
  }
  commitRecentEventMonitorEffect(target.context, effects.eventMonitor);
  if (effects.navigation.kind !== 'NONE') {
    const currentStatus = target.context.state.currentStatus;
    useRunHistoryStore().applyRunNavigationEffect(
      target.kind === 'standalone'
        ? { kind: 'standalone', runId: target.runId, currentStatus }
        : {
            kind: 'team_member',
            teamRunId: target.teamRunId,
            agentRunId: target.agentRunId,
            currentStatus,
          },
      effects.navigation,
    );
  }
  return effects;
};
