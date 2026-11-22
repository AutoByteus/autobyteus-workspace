import type { CompactionStatusPhase } from '~/types/activity/compactionPhase';
import type { CompactionActivity } from '~/types/activity/RunActivity';

export type CompactionTone = 'amber' | 'blue' | 'emerald' | 'red' | 'gray';

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
    case 'stopped':
      return { label: 'Stopped', icon: 'heroicons:stop-circle-solid', tone: 'gray', isCompacting: false };
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
  if (input.phase === 'stopped') return 'Stopped';
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

export interface CompactionActivityDetailRow {
  label: string;
  value: string;
}

const formatCount = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : null;

/**
 * The rows of a compaction's details, in order, each only when it has a value: one owner for the desktop Activity panel
 * and the phone's detail screen (autobyteus-590 D-4).
 */
export const compactionActivityDetailRows = (activity: CompactionActivity): CompactionActivityDetailRow[] => {
  const rows: CompactionActivityDetailRow[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };

  add('Turn', activity.turnId ?? null);
  add('Task', activity.compactionTaskId ?? null);
  add('Provider', activity.provider ?? null);
  add('Boundary', activity.boundaryKey ?? null);
  add('Source', activity.sourceSurface ?? null);
  add('Run', activity.compactionRunId ?? null);
  add('Agent', activity.compactionAgentName ?? null);
  add('Model', activity.compactionModelIdentifier);
  add('Summarizer provider', activity.summarizerProvider);
  add('Completion', activity.completionStatus);
  add('Summary characters', formatCount(activity.summaryCharCount));
  add('Summary tokens (estimated)', formatCount(activity.summaryTokenCount));
  add('Raw traces', formatCount(activity.rawTraceCount));
  add('Compacted blocks', formatCount(activity.compactedBlockCount));
  add('Facts', formatCount(activity.semanticFactCount));
  add('Error', activity.errorMessage ?? null);

  return rows;
};
