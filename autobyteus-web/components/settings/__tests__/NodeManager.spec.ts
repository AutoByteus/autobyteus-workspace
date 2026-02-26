import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeManager from '../NodeManager.vue';

const {
  nodeStoreMock,
  nodeSyncStoreMock,
  validateServerHostConfigurationMock,
  probeNodeCapabilitiesMock,
} = vi.hoisted(() => {
  const initialNodes = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://localhost:29695',
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
      capabilityProbeState: 'ready',
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
    },
    {
      id: 'remote-1',
      name: 'Remote One',
      baseUrl: 'http://node-a:8000',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
      capabilityProbeState: 'ready',
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
    },
  ];

  const store = {
    nodes: initialNodes,
    initializeRegistry: vi.fn().mockResolvedValue(undefined),
    getNodeById: vi.fn((id: string) => initialNodes.find((node) => node.id === id) || null),
    addRemoteNode: vi.fn().mockImplementation(async (input: any) => ({
      ...input,
      id: 'remote-added',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
    })),
    renameNode: vi.fn().mockResolvedValue(undefined),
    removeRemoteNode: vi.fn().mockResolvedValue(undefined),
  };

  const syncStore = {
    initialize: vi.fn().mockResolvedValue(undefined),
    runBootstrapSync: vi.fn().mockResolvedValue({
      status: 'success',
      sourceNodeId: 'embedded-local',
      targetResults: [{ targetNodeId: 'remote-added', status: 'success' }],
      error: null,
    }),
    runFullSync: vi.fn().mockResolvedValue({
      status: 'success',
      sourceNodeId: 'embedded-local',
      targetResults: [{ targetNodeId: 'remote-1', status: 'success' }],
      error: null,
      report: {
        sourceNodeId: 'embedded-local',
        scope: ['prompt'],
        exportByEntity: [
          {
            entityType: 'prompt',
            exportedCount: 1,
            sampledKeys: ['prompt-1'],
            sampleTruncated: false,
          },
        ],
        targets: [
          {
            targetNodeId: 'remote-1',
            status: 'success',
            summary: {
              processed: 1,
              created: 1,
              updated: 0,
              deleted: 0,
              skipped: 0,
            },
            failureCountTotal: 0,
            failureSamples: [],
            failureSampleTruncated: false,
            message: null,
          },
        ],
      },
    }),
  };

  return {
    nodeStoreMock: store,
    nodeSyncStoreMock: syncStore,
    validateServerHostConfigurationMock: vi.fn(),
    probeNodeCapabilitiesMock: vi.fn(),
  };
});

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => nodeStoreMock,
}));

vi.mock('~/stores/nodeSyncStore', () => ({
  useNodeSyncStore: () => nodeSyncStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    nodeId: 'embedded-local',
    isEmbeddedWindow: true,
  }),
}));

vi.mock('~/utils/nodeHostValidation', () => ({
  validateServerHostConfiguration: validateServerHostConfigurationMock,
}));

vi.mock('~/utils/nodeCapabilityProbe', () => ({
  probeNodeCapabilities: probeNodeCapabilitiesMock,
}));

describe('NodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateServerHostConfigurationMock.mockReturnValue({
      normalizedBaseUrl: 'http://node-b:8000',
      severity: 'ok',
      warnings: [],
      errors: [],
    });
    probeNodeCapabilitiesMock.mockResolvedValue({
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
      state: 'ready',
      error: null,
    });

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: {
        openNodeWindow: vi.fn().mockResolvedValue({ windowId: 1, created: false }),
      },
    });
  });

  it('adds a remote node using host validation and capability probe', async () => {
    const wrapper = mount(NodeManager);

    const setupState = (wrapper.vm as any).$?.setupState;
    setupState.addForm.name = 'Docker Node';
    setupState.addForm.baseUrl = 'http://node-b:8000';
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="add-node-button"]').trigger('click');
    await Promise.resolve();

    expect(validateServerHostConfigurationMock).toHaveBeenCalledWith('http://node-b:8000');
    expect(probeNodeCapabilitiesMock).toHaveBeenCalledWith('http://node-b:8000', {
      timeoutMs: 1500,
    });
    expect(nodeStoreMock.addRemoteNode).toHaveBeenCalledWith({
      name: 'Docker Node',
      baseUrl: 'http://node-b:8000',
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
      capabilityProbeState: 'ready',
    });
    expect(nodeSyncStoreMock.runBootstrapSync).toHaveBeenCalledWith({
      sourceNodeId: 'embedded-local',
      targetNodeId: 'remote-added',
    });
  });

  it('focuses/open an existing node window', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.get('[data-testid="focus-node-embedded-local"]').trigger('click');
    expect(window.electronAPI.openNodeWindow).toHaveBeenCalledWith('embedded-local');
  });

  it('runs full sync with explicit source and selected targets', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="full-sync-source-select"]').setValue('embedded-local');
    await wrapper.get('[data-testid="full-sync-run-button"]').trigger('click');
    await Promise.resolve();

    expect(nodeSyncStoreMock.runFullSync).toHaveBeenCalledWith({
      sourceNodeId: 'embedded-local',
      targetNodeIds: ['remote-1'],
      scope: [
        'prompt',
        'agent_definition',
        'agent_team_definition',
        'mcp_server_configuration',
      ],
    });
    const setupState = (wrapper.vm as any).$?.setupState;
    expect(setupState.fullSyncReport).toEqual({
      sourceNodeId: 'embedded-local',
      scope: ['prompt'],
      exportByEntity: [
        {
          entityType: 'prompt',
          exportedCount: 1,
          sampledKeys: ['prompt-1'],
          sampleTruncated: false,
        },
      ],
      targets: [
        {
          targetNodeId: 'remote-1',
          status: 'success',
          summary: {
            processed: 1,
            created: 1,
            updated: 0,
            deleted: 0,
            skipped: 0,
          },
          failureCountTotal: 0,
          failureSamples: [],
          failureSampleTruncated: false,
          message: null,
        },
      ],
    });
  });
});
