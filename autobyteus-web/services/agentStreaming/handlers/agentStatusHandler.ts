/**
 * Status and other event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles AGENT_STATUS,
 * TODO_LIST_UPDATE, and ERROR events.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { ErrorSegment, ToolInvocationLifecycle, MediaSegment } from '~/types/segments';
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
  payload: AssistantCompletePayload,
  context: AgentContext
): void {
  hydrateAssistantCompleteFallbackSegments(payload, context);
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
  const agentId = context.state.agentId;
  activityStore.updateActivityStatus(agentId, info.invocationId, 'error');
  activityStore.setActivityResult(agentId, info.invocationId, null, info.message);

  const activity = activityStore
    .getActivities(agentId)
    .find((item) => item.invocationId === info.invocationId);
  if (activity && !activity.logs.includes(info.message)) {
    activityStore.addActivityLog(agentId, info.invocationId, info.message);
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

function hydrateAssistantCompleteFallbackSegments(
  payload: AssistantCompletePayload,
  context: AgentContext,
): void {
  const textContent =
    typeof payload.content === 'string' && payload.content.trim().length > 0
      ? payload.content
      : null;
  const imageUrls = normalizeUrlList(payload.image_urls);
  const audioUrls = normalizeUrlList(payload.audio_urls);
  const videoUrls = normalizeUrlList(payload.video_urls);

  if (!textContent && imageUrls.length === 0 && audioUrls.length === 0 && videoUrls.length === 0) {
    return;
  }

  const aiMessage = findOrCreateAIMessage(context);

  if (textContent && !hasNonEmptyTextSegment(aiMessage.segments)) {
    aiMessage.segments.push({
      type: 'text',
      content: textContent,
    });
  }

  appendMediaSegmentIfMissing(aiMessage.segments, 'image', imageUrls);
  appendMediaSegmentIfMissing(aiMessage.segments, 'audio', audioUrls);
  appendMediaSegmentIfMissing(aiMessage.segments, 'video', videoUrls);
}

function hasNonEmptyTextSegment(segments: Array<{ type: string; content?: string }>): boolean {
  return segments.some(
    (segment) => segment.type === 'text' && typeof segment.content === 'string' && segment.content.trim().length > 0,
  );
}

function normalizeUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function appendMediaSegmentIfMissing(
  segments: Array<{ type: string; mediaType?: string; urls?: string[] }>,
  mediaType: MediaSegment['mediaType'],
  urls: string[],
): void {
  if (urls.length === 0) {
    return;
  }
  const alreadyPresent = segments.some(
    (segment) =>
      segment.type === 'media' &&
      segment.mediaType === mediaType &&
      Array.isArray(segment.urls) &&
      segment.urls.length > 0,
  );
  if (alreadyPresent) {
    return;
  }
  segments.push({
    type: 'media',
    mediaType,
    urls,
  });
}
