import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

export const RUN_HISTORY_REFRESH_INTERVAL_MS = 5000;

/** One history read: it listed what the node has, or why it did not (the error it threw, else the store's error). */
export type RunHistoryReadResult = Readonly<{ ok: true }> | Readonly<{ ok: false; cause: unknown }>;

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

  const listsAnyRun = (): boolean => (runHistoryStore.agentOrgHistory?.length ?? 0) > 0
    || runHistoryStore.workspaceGroups.some((group) => group.agentDefinitions.some((agent) => agent.runs.length > 0)
      || group.teamDefinitions.some((team) => team.runs.length > 0));

  /** The history read; a read that listed nothing while the store recorded an error did not reach the node. */
  const readHistory = async (): Promise<RunHistoryReadResult> => {
    try {
      await runHistoryStore.fetchTree();
    } catch (cause) {
      return { ok: false, cause };
    }
    if (runHistoryStore.error && !listsAnyRun()) return { ok: false, cause: runHistoryStore.error };
    return { ok: true };
  };

  /** Sets the window and reads the history, the folder catalog and the definitions. */
  const load = async (): Promise<RunHistoryReadResult> => {
    runHistoryStore.setHistoryWindow(options.window());
    const [result] = await Promise.all([
      readHistory(),
      runHistoryStore.loadWorkspaceCatalogForNavigation().catch(() => undefined),
      agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined),
      agentTeamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined),
      agentOrgDefinitionStore.fetchAll().catch(() => undefined),
    ]);
    return result;
  };

  let resolveInitialLoad: (result: RunHistoryReadResult) => void = () => undefined;
  /** The result of the load the host's mount starts. */
  const initialLoad = new Promise<RunHistoryReadResult>((resolve) => { resolveInitialLoad = resolve; });

  let timer: ReturnType<typeof setInterval> | null = null;
  const stopPolling = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const startPolling = (): void => {
    if (timer !== null) return;
    timer = setInterval(() => { void runHistoryStore.refreshTreeQuietly(); }, RUN_HISTORY_REFRESH_INTERVAL_MS);
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
    void runHistoryStore.refreshTreeQuietly();
    startPolling();
  });

  onMounted(async () => {
    const result = await load();
    resolveInitialLoad(result);
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
