import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentTeamList from '../AgentTeamList.vue';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useServerSettingsStore } from '~/stores/serverSettings';
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from '~/utils/catalog/featuredCatalogItems';

const EMBEDDED_SERVER_BASE_URL = 'http://127.0.0.1:29695';

const AgentTeamCardStub = {
  name: 'AgentTeamCard',
  template: '<div class="agent-team-card"></div>',
  props: ['teamDef'],
  emits: ['run-team', 'view-details', 'sync-team'],
};

const NodeSyncTargetPickerModalStub = {
  name: 'NodeSyncTargetPickerModal',
  template: '<div class="sync-target-picker-stub"></div>',
  props: ['modelValue'],
  emits: ['update:modelValue', 'confirm'],
};

const NodeSyncReportPanelStub = {
  name: 'NodeSyncReportPanel',
  template: '<div class="sync-report-panel-stub"></div>',
  props: ['report', 'title'],
};

function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: mock,
  });
}

async function flushAsyncUi(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function readSetupRef<T>(wrapper: ReturnType<typeof mount>, key: string): T | undefined {
  const setupState = (wrapper.vm as any).$?.setupState;
  const value = setupState?.[key];
  if (value && typeof value === 'object' && 'value' in value) {
    return value.value as T;
  }
  return value as T | undefined;
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
      nodes: [{ memberName: 'alpha_lead', refType: 'AGENT', ref: 'a1' }],
    },
    {
      id: 't2',
      name: 'Team Beta',
      description: 'Beta description',
      instructions: 'Beta orchestration instructions',
      category: 'ops',
      coordinatorMemberName: 'beta_lead',
      nodes: [{ memberName: 'beta_lead', refType: 'AGENT', ref: 'a2' }],
    },
  ];

  const defaultNodes = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: EMBEDDED_SERVER_BASE_URL,
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-02-11T00:00:00.000Z',
      updatedAt: '2026-02-11T00:00:00.000Z',
    },
    {
      id: 'remote-1',
      name: 'Remote One',
      baseUrl: 'http://localhost:8001',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-02-11T00:00:00.000Z',
      updatedAt: '2026-02-11T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    setElectronApiMock(null);
  });

  const mountComponent = async (options?: { nodes?: any[]; sourceNodeId?: string; featuredSettingValue?: string | null }) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    });
    setActivePinia(pinia);

    const store = useAgentTeamDefinitionStore();
    store.agentTeamDefinitions = mockTeamDefs as any;
    store.loading = false as any;
    store.error = null as any;

    const nodeStore = useNodeStore();
    nodeStore.nodes = (options?.nodes ?? defaultNodes) as any;
    (nodeStore.initializeRegistry as any).mockResolvedValue(undefined);

    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.initialize as any).mockResolvedValue(undefined);

    const windowNodeContextStore = useWindowNodeContextStore();
    windowNodeContextStore.nodeId = options?.sourceNodeId ?? 'embedded-local';

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
          NodeSyncTargetPickerModal: NodeSyncTargetPickerModalStub,
          NodeSyncReportPanel: NodeSyncReportPanelStub,
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

  it('shows error when no target nodes are available for team sync', async () => {
    const wrapper = await mountComponent({
      nodes: [defaultNodes[0]],
    });

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncTeam(mockTeamDefs[0]);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(readSetupRef<string | null>(wrapper, 'syncError')).toBe('No target nodes available for sync.');
  });

  it('reloads team definitions when reload is clicked', async () => {
    const wrapper = await mountComponent();
    const store = useAgentTeamDefinitionStore();

    const reloadButton = wrapper.findAll('button').find((button) => button.text().includes('Reload'));
    expect(reloadButton).toBeDefined();
    await reloadButton!.trigger('click');
    await flushAsyncUi();

    expect(store.reloadAllAgentTeamDefinitions).toHaveBeenCalledTimes(1);
  });

  it('opens target picker and runs selective team sync after confirmation', async () => {
    const wrapper = await mountComponent();
    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.runSelectiveTeamSync as any).mockResolvedValue({
      status: 'success',
      sourceNodeId: 'embedded-local',
      targetResults: [{ targetNodeId: 'remote-1', status: 'success' }],
      error: null,
      report: {
        sourceNodeId: 'embedded-local',
        scope: ['agent_definition', 'agent_team_definition'],
        exportByEntity: [],
        targets: [],
      },
    });

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncTeam(mockTeamDefs[0]);
    expect(readSetupRef<boolean>(wrapper, 'isTargetPickerOpen')).toBe(true);

    await setupState.confirmTeamSync(['remote-1']);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(nodeSyncStore.runSelectiveTeamSync).toHaveBeenCalledWith({
      sourceNodeId: 'embedded-local',
      targetNodeIds: ['remote-1'],
      agentTeamDefinitionIds: ['t1'],
      includeDependencies: true,
      includeDeletes: false,
    });
    expect(readSetupRef(wrapper, 'lastTeamSyncReport')).toEqual({
      sourceNodeId: 'embedded-local',
      scope: ['agent_definition', 'agent_team_definition'],
      exportByEntity: [],
      targets: [],
    });
    expect(readSetupRef<string | null>(wrapper, 'syncInfo')).toBe('Team sync success. 1/1 target(s) succeeded.');
  });

  it('renders sync failure message when selective team sync rejects', async () => {
    const wrapper = await mountComponent();
    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.runSelectiveTeamSync as any).mockRejectedValue(new Error('team sync failed'));

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncTeam(mockTeamDefs[0]);
    await setupState.confirmTeamSync(['remote-1']);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(readSetupRef<string | null>(wrapper, 'syncError')).toBe('team sync failed');
  });
});
