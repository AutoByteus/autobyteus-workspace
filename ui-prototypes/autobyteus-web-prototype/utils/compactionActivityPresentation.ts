import type { CompactionStatusPhase } from '~/types/agent/AgentRunState';
import type { CompactionActivity } from '~/types/activity/RunActivity';

export type CompactionTone = 'amber' | 'blue' | 'emerald' | 'red';

export interface CompactionPhasePresentation {
  label: string;
  icon: string;
  tone: CompactionTone;
  isCompacting: boolean;
}

export const getCompactionPhasePresentation = (
  phase: CompactionStatusPhase,
): CompactionPhasePresentation => {
  switch (phase) {
    case 'failed':
      return { label: 'Failed', icon: 'heroicons:x-circle-solid', tone: 'red', isCompacting: false };
    case 'completed':
      return { label: 'Completed', icon: 'heroicons:check-circle-solid', tone: 'emerald', isCompacting: false };
    case 'started':
      return { label: 'Compacting', icon: 'heroicons:arrow-path-solid', tone: 'blue', isCompacting: true };
    case 'requested':
    default:
      return { label: 'Queued', icon: 'heroicons:clock-solid', tone: 'amber', isCompacting: false };
  }
};

export const getCompactionSecondaryText = (activity: CompactionActivity): string => {
  const parts: string[] = [];
  if (activity.turnId) parts.push(`Turn: ${activity.turnId}`);
  if (activity.rawTraceCount != null) parts.push(`${activity.rawTraceCount} raw traces`);
  if (activity.semanticFactCount != null) parts.push(`${activity.semanticFactCount} facts`);
  if (activity.provider) parts.push(`Provider: ${activity.provider}`);
  return parts.join(' · ');
};

export const getCompactionMessage = (input: {
  phase: CompactionStatusPhase;
  errorMessage?: string | null;
  isProviderBoundary?: boolean;
}): string => {
  if (input.isProviderBoundary) {
    switch (input.phase) {
      case 'failed':
        return input.errorMessage || 'Provider context compaction failed';
      case 'completed':
        return 'Provider context compaction boundary recorded';
      case 'started':
        return 'Provider context compaction started';
      case 'requested':
      default:
        return 'Provider context compaction queued';
    }
  }

  switch (input.phase) {
    case 'requested':
      return 'Compaction queued';
    case 'started':
      return 'Compacting memory…';
    case 'completed':
      return 'Memory compacted';
    case 'failed':
      return input.errorMessage || 'Compaction failed — see logs';
    default:
      return 'Compaction update';
  }
};
