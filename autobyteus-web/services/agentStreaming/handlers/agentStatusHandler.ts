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
  CompactionStatusPayload,
  ErrorPayload,
  AssistantCompletePayload,
  TurnLifecyclePayload,
} from '../protocol/messageTypes';
import { findOrCreateAIMessage, findSegmentById } from './segmentHandler';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { isCenterFeedCompactionPhase, projectCompactionStatusToActivity } from './compactionActivityProjection';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { applyLiveAgentStatusEvent } from '~/services/runStatus/agentRuntimeStatusState';
import {
  applyExecutionFailedState,
  applyExecutionInterruptedState,
  isTerminalStatus,
  type ToolLifecycleSegment,
} from './toolLifecycleState';
import { markStreamSegmentPresentationComplete } from './segmentIdentity';
import type { RecentEventMonitorEffect } from '../agentStreamMutationEffects';

export interface AgentStatusHandlerResult {
  statusChanged: boolean;
  conversationEffect: RecentEventMonitorEffect;
}

export interface CompactionStatusHandlerResult {
  conversationChanged: boolean;
  eventMonitor: RecentEventMonitorEffect;
}


/**
 * Handle AGENT_STATUS event.
 */
export function handleAgentStatus(
  payload: AgentStatusPayload,
  context: AgentContext
): AgentStatusHandlerResult {
  const statusChanged = applyLiveAgentStatusEvent(context, payload);
  let conversationEffect: RecentEventMonitorEffect = 'NONE';

  // If status indicates completion, mark the current AI message as complete.
  if (
    payload.status === AgentStatus.Idle ||
    payload.status === AgentStatus.Offline ||
    payload.status === AgentStatus.Error
  ) {
    conversationEffect = markConversationComplete(context) ? 'STRUCTURAL' : 'NONE';
  }
  return { statusChanged, conversationEffect };
}

/**
 * Handle ASSISTANT_COMPLETE event.
 * Marks the current AI message as complete so the next response starts a new message.
 */
export function handleAssistantComplete(
  _payload: AssistantCompletePayload,
  context: AgentContext
): RecentEventMonitorEffect {
  return markConversationComplete(context) ? 'STRUCTURAL' : 'NONE';
}

export function handleTurnCompleted(
  _payload: TurnLifecyclePayload,
  context: AgentContext
): RecentEventMonitorEffect {
  return markConversationComplete(context) ? 'STRUCTURAL' : 'NONE';
}

export function handleTurnInterrupted(
  payload: TurnLifecyclePayload,
  context: AgentContext
): RecentEventMonitorEffect {
  const changed = terminalizeOpenToolSegmentsForInterruptedTurn(payload, context);
  return markConversationComplete(context) || changed ? 'STRUCTURAL' : 'NONE';
}



export function handleCompactionStatus(
  payload: CompactionStatusPayload,
  context: AgentContext
): CompactionStatusHandlerResult {
  const previousStatus = context.state.compactionStatus;
  const projection = projectCompactionStatusToActivity(payload, {
    runId: context.state.runId,
    previousStatus,
  });
  context.state.compactionStatus = projection.status;

  const conversationChanged = shouldCloseCurrentAIMessageForCenterCompaction(
    projection.status,
    previousStatus,
  ) && markConversationComplete(context);

  const activityStore = useAgentActivityStore();
  const activityChanged = activityStore.upsertCompactionActivity(
    context.state.runId,
    projection.activity,
  );
  const eventMonitor = conversationChanged || (
    activityChanged && isCenterFeedCompactionPhase(projection.status.phase)
  ) ? 'STRUCTURAL' : 'NONE';
  return { conversationChanged, eventMonitor };
}

/**
 * Handle ERROR event.
 */
