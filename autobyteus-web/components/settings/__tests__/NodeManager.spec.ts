import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeManager from '../NodeManager.vue';

const {
  nodeStoreMock,
  nodeSyncStoreMock,
  remoteBrowserSharingStoreMock,
  validateServerHostConfigurationMock,
  probeNodeCapabilitiesMock,
} = vi.hoisted(() => {
  const initialNodes = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://127.0.0.1:29695',
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

  return {
    nodeStoreMock: {
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
    },
    nodeSyncStoreMock: {
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
          scope: ['agent_definition'],
          exportByEntity: [
            {
              entityType: 'agent_definition',
              exportedCount: 1,
              sampledKeys: ['agent-1'],
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
    },
    remoteBrowserSharingStoreMock: {
      initialize: vi.fn().mockResolvedValue(undefined),
      prepareNodeRemoval: vi.fn().mockResolvedValue(null),
      revokeLocalPairing: vi.fn().mockResolvedValue(undefined),
      busyNodeId: null,
    },
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

vi.mock('~/stores/remoteBrowserSharingStore', () => ({
  useRemoteBrowserSharingStore: () => remoteBrowserSharingStoreMock,
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

vi.mock('~/components/settings/RemoteBrowserSharingPanel.vue', () => ({
  default: {
    template: '<div data-testid="remote-browser-sharing-panel" />',
  },
}));

vi.mock('~/components/settings/RemoteNodePairingControls.vue', () => ({
  default: {
    props: ['node'],
    template: '<div :data-testid="`pairing-controls-${node.id}`" />',
  },
}));

describe('NodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remoteBrowserSharingStoreMock.busyNodeId = null;
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
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
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

  it('initializes the remote browser sharing store and renders the panel host', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="remote-browser-sharing-panel"]').exists()).toBe(true);
  });

  it('runs full sync with explicit source and selected targets', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    const setupState = (wrapper.vm as any).$?.setupState;
    setupState.fullSyncSourceNodeId = 'embedded-local';
    setupState.fullSyncTargetNodeIds = ['remote-1'];
    setupState.fullSyncScope = ['agent_definition'];

    await wrapper.get('[data-testid="full-sync-run-button"]').trigger('click');

    expect(nodeSyncStoreMock.runFullSync).toHaveBeenCalledWith({
      sourceNodeId: 'embedded-local',
      targetNodeIds: ['remote-1'],
      scope: ['agent_definition'],
    });
  });

  it('prepares remote browser cleanup before removing a remote node', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="remove-node-remote-1"]').trigger('click');

    expect(remoteBrowserSharingStoreMock.prepareNodeRemoval).toHaveBeenCalledWith('remote-1');
    expect(nodeStoreMock.removeRemoteNode).toHaveBeenCalledWith('remote-1');
  });

  it('revokes local pairing state if node removal fails after remote cleanup succeeded', async () => {
    nodeStoreMock.nodes[1].browserPairing = {
      state: 'paired',
      advertisedBaseUrl: 'http://host.docker.internal:30123',
      expiresAt: '2026-04-10T10:20:30.000Z',
      updatedAt: '2026-04-10T09:20:30.000Z',
      errorMessage: null,
    };
    nodeStoreMock.removeRemoteNode.mockRejectedValueOnce(new Error('Local registry write failed'));

    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="remove-node-remote-1"]').trigger('click');
    await Promise.resolve();

    expect(remoteBrowserSharingStoreMock.revokeLocalPairing).toHaveBeenCalledWith(
      'remote-1',
      'revoked',
      'Node removal failed after remote browser cleanup completed.',
    );
  });
});
