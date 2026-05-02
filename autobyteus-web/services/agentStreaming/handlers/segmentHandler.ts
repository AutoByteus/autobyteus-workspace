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
import { createSegmentFromPayload } from '../protocol/segmentTypes';
import { hasStreamSegmentId, matchesStreamSegmentIdentity, setStreamSegmentIdentity } from './segmentIdentity';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { invocationIdsMatch } from '~/utils/invocationAliases';
import { isProjectableToolSegment, upsertActivityFromToolSegment } from './toolActivityProjection';

function extractToolCallArgumentsFromMetadata(metadata?: Record<string, any>): Record<string, any> {
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
): void {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_START with invalid id', payload);
    return;
  }
  const existingSegment = findSegmentById(context, payload.id, payload.segment_type);
  if (existingSegment) {
    mergeSegmentStartMetadata(existingSegment, payload);
    if (isProjectableToolSegment(existingSegment)) {
      upsertActivityFromToolSegment(context, payload.id, existingSegment);
    }
    return;
  }
  const aiMessage = findOrCreateAIMessage(context);
  const segment = createSegmentFromPayload(payload);

  setStreamSegmentIdentity(segment, payload.id, payload.segment_type);
  mergeSegmentStartMetadata(segment, payload);

  aiMessage.segments.push(segment);
  if (isProjectableToolSegment(segment)) {
    upsertActivityFromToolSegment(context, payload.id, segment);
  }
}

function mergeSegmentStartMetadata(
  segment: AIResponseSegment,
  payload: SegmentStartPayload,
): void {
  const metadata = payload.metadata;
  if (!metadata) {
    return;
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
    return;
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
    return;
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
    return;
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
}

/**
 * Handle SEGMENT_CONTENT event - appends delta content to the segment.
 */
export function handleSegmentContent(
  payload: SegmentContentPayload,
  context: AgentContext
): void {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_CONTENT with invalid id', payload);
    return;
  }
  const delta = typeof payload.delta === 'string' ? payload.delta : '';
  if (!delta) {
    return;
  }
  let segment = findSegmentById(context, payload.id, payload.segment_type);
  if (!segment) {
    segment = createSyntheticSegmentFromContent(payload.id, payload.turn_id, payload.segment_type ?? 'text', context);
  }

  appendContentToSegment(segment, delta);
}

/**
 * Handle SEGMENT_END event - finalizes the segment with any end metadata.
 */
export function handleSegmentEnd(
  payload: SegmentEndPayload,
  context: AgentContext
): void {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_END with invalid id', payload);
    return;
  }
  const segment = findSegmentById(context, payload.id);
  if (!segment) {
    console.warn(`Segment not found for end event: ${payload.id}`);
    return;
  }

  if (segment.type === 'think') {
    const thinkSegment = segment as ThinkSegment;
    if (!thinkSegment.content.trim()) {
      removeSegmentById(context, payload.id);
      return;
    }
  }

  finalizeSegment(segment, payload.metadata);
  if (isProjectableToolSegment(segment)) {
    upsertActivityFromToolSegment(context, payload.id, segment);
  }
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
  context.conversation.updatedAt = new Date().toISOString();

  return newMessage;
}

/**
 * Find a segment by its ID across all messages.
 */
export function findSegmentById(
  context: AgentContext,
  segmentId: string,
  segmentType?: SegmentStartPayload['segment_type'] | SegmentContentPayload['segment_type'],
): AIResponseSegment | null {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type === 'ai') {
      for (let j = message.segments.length - 1; j >= 0; j--) {
        const segment = message.segments[j];
        if (matchesStreamSegmentIdentity(segment, segmentId, segmentType)) {
          return segment;
        }
        if (
          ['tool_call', 'write_file', 'terminal_command', 'edit_file'].includes(segment.type) &&
          invocationIdsMatch((segment as ToolInvocationLifecycle).invocationId, segmentId)
        ) {
          return segment;
        }
      }
    }
  }
  return null;
}

/**
 * Append content delta to a segment based on its type.
 */
function appendContentToSegment(segment: AIResponseSegment, delta: string): void {
  switch (segment.type) {
    case 'text':
      (segment as AIResponseTextSegment).content += delta;
      break;

    case 'think':
      (segment as ThinkSegment).content += delta;
      break;

    case 'tool_call':
      const toolSegment = segment as ToolCallSegment;
      toolSegment.rawContent = (toolSegment.rawContent || '') + delta;
      break;

    case 'write_file':
      (segment as WriteFileSegment).originalContent += delta;
      break;

    case 'terminal_command':
      (segment as TerminalCommandSegment).command += delta;
      break;

    case 'edit_file':
      (segment as EditFileSegment).originalContent += delta;
      break;

    default:
      console.warn(`Unknown segment type for content append: ${segment.type}`);
  }
}

function createSyntheticSegmentFromContent(
  segmentId: string,
  turnId: string | null,
  segmentType: SegmentStartPayload['segment_type'],
  context: AgentContext,
): AIResponseSegment {
  const aiMessage = findOrCreateAIMessage(context);
  const segment = createSegmentFromPayload({
    id: segmentId,
    turn_id: turnId,
    segment_type: segmentType,
  });
  setStreamSegmentIdentity(segment, segmentId, segmentType);
  aiMessage.segments.push(segment);
  return segment;
}

function removeSegmentById(context: AgentContext, segmentId: string): void {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type !== 'ai') {
      continue;
    }
    const segmentIndex = message.segments.findIndex((segment) => hasStreamSegmentId(segment, segmentId));
    if (segmentIndex >= 0) {
      message.segments.splice(segmentIndex, 1);
      return;
    }
  }
}

/**
 * Finalize a segment with end metadata.
 */
function finalizeSegment(
  segment: AIResponseSegment,
  metadata?: Record<string, any>
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

    if (toolSegment.status === 'parsing') {
      toolSegment.status = 'parsed';
    }
  }
}
