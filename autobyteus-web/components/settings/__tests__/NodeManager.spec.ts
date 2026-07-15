import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeManager from '../NodeManager.vue';

const {
  nodeStoreMock,
  routeMock,
  windowNodeContextStoreMock,
  validateServerHostConfigurationMock,
  probeNodeCapabilitiesMock,
} = vi.hoisted(() => {
  const initialNodes: any[] = [
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
    routeMock: {
      query: {},
    },
    windowNodeContextStoreMock: {
      nodeId: 'embedded-local',
      isEmbeddedWindow: true,
    },
    validateServerHostConfigurationMock: vi.fn(),
    probeNodeCapabilitiesMock: vi.fn(),
  };
});

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => nodeStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
}));

vi.mock('~/utils/nodeHostValidation', () => ({
  validateServerHostConfiguration: validateServerHostConfigurationMock,
}));

vi.mock('~/utils/nodeCapabilityProbe', () => ({
  probeNodeCapabilities: probeNodeCapabilitiesMock,
}));

vi.mock('~/components/settings/DockerNodeStartGuideCard.vue', () => ({
  default: {
    template: '<div data-testid="docker-node-start-guide-card" />',
  },
}));

vi.mock('~/components/settings/PhoneAccessCard.vue', () => ({
  default: {
    template: '<div data-testid="phone-access-card" />',
  },
}));

vi.mock('~/components/settings/PhoneSetupGuideCard.vue', () => ({
  default: {
    template: '<div data-testid="phone-setup-guide-card" />',
  },
}));

vi.mock('~/components/settings/MemorySyncCard.vue', () => ({
  default: {
    props: ['nodeName', 'nodeTypeLabel', 'baseUrl'],
    template: '<div data-testid="memory-sync-card">{{ nodeName }} {{ nodeTypeLabel }} {{ baseUrl }}</div>',
  },
}));

describe('NodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMock.query = {};
    windowNodeContextStoreMock.nodeId = 'embedded-local';
    windowNodeContextStoreMock.isEmbeddedWindow = true;
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
    nodeStoreMock.removeRemoteNode.mockResolvedValue(undefined);

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
    expect(wrapper.find('[data-testid="bootstrap-sync-on-add"]').exists()).toBe(false);
  });

  it('opens or focuses each selected node in its own Electron window', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.get('[data-testid="focus-node-embedded-local"]').trigger('click');
    await wrapper.get('[data-testid="focus-node-remote-1"]').trigger('click');

    expect(window.electronAPI.openNodeWindow).toHaveBeenNthCalledWith(1, 'embedded-local');
    expect(window.electronAPI.openNodeWindow).toHaveBeenNthCalledWith(2, 'remote-1');
  });

  it('does not render removed remote browser pairing surfaces', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="remote-browser-sharing-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="pair-node-remote-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="unpair-node-remote-1"]').exists()).toBe(false);
  });

  it('renders the node management tab by default and keeps Docker guide separate', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-testid="node-manager-tab-memorySync"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.find('[data-testid="node-manager-panel-manage"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="node-manager-panel-memorySync"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="add-node-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="full-sync-run-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bootstrap-sync-on-add"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="docker-node-start-guide-card"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="phone-access-card"]').exists()).toBe(false);
  });

  it('opens the Memory Sync tab from the route query for the current bound node', async () => {
    routeMock.query = { nodeTab: 'memorySync' };

    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-memorySync"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.find('[data-testid="node-manager-panel-memorySync"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="memory-sync-card"]').text()).toContain('Embedded Node');
    expect(wrapper.get('[data-testid="memory-sync-card"]').text()).toContain('http://127.0.0.1:29695');
    expect(wrapper.find('[data-testid="add-node-button"]').exists()).toBe(false);
  });

  it('renders the Phone Setup guide and Phone Access controls in the Phone Setup tab for embedded windows', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').trigger('click');

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-memorySync"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.find('[data-testid="node-manager-panel-phoneSetup"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-setup-guide-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-access-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="add-node-button"]').exists()).toBe(false);
  });

  it('opens the Phone Setup tab from the nodeTab route query', async () => {
    routeMock.query = { nodeTab: 'phoneSetup' };

    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.find('[data-testid="node-manager-panel-phoneSetup"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-setup-guide-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-access-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="add-node-button"]').exists()).toBe(false);
  });

  it('shows Phone Access controls in remote windows so paired-phone access can be configured', async () => {
    windowNodeContextStoreMock.nodeId = 'remote-1';
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').trigger('click');

    expect(wrapper.find('[data-testid="phone-setup-guide-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-access-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-setup-remote-unavailable"]').exists()).toBe(false);
  });

  it('renders the Docker node start guide only in the Docker guide tab', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').trigger('click');

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-phoneSetup"]').attributes('aria-selected')).toBe('false');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-testid="node-manager-panel-dockerGuide"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="docker-node-start-guide-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="add-node-button"]').exists()).toBe(false);
  });

  it('removes a remote node without remote browser cleanup', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="remove-node-remote-1"]').trigger('click');

    expect(nodeStoreMock.removeRemoteNode).toHaveBeenCalledWith('remote-1');
  });
});
