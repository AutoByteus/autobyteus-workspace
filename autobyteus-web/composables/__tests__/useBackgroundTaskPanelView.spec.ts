// autobyteus-609 D-I: when the run a task list shows stops (its status turns Offline from live), each task still shown
// running ends as the run's end does ("Stopped: the run ended"), even when the live end update was lost. The first status
// never counts, nor does switching to another run. A stopped run's list is not re-read every 2 s; it is read once when the
// run is live again.
// Production: useBackgroundTaskPanelView, agentBackgroundTaskStore. Doubled: the node binding and Apollo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, reactive, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useBackgroundTaskPanelView } from '../useBackgroundTaskPanelView';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';

const io = vi.hoisted(() => ({ query: vi.fn() }));
const node = reactive({ bindingRevision: 1, waitForBoundBackendReady: async () => true });
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));

const task = (taskId: string, status: 'running' | 'completed', startedAt = '2026-11-22T10:00:00.000Z') => ({
  taskId, kind: 'shell' as const, description: `Task ${taskId}`, command: `cmd ${taskId}`, status, summary: null,
  endReason: null, exitCode: status === 'completed' ? 0 : null, startedAt,
});
const eventStream = (runId: string, currentTasks: unknown[]) => ({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: runId, currentTasks } } });
const inactive = (runId: string) => ({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskUnavailable', agentRunId: runId, reason: 'inactive' } } });

const scopes: Array<ReturnType<typeof effectScope>> = [];
const view = (runId: string, stopped: boolean) => {
  const selected = ref(runId);
  const runStopped = ref(stopped);
  const scope = effectScope();
  scopes.push(scope);
  const result = scope.run(() => useBackgroundTaskPanelView(selected, ref(true), runStopped))!;
  return { selected, runStopped, result };
};

describe('useBackgroundTaskPanelView: the run stops (autobyteus-609 D-I)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    io.query.mockReset();
  });
  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
    vi.useRealTimers();
  });

  it('live → Offline: a task still shown running ends as the run\'s end; an ended task keeps its end', async () => {
    io.query.mockResolvedValue(eventStream('run-1', [task('bg-1', 'running'), task('bg-2', 'completed', '2026-11-22T09:00:00.000Z')]));
    const { runStopped, result } = view('run-1', false);
    await flushPromises();
    expect(result.tasks.value.map((row) => [row.taskId, row.status])).toEqual([['bg-1', 'running'], ['bg-2', 'completed']]);

    runStopped.value = true;
    await nextTick();
    expect(result.tasks.value).toEqual([
      expect.objectContaining({ taskId: 'bg-1', status: 'stopped', endReason: 'run_ended', exitCode: null }),
      expect.objectContaining({ taskId: 'bg-2', status: 'completed', exitCode: 0, endReason: null }),
    ]);
    expect(result.counts.value).toEqual({ running: 0, total: 2 });
  });

  it('a run first seen Offline ends nothing (its first status never counts)', async () => {
    io.query.mockResolvedValue(eventStream('run-1', [task('bg-1', 'running')]));
    const { result } = view('run-1', true);
    await flushPromises();
    expect(result.tasks.value.map((row) => row.status)).toEqual(['running']);
  });

  it('switching to another run whose status reads Offline ends nothing of either', async () => {
    useAgentBackgroundTaskStore().upsertTask('run-2', task('bg-9', 'running'));
    io.query.mockImplementation(async ({ variables }: { variables: { agentRunId: string } }) => eventStream(variables.agentRunId,
      variables.agentRunId === 'run-1' ? [task('bg-1', 'running')] : [task('bg-9', 'running')]));
    // As the callers do: the run and its liveness both come from the one selected context.
    const context = ref({ runId: 'run-1', offline: false });
    const scope = effectScope();
    scopes.push(scope);
    const result = scope.run(() => useBackgroundTaskPanelView(computed(() => context.value.runId), ref(true), computed(() => context.value.offline)))!;
    await flushPromises();
    context.value = { runId: 'run-2', offline: true };
    await flushPromises();
    expect(result.tasks.value.map((row) => [row.taskId, row.status])).toEqual([['bg-9', 'running']]);
    expect(useAgentBackgroundTaskStore().getTasks('run-1').map((row) => row.status)).toEqual(['running']);
  });

  it('a stopped run is not re-read every 2 s; when it is live again it is read once', async () => {
    vi.useFakeTimers();
    io.query.mockResolvedValue(inactive('run-1'));
    const { runStopped } = view('run-1', false);
    await flushPromises();
    expect(io.query).toHaveBeenCalledTimes(1);
    // Live with an inactive answer: the existing 2 s re-read.
    await vi.advanceTimersByTimeAsync(2_100);
    expect(io.query).toHaveBeenCalledTimes(2);

    runStopped.value = true;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(io.query).toHaveBeenCalledTimes(2);

    runStopped.value = false;
    await flushPromises();
    expect(io.query).toHaveBeenCalledTimes(3);
  });
});
