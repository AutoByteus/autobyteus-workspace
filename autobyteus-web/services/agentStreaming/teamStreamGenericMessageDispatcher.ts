import type { AgentContext } from '~/types/agent/AgentContext';
import type { ServerMessage } from './protocol';
import {
  handleSegmentStart,
  handleSegmentContent,
  handleSegmentEnd,
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
  handleExternalUserMessage,
  handleMemberInputMessage,
  handleTodoListUpdate,
  handleError,
  handleInterAgentMessage,
  handleSystemTaskNotification,
  handleFileChange,
} from './handlers';
import { handleBrowserToolExecutionSucceeded } from './browser/browserToolExecutionSucceededHandler';
import {
  beginRecentEventMonitorMutation,
  commitRecentEventMonitorMutation,
} from '~/services/eventMonitor/recentEventMonitorMutationCommit';

export const dispatchGenericTeamMemberMessage = (
  message: ServerMessage,
  memberContext: AgentContext,
): void => {
  const presentationBaseline = beginRecentEventMonitorMutation(memberContext);
  memberContext.conversation.updatedAt = new Date().toISOString();
  switch (message.type) {
    case 'SEGMENT_START':
      handleSegmentStart(message.payload, memberContext);
      break;
    case 'SEGMENT_CONTENT':
      handleSegmentContent(message.payload, memberContext);
      break;
    case 'SEGMENT_END':
      handleSegmentEnd(message.payload, memberContext);
      break;
    case 'TOOL_APPROVAL_REQUESTED':
      handleToolApprovalRequested(message.payload, memberContext);
      break;
    case 'TOOL_APPROVED':
      handleToolApproved(message.payload, memberContext);
      break;
    case 'TOOL_DENIED':
      handleToolDenied(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_STARTED':
      handleToolExecutionStarted(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_SUCCEEDED':
      handleToolExecutionSucceeded(message.payload, memberContext);
      void handleBrowserToolExecutionSucceeded(message.payload);
      break;
    case 'TOOL_EXECUTION_FAILED':
      handleToolExecutionFailed(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_INTERRUPTED':
      handleToolExecutionInterrupted(message.payload, memberContext);
      break;
    case 'TOOL_LOG':
      handleToolLog(message.payload, memberContext);
      break;
    case 'AGENT_STATUS':
      handleAgentStatus(message.payload, memberContext);
      break;
    case 'COMPACTION_STATUS':
      handleCompactionStatus(message.payload, memberContext);
      break;
    case 'TOKEN_USAGE_UPDATED':
      handleTokenUsageUpdated(message.payload, memberContext);
      break;
    case 'TURN_STARTED':
      break;
    case 'TURN_COMPLETED':
      handleTurnCompleted(message.payload, memberContext);
      break;
    case 'TURN_INTERRUPTED':
      handleTurnInterrupted(message.payload, memberContext);
      break;
    case 'ASSISTANT_COMPLETE':
      handleAssistantComplete(message.payload, memberContext);
      break;
    case 'EXTERNAL_USER_MESSAGE':
      handleExternalUserMessage(message.payload, memberContext);
      break;
    case 'MEMBER_INPUT_MESSAGE':
      handleMemberInputMessage(message.payload, memberContext);
      break;
    case 'TODO_LIST_UPDATE':
      handleTodoListUpdate(message.payload, memberContext);
      break;
    case 'ERROR':
      handleError(message.payload, memberContext);
      break;
    case 'INTER_AGENT_MESSAGE':
      handleInterAgentMessage(message.payload, memberContext);
      break;
    case 'SYSTEM_TASK_NOTIFICATION':
      handleSystemTaskNotification(message.payload, memberContext);
      break;
    case 'FILE_CHANGE':
      handleFileChange(message.payload, memberContext);
      break;
    case 'CONNECTED':
      break;
    default:
      console.warn('Unhandled team message type:', (message as any).type);
  }
  commitRecentEventMonitorMutation(memberContext, presentationBaseline);
};
