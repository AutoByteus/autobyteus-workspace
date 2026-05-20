import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentList from '../AgentList.vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from '~/utils/catalog/featuredCatalogItems';

const { addToastMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
    removeToast: vi.fn(),
    toasts: { value: [] },
  }),
}));

const AgentCardStub = {
  name: 'AgentCard',
  template: '<div class="agent-card"></div>',
  props: ['agentDef'],
  emits: ['run-agent', 'view-details'],
};

async function flushAsyncUi(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AgentList', () => {
  const mockAgentDefs = [
    { id: '1', name: 'Agent Alpha', description: 'Alpha Desc', ownershipScope: 'SHARED' },
    { id: '2', name: 'Agent Beta', description: 'Beta Desc', ownershipScope: 'SHARED' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    addToastMock.mockReset();
  });

  const mountComponent = async (options?: {
    agentDefs?: any[];
    deleteResult?: { success: boolean; message: string } | null;
    featuredSettingValue?: string | null;
  }) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    });
    setActivePinia(pinia);

    const store = useAgentDefinitionStore();
    store.agentDefinitions = (options?.agentDefs ?? mockAgentDefs) as any;
    store.loading = false;
    store.error = null;
    store.deleteResult = options?.deleteResult ?? null;

    const serverSettingsStore = useServerSettingsStore();
    serverSettingsStore.settings = options?.featuredSettingValue === undefined || options.featuredSettingValue === null
      ? []
      : [{
          key: FEATURED_CATALOG_ITEMS_SETTING_KEY,
          value: options.featuredSettingValue,
          description: 'Featured catalog items',
          isEditable: true,
          isDeletable: false,
        }];
    (serverSettingsStore.fetchServerSettings as any).mockResolvedValue(serverSettingsStore.settings);
    (serverSettingsStore.reloadServerSettings as any).mockResolvedValue(serverSettingsStore.settings);

    const wrapper = mount(AgentList, {
      global: {
        plugins: [pinia],
        stubs: {
          AgentCard: AgentCardStub,
          navigateTo: vi.fn(),
        },
        mocks: {
          navigateTo: vi.fn(),
        },
      },
    });

    await wrapper.vm.$nextTick();
    await Promise.resolve();
    return wrapper;
  };

  it('renders list of agents', async () => {
    const wrapper = await mountComponent();
    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards).toHaveLength(2);
  });

  it('renders configured featured agents first without duplicating them in origin sections', async () => {
    const wrapper = await mountComponent({
      featuredSettingValue: JSON.stringify({
        version: 1,
        items: [{ resourceKind: 'AGENT', definitionId: '2', sortOrder: 10 }],
      }),
    });

    expect(wrapper.text()).toContain('Featured agents');
    expect(wrapper.text()).toContain('Shared agents');
    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards).toHaveLength(2);
    expect(cards[0].props('agentDef')).toMatchObject({ id: '2' });
    expect(cards[1].props('agentDef')).toMatchObject({ id: '1' });
  });

  it('renders regular agents by application and shared origin sections while excluding team-local agents', async () => {
    const wrapper = await mountComponent({
      agentDefs: [
        {
          id: 'shared-agent',
          name: 'Shared Agent',
          description: 'Shared Desc',
          ownershipScope: 'SHARED',
        },
        {
          id: 'app-agent',
          name: 'Application Agent',
          description: 'Application Desc',
          ownershipScope: 'APPLICATION_OWNED',
          ownerApplicationId: 'app-research',
          ownerApplicationName: 'Research Workspace',
        },
        {
          id: 'team-agent',
          name: 'Team Agent',
          description: 'Team Desc',
          ownershipScope: 'TEAM_LOCAL',
          ownerTeamId: 'team-literature',
          ownerTeamName: 'Literature Review Team',
          ownerApplicationId: 'app-research',
          ownerApplicationName: 'Research Workspace',
        },
      ],
    });

    const text = wrapper.text();
    expect(text).not.toContain('Team local agents');
    expect(text).not.toContain('Literature Review Team');
    expect(text).toContain('Application agents');
    expect(text).toContain('Research Workspace');
    expect(text).toContain('Shared agents');

    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards.map((card) => (card.props('agentDef') as any).id)).toEqual([
      'app-agent',
      'shared-agent',
    ]);
  });

  it('hides featured grouping during search and searches the full agent list', async () => {
    const wrapper = await mountComponent({
      featuredSettingValue: JSON.stringify({
        version: 1,
        items: [{ resourceKind: 'AGENT', definitionId: '2', sortOrder: 10 }],
      }),
    });

    await wrapper.find('input[name="agent-search"]').setValue('Agent');

    expect(wrapper.text()).not.toContain('Featured agents');
    expect(wrapper.text()).not.toContain('Shared agents');
    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => (card.props('agentDef') as any).id)).toEqual(['1', '2']);
  });

  it('excludes featured team-local agents from browse results', async () => {
    const wrapper = await mountComponent({
      agentDefs: [
        { id: 'shared-agent', name: 'Shared Agent', description: 'Shared Desc', ownershipScope: 'SHARED' },
        { id: 'team-agent', name: 'Team Agent', description: 'Team Desc', ownershipScope: 'TEAM_LOCAL' },
      ],
      featuredSettingValue: JSON.stringify({
        version: 1,
        items: [{ resourceKind: 'AGENT', definitionId: 'team-agent', sortOrder: 10 }],
      }),
    });

    expect(wrapper.text()).not.toContain('Featured agents');
    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards).toHaveLength(1);
    expect(cards[0].props('agentDef')).toMatchObject({ id: 'shared-agent' });
  });

  it('searches only discoverable owner names in a flat result grid', async () => {
    const wrapper = await mountComponent({
      agentDefs: [
        {
          id: 'source-collector',
          name: 'Source Collector',
          description: 'Collects source material.',
          ownershipScope: 'TEAM_LOCAL',
          ownerTeamId: 'team-literature',
          ownerTeamName: 'Literature Review Team',
          ownerApplicationId: 'app-research',
          ownerApplicationName: 'Research Workspace',
        },
        {
          id: 'app-agent',
          name: 'Application Agent',
          description: 'Application work.',
          ownershipScope: 'APPLICATION_OWNED',
          ownerApplicationId: 'app-research',
          ownerApplicationName: 'Research Workspace',
        },
        {
          id: 'general-agent',
          name: 'General Agent',
          description: 'General work.',
          ownershipScope: 'SHARED',
        },
      ],
    });

    await wrapper.find('input[name="agent-search"]').setValue('Research Workspace');

    expect(wrapper.text()).not.toContain('Team local agents');
    expect(wrapper.text()).not.toContain('Application agents');
    expect(wrapper.text()).not.toContain('Shared agents');
    const cards = wrapper.findAllComponents({ name: 'AgentCard' });
    expect(cards).toHaveLength(1);
    expect(cards[0].props('agentDef')).toMatchObject({ id: 'app-agent' });
  });

  it('reloads agent definitions when reload is clicked', async () => {
    const wrapper = await mountComponent();
    const store = useAgentDefinitionStore();

    const reloadButton = wrapper.findAll('button').find((button) => button.text().includes('Reload'));
    expect(reloadButton).toBeDefined();
    await reloadButton!.trigger('click');
    await flushAsyncUi();

    expect(store.refreshAndReloadAllAgentDefinitions).toHaveBeenCalledTimes(1);
  });

  it('routes existing delete result to global toaster on mount', async () => {
    const message = 'Agent definition deleted successfully.';

    await mountComponent({
      deleteResult: {
        success: true,
        message,
      },
    });
    const agentDefinitionStore = useAgentDefinitionStore();

    expect(addToastMock).toHaveBeenCalledWith(message, 'success');
    expect(agentDefinitionStore.clearDeleteResult).toHaveBeenCalledTimes(1);
  });
});
