/**
 * Status and other event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles AGENT_STATUS,
 * TODO_LIST_UPDATE, and ERROR events.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { ErrorSegment, ToolInvocationLifecycle } from '~/types/segments';
import type { 
  AgentStatusPayload, 
  ErrorPayload,
  AssistantCompletePayload,
} from '../protocol/messageTypes';
import { findOrCreateAIMessage, findSegmentById } from './segmentHandler';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useAgentActivityStore } from '~/stores/agentActivityStore';


/**
 * Handle AGENT_STATUS event.
 */
export function handleAgentStatus(
  payload: AgentStatusPayload,
  context: AgentContext
): void {
  const normalizedStatus = String(payload.new_status || AgentStatus.Uninitialized).toLowerCase();
  context.state.currentStatus = normalizedStatus as AgentStatus;
  
  const shouldStopSending = [
    AgentStatus.Idle,
    AgentStatus.Error,
    AgentStatus.ShutdownComplete,
  ].includes(normalizedStatus as AgentStatus);

  // If status indicates completion, mark the current AI message as complete
  if (normalizedStatus === AgentStatus.Idle) {
    const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
    if (lastMessage?.type === 'ai') {
      lastMessage.isComplete = true;
    }
  }

  if (shouldStopSending) {
    context.isSending = false;
  }
}

/**
 * Handle ASSISTANT_COMPLETE event.
 * Marks the current AI message as complete so the next response starts a new message.
 */
export function handleAssistantComplete(
  _payload: AssistantCompletePayload,
  context: AgentContext
): void {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  if (lastMessage?.type === 'ai') {
    lastMessage.isComplete = true;
  }
}



/**
 * Handle ERROR event.
 */
export function handleError(
  payload: ErrorPayload,
  context: AgentContext
): void {
  const toolErrorInfo = parseToolExecutionError(payload.message);
  if (toolErrorInfo && applyToolError(toolErrorInfo, context)) {
    markConversationComplete(context);
    return;
  }

  const aiMessage = findOrCreateAIMessage(context);

  const errorSegment: ErrorSegment = {
    type: 'error',
    source: payload.code,
    message: payload.message,
  };

  aiMessage.segments.push(errorSegment);
  aiMessage.isComplete = true;
  context.isSending = false;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ToolErrorInfo {
  invocationId: string;
  toolName?: string;
  message: string;
}

function parseToolExecutionError(message: string): ToolErrorInfo | null {
  // Backend tool execution errors are typically formatted as:
  // "Error executing tool 'tool_name' (ID: invocation_id): <details>"
  const match = message.match(
    /^Error executing tool ['"](.+?)['"] \(ID: ([^)]+)\):\s*([\s\S]*)$/
  );
  if (!match) return null;

  return {
    toolName: match[1],
    invocationId: match[2],
    message,
  };
}

function applyToolError(info: ToolErrorInfo, context: AgentContext): boolean {
  const segment = findSegmentById(context, info.invocationId);
  if (
    !segment ||
    !['tool_call', 'write_file', 'terminal_command', 'edit_file'].includes(segment.type)
  ) {
    return false;
  }

  const toolSegment = segment as ToolInvocationLifecycle;
  toolSegment.status = 'error';
  toolSegment.error = info.message;
  toolSegment.result = null;
  if (Array.isArray(toolSegment.logs) && !toolSegment.logs.includes(info.message)) {
    toolSegment.logs.push(info.message);
  }
  if (!toolSegment.toolName && info.toolName) {
    toolSegment.toolName = info.toolName;
  }

  const activityStore = useAgentActivityStore();
  const agentRunId = context.state.runId;
  activityStore.updateActivityStatus(agentRunId, info.invocationId, 'error');
  activityStore.setActivityResult(agentRunId, info.invocationId, null, info.message);

  const activity = activityStore
    .getActivities(agentRunId)
    .find((item) => item.invocationId === info.invocationId);
  if (activity && !activity.logs.includes(info.message)) {
    activityStore.addActivityLog(agentRunId, info.invocationId, info.message);
  }

  return true;
}

function markConversationComplete(context: AgentContext): void {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  if (lastMessage?.type === 'ai') {
    lastMessage.isComplete = true;
  }
  context.isSending = false;
}
