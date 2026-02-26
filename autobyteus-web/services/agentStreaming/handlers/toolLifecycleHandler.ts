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
import { findSegmentById } from './segmentHandler';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
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

const findToolLifecycleSegment = (
  context: AgentContext,
  invocationId: string,
): ToolLifecycleSegment | null => {
  const segment = findSegmentById(context, invocationId);
  if (
    segment?.type === 'tool_call' ||
    segment?.type === 'write_file' ||
    segment?.type === 'terminal_command' ||
    segment?.type === 'edit_file'
  ) {
    return segment as ToolLifecycleSegment;
  }
  return null;
};

const warnInvalidPayload = (eventType: string, payload: unknown): void => {
  console.warn(`[toolLifecycleHandler] Dropping malformed ${eventType} payload`, payload);
};

const warnSegmentMissing = (eventType: string, invocationId: string): void => {
  console.warn(`[toolLifecycleHandler] Segment not found for ${eventType}: ${invocationId}`);
};

const syncActivityToolName = (
  context: AgentContext,
  invocationId: string,
  toolName: string,
): void => {
  const activityStore = useAgentActivityStore();
  activityStore.updateActivityToolName(context.state.agentId, invocationId, toolName);
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

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_APPROVAL_REQUESTED', parsed.invocationId);
    return;
  }

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (!segment.toolName) {
      segment.toolName = parsed.toolName;
    }
  }

  const transitioned = applyApprovalRequestedState(segment);
  const activityStore = useAgentActivityStore();
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  activityStore.updateActivityArguments(context.state.agentId, parsed.invocationId, parsed.arguments);
  if (transitioned) {
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'awaiting-approval');
    activityStore.setHighlightedActivity(context.state.agentId, parsed.invocationId);
  }
}

export function handleToolApproved(payload: ToolApprovedPayload, context: AgentContext): void {
  const parsed = parseToolApprovedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVED', payload);
    return;
  }

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_APPROVED', parsed.invocationId);
    return;
  }

  if (!segment.toolName) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyApprovedState(segment);
  if (transitioned) {
    const activityStore = useAgentActivityStore();
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'approved');
    activityStore.setHighlightedActivity(context.state.agentId, parsed.invocationId);
  }
}

export function handleToolDenied(payload: ToolDeniedPayload, context: AgentContext): void {
  const parsed = parseToolDeniedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_DENIED', payload);
    return;
  }

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_DENIED', parsed.invocationId);
    return;
  }

  if (!segment.toolName) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyDeniedState(segment, parsed.reason, parsed.error);
  if (transitioned) {
    const activityStore = useAgentActivityStore();
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'denied');
    activityStore.setActivityResult(context.state.agentId, parsed.invocationId, null, segment.error);
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

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_EXECUTION_STARTED', parsed.invocationId);
    return;
  }

  if (!isTerminalStatus(segment.status)) {
    mergeArguments(segment, parsed.arguments);
    if (!segment.toolName) {
      segment.toolName = parsed.toolName;
    }
  }

  const transitioned = applyExecutionStartedState(segment);
  const activityStore = useAgentActivityStore();
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  activityStore.updateActivityArguments(context.state.agentId, parsed.invocationId, parsed.arguments);
  if (transitioned) {
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'executing');
    if (segment.type !== 'write_file') {
      activityStore.setHighlightedActivity(context.state.agentId, parsed.invocationId);
    }
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

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_EXECUTION_SUCCEEDED', parsed.invocationId);
    return;
  }

  if (!segment.toolName) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyExecutionSucceededState(segment, parsed.result);
  if (transitioned) {
    const activityStore = useAgentActivityStore();
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'success');
    activityStore.setActivityResult(context.state.agentId, parsed.invocationId, segment.result, null);
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

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_EXECUTION_FAILED', parsed.invocationId);
    return;
  }

  if (!segment.toolName) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyExecutionFailedState(segment, parsed.error);
  if (transitioned) {
    const activityStore = useAgentActivityStore();
    activityStore.updateActivityStatus(context.state.agentId, parsed.invocationId, 'error');
    activityStore.setActivityResult(context.state.agentId, parsed.invocationId, null, segment.error);
  }
}

export function handleToolLog(payload: ToolLogPayload, context: AgentContext): void {
  const parsed = parseToolLogPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_LOG', payload);
    return;
  }

  const segment = findToolLifecycleSegment(context, parsed.invocationId);
  if (!segment) {
    warnSegmentMissing('TOOL_LOG', parsed.invocationId);
    return;
  }

  appendLog(segment, parsed.logEntry);
  const activityStore = useAgentActivityStore();
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  activityStore.addActivityLog(context.state.agentId, parsed.invocationId, parsed.logEntry);
}
