import type { CompactionActivity, RunActivity } from '~/types/activity/RunActivity';
import type { AgentCompactionStatus } from '~/types/agent/AgentRunState';
import { isActiveCompactionPhase, isCompleteCompactionPhase } from '~/types/activity/compactionPhase';

export const isNativeCompactionIdentity = (value: AgentCompactionStatus): boolean => {
  const operation = value.compactionOperationId;
  return typeof operation === 'string' && operation.trim().length > 0
    && value.activityId === `compaction:operation:${operation}`
    && ![value.provider, value.sourceSurface, value.boundaryKey,
      value.providerEventId, value.providerSessionId].some(Boolean);
};

export const isNativeCompactionActivity = (activity: RunActivity): activity is CompactionActivity =>
  activity.kind === 'compaction' && isNativeCompactionIdentity(activity);

export const stopNativeCompactionActivity = (activity: CompactionActivity, at: Date): CompactionActivity =>
  isNativeCompactionIdentity(activity) && isActiveCompactionPhase(activity.phase)
    ? { ...activity, phase: 'stopped', message: 'Stopped', updatedAt: at,
        centerTimelineTimestamp: activity.centerTimelineTimestamp ?? at }
    : activity;

// Projection covers saved facts, not native live status. Only preserve facts already held
// by this run's bounded activity window; live events remain free to start a fresh attempt.
export const retainTerminalNativeActivities = (
  projected: readonly RunActivity[], current: readonly RunActivity[],
): RunActivity[] => {
  const combined = new Map(projected.map((activity) => [activity.activityId, activity]));
  for (const activity of current) {
    if (!isNativeCompactionActivity(activity) || !isCompleteCompactionPhase(activity.phase)) continue;
    const incoming = combined.get(activity.activityId);
    if (!incoming || (isNativeCompactionActivity(incoming) && !isCompleteCompactionPhase(incoming.phase))) {
      combined.set(activity.activityId, activity);
    }
  }
  return [...combined.values()].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
};
