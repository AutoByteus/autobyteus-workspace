import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';

export const RUN_HISTORY_REFRESH_INTERVAL_MS = 5000;

/**
 * The history load of a run section host (mobile-experience-redesign DS-001): the desktop run section and the phone
 * shell. It sets the read window, reads the history with the folder catalog and the agent, Team and Org definitions,
 * re-reads when the window changes, and polls every 5 s while `polling` is true. It owns no view state: the host gives
 * the window and when to poll.
 */
export const useRunHistorySectionLoad = (options: {
  window: () => number | null;
  polling: () => boolean;
}) => {
  const runHistoryStore = useRunHistoryStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
  const agentOrgDefinitionStore = useAgentOrgDefinitionStore();
  const collaborationStore = useAgentRunCollaborationStore();

  /**
   * Sets the window and reads the history, the folder catalog and the definitions; settles when they are read (the
   * store shows any failure). No read decides anything about the connection (autobyteus-426 SR-008).
   */
  const load = async (): Promise<void> => {
    runHistoryStore.setHistoryWindow(options.window());
    await Promise.all([
      runHistoryStore.fetchTree().catch(() => undefined),
      runHistoryStore.loadWorkspaceCatalogForNavigation().catch(() => undefined),
      agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined),
      agentTeamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined),
      agentOrgDefinitionStore.fetchAll().catch(() => undefined),
    ]);
  };

  let resolveInitialLoad: () => void = () => undefined;
  /** Settles when the load the host's mount starts has finished. */
  const initialLoad = new Promise<void>((resolve) => { resolveInitialLoad = resolve; });

  /**
   * One poll tick: the quiet history read, then the children's states of listed runs that are not open
   * (autobyteus-426 REQ-009); the first load and a window change read the views themselves.
   */
  const pollTick = async (): Promise<void> => {
    await runHistoryStore.refreshTreeQuietly();
    await collaborationStore.refreshListedStatuses(runHistoryStore.activeListedAgentRunIds);
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  const stopPolling = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const startPolling = (): void => {
    if (timer !== null) return;
    timer = setInterval(() => { void pollTick(); }, RUN_HISTORY_REFRESH_INTERVAL_MS);
  };

  // The read window follows the host's view: one read when it changes.
  watch(options.window, (window) => {
    runHistoryStore.setHistoryWindow(window);
    void runHistoryStore.fetchTree().catch(() => undefined);
  });

  let loaded = false;
  let unmounted = false;
  // A poll that resumes (the list shown again, the app back in front) reads at once, then every 5 s.
  watch(options.polling, (polling) => {
    if (!loaded || unmounted) return;
    if (!polling) { stopPolling(); return; }
    void pollTick();
    startPolling();
  });

  onMounted(async () => {
    await load();
    resolveInitialLoad();
    if (unmounted) return;
    loaded = true;
    if (options.polling()) startPolling();
  });

  onBeforeUnmount(() => {
    unmounted = true;
    stopPolling();
  });

  return { load, initialLoad };
};
