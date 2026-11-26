import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AgentMemoryPage from '../AgentMemoryPage.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useLocalization } from '~/composables/useLocalization';

const translate = (key: string, params?: Record<string, unknown>): string => useLocalization().t(key as never, params as never);

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** One agent's memory page (autobyteus-554, UXJ-003; VIS-004, VIS-011). */
const memory = { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };
const episode = (runId: string, place: { kind: 'TEAM' | 'ORG'; name: string } | null, summary: string | null = `${runId} summary`) => ({
  runId, summary, taskTitle: null, workspaceRootPath: '/work/project', lastActivityAt: '2026-11-20T10:31:00Z', memory, place,
  subject: { kind: 'AGENT' as const, runId, agentDefinitionId: 'researcher' },
});

const mountPage = (props: { agentDefinitionId: string | null; pane?: 'episodic' | 'semantic'; backText?: string; backLabel?: string }, setup: (store: ReturnType<typeof useMemoryExplorerStore>) => void) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useMemoryExplorerStore();
  setup(store);
  const wrapper = mount(AgentMemoryPage, {
    props: { name: 'Research Assistant', pane: 'episodic', imported: false, backText: 'Memory', backLabel: 'Back to Memory', ...props },
    global: { plugins: [pinia], mocks: { $t: translate }, stubs: { SemanticMemoryFolder: { props: ['agentDefinitionId'], template: '<div data-test="folder">{{ agentDefinitionId }}</div>' } } },
  });
  return { wrapper, store };
};

