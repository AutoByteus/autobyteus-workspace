import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import GroupMemoryPage from '../GroupMemoryPage.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useLocalization } from '~/composables/useLocalization';

const translate = (key: string, params?: Record<string, unknown>): string => useLocalization().t(key as never, params as never);

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** A team's or org's memory page (autobyteus-554, UXJ-004, UXJ-005; VIS-009, VIS-010, VIS-013). */
const memory = { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };

const mountPage = (props: { kind: 'TEAM' | 'ORG'; pane: 'members' | 'runs' }, setup: (store: ReturnType<typeof useMemoryExplorerStore>) => void) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryExplorerStore();
  setup(store);
  const wrapper = mount(GroupMemoryPage, {
    props: {
      definitionId: props.kind === 'ORG' ? 'launch-org' : 'se-team', name: props.kind === 'ORG' ? 'Launch Org' : 'Software Engineering Team', imported: false,
      backText: 'Memory', backLabel: 'Back to Memory', ...props,
    },
    global: { plugins: [pinia], mocks: { $t: translate }, stubs: { CollaborationMemoryDetail: {
      props: { rows: Array },
      emits: ['inspectMember'],
      template: `<div data-test="runs">{{ rows.length }}<button data-test="runs-member" @click="$emit('inspectMember', 'r1', { agentRunId: 'm1' }, 'Planning run')" /></div>`,
    } } },
  });
  return { wrapper, store };
};

describe('GroupMemoryPage', () => {
  it("lists a team's members with the Shared agent pill and opens one; the tabs count members and runs", async () => {
    const { wrapper } = mountPage({ kind: 'TEAM', pane: 'members' }, (store) => {
      store.teams.entries = [{ teamDefinitionId: 'se-team', teamDefinitionName: 'Software Engineering Team', teamRunCount: 7, memberMemoryCount: 2, memberCount: 2, memory }];
      store.members = { key: 'TEAM:se-team', loading: false, error: null, requestId: 1, entries: [
        { kind: 'AGENT', id: 'team-local-agent:se-team:designer', name: 'Solution Designer', shared: false },
        { kind: 'AGENT', id: 'computer-use-operator', name: 'Computer Use Operator', shared: true },
      ] };
    });
    // One header row (autobyteus-608 DC-002): Back shows where it goes; the kind and ID only in the name's tooltip.
    expect(wrapper.get('[data-test="memory-page-back"]').text()).toBe('Memory');
    expect(wrapper.get('[data-test="memory-page-back"]').attributes('aria-label')).toBe('Back to Memory');
    expect(wrapper.get('h1').text()).toBe('Software Engineering Team');
    expect(wrapper.get('h1').attributes('title')).toBe('Agent Team · se-team');
    expect(wrapper.text()).not.toContain('Agent Team');
    expect(wrapper.text()).not.toContain('se-team');
    const tabText = (id: string) => [...wrapper.get(`[data-test="group-memory-tab-${id}"]`).element.querySelectorAll('span')].map((span) => span.textContent);
    expect(tabText('members')).toEqual(['Members', '2']);
    expect(tabText('runs')).toEqual(['Runs', '7']);
    expect(wrapper.find('[data-test="group-runs-filter"]').exists()).toBe(false);
    const members = wrapper.findAll('[data-test="group-member"]');
    expect(members.map((member) => member.find('h2').text())).toEqual(['Solution Designer', 'Computer Use Operator']);
    // No ID line (DC-006): the ID is the name's tooltip.
    expect(members.map((member) => member.find('h2').attributes('title'))).toEqual(['team-local-agent:se-team:designer', 'computer-use-operator']);
    expect(wrapper.text()).not.toContain('computer-use-operator');
    expect(members[0]!.text()).not.toContain('Shared agent');
    expect(members[1]!.text()).toContain('Shared agent');
    await members[1]!.trigger('click');
    expect(wrapper.emitted('selectMember')?.[0]?.[0]).toMatchObject({ id: 'computer-use-operator' });
  });

  it("lists an org's teams with their member counts", () => {
    const { wrapper } = mountPage({ kind: 'ORG', pane: 'members' }, (store) => {
      store.members = { key: 'ORG:launch-org', loading: false, error: null, requestId: 1, entries: [{ kind: 'TEAM', id: 'team-product', name: 'Product Review Team', shared: true, memberCount: 2 }] };
    });
    expect(wrapper.get('h1').attributes('title')).toBe('Agent Org · launch-org');
    expect(wrapper.get('[data-test="group-member"]').text()).toContain('Agent Team · 2 members');
  });

  it("embeds the team's runs on Runs; a member opens with the run's summary (autobyteus-608 DEC-002); another group's members only as loading", async () => {
    const runs = mountPage({ kind: 'TEAM', pane: 'runs' }, (store) => {
      store.teamRuns.entries = [{ teamRunId: 'r1', teamDefinitionId: 'se-team', teamDefinitionName: 'SE', memory, memberTargets: [] }];
    }).wrapper;
    expect(runs.get('[data-test="runs"]').text()).toBe('1');
    await runs.get('[data-test="runs-member"]').trigger('click');
    expect(runs.emitted('inspectMember')).toEqual([['r1', { agentRunId: 'm1' }, 'Planning run']]);

    const other = mountPage({ kind: 'TEAM', pane: 'members' }, (store) => {
      store.members = { key: 'TEAM:other', loading: false, error: null, requestId: 1, entries: [{ kind: 'AGENT', id: 'x', name: 'Someone Else', shared: true }] };
    }).wrapper;
    expect(other.text()).not.toContain('Someone Else');
  });

  it("filters the runs from the page's header: 300 ms after typing, at once on Enter (TR-003, DC-012); Back", async () => {
    vi.useFakeTimers();
    try {
      const { wrapper, store } = mountPage({ kind: 'TEAM', pane: 'runs' }, () => undefined);
      const filter = wrapper.get('[data-test="group-runs-filter"]');
      await filter.setValue(' plan ');
      expect(store.setTeamRunsSearch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(300);
      expect(store.setTeamRunsSearch).toHaveBeenCalledWith('se-team', 'plan');

      await filter.setValue('release');
      await filter.trigger('keyup.enter');
      expect(store.setTeamRunsSearch).toHaveBeenLastCalledWith('se-team', 'release');
      await vi.advanceTimersByTimeAsync(300);
      expect(store.setTeamRunsSearch).toHaveBeenCalledTimes(2);

      await wrapper.get('[data-test="memory-page-back"]').trigger('click');
      expect(wrapper.emitted('back')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
