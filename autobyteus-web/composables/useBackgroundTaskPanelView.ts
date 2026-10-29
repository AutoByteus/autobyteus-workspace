import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';
import { AgentBackgroundTaskView } from '~/graphql/queries/agentBackgroundTaskQueries';
import type { AgentBackgroundTaskViewQuery, AgentBackgroundTaskViewQueryVariables } from '~/generated/graphql';
import type { BackgroundTaskPanelRow } from '~/types/backgroundTaskView';

type View = AgentBackgroundTaskViewQuery['agentBackgroundTaskView'];
type Snapshot = Extract<View, { __typename?: 'AgentBackgroundTaskSnapshot' }>;
type Mode = 'loading' | 'snapshot' | 'event-stream' | 'unsupported' | 'unavailable';

/** The expanded selected panel is the only refresh owner. Never activates a run or publishes lifecycle events. */
export const useBackgroundTaskPanelView = (runId: Ref<string>, expanded: Ref<boolean>) => {
  const node = useWindowNodeContextStore();
  const stream = useAgentBackgroundTaskStore();
  const mode = ref<Mode>('loading');
  const snapshot = shallowRef<Snapshot | null>(null);
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let pending: Promise<void> | null = null;
  let controller: AbortController | null = null;

  const tasks = computed<BackgroundTaskPanelRow[]>(() => {
    if (snapshot.value && mode.value !== 'event-stream') return snapshot.value.tasks.map(task => ({
      taskId: task.taskId, kind: 'shell', description: task.description, command: null, summary: null,
      status: task.status, startedAt: task.startedAt, exitCode: task.exitCode ?? null,
    }));
    return runId.value ? stream.getTasks(runId.value) : [];
  });
  const confirmed = computed(() => mode.value === 'snapshot' || mode.value === 'event-stream');
  const snapshotView = computed(() => snapshot.value !== null && mode.value !== 'event-stream');
  const counts = computed(() => ({ running: tasks.value.filter(task => task.status === 'running').length, total: tasks.value.length }));
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };

  const refresh = (): Promise<void> => {
    if (disposed || !expanded.value || !runId.value) return Promise.resolve();
    if (pending) return pending;
    clearTimer();
    const capturedGeneration = generation, selected = runId.value, revision = node.bindingRevision;
    const current = () => !disposed && expanded.value && generation === capturedGeneration && runId.value === selected && node.bindingRevision === revision;
    const abort = new AbortController();
    controller = abort;
    const request = (async () => {
      try {
        if (!await node.waitForBoundBackendReady()) throw new Error('inspection_failed');
        if (!current()) return;
        const client: ApolloClient<NormalizedCacheObject> = getApolloClient();
        const { data, errors } = await client.query<AgentBackgroundTaskViewQuery, AgentBackgroundTaskViewQueryVariables>({
          query: AgentBackgroundTaskView, variables: { agentRunId: selected }, fetchPolicy: 'network-only',
          context: { queryDeduplication: false, fetchOptions: { signal: abort.signal } },
        });
        if (!current()) return;
        if (errors?.length || !data?.agentBackgroundTaskView || data.agentBackgroundTaskView.agentRunId !== selected) throw new Error('inspection_failed');
        const view = data.agentBackgroundTaskView;
        switch (view.__typename) {
          case 'AgentBackgroundTaskSnapshot': snapshot.value = view; mode.value = 'snapshot'; break;
          case 'AgentBackgroundTaskEventStream': snapshot.value = null; mode.value = 'event-stream'; break;
          case 'AgentBackgroundTaskUnsupported': mode.value = 'unsupported'; break;
          default: mode.value = 'unavailable';
        }
      } catch { if (current()) mode.value = 'unavailable'; }
      finally {
        if (current()) {
          pending = null;
          controller = null;
          if (mode.value !== 'event-stream') timer = setTimeout(() => void refresh(), 2_000);
        }
      }
    })();
    pending = request;
    return request;
  };

  watch([runId, () => node.bindingRevision, expanded], ([selected, revision], previous) => {
    generation++; clearTimer(); controller?.abort(); controller = null; pending = null;
    if (!previous || selected !== previous[0] || revision !== previous[1]) snapshot.value = null;
    mode.value = 'loading';
    if (expanded.value && selected) void refresh();
  }, { immediate: true, flush: 'sync' });

  // Network reconnection re-reads this selection, without opening any runtime input path.
  const onOnline = () => { if (expanded.value) void refresh(); };
  onMounted(() => window.addEventListener('online', onOnline));
  onScopeDispose(() => {
    disposed = true; generation++; clearTimer(); controller?.abort();
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  });
  return { tasks, counts, mode, confirmed, snapshotView, refresh };
};
