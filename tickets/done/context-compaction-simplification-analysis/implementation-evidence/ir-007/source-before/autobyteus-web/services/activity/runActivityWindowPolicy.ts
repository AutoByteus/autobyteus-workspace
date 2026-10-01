import type { RunActivity } from '~/types/activity/RunActivity';
import type { ToolInvocationStatus } from '~/types/segments';
import { assertUnreachableRunActivity } from './runActivityPresentation';

export const RUN_ACTIVITY_WINDOW_LIMIT = 100;

const TERMINAL_TOOL_STATUSES = new Set<ToolInvocationStatus>([
  'success',
  'error',
  'denied',
  'interrupted',
]);

export const isRunActivityComplete = (activity: RunActivity): boolean => {
  switch (activity.kind) {
    case 'system_instruction':
      return true;
    case 'compaction':
      return activity.phase === 'completed' || activity.phase === 'failed';
    case 'tool':
      return TERMINAL_TOOL_STATUSES.has(activity.status);
    default:
      return assertUnreachableRunActivity(activity);
  }
};
