import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryBrowse from '../MemoryBrowse.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useLocalization } from '~/composables/useLocalization';

const translate = (key: string, params?: Record<string, unknown>): string => useLocalization().t(key as never, params as never);

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** Memory → Browse by owner (autobyteus-554, UI/UX spec UXJ-001…UXJ-005, VIS-001, 008, 009, 011, 012, 013). */
const memory = { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };
const teamLocal = 'team-local-agent:se-team:solution_designer';

const mountBrowse = (nodeKey: string, pane: string | null = null, setup: (store: ReturnType<typeof useMemoryExplorerStore>) => void = () => undefined) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryExplorerStore();
  store.agents.entries = [
    { attribution: 'DEFINITION', agentDefinitionId: 'researcher', displayName: 'Research Assistant', stableId: 'researcher', runCount: 4, latestMemoryAt: '2026-11-20T10:00:00Z' },
    { attribution: 'DEFINITION', agentDefinitionId: teamLocal, displayName: 'Solution Designer', stableId: teamLocal, runCount: 9, latestMemoryAt: null },
    { attribution: 'UNATTRIBUTED', agentDefinitionId: null, displayName: 'Unattributed runs', stableId: 'unattributed', runCount: 2, latestMemoryAt: null },
  ];
  store.teams.entries = [{ teamDefinitionId: 'se-team', teamDefinitionName: 'Software Engineering Team', teamRunCount: 7, memberMemoryCount: 3, memberCount: 4, latestMemoryAt: null, memory }];
  store.orgs.entries = [{ orgDefinitionId: 'launch-org', orgDefinitionName: 'Launch Org', orgRunCount: 1, memberMemoryCount: 1, memberCount: 2, latestMemoryAt: null, memory }];
  store.ownersSourceKey = 'local';
  setup(store);
  const wrapper = mount(MemoryBrowse, {
    props: { nodeKey, pane },
    slots: { sections: '<div data-test="sections-slot">Browse · Search · Index</div>' },
    global: {
      plugins: [pinia],
      mocks: { $t: translate },
      stubs: {
        AgentMemoryPage: {
          props: ['agentDefinitionId', 'name', 'pane', 'imported', 'backText', 'backLabel'],
          emits: ['back'],
          template: '<div><button data-test="page-back" :aria-label="backLabel" @click="$emit(\'back\')">{{ backText }}</button><span data-test="agent-page">{{ name }}|{{ agentDefinitionId }}|{{ pane }}</span></div>',
        },
        GroupMemoryPage: { props: ['kind', 'definitionId', 'name', 'pane', 'imported', 'backText', 'backLabel'], template: '<div data-test="group-page">{{ kind }}|{{ name }}|{{ pane }}</div>' },
        SemanticMemoryFolder: { props: ['agentDefinitionId', 'agentName', 'imported'], template: '<div data-test="folder">{{ agentDefinitionId === null ? "GLOBAL" : agentDefinitionId }}|{{ agentName }}</div>' },
      },
    },
  });
  return { wrapper, store };
};

