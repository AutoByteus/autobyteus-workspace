/**
 * Segment event handlers - Business logic for SEGMENT_* events.
 * 
 * Layer 3 of the agent streaming architecture - pure functions that
 * handle segment lifecycle events and update AgentContext state.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { AIMessage } from '~/types/conversation';
import type { AIResponseSegment, ToolCallSegment, WriteFileSegment, TerminalCommandSegment, EditFileSegment, ThinkSegment, AIResponseTextSegment, ToolInvocationLifecycle } from '~/types/segments';
import type { SegmentStartPayload, SegmentContentPayload, SegmentEndPayload } from '../protocol/messageTypes';
import { createSegmentFromPayload, toSegmentMetadataRecord } from '../protocol/segmentTypes';
import {
  markStreamSegmentPresentationComplete,
  matchesStreamSegmentIdentity,
  matchesStreamSegmentType,
  setStreamSegmentIdentity,
} from './segmentIdentity';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { isProjectableToolSegment, upsertActivityFromToolSegment } from './toolActivityProjection';
import type { RecentEventMonitorEffect } from '../agentStreamMutationEffects';

function extractToolCallArgumentsFromMetadata(metadata?: Record<string, any> | null): Record<string, any> {
  const parseArgumentsCandidate = (value: unknown): Record<string, any> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Record<string, any>) };
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return {};
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        return {};
      }
    }
    return {};
  };

  const args = parseArgumentsCandidate(metadata?.arguments);

  if (typeof metadata?.query === 'string' && metadata.query.trim().length > 0 && typeof args.query !== 'string') {
    args.query = metadata.query;
  }
  if (Array.isArray(metadata?.queries) && !Array.isArray(args.queries)) {
    args.queries = metadata.queries;
  }

  return args;
}

/**
 * Handle SEGMENT_START event - creates a new segment and adds it to the current AI message.
 */
export function handleSegmentStart(
  payload: SegmentStartPayload,
  context: AgentContext
): RecentEventMonitorEffect {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_START with invalid id', payload);
    return 'NONE';
  }
  if (typeof payload.turn_id !== 'string' || payload.turn_id.trim().length === 0) return 'NONE';
  const existingSegment = findStreamSegment(context, payload.turn_id, payload.id);
  if (existingSegment) {
    if (!matchesStreamSegmentType(existingSegment, payload.segment_type)) return 'NONE';
    const changed = mergeSegmentStartMetadata(existingSegment, payload);
    if (isProjectableToolSegment(existingSegment)) {
      upsertActivityFromToolSegment(context, payload.id, existingSegment);
    }
    return changed ? 'PRESENTATION' : 'NONE';
  }
  const aiMessage = findOrCreateAIMessage(context);
  const segment = createSegmentFromPayload(payload);

  setStreamSegmentIdentity(segment, payload.turn_id, payload.id, payload.segment_type);
  mergeSegmentStartMetadata(segment, payload);

  aiMessage.segments.push(segment);
  if (isProjectableToolSegment(segment)) {
    upsertActivityFromToolSegment(context, payload.id, segment);
  }
  return 'STRUCTURAL';
}

function mergeSegmentStartMetadata(
  segment: AIResponseSegment,
  payload: SegmentStartPayload,
): boolean {
  const before = JSON.stringify(segment);
  const metadata = toSegmentMetadataRecord(payload.metadata);
  if (!metadata) {
    return false;
  }

  if (
    (segment.type === 'tool_call' ||
      segment.type === 'write_file' ||
      segment.type === 'terminal_command' ||
      segment.type === 'edit_file') &&
    metadata.tool_name &&
    isPlaceholderToolName(segment.toolName)
  ) {
    segment.toolName = String(metadata.tool_name);
  }

  if (segment.type === 'terminal_command') {
    const terminalSegment = segment as TerminalCommandSegment;
    if (!terminalSegment.command && typeof metadata.command === 'string' && metadata.command.trim().length > 0) {
      terminalSegment.command = metadata.command;
    }
    if (typeof metadata.command === 'string' && metadata.command.trim().length > 0) {
      terminalSegment.arguments = {
        ...terminalSegment.arguments,
        command: metadata.command,
      };
    }
    return JSON.stringify(segment) !== before;
  }

  if (segment.type === 'write_file') {
    const writeSegment = segment as WriteFileSegment;
    if (!writeSegment.path && typeof metadata.path === 'string') {
      writeSegment.path = metadata.path;
    }
    if (typeof metadata.path === 'string' && metadata.path.length > 0) {
      writeSegment.arguments = {
        ...writeSegment.arguments,
        path: metadata.path,
      };
    }
    return JSON.stringify(segment) !== before;
  }

  if (segment.type === 'edit_file') {
    const editSegment = segment as EditFileSegment;
    if (!editSegment.path && typeof metadata.path === 'string') {
      editSegment.path = metadata.path;
    }
    if (
      !editSegment.originalContent &&
      (typeof metadata.patch === 'string' || typeof metadata.diff === 'string')
    ) {
      editSegment.originalContent =
        typeof metadata.patch === 'string' ? metadata.patch : String(metadata.diff ?? '');
    }
    const patchValue =
      typeof metadata.patch === 'string'
        ? metadata.patch
        : typeof metadata.diff === 'string'
          ? metadata.diff
          : null;
    editSegment.arguments = {
      ...editSegment.arguments,
      ...(typeof metadata.path === 'string' ? { path: metadata.path } : {}),
      ...(patchValue ? { patch: patchValue } : {}),
    };
    return JSON.stringify(segment) !== before;
  }

  if (segment.type === 'tool_call') {
    const toolSegment = segment as ToolCallSegment;
    const metadataArgs = extractToolCallArgumentsFromMetadata(metadata);
    if (Object.keys(metadataArgs).length > 0) {
      toolSegment.arguments = {
        ...toolSegment.arguments,
        ...metadataArgs,
      };
    }
  }
  return JSON.stringify(segment) !== before;
}

