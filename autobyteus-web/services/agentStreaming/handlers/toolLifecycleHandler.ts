import type { AgentContext } from '~/types/agent/AgentContext';
import type {
  EditFileSegment,
  TerminalCommandSegment,
  ToolCallSegment,
  WriteFileSegment,
} from '~/types/segments';
import type {
  ToolApprovalRequestedPayload,
  ToolApprovedPayload,
  ToolDeniedPayload,
  ToolExecutionFailedPayload,
  ToolExecutionStartedPayload,
  ToolExecutionSucceededPayload,
  ToolLogPayload,
} from '../protocol/messageTypes';
import { createSegmentFromPayload } from '../protocol/segmentTypes';
import { findOrCreateAIMessage, findSegmentById } from './segmentHandler';
import {
  appendLog,
  applyApprovedState,
  applyApprovalRequestedState,
  applyDeniedState,
  applyExecutionFailedState,
  applyExecutionStartedState,
  applyExecutionSucceededState,
  isTerminalStatus,
  type ToolLifecycleSegment,
} from './toolLifecycleState';
import {
  parseToolApprovalRequestedPayload,
  parseToolApprovedPayload,
  parseToolDeniedPayload,
  parseToolExecutionFailedPayload,
  parseToolExecutionStartedPayload,
  parseToolExecutionSucceededPayload,
  parseToolLogPayload,
} from './toolLifecycleParsers';
import { setStreamSegmentIdentity } from './segmentIdentity';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { buildInvocationAliases } from '~/utils/invocationAliases';
import {
  addActivityLog,
  inferSegmentTypeFromTool,
  isProjectableToolSegment,
  setActivityResult,
  syncActivityToolName,
  updateActivityArguments,
  updateActivityStatus,
  upsertActivityFromToolSegment,
} from './toolActivityProjection';

const resolveToolSegmentByAlias = (
  context: AgentContext,
  invocationId: string,
): ToolLifecycleSegment | null => {
  for (const alias of buildInvocationAliases(invocationId)) {
    const segment = findSegmentById(context, alias);
    if (isProjectableToolSegment(segment)) {
      return segment;
    }
  }
  return null;
};

const createSyntheticToolSegment = (
  context: AgentContext,
  invocationId: string,
  turnId: string | null,
  toolName: string,
  argumentsPayload: Record<string, any>,
): ToolLifecycleSegment => {
  const segmentType = inferSegmentTypeFromTool(toolName, argumentsPayload);
  const metadata: Record<string, any> = { tool_name: toolName };
  if (typeof argumentsPayload.path === 'string' && argumentsPayload.path.trim().length > 0) {
    metadata.path = argumentsPayload.path;
  }

  const segment = createSegmentFromPayload({
    id: invocationId,
    turn_id: turnId,
    segment_type: segmentType,
    metadata,
  });

  if (!isProjectableToolSegment(segment)) {
    const fallback: ToolCallSegment = {
      type: 'tool_call',
      invocationId,
      toolName,
      arguments: { ...argumentsPayload },
      status: 'parsing',
      logs: [],
      result: null,
      error: null,
      rawContent: '',
    };
    setStreamSegmentIdentity(fallback, invocationId, 'tool_call');
    const aiMessage = findOrCreateAIMessage(context);
    aiMessage.segments.push(fallback);
    return fallback;
  }

  setStreamSegmentIdentity(segment, invocationId, segmentType);
  segment.invocationId = invocationId;
  segment.toolName = toolName;
  segment.arguments = { ...segment.arguments, ...argumentsPayload };

  if (segment.type === 'terminal_command' && typeof argumentsPayload.command === 'string') {
    segment.command = argumentsPayload.command;
  }
  if (segment.type === 'write_file') {
    if (typeof argumentsPayload.path === 'string' && !segment.path) {
      segment.path = argumentsPayload.path;
    }
    if (typeof argumentsPayload.content === 'string' && !segment.originalContent) {
      segment.originalContent = argumentsPayload.content;
    }
  }
  if (segment.type === 'edit_file') {
    if (typeof argumentsPayload.path === 'string' && !segment.path) {
      segment.path = argumentsPayload.path;
    }
    if (typeof argumentsPayload.patch === 'string' && !segment.originalContent) {
      segment.originalContent = argumentsPayload.patch;
    }
  }

  const aiMessage = findOrCreateAIMessage(context);
  aiMessage.segments.push(segment);
  return segment;
};

