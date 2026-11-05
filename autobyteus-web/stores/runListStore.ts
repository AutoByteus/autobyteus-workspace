import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useRunHistoryRetiredRunsStore, withoutRetiredRuns } from '~/stores/runHistoryRetiredRuns';
import { buildRunListEntries, type RunListEntry } from '~/utils/runListProjection';

/** How many runs show before "Show older". */
export const RUN_LIST_SHOWN = 5;

/**
 * "Your runs" (autobyteus-378 DS-002): which top-level runs are rows, in which order, with which live status, and the
 * fold over the runs beyond the newest five. It reads the history the app keeps loaded (`useRunHistoryLoad`); it never
 * reads the server.
 */
export const useRunListStore = defineStore('runList', () => {
  const runHistory = useRunHistoryStore();
  const agentContexts = useAgentContextsStore();
  const teamContexts = useAgentTeamContextsStore();
  const retiredRuns = useRunHistoryRetiredRunsStore();

  const entries = computed<RunListEntry[]>(() => {
    // Runs another window or client archived or deleted leave, as in the navigation projection.
    const topLevel = withoutRetiredRuns({
      workspaceGroups: runHistory.workspaceGroups,
      agentContexts: agentContexts.runs,
      teamContexts: teamContexts.allTeamRuns ?? [],
    }, retiredRuns.retiredRunIds);
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
