import type { AgentContext } from '~/types/agent/AgentContext';
import type { EditFileSegment, TerminalCommandSegment, ToolApprovalTarget, ToolCallSegment, ToolInvocationStatus, WriteFileSegment } from '~/types/segments';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';

export type ProjectableToolSegment = ToolCallSegment | WriteFileSegment | TerminalCommandSegment | EditFileSegment;

export const isProjectableToolSegment = (segment: unknown): segment is ProjectableToolSegment => {
  if (!segment || typeof segment !== 'object') {
    return false;
  }
  const type = (segment as { type?: string }).type;
  return type === 'tool_call' || type === 'write_file' || type === 'terminal_command' || type === 'edit_file';
};

export const inferSegmentTypeFromTool = (
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

const resolveToolName = (segment: ProjectableToolSegment): string | null => {
  if (typeof segment.toolName === 'string' && segment.toolName.trim().length > 0) {
    return segment.toolName;
  }
  if (segment.type === 'write_file') {
    return 'write_file';
  }
  if (segment.type === 'terminal_command') {
    return 'run_bash';
  }
  if (segment.type === 'edit_file') {
    return 'edit_file';
  }
  return null;
};

const resolveArguments = (
  segment: ProjectableToolSegment,
  argumentsPayload: Record<string, any>,
): Record<string, any> => {
  const next = {
    ...segment.arguments,
    ...argumentsPayload,
  };

  if (segment.type === 'terminal_command' && segment.command.trim().length > 0) {
    next.command = segment.command;
  }
  if ((segment.type === 'write_file' || segment.type === 'edit_file') && segment.path) {
    next.path = segment.path;
  }
  if (segment.type === 'write_file' && segment.originalContent) {
    next.content = segment.originalContent;
  }
  if (segment.type === 'edit_file' && segment.originalContent) {
    next.patch = segment.originalContent;
  }

  return next;
};

type ActivityType = 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file';

const getActivityType = (segment: ProjectableToolSegment, toolName: string, argumentsPayload: Record<string, any>): ActivityType => {
  const inferredSegmentType = inferSegmentTypeFromTool(toolName, argumentsPayload);
  if (inferredSegmentType === 'run_bash') {
    return 'terminal_command';
  }
  if (inferredSegmentType === 'write_file') {
    return 'write_file';
  }
  if (inferredSegmentType === 'edit_file') {
    return 'edit_file';
  }
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

const hasExistingActivity = (context: AgentContext, invocationId: string): boolean => {
  const activityStore = useAgentActivityStore();
  return activityStore
    .getToolActivities(context.state.runId)
    .some((activity) => activity.invocationId === invocationId);
};

export const upsertActivityFromToolSegment = (
  context: AgentContext,
  invocationId: string,
  segment: ProjectableToolSegment,
  argumentsPayload: Record<string, any> = {},
): void => {
  const toolName = resolveToolName(segment);
  if (!toolName || (segment.type === 'tool_call' && isPlaceholderToolName(toolName))) {
    return;
  }

  const activityStore = useAgentActivityStore();
  const mergedArguments = resolveArguments(segment, argumentsPayload);
  if (!hasExistingActivity(context, invocationId)) {
    activityStore.addToolActivity(context.state.runId, {
      kind: 'tool',
      activityId: invocationId,
      invocationId,
      toolName,
      type: getActivityType(segment, toolName, mergedArguments),
      status: segment.status,
      contextText: getContextText(toolName, mergedArguments),
      arguments: mergedArguments,
      approvalTarget: segment.approvalTarget ?? null,
      logs: [...segment.logs],
      result: segment.result,
      error: segment.error,
      timestamp: new Date(),
    });
    return;
  }

  syncActivityToolName(context, invocationId, toolName);
  updateToolActivityArguments(context, invocationId, mergedArguments);
  updateToolActivityStatus(context, invocationId, segment.status);
  if (segment.result !== null || segment.error !== null) {
    setToolActivityResult(context, invocationId, segment.result, segment.error);
  }
};

export const syncActivityToolName = (context: AgentContext, invocationId: string, toolName: string): void => {
  const activityStore = useAgentActivityStore();
  activityStore.updateToolActivityToolName(context.state.runId, invocationId, toolName);
};

export const updateToolActivityArguments = (
  context: AgentContext,
  invocationId: string,
  argumentsPayload: Record<string, any>,
): void => {
  const activityStore = useAgentActivityStore();
  activityStore.updateToolActivityArguments(
    context.state.runId,
    invocationId,
    argumentsPayload,
  );
};

export const updateToolActivityStatus = (
  context: AgentContext,
  invocationId: string,
  status: ToolInvocationStatus,
): void => {
  const activityStore = useAgentActivityStore();
  activityStore.updateToolActivityStatus(context.state.runId, invocationId, status);
};

export const updateToolActivityApprovalTarget = (
  context: AgentContext,
  invocationId: string,
  approvalTarget: ToolApprovalTarget | null,
): void => {
  const activityStore = useAgentActivityStore();
  activityStore.updateToolActivityApprovalTarget(context.state.runId, invocationId, approvalTarget);
};

export const setToolActivityResult = (
  context: AgentContext,
  invocationId: string,
  result: any,
  error: string | null,
): void => {
  const activityStore = useAgentActivityStore();
  activityStore.setToolActivityResult(context.state.runId, invocationId, result, error);
};

export const addToolActivityLog = (context: AgentContext, invocationId: string, logEntry: string): void => {
  const activityStore = useAgentActivityStore();
  activityStore.addToolActivityLog(context.state.runId, invocationId, logEntry);
};
