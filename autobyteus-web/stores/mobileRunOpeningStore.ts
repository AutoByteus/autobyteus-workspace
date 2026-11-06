import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

/**
 * The phone's pending open (autobyteus-277 AR-001): the tree row a tap is opening, from the tap until the shared open
 * action commits or fails. The run screen shows "Opening…" while one is pending, never the previous target. The open
 * sequence (`useMobileRunOpening`) writes it; the run screen reads it. A stale key's outcome is ignored.
 */
export const useMobileRunOpeningStore = defineStore('mobileRunOpening', () => {
  const pending = shallowRef<Readonly<{ key: string; status: 'opening' }> | null>(null);
  /** The last open that did not commit; a new object each time, so the run screen sees each failure. */
  const failure = shallowRef<Readonly<{ key: string }> | null>(null);

  /** A new open supersedes any in flight: its selection intent ends now, so its late commit cannot be taken for this one. */
  const begin = (key: string): void => {
    useAgentSelectionStore().invalidateSelectionIntent();
    pending.value = Object.freeze({ key, status: 'opening' });
  };
  const commit = (key: string): void => {
    if (pending.value?.key === key) pending.value = null;
  };
  const fail = (key: string): void => {
    if (pending.value?.key !== key) return;
    pending.value = null;
    failure.value = Object.freeze({ key });
  };

  return { pending, failure, begin, commit, fail };
});
