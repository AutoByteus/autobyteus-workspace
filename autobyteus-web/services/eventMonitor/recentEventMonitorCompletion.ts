import type { RunActivity } from '~/types/activity/RunActivity';
import { isRunActivityComplete } from '~/services/activity/runActivityWindowPolicy';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';
import { getStreamSegmentIdentity } from '~/services/agentStreaming/handlers/segmentIdentity';

const TERMINAL_TOOL_STATUSES = new Set<ToolInvocationStatus>([
  'success',
  'error',
  'denied',
  'interrupted',
]);

export const isEventMonitorToolSegment = (
  segment: AIResponseSegment,
): segment is Extract<AIResponseSegment, { status: ToolInvocationStatus }> =>
  segment.type === 'tool_call'
  || segment.type === 'write_file'
  || segment.type === 'terminal_command'
  || segment.type === 'edit_file';

export const isRecentEventMonitorSegmentComplete = (
  segment: AIResponseSegment,
  containingMessageComplete: boolean,
): boolean => {
  if (isEventMonitorToolSegment(segment)) {
    return TERMINAL_TOOL_STATUSES.has(segment.status);
  }
  if (segment.type === 'text' || segment.type === 'think') {
    return containingMessageComplete
      || getStreamSegmentIdentity(segment)?.presentationComplete === true;
  }
  return true;
};

export const isRecentEventMonitorActivityComplete = (activity: RunActivity): boolean => {
  return isRunActivityComplete(activity);
};
