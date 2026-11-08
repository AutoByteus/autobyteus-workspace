import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import MobileRunList from '../MobileRunList.vue';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';
import { useRunListStore } from '~/stores/runListStore';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

const row = (patch: Partial<MobileRunTreeRow>): MobileRunTreeRow => ({
  key: 'agent:a', depth: 0, avatar: 'agent', name: 'Project Task Manager', title: 'Dispatch the approved Task', status: 'running', remote: null,
  hasChildren: false, expanded: false, fold: null, open: { kind: 'agentRun', run: { runId: 'a' } as never }, lastActivityAt: '2026-11-06T10:00:00.000Z', ...patch,
});

// autobyteus-277 UIS-001, QR-001: the list is a tree of treeitems with levels, expansion and the open run.
describe('MobileRunList', () => {
  it('renders the rows as one tree; nested rows carry their level, rails and node; the open row is marked', async () => {
    setActivePinia(createPinia());
    vi.spyOn(useRunListStore(), 'entries', 'get').mockReturnValue([{}] as never);
    const toggle = vi.fn();
    const rows = ref([
      row({ hasChildren: true, expanded: true, fold: { kind: 'run', runId: 'a' } }),
      row({ key: 'agent:a/team:se', depth: 1, avatar: 'team', name: 'Software Engineering Team', title: '', hasChildren: true, fold: { kind: 'taskTeam', hostRunId: 'a', teamRunId: 'se' }, open: null, lastActivityAt: null }),
      row({ key: 'agent:a/agent:mr', depth: 1, name: 'Market Researcher', title: '', remote: { nodeName: 'office-mac', reachable: false }, lastActivityAt: null }),
    ]);
    const tree = { rows: computed(() => rows.value), openRowKey: computed(() => 'agent:a/agent:mr'), toggle, setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), expandTeamMemberAncestors: vi.fn() };
    const router = await createMobileTestRouter();
    const wrapper = mount(MobileRunList, { props: { tree: tree as never, nodeName: 'AutoByteus Desktop', connection: 'connected' }, global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.get('[role="tree"]').attributes('aria-label')).toBe('Your runs');
    const items = wrapper.findAll('[role="treeitem"]');
    expect(items.map((item) => item.attributes('aria-level'))).toEqual(['1', '2', '2']);
    expect(items[0]!.attributes('aria-expanded')).toBe('true');
    expect(items[1]!.attributes('aria-expanded')).toBe('false');
    expect(items[2]!.attributes('aria-current')).toBe('true');
    expect(items[2]!.classes()).toContain('bg-blue-50');
    expect(items[2]!.text()).toContain('Not reachable');
    expect(items[2]!.get('[data-testid="mobile-run-status-dot"]').attributes('data-status')).toBe('error');
    expect(items[0]!.find('[data-testid="mobile-run-age"]').exists()).toBe(true);
    expect(items[1]!.find('[data-testid="mobile-run-age"]').exists()).toBe(false);
    // A row with nothing to open folds on a tap of its body; the chevron folds too.
    await items[1]!.get('[data-testid="mobile-run-open"]').trigger('click');
    await items[1]!.get('[data-testid="mobile-run-toggle"]').trigger('click');
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(items[1]!.get('[data-testid="mobile-run-toggle"]').attributes('aria-label')).toBe('Show members of Software Engineering Team');
    expect(items.every((item) => !/Archive|Delete|Stop/.test(item.text()))).toBe(true);
  });

  it.each([
    ['loading', { loading: true, error: null }, 'mobile-run-list-loading', null],
    ['empty', { loading: false, error: null }, 'mobile-run-list-empty', 'Start with New run. Work an agent delegates appears under its run and leaves when it is done.'],
    ['read error', { loading: false, error: 'offline' }, 'mobile-run-list-error', 'Couldn’t load your runs.'],
  ])('with no run listed it shows the %s state (VIS-021…023)', async (_name, history, testId, text) => {
    setActivePinia(createPinia());
    const { useRunHistoryStore } = await import('~/stores/runHistoryStore');
    const store = useRunHistoryStore();
    store.loading = history.loading;
    store.historyFamilyErrors = { workspace: history.error } as never;
    const tree = { rows: computed(() => []), openRowKey: computed(() => null), toggle: vi.fn(), setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), expandTeamMemberAncestors: vi.fn() };
    const wrapper = mount(MobileRunList, { props: { tree: tree as never, nodeName: 'n', connection: 'connected' }, global: { plugins: [await createMobileTestRouter()] } });
    await flushPromises();
    const state = wrapper.get(`[data-testid="${testId}"]`);
    if (text) expect(state.text()).toContain(text);
    if (testId === 'mobile-run-list-loading') expect(state.findAll('.rounded-full')).toHaveLength(6);
    expect(wrapper.find('[data-testid="mobile-new-run-button"]').exists()).toBe(true);
    // CRR-001 CR-001: the list reads nothing itself; Retry asks the shell to check the node again.
    if (testId === 'mobile-run-list-error') {
      const fetchTree = vi.spyOn(store, 'fetchTree');
      await wrapper.get('[data-testid="mobile-run-list-retry"]').trigger('click');
      expect(wrapper.emitted('retry')).toHaveLength(1);
      expect(fetchTree).not.toHaveBeenCalled();
    }
  });

  // autobyteus-426 REQ-002 / AC-003: Phone Access off is its own bar and banner state.
  it.each([
    ['connected', 'Connected', null],
    ['unreachable', 'Not reachable', 'Can’t reach Office Mac.'],
    ['phone_access_off', 'Phone access off', 'Office Mac is reachable, but Phone access is off.'],
  ] as const)('shows the %s state in the bar and banner', async (connection, label, banner) => {
    setActivePinia(createPinia());
    const tree = { rows: computed(() => []), openRowKey: computed(() => null), toggle: vi.fn(), setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), expandTeamMemberAncestors: vi.fn() };
    const wrapper = mount(MobileRunList, { props: { tree: tree as never, nodeName: 'Office Mac', connection }, global: { plugins: [await createMobileTestRouter()] } });
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe(label);
    const bannerEl = wrapper.find('[data-testid="mobile-node-offline-banner"]');
    expect(bannerEl.exists()).toBe(banner !== null);
    if (banner) {
      expect(bannerEl.text()).toContain(banner);
      await wrapper.get('[data-testid="mobile-node-offline-check"]').trigger('click');
      expect(wrapper.emitted('open-connection')).toHaveLength(1);
    }
  });
});
