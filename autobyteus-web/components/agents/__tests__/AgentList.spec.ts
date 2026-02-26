import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentList from '../AgentList.vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

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
  emits: ['run-agent', 'view-details', 'sync-agent'],
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

describe('AgentList', () => {
  const mockAgentDefs = [
    { id: '1', name: 'Agent Alpha', description: 'Alpha Desc' },
    { id: '2', name: 'Agent Beta', description: 'Beta Desc' },
  ];

  const defaultNodes = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://localhost:29695',
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
    addToastMock.mockReset();
    setElectronApiMock(null);
  });

  const mountComponent = async (options?: {
    nodes?: any[];
    sourceNodeId?: string;
    deleteResult?: { success: boolean; message: string } | null;
  }) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    });
    setActivePinia(pinia);

    const store = useAgentDefinitionStore();
    store.agentDefinitions = mockAgentDefs as any;
    store.loading = false;
    store.error = null;
    store.deleteResult = options?.deleteResult ?? null;

    const nodeStore = useNodeStore();
    nodeStore.nodes = (options?.nodes ?? defaultNodes) as any;
    (nodeStore.initializeRegistry as any).mockResolvedValue(undefined);

    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.initialize as any).mockResolvedValue(undefined);

    const windowNodeContextStore = useWindowNodeContextStore();
    windowNodeContextStore.nodeId = options?.sourceNodeId ?? 'embedded-local';

    const wrapper = mount(AgentList, {
      global: {
        plugins: [pinia],
        stubs: {
          AgentCard: AgentCardStub,
          NodeSyncTargetPickerModal: NodeSyncTargetPickerModalStub,
          NodeSyncReportPanel: NodeSyncReportPanelStub,
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

  it('shows error when no target nodes are available for sync', async () => {
    const wrapper = await mountComponent({
      nodes: [defaultNodes[0]],
    });

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncAgent(mockAgentDefs[0]);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(readSetupRef<string | null>(wrapper, 'syncError')).toBe('No target nodes available for sync.');
  });

  it('opens target picker and runs selective sync after confirmation', async () => {
    const wrapper = await mountComponent();
    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.runSelectiveAgentSync as any).mockResolvedValue({
      status: 'success',
      sourceNodeId: 'embedded-local',
      targetResults: [{ targetNodeId: 'remote-1', status: 'success' }],
      error: null,
      report: {
        sourceNodeId: 'embedded-local',
        scope: ['prompt', 'agent_definition'],
        exportByEntity: [],
        targets: [],
      },
    });

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncAgent(mockAgentDefs[0]);
    expect(readSetupRef<boolean>(wrapper, 'isTargetPickerOpen')).toBe(true);

    await setupState.confirmAgentSync(['remote-1']);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(nodeSyncStore.runSelectiveAgentSync).toHaveBeenCalledWith({
      sourceNodeId: 'embedded-local',
      targetNodeIds: ['remote-1'],
      agentDefinitionIds: ['1'],
      includeDependencies: true,
      includeDeletes: false,
    });
    expect(readSetupRef(wrapper, 'lastAgentSyncReport')).toEqual({
      sourceNodeId: 'embedded-local',
      scope: ['prompt', 'agent_definition'],
      exportByEntity: [],
      targets: [],
    });
    expect(readSetupRef<string | null>(wrapper, 'syncInfo')).toBe('Agent sync success. 1/1 target(s) succeeded.');
  });

  it('renders sync failure message when selective sync action rejects', async () => {
    const wrapper = await mountComponent();
    const nodeSyncStore = useNodeSyncStore();
    (nodeSyncStore.runSelectiveAgentSync as any).mockRejectedValue(new Error('sync failed for remote node'));

    const setupState = (wrapper.vm as any).$?.setupState;
    await setupState.syncAgent(mockAgentDefs[0]);
    await setupState.confirmAgentSync(['remote-1']);
    await flushAsyncUi();
    await wrapper.vm.$nextTick();

    expect(readSetupRef<string | null>(wrapper, 'syncError')).toBe('sync failed for remote node');
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
