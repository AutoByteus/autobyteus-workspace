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
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';

const buildInvocationAliases = (invocationId: string): string[] => {
  const trimmed = invocationId.trim();
  if (!trimmed) {
    return [];
  }
  const aliases = [trimmed];
  if (trimmed.includes(':')) {
    const base = trimmed.split(':')[0]?.trim();
    if (base && !aliases.includes(base)) {
      aliases.push(base);
    }
  }
  return aliases;
};

const isToolLifecycleSegment = (segment: unknown): segment is ToolLifecycleSegment => {
  if (!segment || typeof segment !== 'object') {
    return false;
  }
  const type = (segment as { type?: string }).type;
  return (
    type === 'tool_call' ||
    type === 'write_file' ||
    type === 'terminal_command' ||
    type === 'edit_file'
  );
};

const resolveToolSegmentByAlias = (
  context: AgentContext,
  invocationId: string,
): ToolLifecycleSegment | null => {
  for (const alias of buildInvocationAliases(invocationId)) {
    const segment = findSegmentById(context, alias);
    if (isToolLifecycleSegment(segment)) {
      return segment;
    }
  }
  return null;
};

const inferSegmentTypeFromTool = (
  toolName: string,
  argumentsPayload: Record<string, any>,
): 'tool_call' | 'write_file' | 'run_bash' | 'edit_file' => {
  if (toolName === 'write_file') {
    return 'write_file';
  }
  if (toolName === 'edit_file' || argumentsPayload.patch || argumentsPayload.diff) {
    return 'edit_file';
  }
  if (toolName === 'run_bash' || typeof argumentsPayload.command === 'string') {
    return 'run_bash';
  }
  return 'tool_call';
};

const getActivityType = (
  segment: ToolLifecycleSegment,
): 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file' => {
  if (segment.type === 'write_file') {
    return 'write_file';
  }
  if (segment.type === 'terminal_command') {
    return 'terminal_command';
  }
  if (segment.type === 'edit_file') {
    return 'edit_file';
  }
  return 'tool_call';
};

const getContextText = (
  toolName: string,
  argumentsPayload: Record<string, any>,
): string => {
  if (typeof argumentsPayload.path === 'string' && argumentsPayload.path.trim().length > 0) {
    return argumentsPayload.path;
  }
  if (typeof argumentsPayload.command === 'string' && argumentsPayload.command.trim().length > 0) {
    return argumentsPayload.command;
  }
  return toolName;
};