const ensureToolLifecycleSegment = (
  context: AgentContext,
  invocationId: string,
  turnId: string | null,
  toolName: string,
  argumentsPayload: Record<string, any>,
): ToolLifecycleSegment => {
  const existing = resolveToolSegmentByAlias(context, invocationId);
  if (existing) {
    upsertActivityFromToolSegment(context, invocationId, existing, argumentsPayload);
    return existing;
  }

  const synthetic = createSyntheticToolSegment(context, invocationId, turnId, toolName, argumentsPayload);
  upsertActivityFromToolSegment(context, invocationId, synthetic, argumentsPayload);
  return synthetic;
};

const warnInvalidPayload = (eventType: string, payload: unknown): void => {
  console.warn(`[toolLifecycleHandler] Dropping malformed ${eventType} payload`, payload);
};

const mergeArguments = (
  segment: ToolCallSegment | WriteFileSegment | TerminalCommandSegment | EditFileSegment,
  argumentsPayload: Record<string, any>,
): void => {
  segment.arguments = { ...segment.arguments, ...argumentsPayload };

  if (segment.type === 'terminal_command' && !segment.command && argumentsPayload.command) {
    segment.command = String(argumentsPayload.command);
  }
  if (segment.type === 'write_file' && !segment.originalContent && argumentsPayload.content) {
    segment.originalContent = String(argumentsPayload.content);
  }
  if (segment.type === 'write_file' && !segment.path && argumentsPayload.path) {
    segment.path = String(argumentsPayload.path);
  }
  if (segment.type === 'edit_file' && !segment.originalContent && argumentsPayload.patch) {
    segment.originalContent = String(argumentsPayload.patch);
  }
  if (segment.type === 'edit_file' && !segment.path && argumentsPayload.path) {
    segment.path = String(argumentsPayload.path);
  }
};

export function handleToolApprovalRequested(
  payload: ToolApprovalRequestedPayload,
  context: AgentContext,
): void {
  const parsed = parseToolApprovalRequestedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVAL_REQUESTED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (isPlaceholderToolName(segment.toolName)) {
      segment.toolName = parsed.toolName;
    }
  }

  const transitioned = applyApprovalRequestedState(segment);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateActivityArguments(context, parsed.invocationId, parsed.arguments);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'awaiting-approval');
  }
}

export function handleToolApproved(payload: ToolApprovedPayload, context: AgentContext): void {
  const parsed = parseToolApprovedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.turnId, parsed.toolName, {});

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyApprovedState(segment);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'approved');
  }
}

export function handleToolDenied(payload: ToolDeniedPayload, context: AgentContext): void {
  const parsed = parseToolDeniedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_DENIED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyDeniedState(segment, parsed.reason, parsed.error);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'denied');
    setActivityResult(context, parsed.invocationId, null, segment.error);
  }
}

export function handleToolExecutionStarted(
  payload: ToolExecutionStartedPayload,
  context: AgentContext,
): void {
  const parsed = parseToolExecutionStartedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_STARTED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (isPlaceholderToolName(segment.toolName)) {
      segment.toolName = parsed.toolName;
    }
  }

  const transitioned = applyExecutionStartedState(segment);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateActivityArguments(context, parsed.invocationId, parsed.arguments);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'executing');
  }
}

export function handleToolExecutionSucceeded(
  payload: ToolExecutionSucceededPayload,
  context: AgentContext,
): void {
  const parsed = parseToolExecutionSucceededPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_SUCCEEDED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyExecutionSucceededState(segment, parsed.result);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'success');
    setActivityResult(context, parsed.invocationId, segment.result, null);
  }
}

export function handleToolExecutionFailed(
  payload: ToolExecutionFailedPayload,
  context: AgentContext,
): void {
  const parsed = parseToolExecutionFailedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_FAILED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyExecutionFailedState(segment, parsed.error);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'error');
    setActivityResult(context, parsed.invocationId, null, segment.error);
  }
}

export function handleToolLog(payload: ToolLogPayload, context: AgentContext): void {
  const parsed = parseToolLogPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_LOG', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.turnId, parsed.toolName, {});

  appendLog(segment, parsed.logEntry);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  addActivityLog(context, parsed.invocationId, parsed.logEntry);
}
