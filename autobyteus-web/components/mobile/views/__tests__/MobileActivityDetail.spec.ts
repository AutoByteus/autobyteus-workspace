// autobyteus-590 D-6: a tap on a phone Activity row opens its details over the list (the `activityItem` route key): a
// tool call's status word, full summary and its Arguments, Logs, Result and Error, read live from the run's activities; a
// compaction's rows with its error. Back returns to the list, which stayed mounted where it was.
// Production: MobileActivity, MobileRunActivityItem, MobileActivityDetail, useMobileNavigation, agentActivityStore.
// Doubled: the node binding and Apollo (the background-task view's answer: none).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import MobileActivity from '../MobileActivity.vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';
import type { ToolActivity } from '~/types/activity/RunActivity';

const io = vi.hoisted(() => ({ query: vi.fn() }));
const node = reactive({ bindingRevision: 1, waitForBoundBackendReady: async () => true });
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));

enableAutoUnmount(afterEach);

const target = { context: { state: { runId: 'run-1' }, config: { runtimeKind: 'autobyteus' } } } as never;
const tool = (patch: Partial<ToolActivity>): ToolActivity => ({
  kind: 'tool', activityId: 'call-1', timestamp: new Date(0), invocationId: 'call-1', toolName: 'run_bash', type: 'terminal_command',
  status: 'executing', arguments: { command: 'cd /Users/me/repo && pnpm test' }, logs: ['collecting'], result: null, error: null, ...patch,
});

beforeEach(() => {
  setActivePinia(createPinia());
  io.query.mockReset();
  io.query.mockResolvedValue({ data: { agentBackgroundTaskView: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: 'run-1', currentTasks: [] } } });
});

const open = async (query: Record<string, string> = { screen: 'activity' }) => {
  const router = await createMobileTestRouter(query);
  const wrapper = mount(MobileActivity, { props: { target }, global: { plugins: [router] } });
  await flushPromises();
  return { router, wrapper };
};
const detail = (wrapper: Awaited<ReturnType<typeof open>>['wrapper']) => wrapper.find('[data-testid="mobile-activity-detail"]');

describe('the phone Activity detail screen (autobyteus-590)', () => {
  it('a row opens its details: status word, the full command, Arguments and Logs; the logs grow while it is open; Back returns to the list', async () => {
    const store = useAgentActivityStore();
    store.addToolActivity('run-1', tool({}));
    store.addToolActivity('run-1', tool({ activityId: 'call-2', invocationId: 'call-2', toolName: 'read_file', type: 'tool_call', status: 'success', arguments: { path: '/w/a.md' }, logs: [] }));
    const { router, wrapper } = await open();
    const rows = wrapper.findAll('[data-testid="mobile-run-activity-row"]');
    expect(rows).toHaveLength(2);

    await rows.find((r) => r.text().includes('run_bash'))!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query).toMatchObject({ screen: 'activity', activityItem: 'call-1' });
    const screen = detail(wrapper);
    expect(screen.get('[data-testid="mobile-screen-title"]').text()).toBe('run_bash');
    expect(screen.get('[data-testid="mobile-activity-detail-status"]').text()).toBe('Running');
    expect(screen.get('[data-testid="mobile-activity-detail-summary"]').text()).toBe('cd /Users/me/repo && pnpm test');
    expect(screen.get('[data-testid="mobile-activity-detail-arguments-text"]').text()).toContain('"command": "cd /Users/me/repo && pnpm test"');
    expect(screen.get('[data-testid="mobile-activity-detail-logs-text"]').text()).toBe('collecting');
    expect(screen.find('[data-testid="mobile-activity-detail-result"]').exists()).toBe(false);
    // The list stays mounted under the details.
    expect(wrapper.findAll('[data-testid="mobile-run-activity-row"]')).toHaveLength(2);

    store.addToolActivityLog('run-1', 'call-1', '3 passed');
    store.setToolActivityResult('run-1', 'call-1', { exit_code: 0 });
    store.updateToolActivityStatus('run-1', 'call-1', 'success');
    await flushPromises();
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-logs-text"]').text()).toBe('collecting\n3 passed');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-result-text"]').text()).toContain('"exit_code": 0');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-status"]').text()).toBe('Success');

    await detail(wrapper).get('[data-testid="mobile-screen-back"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.activityItem).toBeUndefined();
    expect(router.currentRoute.value.query.screen).toBe('activity');
    expect(detail(wrapper).exists()).toBe(false);
  });

  it('a failed call shows its full error, open', async () => {
    const error = `Command failed with exit code 1\n${'stack line\n'.repeat(400)}`;
    useAgentActivityStore().addToolActivity('run-1', tool({ status: 'error', error }));
    const { wrapper } = await open({ screen: 'activity', activityItem: 'call-1' });
    const body = detail(wrapper).get('[data-testid="mobile-activity-detail-error-text"]');
    expect(body.text()).toBe(error.trim());
    expect(body.isVisible()).toBe(true);
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-status"]').text()).toBe('Failed');
  });

  it('a long section starts closed and opens on tap; a short one starts open', async () => {
    useAgentActivityStore().addToolActivity('run-1', tool({ logs: Array.from({ length: 400 }, (_, i) => `log line ${i} with some text`) }));
    const { wrapper } = await open({ screen: 'activity', activityItem: 'call-1' });
    const toggle = detail(wrapper).get('[data-testid="mobile-activity-detail-logs-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.classes()).toContain('min-h-[2.75rem]');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-arguments-toggle"]').attributes('aria-expanded')).toBe('true');
    await toggle.trigger('click');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-logs-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-logs-text"]').isVisible()).toBe(true);
  });

  it('a compaction opens its rows, its error among them', async () => {
    useAgentActivityStore().upsertCompactionActivity('run-1', { kind: 'compaction', activityId: 'compaction-1', timestamp: new Date(0), updatedAt: new Date(0), phase: 'failed',
      message: 'Compaction failed', turnId: 'turn-4', provider: 'anthropic', errorMessage: 'Summarizer timed out after 120 s' });
    const { wrapper } = await open({ screen: 'activity', activityItem: 'compaction-1' });
    const rows = detail(wrapper).get('[data-testid="mobile-activity-detail-rows"]');
    expect(rows.text()).toContain('turn-4');
    expect(rows.text()).toContain('anthropic');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-error"]').text()).toContain('Summarizer timed out after 120 s');
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-status"]').text()).toBe('Failed');
  });

  it('an activity that is no longer there says so', async () => {
    const { wrapper } = await open({ screen: 'activity', activityItem: 'gone' });
    expect(detail(wrapper).get('[data-testid="mobile-activity-detail-missing"]').text()).toMatch(/no longer available/i);
  });

  it('opened from a link or a reload (no entry under it), Back goes to the Activity list', async () => {
    useAgentActivityStore().addToolActivity('run-1', tool({}));
    const { router, wrapper } = await open({ screen: 'activity', activityItem: 'call-1', row: 'agent:run-1' });
    await detail(wrapper).get('[data-testid="mobile-screen-back"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ row: 'agent:run-1', screen: 'activity' });
  });
});
