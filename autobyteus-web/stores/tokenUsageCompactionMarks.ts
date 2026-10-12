import { reactive } from 'vue';

/**
 * Live-session "Compacted — updates on the next model call" marks (D-13, SR-014). A completed
 * compaction marks its run; only the next live token-usage event for that same run that reports a
 * model call clears it. Fetched or hydrated summaries and events without a model call (the Claude
 * turn-end remainder, a series-restart result, Codex reading-only updates) never clear it, so the
 * mark needs no baseline and works when no exact summary is loaded. Owned by
 * `tokenUsageMeterStore`, which routes the live events.
 */
export const createTokenUsageCompactionMarks = () => {
  const marked = reactive<Record<string, true>>({});

  function markCompactionCompleted(runIdValue: string | null | undefined): void {
    const runId = runIdValue?.trim();
    if (runId) marked[runId] = true;
  }

  /** Idempotent: a Team event may reach both live entry points. */
  function clearOnLiveModelCall(runId: string, reportsModelCall: boolean | undefined): void {
    if (reportsModelCall === true) delete marked[runId];
  }

  function isAwaitingPostCompactionReading(runIdValue: string | null | undefined): boolean {
    const runId = runIdValue?.trim();
    return Boolean(runId && marked[runId]);
  }

  return { markCompactionCompleted, clearOnLiveModelCall, isAwaitingPostCompactionReading };
};
