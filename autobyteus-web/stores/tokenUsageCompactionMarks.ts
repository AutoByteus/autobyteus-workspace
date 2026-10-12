import { reactive } from 'vue';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

/**
 * Live-session "Compacted — updates on the next model call" marks (D-13). A mark records the
 * run's exact-run summary revision when its compaction completed; the next newer revision (the
 * run's next model call) clears it. Owned by `tokenUsageMeterStore`, which holds the summaries.
 */
export const createTokenUsageCompactionMarks = (
  runSummaries: Readonly<Record<string, TokenUsageRunSummary>>,
  teamMemberSummaries: Readonly<Record<string, TokenUsageRunSummary>>,
) => {
  const revisionAtCompaction = reactive<Record<string, number | null>>({});
  /** The run's own summary: a standalone/Org exact run, or a Team member keyed `team\0agentRun`. */
  const exactRunRevision = (runId: string): number | null => runSummaries[runId]?.revision
    ?? Object.entries(teamMemberSummaries).find(([key]) => key.endsWith(`\u0000${runId}`))?.[1].revision
    ?? null;

  function markCompactionCompleted(runIdValue: string | null | undefined): void {
    const runId = runIdValue?.trim();
    if (runId) revisionAtCompaction[runId] = exactRunRevision(runId);
  }

  /** Pure read (safe inside computed): any newer exact revision means the mark no longer applies. */
  function isAwaitingPostCompactionReading(runIdValue: string | null | undefined): boolean {
    const runId = runIdValue?.trim();
    return Boolean(runId && runId in revisionAtCompaction && exactRunRevision(runId) === revisionAtCompaction[runId]);
  }

  return { markCompactionCompleted, isAwaitingPostCompactionReading };
};
