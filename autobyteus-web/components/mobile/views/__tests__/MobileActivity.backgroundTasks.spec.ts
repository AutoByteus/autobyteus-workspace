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
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

const io = vi.hoisted(() => ({ query: vi.fn() }));
const node = reactive({ bindingRevision: 1, waitForBoundBackendReady: async () => true });
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));

enableAutoUnmount(afterEach);

const target = { context: { state: { runId: 'run-1' }, config: { runtimeKind: 'claude_agent_sdk' } } } as never;
const running = { taskId: 'bg-1', kind: 'shell', description: 'Run the phone probe', command: 'pnpm test:e2e:mobile-shell',
  status: 'running', summary: null, endReason: null, exitCode: null, startedAt: '2026-11-12T10:00:00.000Z' };
const eventStream = (currentTasks: unknown[]) => ({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: 'run-1', currentTasks } } });

beforeEach(() => {
  setActivePinia(createPinia());
  io.query.mockReset();
});

const open = async () => {
  // Activity opens a row's details through the phone's route (autobyteus-590 D-6).
  const router = await createMobileTestRouter({ screen: 'activity' });
  const wrapper = mount(MobileActivity, { props: { target }, global: { plugins: [router], stubs: { MobileRunActivityItem: true } } });
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
    store.upsertTask('run-1', { ...running, status: 'failed', exitCode: 1 } as never);
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

  it.each([
    ['time limit (AC-005)', { status: 'stopped', endReason: 'time_limit', summary: 'Background command "x" was stopped after reaching its background time limit' }, 'Stopped: it reached its time limit — not a failure of the command'],
    ['low memory', { status: 'stopped', endReason: 'low_memory' }, 'Stopped: the computer was low on memory'],
    ['run end (AC-007)', { status: 'stopped', endReason: 'run_ended', summary: 'signal SIGTERM' }, 'Stopped: the run ended'],
    ['stop without a cause (AC-008)', { status: 'stopped', summary: 'signal SIGTERM' }, 'signal SIGTERM'],
  ])('autobyteus-483 says in one line how a task ended: %s', async (_label, end, line) => {
    io.query.mockResolvedValue(eventStream([{ ...running, ...end }]));
    const wrapper = await open();
    expect(wrapper.get('[data-testid="mobile-background-task-end"]').text()).toBe(line);
    expect(wrapper.get('[data-testid="mobile-background-task"]').text()).toContain('Stopped');
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

  // autobyteus-590 D-7: a tap shows the full command and end summary, as the desktop panel's expand does.
  it('a tap on a task shows its full command and end summary; another tap folds it again', async () => {
    const command = `pnpm --filter autobyteus-web exec vitest run ${'components/mobile/views/__tests__/Long.spec.ts '.repeat(6)}--reporter=verbose`;
    const summary = `${'The suite ran 812 tests across 96 files; '.repeat(4)}all passed.`;
    io.query.mockResolvedValue(eventStream([{ ...running, description: 'Run the suite', command, status: 'completed', summary, exitCode: null }]));
    const wrapper = await open();
    const toggle = wrapper.get('[data-testid="mobile-background-task-toggle"]');
    const commandLine = () => wrapper.get('[data-testid="mobile-background-task-command"]');
    const endLine = () => wrapper.get('[data-testid="mobile-background-task-end"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(commandLine().classes()).toContain('line-clamp-2');
    expect(endLine().classes()).toContain('line-clamp-3');
    expect(toggle.classes()).toContain('min-h-[2.75rem]');

    await toggle.trigger('click');
    expect(wrapper.get('[data-testid="mobile-background-task-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(commandLine().classes()).not.toContain('line-clamp-2');
    expect(commandLine().text()).toBe(command);
    expect(endLine().classes()).not.toContain('line-clamp-3');
    expect(endLine().text()).toBe(summary);

    await wrapper.get('[data-testid="mobile-background-task-toggle"]').trigger('click');
    expect(commandLine().classes()).toContain('line-clamp-2');
  });

  it('a task whose title is its command (Antigravity, native) unfolds its title on tap', async () => {
    const command = `sleep 4 # background step 51 ${'pnpm --filter autobyteus-web exec vitest run --reporter=verbose '.repeat(3)}`.trim();
    io.query.mockResolvedValue(eventStream([{ ...running, description: '', command }]));
    const wrapper = await open();
    const title = () => wrapper.get('[data-testid="mobile-background-task-title"]');
    expect(title().text()).toBe(command);
    expect(wrapper.find('[data-testid="mobile-background-task-command"]').exists()).toBe(false);
    expect(title().classes()).toContain('line-clamp-2');
    await wrapper.get('[data-testid="mobile-background-task-toggle"]').trigger('click');
    expect(title().classes()).not.toContain('line-clamp-2');
  });
});