describe('AgentMemoryPage', () => {
  it("lists the agent's episodes from every place with the Episodic count, the place line, and opens one", async () => {
    const { wrapper } = mountPage({ agentDefinitionId: 'researcher' }, (store) => {
      store.episodes.ownerKey = 'DEFINITION:researcher';
      store.episodes.entries = [episode('team-run', { kind: 'TEAM', name: 'Product Review Team' }), episode('own-run', null)];
      store.episodes.total = 31;
      store.episodes.totalPages = 2;
      (store as any).placesOf = () => [{ kind: 'TEAM', id: 'team-product', name: 'Product Review Team', local: false }, { kind: 'ORG', id: 'org-launch', name: 'Launch Org', local: false }];
    });
    expect(wrapper.get('[data-test="agent-memory-places"]').text()).toBe('Also works in Product Review Team · Launch Org');
    expect(wrapper.get('[data-test="agent-memory-tab-episodic"]').text()).toContain('31');
    const cards = wrapper.findAll('[data-test="agent-episode"]');
    expect(cards.map((card) => card.find('h3').text())).toEqual(['team-run summary', 'own-run summary']);
    expect(cards[0]!.get('[data-test="agent-episode-place"]').text()).toBe('In Product Review Team');
    expect(wrapper.text()).toContain('Page 1 / 2');
    await cards[0]!.trigger('click');
    expect(wrapper.emitted('openEpisode')?.[0]?.[0]).toMatchObject({ runId: 'team-run' });
  });

  it('says where a team-local agent belongs, and shows another agent\'s list only as loading', () => {
    const { wrapper } = mountPage({ agentDefinitionId: 'team-local-agent:se:designer' }, (store) => {
      store.episodes.ownerKey = 'DEFINITION:researcher';
      store.episodes.entries = [episode('someone-else', null)];
      (store as any).placesOf = () => [{ kind: 'TEAM', id: 'se', name: 'Software Engineering Team', local: true }];
    });
    expect(wrapper.get('[data-test="agent-memory-places"]').text()).toBe('Belongs to Software Engineering Team');
    expect(wrapper.text()).toContain('Loading runs');
    expect(wrapper.text()).not.toContain('someone-else');
  });

  it('filters by asking the node, and says when the agent has no runs or nothing matches', async () => {
    vi.useFakeTimers();
    try {
      const { wrapper, store } = mountPage({ agentDefinitionId: 'researcher' }, (store) => {
        store.episodes.ownerKey = 'DEFINITION:researcher';
        (store as any).placesOf = () => [];
      });
      expect(wrapper.text()).toContain('Research Assistant has no runs yet.');
      await wrapper.get('[data-test="agent-episodes-filter"]').setValue('spec');
      vi.advanceTimersByTime(350);
      expect(store.setEpisodesSearch).toHaveBeenCalledWith({ attribution: 'DEFINITION', agentDefinitionId: 'researcher' }, 'spec');
      store.episodes.search = 'spec';
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('No runs match this filter.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the Semantic tab with the folder; Unattributed runs has Episodic only', async () => {
    const semantic = mountPage({ agentDefinitionId: 'researcher', pane: 'semantic' }, (store) => { (store as any).placesOf = () => []; }).wrapper;
    expect(semantic.get('[data-test="folder"]').text()).toBe('researcher');
    await semantic.get('[data-test="agent-memory-tab-episodic"]').trigger('click');
    expect(semantic.emitted('changePane')).toEqual([['episodic']]);

    const unattributed = mountPage({ agentDefinitionId: null }, () => undefined).wrapper;
    expect(unattributed.find('[data-test="agent-memory-tab-semantic"]').exists()).toBe(false);
    expect(unattributed.get('[data-test="agent-memory-places"]').text()).toBe('Runs that no agent definition names.');
  });

  it('has one header row: Back showing where it goes, the name with its ID as tooltip, the filter on Episodic and the switch (autobyteus-608 DC-002)', async () => {
    const { wrapper } = mountPage({ agentDefinitionId: 'researcher' }, (store) => {
      store.episodes.ownerKey = 'DEFINITION:researcher';
      store.episodes.entries = [episode('own-run', null)];
      (store as any).placesOf = () => [];
    });
    const header = wrapper.get('[data-test="memory-page-header"]');
    const back = header.get('[data-test="memory-page-back"]');
    expect(back.text()).toBe('Memory');
    expect(back.attributes('aria-label')).toBe('Back to Memory');
    expect(back.attributes('title')).toBe('Back to Memory');
    await back.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(header.get('h1').text()).toBe('Research Assistant');
    expect(header.get('h1').attributes('title')).toBe('researcher');
    expect(header.find('[data-test="agent-episodes-filter"]').exists()).toBe(true);
    expect(header.find('[data-test="agent-memory-tab-semantic"]').exists()).toBe(true);
    // No ID line (DC-002).
    expect(wrapper.findAll('.font-mono')).toHaveLength(0);
  });

  it('episode cards: no run ID line (it is the title\'s tooltip); the workspace and the time on one line (DC-006)', () => {
    const { wrapper } = mountPage({ agentDefinitionId: 'researcher' }, (store) => {
      store.episodes.ownerKey = 'DEFINITION:researcher';
      store.episodes.entries = [episode('own-run', null)];
      (store as any).placesOf = () => [];
    });
    const card = wrapper.get('[data-test="agent-episode"]');
    expect(card.get('h3').attributes('title')).toBe('own-run');
    expect(card.findAll('p, span').some((element) => element.text() === 'own-run')).toBe(false);
    const meta = card.get('[data-test="agent-episode-meta"]');
    expect(meta.findAll('span').map((span) => span.text())).toEqual(['/work/project', new Date('2026-11-20T10:31:00Z').toLocaleString('en')]);
  });

  it('hides "Belongs to <team>" when Back already names that team, and has no filter on Semantic', () => {
    const { wrapper } = mountPage({ agentDefinitionId: 'team-local-agent:se:designer', pane: 'semantic', backText: 'Software Engineering Team', backLabel: 'Back to Software Engineering Team' }, (store) => {
      (store as any).placesOf = () => [{ kind: 'TEAM', id: 'se', name: 'Software Engineering Team', local: true }];
    });
    expect(wrapper.find('[data-test="agent-memory-places"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-episodes-filter"]').exists()).toBe(false);
  });
});