const createSyntheticToolSegment = (
  context: AgentContext,
  invocationId: string,
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

  if (!isToolLifecycleSegment(segment)) {
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
    (fallback as any)._segmentId = invocationId;
    const aiMessage = findOrCreateAIMessage(context);
    aiMessage.segments.push(fallback);
    return fallback;
  }

  (segment as any)._segmentId = invocationId;
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

const ensureActivityForSegment = (
  context: AgentContext,
  invocationId: string,
  toolName: string,
  segment: ToolLifecycleSegment,
  argumentsPayload: Record<string, any>,
): void => {
  const activityStore = useAgentActivityStore();
  const aliases = buildInvocationAliases(invocationId);
  const hasExisting = activityStore
    .getActivities(context.state.runId)
    .some((activity) => aliases.includes(activity.invocationId));
  if (hasExisting) {
    return;
  }

  activityStore.addActivity(context.state.runId, {
    invocationId,
    toolName,
    type: getActivityType(segment),
    status: segment.status,
    contextText: getContextText(toolName, argumentsPayload),
    arguments: { ...segment.arguments, ...argumentsPayload },
    logs: [...segment.logs],
    result: segment.result,
    error: segment.error,
    timestamp: new Date(),
  });
};

const ensureToolLifecycleSegment = (
  context: AgentContext,
  invocationId: string,
  toolName: string,
  argumentsPayload: Record<string, any>,
): ToolLifecycleSegment => {
  const existing = resolveToolSegmentByAlias(context, invocationId);
  if (existing) {
    ensureActivityForSegment(context, invocationId, toolName, existing, argumentsPayload);
    return existing;
  }

  const synthetic = createSyntheticToolSegment(context, invocationId, toolName, argumentsPayload);
  ensureActivityForSegment(context, invocationId, toolName, synthetic, argumentsPayload);
  return synthetic;
};

const warnInvalidPayload = (eventType: string, payload: unknown): void => {
  console.warn(`[toolLifecycleHandler] Dropping malformed ${eventType} payload`, payload);
};

const withActivityInvocationAliases = (
  invocationId: string,
  fn: (activityInvocationId: string) => void,
): void => {
  for (const alias of buildInvocationAliases(invocationId)) {
    fn(alias);
  }
};

const syncActivityToolName = (
  context: AgentContext,
  invocationId: string,
  toolName: string,
): void => {
  const activityStore = useAgentActivityStore();
  withActivityInvocationAliases(invocationId, (activityInvocationId) => {
    activityStore.updateActivityToolName(context.state.runId, activityInvocationId, toolName);
  });
};

const updateActivityArguments = (
  context: AgentContext,
  invocationId: string,
  argumentsPayload: Record<string, any>,
): void => {
  const activityStore = useAgentActivityStore();
  withActivityInvocationAliases(invocationId, (activityInvocationId) => {
    activityStore.updateActivityArguments(context.state.runId, activityInvocationId, argumentsPayload);
  });
};

const updateActivityStatus = (
  context: AgentContext,
  invocationId: string,
  status: 'awaiting-approval' | 'approved' | 'executing' | 'success' | 'error' | 'denied',
): void => {
  const activityStore = useAgentActivityStore();
  withActivityInvocationAliases(invocationId, (activityInvocationId) => {
    activityStore.updateActivityStatus(context.state.runId, activityInvocationId, status);
  });
};

const setHighlightedActivity = (context: AgentContext, invocationId: string): void => {
  const activityStore = useAgentActivityStore();
  const aliases = buildInvocationAliases(invocationId);
  activityStore.setHighlightedActivity(context.state.runId, aliases[0] ?? invocationId);
};

const setActivityResult = (
  context: AgentContext,
  invocationId: string,
  result: any,
  error: string | null,
): void => {
  const activityStore = useAgentActivityStore();
  withActivityInvocationAliases(invocationId, (activityInvocationId) => {
    activityStore.setActivityResult(context.state.runId, activityInvocationId, result, error);
  });
};

const addActivityLog = (context: AgentContext, invocationId: string, logEntry: string): void => {
  const activityStore = useAgentActivityStore();
  withActivityInvocationAliases(invocationId, (activityInvocationId) => {
    activityStore.addActivityLog(context.state.runId, activityInvocationId, logEntry);
  });
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
    setHighlightedActivity(context, parsed.invocationId);
  }
}

export function handleToolApproved(payload: ToolApprovedPayload, context: AgentContext): void {
  const parsed = parseToolApprovedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_APPROVED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.toolName, {});

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

  const transitioned = applyApprovedState(segment);
  if (transitioned) {
    updateActivityStatus(context, parsed.invocationId, 'approved');
    setHighlightedActivity(context, parsed.invocationId);
  }
}

export function handleToolDenied(payload: ToolDeniedPayload, context: AgentContext): void {
  const parsed = parseToolDeniedPayload(payload);
  if (!parsed) {
    warnInvalidPayload('TOOL_DENIED', payload);
    return;
  }

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.toolName, {});

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

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
    if (segment.type !== 'write_file') {
      setHighlightedActivity(context, parsed.invocationId);
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

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.toolName, {});

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

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

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.toolName, {});

  if (isPlaceholderToolName(segment.toolName)) {
    segment.toolName = parsed.toolName;
  }
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);

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

  const segment = ensureToolLifecycleSegment(context, parsed.invocationId, parsed.toolName, {});

  appendLog(segment, parsed.logEntry);
  syncActivityToolName(context, parsed.invocationId, parsed.toolName);
  addActivityLog(context, parsed.invocationId, parsed.logEntry);
}
