import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeManager from '../NodeManager.vue';

const {
  nodeStoreMock,
  routeMock,
  windowNodeContextStoreMock,
} = vi.hoisted(() => {
  const initialNodes: any[] = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://127.0.0.1:29695',
      nodeType: 'embedded',
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
    },
    {
      id: 'remote-1',
      name: 'Remote One',
      baseUrl: 'http://node-a:8000',
      nodeType: 'remote',
      createdAt: '2026-02-08T00:00:00.000Z',
      updatedAt: '2026-02-08T00:00:00.000Z',
    },
  ];

  return {
    nodeStoreMock: {
      nodes: initialNodes,
      initializeRegistry: vi.fn().mockResolvedValue(undefined),
      getEntryById: vi.fn((id: string) => initialNodes.find((node) => node.id === id) || null),
      addRemoteNode: vi.fn().mockImplementation(async (input: any) => ({
        ...input,
        id: 'remote-added',
        nodeType: 'remote',
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
      entryId: 'embedded-local',
      isEmbeddedWindow: true,
    },
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

// one-nodes-tab: Manage Nodes is "This node" and the one list; their behavior has its own tests.
vi.mock('~/components/settings/nodes/ThisNodeCard.vue', () => ({
  default: {
    props: ['nodeName', 'nodeTypeLabel', 'baseUrl'],
    template: '<div data-testid="this-node-card">{{ nodeName }} {{ nodeTypeLabel }} {{ baseUrl }}</div>',
  },
}));

vi.mock('~/components/settings/nodes/NodeList.vue', () => ({
  default: {
    emits: ['guide'],
    template: '<div data-testid="node-list-card"><button data-testid="node-list-guide" @click="$emit(\'guide\')" /></div>',
  },
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
    windowNodeContextStoreMock.entryId = 'embedded-local';
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: {
        openNodeWindow: vi.fn().mockResolvedValue({ windowId: 1, created: false }),
      },
    });
  });

  it('one-nodes-tab REQ-701: Manage Nodes shows This node and the one list; there is no Remote Collaboration tab', async () => {
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('data-testid'))).toEqual([
      'node-manager-tab-manage', 'node-manager-tab-memorySync', 'node-manager-tab-phoneSetup', 'node-manager-tab-dockerGuide', 'node-manager-tab-nfsGuide']);
    expect(wrapper.get('[data-testid="this-node-card"]').text()).toContain('Embedded Node');
    expect(wrapper.get('[data-testid="this-node-card"]').text()).toContain('http://127.0.0.1:29695');
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(true);
  });

  it('one-nodes-tab: ?nodeTab=remoteCollaboration opens Manage Nodes; the Docker Guide link from the list switches tabs', async () => {
    routeMock.query = { nodeTab: 'remoteCollaboration' };
    const wrapper = mount(NodeManager);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="node-manager-tab-manage"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-testid="node-manager-panel-remoteCollaboration"]').exists()).toBe(false);
    await wrapper.get('[data-testid="node-list-guide"]').trigger('click');
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-testid="docker-node-start-guide-card"]').exists()).toBe(true);
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
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(true);
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
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(false);
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
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(false);
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
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(false);
  });

  it('shows Phone Access controls in remote windows so paired-phone access can be configured', async () => {
    windowNodeContextStoreMock.entryId = 'remote-1';
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
    expect(wrapper.find('[data-testid="node-list-card"]').exists()).toBe(false);
  });

  it('opens NFS Guide from the route and retains accessible keyboard navigation', async () => {
    routeMock.query = { nodeTab: 'nfsGuide' };
    const wrapper = mount(NodeManager);
    expect(wrapper.get('[data-testid="node-manager-tab-nfsGuide"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-testid="node-manager-panel-nfsGuide"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="copy-nfs-macos"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="copy-nfs-linux"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="nfs-guide-card"]').findAll('code')).toHaveLength(9);
    expect(wrapper.get('[data-testid="nfs-guide-card"]').text()).toContain('v0.1.0');
    expect(wrapper.get('[data-testid="nfs-command-create"] code').text()).toBe('~/.local/bin/autobyteus-nfs create');
    await wrapper.get('[data-testid="node-manager-tab-nfsGuide"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').attributes('aria-selected')).toBe('true');
    await wrapper.get('[data-testid="node-manager-tab-dockerGuide"]').trigger('keydown', { key: 'End' });
    expect(wrapper.find('[data-testid="node-manager-panel-nfsGuide"]').exists()).toBe(true);
    wrapper.unmount();
  });

});
