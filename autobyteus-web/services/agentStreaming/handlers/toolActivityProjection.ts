import type { AgentContext } from '~/types/agent/AgentContext';
import type { EditFileSegment, TerminalCommandSegment, ToolCallSegment, ToolInvocationStatus, WriteFileSegment } from '~/types/segments';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { buildInvocationAliases, invocationIdsMatch } from '~/utils/invocationAliases';
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

const resolveActivityInvocationIds = (context: AgentContext, invocationId: string): string[] => {
  const activityStore = useAgentActivityStore();
  const aliases = buildInvocationAliases(invocationId);
  const existingIds = activityStore
    .getActivities(context.state.runId)
    .map((activity) => activity.invocationId)
    .filter((activityInvocationId) => invocationIdsMatch(activityInvocationId, invocationId));

  return [...new Set([...aliases, ...existingIds])];
};

const hasExistingActivity = (context: AgentContext, invocationId: string): boolean => {
  const activityStore = useAgentActivityStore();
  return activityStore
    .getActivities(context.state.runId)
    .some((activity) => invocationIdsMatch(activity.invocationId, invocationId));
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
    activityStore.addActivity(context.state.runId, {
      invocationId,
      toolName,
      type: getActivityType(segment, toolName, mergedArguments),
      status: segment.status,
      contextText: getContextText(toolName, mergedArguments),
      arguments: mergedArguments,
      logs: [...segment.logs],
      result: segment.result,
      error: segment.error,
      timestamp: new Date(),
    });
    return;
  }

  syncActivityToolName(context, invocationId, toolName);
  updateActivityArguments(context, invocationId, mergedArguments);
  updateActivityStatus(context, invocationId, segment.status);
  if (segment.result !== null || segment.error !== null) {
    setActivityResult(context, invocationId, segment.result, segment.error);
  }
};

export const syncActivityToolName = (context: AgentContext, invocationId: string, toolName: string): void => {
  const activityStore = useAgentActivityStore();
  for (const activityInvocationId of resolveActivityInvocationIds(context, invocationId)) {
    activityStore.updateActivityToolName(context.state.runId, activityInvocationId, toolName);
  }
};

export const updateActivityArguments = (
  context: AgentContext,
  invocationId: string,
  argumentsPayload: Record<string, any>,
): void => {
  const activityStore = useAgentActivityStore();
  for (const activityInvocationId of resolveActivityInvocationIds(context, invocationId)) {
    activityStore.updateActivityArguments(
      context.state.runId,
      activityInvocationId,
      argumentsPayload,
    );
  }
};

export const updateActivityStatus = (
  context: AgentContext,
  invocationId: string,
  status: ToolInvocationStatus,
): void => {
  const activityStore = useAgentActivityStore();
  for (const activityInvocationId of resolveActivityInvocationIds(context, invocationId)) {
    activityStore.updateActivityStatus(context.state.runId, activityInvocationId, status);
  }
};

export const setActivityResult = (
  context: AgentContext,
  invocationId: string,
  result: any,
  error: string | null,
): void => {
  const activityStore = useAgentActivityStore();
  for (const activityInvocationId of resolveActivityInvocationIds(context, invocationId)) {
    activityStore.setActivityResult(context.state.runId, activityInvocationId, result, error);
  }
};

export const addActivityLog = (context: AgentContext, invocationId: string, logEntry: string): void => {
  const activityStore = useAgentActivityStore();
  for (const activityInvocationId of resolveActivityInvocationIds(context, invocationId)) {
    activityStore.addActivityLog(context.state.runId, activityInvocationId, logEntry);
  }
};
