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
  commitRecentEventMonitorMutation,
  type EventMonitorPresentationMutation,
} from '~/services/eventMonitor/recentEventMonitorWindow';

export const dispatchGenericTeamMemberMessage = (
  message: ServerMessage,
  memberContext: AgentContext,
): void => {
  memberContext.conversation.updatedAt = new Date().toISOString();
  let presentationEffect: EventMonitorPresentationMutation = 'none';
  switch (message.type) {
    case 'SEGMENT_START':
      presentationEffect = handleSegmentStart(message.payload, memberContext);
      break;
    case 'SEGMENT_CONTENT':
      presentationEffect = handleSegmentContent(message.payload, memberContext);
      break;
    case 'SEGMENT_END':
      presentationEffect = handleSegmentEnd(message.payload, memberContext);
      break;
    case 'TOOL_APPROVAL_REQUESTED':
      presentationEffect = handleToolApprovalRequested(message.payload, memberContext);
      break;
    case 'TOOL_APPROVED':
      presentationEffect = handleToolApproved(message.payload, memberContext);
      break;
    case 'TOOL_DENIED':
      presentationEffect = handleToolDenied(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_STARTED':
      presentationEffect = handleToolExecutionStarted(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_SUCCEEDED':
      presentationEffect = handleToolExecutionSucceeded(message.payload, memberContext);
      void handleBrowserToolExecutionSucceeded(message.payload);
      break;
    case 'TOOL_EXECUTION_FAILED':
      presentationEffect = handleToolExecutionFailed(message.payload, memberContext);
      break;
    case 'TOOL_EXECUTION_INTERRUPTED':
      presentationEffect = handleToolExecutionInterrupted(message.payload, memberContext);
      break;
    case 'TOOL_LOG':
      presentationEffect = handleToolLog(message.payload, memberContext);
      break;
    case 'AGENT_STATUS':
      presentationEffect = handleAgentStatus(message.payload, memberContext);
      break;
    case 'COMPACTION_STATUS':
      presentationEffect = handleCompactionStatus(message.payload, memberContext);
      break;
    case 'TOKEN_USAGE_UPDATED':
      handleTokenUsageUpdated(message.payload, memberContext);
      break;
    case 'TURN_STARTED':
      break;
    case 'TURN_COMPLETED':
      presentationEffect = handleTurnCompleted(message.payload, memberContext);
      break;
    case 'TURN_INTERRUPTED':
      presentationEffect = handleTurnInterrupted(message.payload, memberContext);
      break;
    case 'ASSISTANT_COMPLETE':
      presentationEffect = handleAssistantComplete(message.payload, memberContext);
      break;
    case 'EXTERNAL_USER_MESSAGE':
      presentationEffect = handleExternalUserMessage(message.payload, memberContext);
      break;
    case 'MEMBER_INPUT_MESSAGE':
      presentationEffect = handleMemberInputMessage(message.payload, memberContext);
      break;
    case 'TODO_LIST_UPDATE':
      handleTodoListUpdate(message.payload, memberContext);
      break;
    case 'ERROR':
      presentationEffect = handleError(message.payload, memberContext);
      break;
    case 'INTER_AGENT_MESSAGE':
      presentationEffect = handleInterAgentMessage(message.payload, memberContext);
      break;
    case 'SYSTEM_TASK_NOTIFICATION':
      presentationEffect = handleSystemTaskNotification(message.payload, memberContext);
      break;
    case 'FILE_CHANGE':
      handleFileChange(message.payload, memberContext);
      break;
    case 'CONNECTED':
      break;
    default:
      console.warn('Unhandled team message type:', (message as any).type);
  }
  commitRecentEventMonitorMutation(memberContext, presentationEffect);
};
