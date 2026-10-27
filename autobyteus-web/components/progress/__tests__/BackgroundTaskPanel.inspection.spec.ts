import { reactive } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCatalog } from '~/localization/runtime/catalogRegistry';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';
import BackgroundTaskPanel from '../BackgroundTaskPanel.vue';

const io = vi.hoisted(() => ({ query: vi.fn() }));
const selection = reactive({ activeAgentContext: { state: { runId: 'run-1' } } });
const node = reactive({ bindingRevision: 1, waitForBoundBackendReady: async () => true });
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => selection }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const catalog = getCatalog('en') as Record<string, string>;
const t = (key: string, params: Record<string, unknown> = {}) => {
  if (catalog[key] === undefined) throw new Error(`Missing label ${key}`);
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), catalog[key]!);
};
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t }) }));
const snapshot = (id = 'run-1', tasks: unknown[] = [], instance = 'instance-1') => ({
  data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskSnapshot', agentRunId: id, runInstanceId: instance, observedAt: '2026-10-26T00:00:00Z', tasks } },
});
const row = { taskId: 'safe-local-id', kind: 'shell', description: 'bash', command: null, status: 'running', exitCode: null, startedAt: '2026-10-26T00:00:00Z' };
const unavailable = (id = 'run-1') => ({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskUnavailable', agentRunId: id, reason: 'inactive' } } });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(r => { resolve = r; }); return { promise, resolve }; };
let wrapper: VueWrapper | undefined;
const show = () => wrapper = mount(BackgroundTaskPanel, { props: { collapsed: false }, global: { stubs: { Icon: true }, mocks: { $t: t } } });
beforeEach(() => {
  setActivePinia(createPinia()); vi.useFakeTimers(); io.query.mockReset();
  selection.activeAgentContext = { state: { runId: 'run-1' } }; node.bindingRevision = 1;
  io.query.mockResolvedValue(unavailable());
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.useRealTimers(); });

describe('selected background inspection panel', () => {
  it('preserves first-entry and reselected stream rows while loading and inactive, without a snapshot cache', async () => {
    const store = useAgentBackgroundTaskStore(); store.upsertTask('run-1', { ...row, status: 'running', kind: 'shell', summary: null });
    const read = deferred(); io.query.mockReturnValueOnce(read.promise); const panel = show();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(1);
    expect(panel.get('[data-test="background-tasks-counts"]').text()).toContain('last-known');
    expect(panel.get('[data-test="background-tasks-availability"]').text()).toContain('Recorded');
    await flushPromises(); read.resolve(unavailable()); await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(1);
    selection.activeAgentContext = { state: { runId: 'other' } }; await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(0);
    selection.activeAgentContext = { state: { runId: 'run-1' } }; await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(1);
  });
  it('does not confuse loading/unavailable plus empty store with successful empty', async () => {
    const panel = show(); expect(panel.find('[data-test="background-tasks-empty"]').exists()).toBe(false);
    await flushPromises(); expect(panel.find('[data-test="background-tasks-empty"]').exists()).toBe(false);
    io.query.mockResolvedValue(snapshot()); await vi.advanceTimersByTimeAsync(2_000); await flushPromises();
    expect(panel.get('[data-test="background-tasks-empty"]').text()).toBe('No tracked background commands');
  });
  it('uses successful snapshots exclusively, renders unknown and numeric exit without raw content expansion', async () => {
    useAgentBackgroundTaskStore().upsertTask('run-1', { ...row, taskId: 'stream', kind: 'shell', status: 'running', summary: 'STREAM_OUTPUT_SECRET', command: 'RAW_SECRET' });
    io.query.mockResolvedValue(snapshot('run-1', [{ ...row, status: 'unknown', exitCode: -1 }])); const panel = show(); await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(1);
    expect(panel.get('[data-test="background-task-row"]').attributes('data-status')).toBe('unknown');
    expect(panel.get('[data-test="background-task-exit"]').text()).toBe('Exit code -1');
    expect(panel.find('[data-test="background-task-command"]').exists()).toBe(false);
    expect(panel.html()).not.toContain('SECRET'); expect(panel.html()).not.toMatch(/Stop command/);
    expect(panel.get('[data-test="background-task-observed"]').text()).toContain('safe-loc');
  });
  it('keeps last successful snapshot, not stream rows, on a later failure and replaces instance history', async () => {
    io.query.mockResolvedValueOnce(snapshot('run-1', [row])); const panel = show(); await flushPromises();
    io.query.mockRejectedValueOnce(new Error('SECRET_ERROR')); await vi.advanceTimersByTimeAsync(2_000); await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(1);
    expect(panel.get('[data-test="background-tasks-counts"]').text()).toContain('last-known'); expect(panel.html()).not.toContain('SECRET_ERROR');
    io.query.mockResolvedValue(snapshot('run-1', [], 'replacement')); await vi.advanceTimersByTimeAsync(2_000); await flushPromises();
    expect(panel.findAll('[data-test="background-task-row"]')).toHaveLength(0);
    expect(panel.get('[data-test="background-tasks-empty"]').text()).toBe('No tracked background commands');
  });
  it.each(['run', 'node'])('discards delayed responses after a %s selection change', async changed => {
    const old = deferred(); io.query.mockReturnValueOnce(old.promise); const panel = show(); await flushPromises();
    const selected = changed === 'run' ? 'run-2' : 'run-1';
    io.query.mockResolvedValue(snapshot(selected, [{ ...row, taskId: 'current', description: 'current' }]));
    if (changed === 'run') selection.activeAgentContext = { state: { runId: selected } }; else node.bindingRevision++;
    await flushPromises(); old.resolve(snapshot('run-1', [{ ...row, description: 'obsolete' }])); await flushPromises();
    expect(panel.text()).toContain('current'); expect(panel.text()).not.toContain('obsolete');
  });
  it('never overlaps refreshes, stops while collapsed/disposed, and rereads on entry', async () => {
    const held = deferred(); io.query.mockReturnValueOnce(held.promise); const panel = show(); await flushPromises();
    await vi.advanceTimersByTimeAsync(10_000); expect(io.query).toHaveBeenCalledTimes(1);
    held.resolve(snapshot()); await flushPromises(); await panel.setProps({ collapsed: true });
    await vi.advanceTimersByTimeAsync(10_000); expect(io.query).toHaveBeenCalledTimes(1);
    io.query.mockResolvedValue(snapshot()); await panel.setProps({ collapsed: false }); await flushPromises(); expect(io.query).toHaveBeenCalledTimes(2);
    panel.unmount(); wrapper = undefined; await vi.advanceTimersByTimeAsync(10_000); expect(io.query).toHaveBeenCalledTimes(2);
  });
  it('selects the existing reactive event store and stops polling for an event-stream capability', async () => {
    io.query.mockResolvedValue({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: 'run-1' } } });
    const panel = show(); await flushPromises(); const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', { ...row, kind: 'shell', status: 'completed', summary: 'recorded outcome' }); await flushPromises();
    expect(panel.text()).toContain('recorded outcome'); expect(panel.get('[data-test="background-tasks-counts"]').text()).toBe('0 running · 1 total');
    await vi.advanceTimersByTimeAsync(10_000); expect(io.query).toHaveBeenCalledTimes(1);
  });
});