/**
 * Handle SEGMENT_CONTENT event - appends delta content to the segment.
 */
export function handleSegmentContent(
  payload: SegmentContentPayload,
  context: AgentContext
): RecentEventMonitorEffect {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_CONTENT with invalid id', payload);
    return 'NONE';
  }
  if (typeof payload.turn_id !== 'string' || payload.turn_id.trim().length === 0) return 'NONE';
  const delta = typeof payload.delta === 'string' ? payload.delta : '';
  if (!delta) {
    return 'NONE';
  }
  let segment = findStreamSegment(context, payload.turn_id, payload.id);
  let segmentCreated = false;
  if (segment && !matchesStreamSegmentType(segment, payload.segment_type)) {
    return 'NONE';
  }
  if (!segment) {
    segment = createSyntheticSegmentFromContent(payload.id, payload.turn_id, payload.segment_type, context);
    segmentCreated = true;
  }

  const changed = appendContentToSegment(segment, delta) || segmentCreated;
  if (!changed) return 'NONE';
  return segmentCreated ? 'STRUCTURAL' : 'PRESENTATION';
}

/**
 * Handle SEGMENT_END event - finalizes the segment with any end metadata.
 */
export function handleSegmentEnd(
  payload: SegmentEndPayload,
  context: AgentContext
): RecentEventMonitorEffect {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_END with invalid id', payload);
    return 'NONE';
  }
  if (typeof payload.turn_id !== 'string' || payload.turn_id.trim().length === 0) return 'NONE';
  const segment = findStreamSegment(context, payload.turn_id, payload.id);
  if (!segment) {
    console.warn(`Segment not found for end event: ${payload.id}`);
    return 'NONE';
  }

  const before = JSON.stringify(segment);
  markStreamSegmentPresentationComplete(segment);

  if (segment.type === 'think') {
    const thinkSegment = segment as ThinkSegment;
    if (!thinkSegment.content.trim()) {
      removeStreamSegment(context, payload.turn_id, payload.id);
      return 'STRUCTURAL';
    }
  }

  finalizeSegment(segment, toSegmentMetadataRecord(payload.metadata), {
    interrupted: payload.interrupted === true,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
    failed: payload.failed === true,
    error: typeof payload.error === 'string' ? payload.error : null,
  });
  if (isProjectableToolSegment(segment)) {
    upsertActivityFromToolSegment(context, payload.id, segment);
  }
  return JSON.stringify(segment) !== before ? 'STRUCTURAL' : 'NONE';
}

/**
 * Find or create the current AI message for streaming content.
 */
export function findOrCreateAIMessage(context: AgentContext): AIMessage {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  
  if (lastMessage?.type === 'ai' && !lastMessage.isComplete) {
    return lastMessage;
  }

  const newMessage: AIMessage = {
    type: 'ai',
    text: '',
    timestamp: new Date(),
    isComplete: false,
    segments: [],
  };

  context.conversation.messages.push(newMessage);

  return newMessage;
}

/**
 * Find a segment by its ID across all messages.
 */
export function findSegmentById(
  context: AgentContext,
  segmentId: string,
): AIResponseSegment | null {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type === 'ai') {
      for (let j = message.segments.length - 1; j >= 0; j--) {
        const segment = message.segments[j];
        if (
          ['tool_call', 'write_file', 'terminal_command', 'edit_file'].includes(segment.type) &&
          (segment as ToolInvocationLifecycle).invocationId === segmentId
        ) {
          return segment;
        }
      }
    }
  }
  return null;
}

