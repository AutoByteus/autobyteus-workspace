import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentTeamList from '../AgentTeamList.vue';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from '~/utils/catalog/featuredCatalogItems';

const AgentTeamCardStub = {
  name: 'AgentTeamCard',
  template: '<div class="agent-team-card"></div>',
  props: ['teamDef'],
  emits: ['run-team', 'view-details'],
};

async function flushAsyncUi(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AgentTeamList', () => {
  const mockTeamDefs = [
    {
      id: 't1',
      name: 'Team Alpha',
      description: 'Alpha description',
      instructions: 'Alpha orchestration instructions',
      category: 'creative',
      coordinatorMemberName: 'alpha_lead',
      nodes: [{ memberName: 'alpha_lead', ref: 'a1' }],
    },
    {
      id: 't2',
      name: 'Team Beta',
      description: 'Beta description',
      instructions: 'Beta orchestration instructions',
      category: 'ops',
      coordinatorMemberName: 'beta_lead',
      nodes: [{ memberName: 'beta_lead', ref: 'a2' }],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mountComponent = async (options?: { featuredSettingValue?: string | null }) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    });
    setActivePinia(pinia);

    const store = useAgentTeamDefinitionStore();
    store.agentTeamDefinitions = mockTeamDefs as any;
    store.loading = false as any;
    store.error = null as any;

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

    const wrapper = mount(AgentTeamList, {
      global: {
        plugins: [pinia],
        stubs: {
          AgentTeamCard: AgentTeamCardStub,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await Promise.resolve();
    return wrapper;
  };

  it('renders list of teams', async () => {
    const wrapper = await mountComponent();
    const cards = wrapper.findAllComponents({ name: 'AgentTeamCard' });
    expect(cards).toHaveLength(2);
  });

  it('renders configured featured teams first without duplicating them in all teams', async () => {
    const wrapper = await mountComponent({
      featuredSettingValue: JSON.stringify({
        version: 1,
        items: [{ resourceKind: 'AGENT_TEAM', definitionId: 't2', sortOrder: 10 }],
      }),
    });

    expect(wrapper.text()).toContain('Featured teams');
    expect(wrapper.text()).toContain('All teams');
    const cards = wrapper.findAllComponents({ name: 'AgentTeamCard' });
    expect(cards).toHaveLength(2);
    expect(cards[0].props('teamDef')).toMatchObject({ id: 't2' });
    expect(cards[1].props('teamDef')).toMatchObject({ id: 't1' });
  });

  it('hides featured team grouping during search and searches the full team list', async () => {
    const wrapper = await mountComponent({
      featuredSettingValue: JSON.stringify({
        version: 1,
        items: [{ resourceKind: 'AGENT_TEAM', definitionId: 't2', sortOrder: 10 }],
      }),
    });

    await wrapper.find('#team-search').setValue('Team');

    expect(wrapper.text()).not.toContain('Featured teams');
    const cards = wrapper.findAllComponents({ name: 'AgentTeamCard' });
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => (card.props('teamDef') as any).id)).toEqual(['t1', 't2']);
  });

  it('reloads team definitions when reload is clicked', async () => {
    const wrapper = await mountComponent();
    const store = useAgentTeamDefinitionStore();

    const reloadButton = wrapper.findAll('button').find((button) => button.text().includes('Reload'));
    expect(reloadButton).toBeDefined();
    await reloadButton!.trigger('click');
    await flushAsyncUi();

    expect(store.refreshAndReloadAllAgentTeamDefinitions).toHaveBeenCalledTimes(1);
  });

  it('keeps Reload disabled while required reads are pending, shows failure, and permits retry', async () => {
    const wrapper = await mountComponent();
    const store = useAgentTeamDefinitionStore();
    let rejectRead!: (error: Error) => void;
    (store.refreshAndReloadAllAgentTeamDefinitions as any).mockImplementationOnce(async () => {
      store.loading = true;
      try {
        await new Promise((_, reject) => { rejectRead = reject; });
      } catch (error) {
        store.error = error;
        throw error;
      } finally {
        store.loading = false;
      }
    });
    const reload = wrapper.findAll('button').find((button) => button.text().includes('Reload'))!;
    await reload.trigger('click');
    expect(reload.attributes('disabled')).toBeDefined();
    expect(reload.text()).toContain('Reloading');
    rejectRead(new Error('Member definitions unavailable'));
    await flushPromises();
    expect(wrapper.text()).toContain('Member definitions unavailable');
    expect(reload.attributes('disabled')).toBeUndefined();
    (store.refreshAndReloadAllAgentTeamDefinitions as any).mockImplementationOnce(async () => {
      store.error = null;
    });
    await reload.trigger('click');
    await flushPromises();
    expect(store.refreshAndReloadAllAgentTeamDefinitions).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain('Member definitions unavailable');
    expect(reload.attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });
});
