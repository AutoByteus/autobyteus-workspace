import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { topLevelRunSources } from '~/stores/topLevelRunSources';
import { buildRunListEntries, type RunListEntry } from '~/utils/runListProjection';

/** How many runs show before "Show older". */
export const RUN_LIST_SHOWN = 5;

/**
 * "Your runs" (autobyteus-378 DS-002): which top-level runs are rows, in which order, with which live status, and the
 * fold over the runs beyond the newest five. It reads the history `runHistoryStore` holds, which the run section loads
 * (`RunSectionPanel`); it never reads the server.
 */
export const useRunListStore = defineStore('runList', () => {
  const runHistory = useRunHistoryStore();

  const entries = computed<RunListEntry[]>(() => {
    // The navigation projection's top-level runs (CR-461-053): no retired run, no delegated run opened from its view.
    const topLevel = topLevelRunSources(runHistory.workspaceGroups);
    return buildRunListEntries({
      workspaceGroups: topLevel.workspaceGroups,
      agentContexts: topLevel.agentContexts,
      agentAvatarByDefinitionId: runHistory.agentAvatarByDefinitionId,
      teamNodes: runHistory.getTeamNodes(),
      agentOrgHistory: runHistory.agentOrgHistory,
    });
  });

  const olderShown = ref(false);
  const olderEntries = computed(() => entries.value.slice(RUN_LIST_SHOWN));
  const shownEntries = computed(() => olderShown.value ? entries.value : entries.value.slice(0, RUN_LIST_SHOWN));
  // Nothing left beyond the newest five (an archive, Archive all older): the fold closes.
  watch(() => olderEntries.value.length === 0, (none) => { if (none) olderShown.value = false; });
  const setOlderShown = (shown: boolean): void => { olderShown.value = shown && olderEntries.value.length > 0; };
  /** Opens the fold when the run is one of the older runs, so its row can be shown. */
  const showRun = (runId: string): void => {
    if (!olderShown.value && olderEntries.value.some((entry) => entry.runId === runId)) olderShown.value = true;
  };
  const entryOf = (runId: string): RunListEntry | null => entries.value.find((entry) => entry.runId === runId) ?? null;

  return { entries, olderEntries, shownEntries, olderShown, setOlderShown, showRun, entryOf };
});
