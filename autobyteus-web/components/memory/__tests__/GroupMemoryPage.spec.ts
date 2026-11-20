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
    props: { definitionId: props.kind === 'ORG' ? 'launch-org' : 'se-team', name: props.kind === 'ORG' ? 'Launch Org' : 'Software Engineering Team', imported: false, ...props },
    global: { plugins: [pinia], mocks: { $t: translate }, stubs: { CollaborationMemoryDetail: { props: { rows: Array, embedded: Boolean }, template: '<div data-test="runs">{{ embedded }}|{{ rows.length }}</div>' } } },
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
    expect(wrapper.text()).toContain('Agent Team');
    expect(wrapper.get('[data-test="group-memory-tab-members"]').text()).toBe('Members 2');
    expect(wrapper.get('[data-test="group-memory-tab-runs"]').text()).toBe('Runs 7');
    const members = wrapper.findAll('[data-test="group-member"]');
    expect(members.map((member) => member.find('h2').text())).toEqual(['Solution Designer', 'Computer Use Operator']);
    expect(members[0]!.text()).not.toContain('Shared agent');
    expect(members[1]!.text()).toContain('Shared agent');
    await members[1]!.trigger('click');
    expect(wrapper.emitted('selectMember')?.[0]?.[0]).toMatchObject({ id: 'computer-use-operator' });
  });

  it("lists an org's teams with their member counts", () => {
    const { wrapper } = mountPage({ kind: 'ORG', pane: 'members' }, (store) => {
      store.members = { key: 'ORG:launch-org', loading: false, error: null, requestId: 1, entries: [{ kind: 'TEAM', id: 'team-product', name: 'Product Review Team', shared: true, memberCount: 2 }] };
    });
    expect(wrapper.text()).toContain('Agent Org');
    expect(wrapper.get('[data-test="group-member"]').text()).toContain('Agent Team · 2 members');
  });

  it("embeds the team's runs on Runs, and shows another group's members only as loading", () => {
    const runs = mountPage({ kind: 'TEAM', pane: 'runs' }, (store) => {
      store.teamRuns.entries = [{ teamRunId: 'r1', teamDefinitionId: 'se-team', teamDefinitionName: 'SE', memory, memberTargets: [] }];
    }).wrapper;
    expect(runs.get('[data-test="runs"]').text()).toBe('true|1');

    const other = mountPage({ kind: 'TEAM', pane: 'members' }, (store) => {
      store.members = { key: 'TEAM:other', loading: false, error: null, requestId: 1, entries: [{ kind: 'AGENT', id: 'x', name: 'Someone Else', shared: true }] };
    }).wrapper;
    expect(other.text()).not.toContain('Someone Else');
  });
});
