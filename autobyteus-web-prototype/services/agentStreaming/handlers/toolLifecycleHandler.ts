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
  ToolExecutionInterruptedPayload,
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
  applyExecutionInterruptedState,
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
  parseToolExecutionInterruptedPayload,
  parseToolExecutionStartedPayload,
  parseToolExecutionSucceededPayload,
  parseToolLogPayload,
} from './toolLifecycleParsers';
import { setStreamSegmentIdentity } from './segmentIdentity';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import {
  addToolActivityLog,
  inferSegmentTypeFromTool,
  isProjectableToolSegment,
  setToolActivityResult,
  updateToolActivityApprovalTarget,
  syncActivityToolName,
  updateToolActivityArguments,
  updateToolActivityStatus,
  upsertActivityFromToolSegment,
} from './toolActivityProjection';
import type { RecentEventMonitorEffect } from '../agentStreamMutationEffects';
import {
  buildToolCardPresentation,
  getToolCardPresentationWitnessValues,
} from '~/utils/toolCardPresentation';

export interface ToolLifecycleHandlerResult {
  conversationChanged: boolean;
  eventMonitor: RecentEventMonitorEffect;
}

type EnsuredToolLifecycleSegment = {
  segment: ToolLifecycleSegment;
  created: boolean;
};

const resolveToolSegmentById = (
  context: AgentContext,
  invocationId: string,
): ToolLifecycleSegment | null => {
  const segment = findSegmentById(context, invocationId);
  if (isProjectableToolSegment(segment)) {
    return segment;
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
    if (turnId) setStreamSegmentIdentity(fallback, turnId, invocationId, 'tool_call');
    const aiMessage = findOrCreateAIMessage(context);
    aiMessage.segments.push(fallback);
    return fallback;
  }

  if (turnId) setStreamSegmentIdentity(segment, turnId, invocationId, segmentType);
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
): EnsuredToolLifecycleSegment => {
  const existing = resolveToolSegmentById(context, invocationId);
  if (existing) {
    upsertActivityFromToolSegment(context, invocationId, existing, argumentsPayload);
    return { segment: existing, created: false };
  }

  const synthetic = createSyntheticToolSegment(context, invocationId, turnId, toolName, argumentsPayload);
  upsertActivityFromToolSegment(context, invocationId, synthetic, argumentsPayload);
  return { segment: synthetic, created: true };
};

const warnInvalidPayload = (eventType: string, payload: unknown): void => {
  console.warn(`[toolLifecycleHandler] Dropping malformed ${eventType} payload`, payload);
};

const mergeArguments = (
  segment: ToolCallSegment | WriteFileSegment | TerminalCommandSegment | EditFileSegment,
  argumentsPayload: Record<string, any>,
): void => {
  const nextArguments = { ...segment.arguments, ...argumentsPayload };
  if (JSON.stringify(segment.arguments) !== JSON.stringify(nextArguments)) {
    segment.arguments = nextArguments;
  }

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

const captureToolPresentation = (segment: ToolLifecycleSegment): string =>
  JSON.stringify(getToolCardPresentationWitnessValues(buildToolCardPresentation(segment)));

const completeToolMutation = (input: {
  ensured: EnsuredToolLifecycleSegment;
  beforeSegment: string;
  beforePresentation: string;
  structural?: boolean;
}): ToolLifecycleHandlerResult => {
  const conversationChanged = input.ensured.created
    || JSON.stringify(input.ensured.segment) !== input.beforeSegment;
  if (!conversationChanged) {
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }
  if (input.ensured.created || input.structural) {
    return { conversationChanged: true, eventMonitor: 'STRUCTURAL' };
  }
  const presentationChanged = captureToolPresentation(input.ensured.segment)
    !== input.beforePresentation;
  return {
    conversationChanged: true,
    eventMonitor: presentationChanged ? 'PRESENTATION' : 'NONE',
  };
};

const beginToolMutation = (ensured: EnsuredToolLifecycleSegment) => ({
  beforeSegment: JSON.stringify(ensured.segment),
  beforePresentation: captureToolPresentation(ensured.segment),
});

export function handleToolApprovalRequested(
  payload: ToolApprovalRequestedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolApprovalRequestedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVAL_REQUESTED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (isPlaceholderToolName(segment.toolName)) {
      segment.toolName = parsed.toolName;
    }
    if (JSON.stringify(segment.approvalTarget) !== JSON.stringify(parsed.approvalTarget)) {
      segment.approvalTarget = parsed.approvalTarget;
    }
  }

  const transitioned = applyApprovalRequestedState(segment);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);
  updateToolActivityApprovalTarget(context, parsed.invocationId, parsed.approvalTarget);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'awaiting-approval');
  }
  return completeToolMutation({ ensured, ...before });
}

export function handleToolApproved(
  payload: ToolApprovedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolApprovedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.turnId, parsed.toolName, {});
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyApprovedState(segment);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'approved');
  }
  return completeToolMutation({ ensured, ...before });
}

export function handleToolDenied(
  payload: ToolDeniedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolDeniedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_DENIED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyDeniedState(segment, parsed.reason, parsed.error);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'denied');
    setToolActivityResult(context, parsed.invocationId, null, segment.error);
  }
  return completeToolMutation({ ensured, ...before, structural: transitioned });
}

export function handleToolExecutionStarted(
  payload: ToolExecutionStartedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolExecutionStartedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_STARTED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (isPlaceholderToolName(segment.toolName)) {
      segment.toolName = parsed.toolName;
    }
  }

  const transitioned = applyExecutionStartedState(segment);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'executing');
  }
  return completeToolMutation({ ensured, ...before });
}

export function handleToolExecutionSucceeded(
  payload: ToolExecutionSucceededPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolExecutionSucceededPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_SUCCEEDED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyExecutionSucceededState(segment, parsed.result);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'success');
    setToolActivityResult(context, parsed.invocationId, segment.result, null);
  }
  return completeToolMutation({ ensured, ...before, structural: transitioned });
}

export function handleToolExecutionFailed(
  payload: ToolExecutionFailedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolExecutionFailedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_FAILED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyExecutionFailedState(segment, parsed.error);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'error');
    setToolActivityResult(context, parsed.invocationId, null, segment.error);
  }
  return completeToolMutation({ ensured, ...before, structural: transitioned });
}

export function handleToolExecutionInterrupted(
  payload: ToolExecutionInterruptedPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolExecutionInterruptedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_EXECUTION_INTERRUPTED', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(
    context,
    parsed.invocationId,
    parsed.turnId,
    parsed.toolName,
    parsed.arguments,
  );
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  mergeArguments(segment, parsed.arguments);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  updateToolActivityArguments(context, parsed.invocationId, parsed.arguments);

  const transitioned = applyExecutionInterruptedState(segment, parsed.reason);
  if (transitioned) {
    updateToolActivityStatus(context, parsed.invocationId, 'interrupted');
    setToolActivityResult(context, parsed.invocationId, null, segment.error);
  }
  return completeToolMutation({ ensured, ...before, structural: transitioned });
}

export function handleToolLog(
  payload: ToolLogPayload,
  context: AgentContext,
): ToolLifecycleHandlerResult {
  const parsed = parseToolLogPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_LOG', payload);
    return { conversationChanged: false, eventMonitor: 'NONE' };
  }


  const ensured = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.turnId, parsed.toolName, {});
  const { segment } = ensured;
  const before = beginToolMutation(ensured);

  appendLog(segment, parsed.logEntry);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  addToolActivityLog(context, parsed.invocationId, parsed.logEntry);
  return completeToolMutation({ ensured, ...before });
}
