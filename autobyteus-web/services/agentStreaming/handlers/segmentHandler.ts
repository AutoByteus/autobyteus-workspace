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

import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

/**
 * Extract context text for the activity store (e.g. filename, command, or partial tool name).
 */
function extractContextText(payload: SegmentStartPayload): string {
  if (payload.segment_type === 'write_file') {
    return payload.metadata?.path || 'new file';
  }
  if (payload.segment_type === 'run_bash') {
    return 'terminal'; // Command content comes later
  }
  if (payload.segment_type === 'tool_call') {
    return payload.metadata?.tool_name || 'tool';
  }
  if (payload.segment_type === 'edit_file') {
    return payload.metadata?.path || 'edit file';
  }
  return '';
}

/**
 * Handle SEGMENT_START event - creates a new segment and adds it to the current AI message.
 * Also initializes streaming artifacts for 'write_file' segments.
 */
export function handleSegmentStart(
  payload: SegmentStartPayload,
  context: AgentContext
): void {
  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    console.warn('[SegmentHandler] Dropping SEGMENT_START with invalid id', payload);
    return;
  }
  const aiMessage = findOrCreateAIMessage(context);
  const segment = createSegmentFromPayload(payload);

  // Store segment ID(s) for lookup during CONTENT and END events
  (segment as any)._segmentId = payload.id;

  aiMessage.segments.push(segment);

  // --- Live Artifact Streaming ---
  if (payload.segment_type === 'write_file' && payload.metadata?.path) {
    const store = useAgentArtifactsStore();
    store.createPendingArtifact(context.state.agentId, payload.metadata.path, 'file');
  }

  // --- Sidecar Activity Store ---
  if (
    ['tool_call', 'write_file', 'run_bash', 'edit_file'].includes(payload.segment_type)
  ) {
    const activityStore = useAgentActivityStore();
    const contextText = extractContextText(payload);
    
    // Map backend type to frontend store type
    let storeType: 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file' = 'tool_call';
    let toolName: string = payload.segment_type; // Default generic name

    if (payload.segment_type === 'write_file') {
      storeType = 'write_file';
      // toolName remains 'write_file'
    } else if (payload.segment_type === 'run_bash') {
      storeType = 'terminal_command';
      // toolName remains 'run_bash' (default from payload.segment_type)
    } else if (payload.segment_type === 'edit_file') {
      storeType = 'edit_file';
      // toolName remains 'edit_file'
    } else if (payload.segment_type === 'tool_call') {
      // For generic tool calls, we STRICTLY require the tool name from metadata.
      // If it's missing, it's a backend bug.
      if (payload.metadata?.tool_name) {
        toolName = payload.metadata.tool_name;
      } else {
        console.error(`[SegmentHandler] Backend Bug: Missing tool_name in metadata for tool_call segment ${payload.id}`);
        toolName = 'MISSING_TOOL_NAME';
      }
    }

    const args: Record<string, any> = {};
    if (payload.segment_type === 'write_file') {
      args.path = payload.metadata?.path;
    } else if (payload.segment_type === 'edit_file') {
      args.path = payload.metadata?.path;
    } else if (payload.segment_type === 'run_bash') {
      args.command = '';
    }

    activityStore.addActivity(context.state.agentId, {
      invocationId: payload.id,
      toolName: toolName, 
      type: storeType,
      status: 'parsing',
      contextText,
      arguments: args,
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });
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
  const segment = findSegmentById(context, payload.id);
  if (!segment) {
    console.warn(`Segment not found for content event: ${payload.id}`);
    return;
  }

  appendContentToSegment(segment, payload.delta);

  // --- Live Artifact Streaming ---
  if (segment.type === 'write_file') {
    const store = useAgentArtifactsStore();
    store.appendArtifactContent(context.state.agentId, payload.delta);
  }
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

  finalizeSegment(segment, payload.metadata);

  // --- Live Artifact Streaming ---
  if (segment.type === 'write_file') {
     const store = useAgentArtifactsStore();
     store.finalizeArtifactStream(context.state.agentId);
  }

  // --- Sidecar Activity Store ---
  if (['tool_call', 'write_file', 'terminal_command', 'edit_file'].includes(segment.type)) {
    const activityStore = useAgentActivityStore();
    // Update status to 'parsed' (handlers will move it to executing/awaiting later)
    activityStore.updateActivityStatus(context.state.agentId, payload.id, 'parsed');
    
    // Potentially update context text if it was empty (e.g. terminal command)
    // For now, we rely on the initial extraction or specific handlers.

    // Update Arguments in Sidecar (e.g. command content or file content)
    if (segment.type === 'write_file') {
      const wfSegment = segment as WriteFileSegment;
      activityStore.updateActivityArguments(context.state.agentId, payload.id, { 
        path: wfSegment.path,
        content: wfSegment.originalContent 
      });
    }
    if (segment.type === 'terminal_command') {
      const tcSegment = segment as TerminalCommandSegment;
      activityStore.updateActivityArguments(context.state.agentId, payload.id, { 
        command: tcSegment.command 
      });
    }
    if (segment.type === 'edit_file') {
      const pfSegment = segment as EditFileSegment;
      activityStore.updateActivityArguments(context.state.agentId, payload.id, {
        path: pfSegment.path,
        patch: pfSegment.originalContent
      });
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find or create the current AI message for streaming content.
 */
export function findOrCreateAIMessage(context: AgentContext): AIMessage {
  const lastMessage = context.conversation.messages[context.conversation.messages.length - 1];
  
  if (lastMessage?.type === 'ai' && !lastMessage.isComplete) {
    return lastMessage;
  }

  // Create new AI message
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
  segmentId: string
): AIResponseSegment | null {
  for (let i = context.conversation.messages.length - 1; i >= 0; i--) {
    const message = context.conversation.messages[i];
    if (message.type === 'ai') {
      for (const segment of message.segments) {
        if ((segment as any)._segmentId === segmentId) {
          return segment;
        }
        // Also check invocationId for tool_call segments
        if (segment.type === 'tool_call' && segment.invocationId === segmentId) {
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
      // Accumulate raw content for display during streaming
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
    // Transition from 'parsing' to 'parsed' when segment ends
    if (toolSegment.status === 'parsing') {
      toolSegment.status = 'parsed';
    }
  }
}