describe('MemoryBrowse', () => {
  it('shows Browse · Search · Index, the tabs Global · Agents · Agent Teams · Agent Orgs and the agent cards (name with its ID in the tooltip, latest change; no run count; Unattributed last); no filter box', async () => {
    const { wrapper } = mountBrowse('agents');
    // One top row: the sections (MemoryHome's) and the tabs (autobyteus-608 DC-001).
    expect(wrapper.get('[data-test="sections-slot"]').text()).toBe('Browse · Search · Index');
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Global', 'Agents', 'Agent Teams', 'Agent Orgs']);
    expect(wrapper.get('[data-test="memory-browse-tab-agents"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('input').exists()).toBe(false);
    const cards = wrapper.findAll('[data-test="memory-owner-card"]');
    expect(cards.map((card) => card.find('h2').text())).toEqual(['Research Assistant', 'Solution Designer', 'Unattributed runs']);
    // No ID line (DC-006): the ID is the name's tooltip.
    expect(cards.map((card) => card.find('h2').attributes('title'))).toEqual(['researcher', teamLocal, 'unattributed']);
    expect(wrapper.text()).not.toContain(teamLocal);
    expect(wrapper.text()).not.toMatch(/\d+ runs/);

    await cards[1]!.trigger('click');
    await cards[2]!.trigger('click');
    expect(wrapper.emitted('selectNode')).toEqual([[`agents/agent:${encodeURIComponent(teamLocal)}`], ['agents/unattributed']]);
    await wrapper.get('[data-test="memory-browse-tab-global"]').trigger('click');
    expect(wrapper.emitted('selectNode')?.at(-1)).toEqual(['global']);
  });

  it('shows team and org cards with their runs pill and member count', async () => {
    const teams = mountBrowse('teams').wrapper;
    const card = teams.get('[data-test="memory-owner-card"]');
    expect(card.text()).toContain('Software Engineering Team');
    expect(card.text()).toContain('7 runs');
    expect(card.text()).toContain('4 members');
    await card.trigger('click');
    expect(teams.emitted('selectNode')).toEqual([['teams/team:se-team']]);
    expect(mountBrowse('orgs').wrapper.get('[data-test="memory-owner-card"]').text()).toContain('2 members');
    // One run says "1 run".
    expect(mountBrowse('orgs').wrapper.get('[data-test="memory-owner-card"]').text()).toContain('1 run');
    expect(mountBrowse('orgs').wrapper.get('[data-test="memory-owner-card"]').text()).not.toContain('1 runs');
  });

  it("shows Global without a title row: its heading for screen readers, its description as the Global tab's tooltip, the node's read-only folder (DC-003)", () => {
    const { wrapper } = mountBrowse('global');
    const heading = wrapper.get('[data-test="global-memory-page"] h1');
    expect(heading.text()).toBe('Global memory');
    expect(heading.classes()).toContain('sr-only');
    const description = 'Knowledge shared by every agent, agent team and agent org on this node. Every agent reads it and writes to it.';
    expect(wrapper.text()).not.toContain(description);
    expect(wrapper.get('[data-test="memory-browse-tab-global"]').attributes('title')).toBe(description);
    expect(wrapper.get('[data-test="memory-browse-tab-agents"]').attributes('title')).toBeUndefined();
    expect(wrapper.get('[data-test="folder"]').text()).toBe('GLOBAL|Global memory');
  });

  it("opens an agent's page with Back showing \"Memory\", and the same agent reached from its team with Back showing the team; no Browse · Search · Index (DC-001)", async () => {
    const fromAgents = mountBrowse('agents/agent:researcher', 'semantic').wrapper;
    expect(fromAgents.find('[data-test="sections-slot"]').exists()).toBe(false);
    expect(fromAgents.find('[role="tab"]').exists()).toBe(false);
    expect(fromAgents.get('[data-test="page-back"]').text()).toBe('Memory');
    expect(fromAgents.get('[data-test="page-back"]').attributes('aria-label')).toBe('Back to Memory');
    expect(fromAgents.get('[data-test="agent-page"]').text()).toBe('Research Assistant|researcher|semantic');
    await fromAgents.get('[data-test="page-back"]').trigger('click');
    expect(fromAgents.emitted('selectNode')).toEqual([['agents']]);

    const fromTeam = mountBrowse(`teams/team:se-team/agent:${encodeURIComponent(teamLocal)}`).wrapper;
    expect(fromTeam.get('[data-test="page-back"]').text()).toBe('Software Engineering Team');
    expect(fromTeam.get('[data-test="page-back"]').attributes('aria-label')).toBe('Back to Software Engineering Team');
    await fromTeam.get('[data-test="page-back"]').trigger('click');
    expect(fromTeam.emitted('selectNode')).toEqual([['teams/team:se-team']]);
  });

  it('opens Unattributed runs with Episodic memory only, and a team or org page on Members or Runs', () => {
    expect(mountBrowse('agents/unattributed', 'semantic').wrapper.get('[data-test="agent-page"]').text()).toBe('Unattributed runs||episodic');
    expect(mountBrowse('teams/team:se-team').wrapper.get('[data-test="group-page"]').text()).toBe('TEAM|Software Engineering Team|members');
    expect(mountBrowse('orgs/org:launch-org', 'runs').wrapper.get('[data-test="group-page"]').text()).toBe('ORG|Launch Org|runs');
  });

  it("names an agent that has no card (a team-local agent without runs) from its team's members; otherwise says it is not in this memory", () => {
    const named = mountBrowse('teams/team:se-team/agent:new-local', null, (store) => {
      store.groupMembers['TEAM:se-team'] = [{ kind: 'AGENT', id: 'new-local', name: 'New Local', shared: false }];
    }).wrapper;
    expect(named.get('[data-test="agent-page"]').text()).toBe('New Local|new-local|episodic');

    const unknown = mountBrowse('agents/agent:router').wrapper;
    expect(unknown.get('[data-test="memory-owner-not-found"]').text()).toBe('This agent, team or org is not in this memory.');
    expect(unknown.find('[data-test="agent-page"]').exists()).toBe(false);
    // Its header still has Back (the page is never a dead end).
    expect(unknown.get('[data-test="memory-page-back"]').text()).toBe('Memory');
  });

  it("shows the loading state, not \"not found\", while the cards or the members that could name an owner are on their way", () => {
    for (const setup of [
      (store: ReturnType<typeof useMemoryExplorerStore>) => { store.ownersSourceKey = null; },
      (store: ReturnType<typeof useMemoryExplorerStore>) => { store.groupMembersLoading = true; },
    ]) {
      const { wrapper } = mountBrowse('teams/team:se-team/agent:new-local', null, setup);
      expect(wrapper.find('[data-test="memory-owner-not-found"]').exists()).toBe(false);
      expect(wrapper.text()).toContain('Loading memory catalog');
    }
  });

  it('shows the source select and the amber pill when an imported source exists', () => {
    const { wrapper } = mountBrowse('agents', null, (store) => {
      const imported = { key: 'imported:finance', type: 'IMPORTED' as const, label: 'Imported: Finance', memorySyncSourceId: 'finance', displayName: 'Finance', readOnly: true, lastImportedAt: null, lastSyncStatus: null };
      store.sources = [{ ...imported, key: 'local', type: 'LOCAL', label: 'Local Memory', memorySyncSourceId: null, readOnly: false }, imported];
      store.selectedSource = imported;
    });
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.text()).toContain('Imported · read-only');
  });

  it('keeps the owner card grid one column wide on a phone (CRR-001 CR-001)', () => {
    expect(mountBrowse('agents').wrapper.get('[data-test="memory-group-cards-agents"]').classes()).toEqual(expect.arrayContaining(['grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3']));
  });
});