function findStreamSegment(
  context: AgentContext,
  turnId: string,
  segmentId: string,
): AIResponseSegment | null {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type !== 'ai') continue;
    for (let j = message.segments.length - 1; j >= 0; j--) {
      const segment = message.segments[j];
      if (matchesStreamSegmentIdentity(segment, turnId, segmentId)) return segment;
    }
  }
  return null;
}

/**
 * Append content delta to a segment based on its type.
 */
function appendContentToSegment(segment: AIResponseSegment, delta: string): boolean {
  switch (segment.type) {
    case 'text':
      (segment as AIResponseTextSegment).content += delta;
      return true;

    case 'think':
      (segment as ThinkSegment).content += delta;
      return true;

    case 'tool_call':
      const toolSegment = segment as ToolCallSegment;
      toolSegment.rawContent = (toolSegment.rawContent || '') + delta;
      return true;

    case 'write_file':
      (segment as WriteFileSegment).originalContent += delta;
      return true;

    case 'terminal_command':
      (segment as TerminalCommandSegment).command += delta;
      return true;

    case 'edit_file':
      (segment as EditFileSegment).originalContent += delta;
      return true;

    default:
      console.warn(`Unknown segment type for content append: ${segment.type}`);
      return false;
  }
}

function createSyntheticSegmentFromContent(
  segmentId: string,
  turnId: string,
  segmentType: SegmentStartPayload['segment_type'],
  context: AgentContext,
): AIResponseSegment {
  const aiMessage = findOrCreateAIMessage(context);
  const segment = createSegmentFromPayload({
    id: segmentId,
    segment_type: segmentType,
  });
  setStreamSegmentIdentity(segment, turnId, segmentId, segmentType);
  aiMessage.segments.push(segment);
  return segment;
}

function removeStreamSegment(context: AgentContext, turnId: string, segmentId: string): boolean {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type !== 'ai') {
      continue;
    }
    const segmentIndex = message.segments.findIndex((segment) =>
      matchesStreamSegmentIdentity(segment, turnId, segmentId));
    if (segmentIndex >= 0) {
      message.segments.splice(segmentIndex, 1);
      return true;
    }
  }
  return false;
}

/**
 * Finalize a segment with end metadata.
 */
function finalizeSegment(
  segment: AIResponseSegment,
  metadata?: Record<string, any> | null,
  options: {
    interrupted?: boolean;
    reason?: string | null;
    failed?: boolean;
    error?: string | null;
  } = {},
): void {
  if (segment.type === 'tool_call' || segment.type === 'write_file' || segment.type === 'terminal_command' || segment.type === 'edit_file') {
    const toolSegment = segment as ToolInvocationLifecycle;
    if (metadata?.tool_name) {
      toolSegment.toolName = metadata.tool_name;
    }
    if (metadata?.path && !toolSegment.arguments?.path) {
      toolSegment.arguments = { ...toolSegment.arguments, path: metadata.path };
    }
    if (metadata?.patch && !toolSegment.arguments?.patch) {
      toolSegment.arguments = { ...toolSegment.arguments, patch: metadata.patch };
    }
    if (metadata?.command && !toolSegment.arguments?.command) {
      toolSegment.arguments = { ...toolSegment.arguments, command: metadata.command };
    }
    const metadataArgs = extractToolCallArgumentsFromMetadata(metadata);
    if (Object.keys(metadataArgs).length > 0) {
      toolSegment.arguments = { ...metadataArgs, ...toolSegment.arguments };
    }

    if (segment.type === 'write_file') {
      const writeSegment = segment as WriteFileSegment;
      if (!writeSegment.path && typeof metadata?.path === 'string') {
        writeSegment.path = metadata.path;
      }
      if (!writeSegment.originalContent && typeof metadata?.content === 'string') {
        writeSegment.originalContent = metadata.content;
      }
    }

    if (segment.type === 'edit_file') {
      const editSegment = segment as EditFileSegment;
      if (!editSegment.path && typeof metadata?.path === 'string') {
        editSegment.path = metadata.path;
      }
      if (!editSegment.originalContent) {
        if (typeof metadata?.patch === 'string') {
          editSegment.originalContent = metadata.patch;
        } else if (typeof metadata?.diff === 'string') {
          editSegment.originalContent = metadata.diff;
        }
      }
    }

    if (segment.type === 'terminal_command') {
      const terminalSegment = segment as TerminalCommandSegment;
      if (!terminalSegment.command && typeof metadata?.command === 'string') {
        terminalSegment.command = metadata.command;
      }
    }

    if (options.failed) {
      toolSegment.status = 'error';
      toolSegment.result = null;
      toolSegment.error = options.error ?? 'stream_error';
      return;
    }

    if (options.interrupted) {
      toolSegment.status = 'interrupted';
      toolSegment.result = null;
      toolSegment.error = options.reason ?? 'interrupted';
      return;
    }

    if (toolSegment.status === 'parsing') {
      toolSegment.status = 'parsed';
    }
  }
}
