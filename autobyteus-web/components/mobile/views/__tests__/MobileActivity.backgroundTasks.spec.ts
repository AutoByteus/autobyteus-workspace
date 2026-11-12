// autobyteus-473 DS-001: the phone's Activity shows the open agent's background tasks above its tool calls: the desktop
// panel's data (the shared view and store), including tasks started before the phone opened the run, updated live by
// stream events; none for a runtime that does not report background tasks.
// Production: MobileActivity, MobileBackgroundTasks, useBackgroundTaskPanelView, agentBackgroundTaskStore.
// Doubled: the node binding and Apollo (the background-task view's answer).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import MobileActivity from '../MobileActivity.vue';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';

const io = vi.hoisted(() => ({ query: vi.fn() }));
const node = reactive({ bindingRevision: 1, waitForBoundBackendReady: async () => true });
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));

enableAutoUnmount(afterEach);

const target = { context: { state: { runId: 'run-1' }, config: { runtimeKind: 'claude_agent_sdk' } } } as never;
const running = { taskId: 'bg-1', kind: 'shell', description: 'Run the phone probe', command: 'pnpm test:e2e:mobile-shell',
  status: 'running', summary: null, startedAt: '2026-11-12T10:00:00.000Z' };
const eventStream = (currentTasks: unknown[]) => ({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: 'run-1', currentTasks } } });

beforeEach(() => {
  setActivePinia(createPinia());
  io.query.mockReset();
});

const open = async () => {
  const wrapper = mount(MobileActivity, { props: { target }, global: { stubs: { MobileRunActivityItem: true } } });
  await flushPromises();
  return wrapper;
};

describe('the phone Activity: background tasks (autobyteus-473)', () => {
  it('AC-001 lists a task started before Activity opened as running, with its command and start time', async () => {
    io.query.mockResolvedValue(eventStream([running]));
    const wrapper = await open();
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { agentRunId: 'run-1' } }));
    const section = wrapper.get('[data-testid="mobile-background-tasks"]');
    expect(section.text()).toContain('Background tasks');
    expect(wrapper.get('[data-testid="mobile-background-tasks-counts"]').text()).toBe('1 running');
    const row = wrapper.get('[data-testid="mobile-background-task"]');
    expect(row.attributes('data-status')).toBe('running');
    expect(row.text()).toContain('Run the phone probe');
    expect(row.text()).toContain('Running');
    expect(row.get('[data-testid="mobile-background-task-command"]').text()).toBe('pnpm test:e2e:mobile-shell');
    expect(row.get('[data-testid="mobile-background-task-started"]').text()).toMatch(/^Started /);
    expect(row.find('[data-testid="mobile-background-task-end"]').exists()).toBe(false);
    // Above the tool calls; the empty state is not shown.
    expect(wrapper.find('[data-testid="mobile-activity-empty"]').exists()).toBe(false);
  });

  it('AC-001, AC-002 follows the stream: the task ends with its exit code; a task started while open appears', async () => {
    io.query.mockResolvedValue(eventStream([running]));
    const wrapper = await open();
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', { ...running, status: 'failed', summary: 'exit code 1' } as never);
    store.upsertTask('run-1', { ...running, taskId: 'bg-2', description: 'Build the app', command: 'Build the app', startedAt: '2026-11-12T11:00:00.000Z' } as never);
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="mobile-background-task"]');
    // Newest first.
    expect(rows.map((row) => row.attributes('data-status'))).toEqual(['running', 'failed']);
    expect(rows[0]!.text()).toContain('Build the app');
    expect(rows[0]!.find('[data-testid="mobile-background-task-command"]').exists()).toBe(false);
    expect(rows[1]!.get('[data-testid="mobile-background-task-end"]').text()).toBe('exit code 1');
    expect(rows[1]!.text()).toContain('Failed');
  });

  it('REQ-004 shows no section for a runtime that does not report background tasks, nor when there are none', async () => {
    io.query.mockResolvedValue({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskUnsupported', agentRunId: 'run-1', reason: 'unsupported' } } });
    const unsupported = await open();
    expect(unsupported.find('[data-testid="mobile-background-tasks"]').exists()).toBe(false);
    expect(unsupported.get('[data-testid="mobile-activity-empty"]').text()).toBe('No activity yet');
    unsupported.unmount();

    io.query.mockResolvedValue(eventStream([]));
    const none = await open();
    expect(none.find('[data-testid="mobile-background-tasks"]').exists()).toBe(false);
  });

  it('shows a polled runtime\'s tasks too, with their exit code (the desktop panel\'s snapshot rows)', async () => {
    io.query.mockResolvedValue({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskSnapshot', agentRunId: 'run-1', runInstanceId: 'i-1',
      observedAt: '2026-11-12T10:00:00Z', tasks: [{ taskId: 'c-1', kind: 'shell', description: 'node', command: null, status: 'failed', exitCode: 2, startedAt: '2026-11-12T10:00:00Z' }] } } });
    const wrapper = await open();
    const row = wrapper.get('[data-testid="mobile-background-task"]');
    expect(row.text()).toContain('node');
    expect(row.get('[data-testid="mobile-background-task-end"]').text()).toBe('exit code 2');
  });
});
