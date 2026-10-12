import { reactive } from 'vue';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

/**
 * Live-session "Compacted — updates on the next model call" marks (D-13). A mark records the
 * run's exact-run model-call count (`usageReportCount`) when its compaction completed; only the
 * run's next counted model call clears it. A save without a call (the Claude turn-end remainder
 * after a manual `/compact`) advances `revision` but keeps the mark (SR-012). Owned by
 * `tokenUsageMeterStore`, which holds the summaries.
 */
export const createTokenUsageCompactionMarks = (
  runSummaries: Readonly<Record<string, TokenUsageRunSummary>>,
  teamMemberSummaries: Readonly<Record<string, TokenUsageRunSummary>>,
) => {
  const modelCallsAtCompaction = reactive<Record<string, number | null>>({});
  /** The run's own summary: a standalone/Org exact run, or a Team member keyed `team\0agentRun`. */
  const exactRunModelCalls = (runId: string): number | null => runSummaries[runId]?.usageReportCount
    ?? Object.entries(teamMemberSummaries).find(([key]) => key.endsWith(`\u0000${runId}`))?.[1].usageReportCount
    ?? null;

  function markCompactionCompleted(runIdValue: string | null | undefined): void {
    const runId = runIdValue?.trim();
    if (runId) modelCallsAtCompaction[runId] = exactRunModelCalls(runId);
  }

  /** Pure read (safe inside computed): a model call reported since the compaction ends the mark. */
  function isAwaitingPostCompactionReading(runIdValue: string | null | undefined): boolean {
    const runId = runIdValue?.trim();
    return Boolean(runId && runId in modelCallsAtCompaction && exactRunModelCalls(runId) === modelCallsAtCompaction[runId]);
  }

  return { markCompactionCompleted, isAwaitingPostCompactionReading };
};