export function handleError(
  payload: ErrorPayload,
  context: AgentContext
): RecentEventMonitorEffect {
  if (payload.error_effect === 'diagnostic') {
    const aiMessage = findOrCreateAIMessage(context);
    aiMessage.segments.push({ type: 'error', source: payload.code, message: payload.message });
    return 'STRUCTURAL';
  }
  const toolErrorInfo = parseToolExecutionError(payload.message);
  if (toolErrorInfo) {
    const changed = applyToolError(toolErrorInfo, context);
    return markConversationComplete(context) || changed ? 'STRUCTURAL' : 'NONE';
  }

  terminalizeOpenToolSegmentsForError(payload, context);

  const aiMessage = findOrCreateAIMessage(context);

  const errorSegment: ErrorSegment = {
    type: 'error',
    source: payload.code,
    message: payload.message,
  };

  aiMessage.segments.push(errorSegment);
  markConversationComplete(context);
  return 'STRUCTURAL';
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
  const wasChanged = toolSegment.status !== 'error'
    || toolSegment.error !== info.message
    || toolSegment.result !== null
    || (info.toolName && isPlaceholderToolName(toolSegment.toolName))
    || !toolSegment.logs.includes(info.message);
  if (!wasChanged) return false;
  toolSegment.status = 'error';
  toolSegment.error = info.message;
  toolSegment.result = null;
  if (Array.isArray(toolSegment.logs) && !toolSegment.logs.includes(info.message)) {
    toolSegment.logs.push(info.message);
  }
  if (info.toolName && isPlaceholderToolName(toolSegment.toolName)) {
    toolSegment.toolName = info.toolName;
  }

  const activityStore = useAgentActivityStore();
  const agentRunId = context.state.runId;
  if (info.toolName) {
    activityStore.updateToolActivityToolName(agentRunId, info.invocationId, info.toolName);
  }
  activityStore.updateToolActivityStatus(agentRunId, info.invocationId, 'error');
  activityStore.setToolActivityResult(agentRunId, info.invocationId, null, info.message);

  const activity = activityStore
    .getToolActivities(agentRunId)
    .find((item) => item.invocationId === info.invocationId);
  if (activity && !activity.logs.includes(info.message)) {
    activityStore.addToolActivityLog(agentRunId, info.invocationId, info.message);
  }

  return true;
}

function markConversationComplete(context: AgentContext): boolean {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  if (lastMessage?.type === 'ai') {
    let changed = false;
    for (const segment of lastMessage.segments ?? []) {
      changed = markStreamSegmentPresentationComplete(segment) || changed;
    }
    if (!lastMessage.isComplete) {
      lastMessage.isComplete = true;
      changed = true;
    }
    return changed;
  }
  return false;
}

function shouldCloseCurrentAIMessageForCenterCompaction(
  status: NonNullable<AgentContext['state']['compactionStatus']>,
  previousStatus: AgentContext['state']['compactionStatus'],
): boolean {
  if (!isCenterFeedCompactionPhase(status.phase)) {
    return false;
  }
  if (previousStatus?.activityId !== status.activityId) {
    return true;
  }
  return previousStatus !== null && !isCenterFeedCompactionPhase(previousStatus.phase);
}

function isToolLifecycleSegment(segment: unknown): segment is ToolLifecycleSegment {
  if (!segment || typeof segment !== 'object') {
    return false;
  }
  const type = (segment as { type?: string }).type;
  return type === 'tool_call' || type === 'write_file' || type === 'terminal_command' || type === 'edit_file';
}

function terminalizeOpenToolSegmentsForInterruptedTurn(
  payload: TurnLifecyclePayload,
  context: AgentContext,
): boolean {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  if (lastMessage?.type !== 'ai') {
    return false;
  }

  const rawReason = (payload as { reason?: unknown }).reason;
  const reason =
    typeof rawReason === 'string' && rawReason.trim().length > 0
      ? rawReason.trim()
      : 'interrupted';
  const activityStore = useAgentActivityStore();
  let changed = false;

  for (const segment of lastMessage.segments) {
    if (!isToolLifecycleSegment(segment) || isTerminalStatus(segment.status)) {
      continue;
    }

    const transitioned = applyExecutionInterruptedState(segment, reason);
    if (!transitioned) {
      continue;
    }
    changed = true;

    activityStore.updateToolActivityStatus(context.state.runId, segment.invocationId, 'interrupted');
    activityStore.setToolActivityResult(context.state.runId, segment.invocationId, null, segment.error);
  }
  return changed;
}

function terminalizeOpenToolSegmentsForError(
  payload: ErrorPayload,
  context: AgentContext,
): boolean {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  if (lastMessage?.type !== 'ai') {
    return false;
  }

  const error =
    typeof payload.message === 'string' && payload.message.trim().length > 0
      ? payload.message.trim()
      : 'stream_error';
  const activityStore = useAgentActivityStore();
  let changed = false;

  for (const segment of lastMessage.segments) {
    if (!isToolLifecycleSegment(segment) || isTerminalStatus(segment.status)) {
      continue;
    }

    const transitioned = applyExecutionFailedState(segment, error);
    if (!transitioned) {
      continue;
    }
    changed = true;

    activityStore.updateToolActivityStatus(context.state.runId, segment.invocationId, 'error');
    activityStore.setToolActivityResult(context.state.runId, segment.invocationId, null, segment.error);
  }
  return changed;
}
