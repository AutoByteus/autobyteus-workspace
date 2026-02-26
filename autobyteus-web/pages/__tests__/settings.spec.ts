import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SettingsPage from '../settings.vue';

const {
  routeMock,
  routerMock,
  serverStoreMock,
  windowNodeContextStoreMock,
} = vi.hoisted(() => ({
  routeMock: {
    query: {} as Record<string, unknown>,
  },
  routerMock: {
    push: vi.fn().mockResolvedValue(undefined),
  },
  serverStoreMock: {
    status: 'running',
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}));

vi.mock('~/stores/serverStore', () => ({
  useServerStore: () => serverStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

const mountSettings = () =>
  mount(SettingsPage, {
    global: {
      stubs: {
        ProviderAPIKeyManager: { template: '<div data-testid="section-api-keys" />' },
        TokenUsageStatistics: { template: '<div data-testid="section-token-usage" />' },
        ConversationHistoryManager: { template: '<div data-testid="section-conversation-logs" />' },
        NodeManager: { template: '<div data-testid="section-nodes" />' },
        MessagingSetupManager: { template: '<div data-testid="section-messaging" />' },
        ToolsManagementWorkspace: { template: '<div data-testid="section-tools-management" />' },
        ServerSettingsManager: { props: ['sectionMode'], template: '<div data-testid="section-server-settings">mode={{ sectionMode }}</div>' },
      },
    },
  });

describe('settings page', () => {
  beforeEach(() => {
    routeMock.query = {};
    serverStoreMock.status = 'running';
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    vi.clearAllMocks();
  });

  it('shows server settings section in remote windows', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = mountSettings();

    expect(wrapper.text()).toContain('API Keys');
    expect(wrapper.text()).toContain('Nodes');
    expect(wrapper.text()).toContain('Messaging');
    expect(wrapper.text()).toContain('Local Tools');
    expect(wrapper.text()).toContain('MCP Servers');
    expect(wrapper.text()).toContain('Server Settings');
    expect(wrapper.get('[data-testid="settings-nav-back"]').attributes('aria-label')).toBe('Back to workspace');
  });

  it('normalizes legacy server-status route query to server-settings in remote windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    routeMock.query = { section: 'server-status' };
    const wrapper = mountSettings();
    await nextTick();
    const setupState = (wrapper.vm as any).$?.setupState;

    expect(setupState.activeSection).toBe('server-settings');
  });

  it('defaults to server-settings when embedded server is not running', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    serverStoreMock.status = 'starting';
    const wrapper = mountSettings();
    await nextTick();
    const setupState = (wrapper.vm as any).$?.setupState;

    expect(setupState.activeSection).toBe('server-settings');
  });

  it('normalizes legacy server-status route query to server-settings in embedded windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    routeMock.query = { section: 'server-status' };
    const wrapper = mountSettings();
    await nextTick();
    const setupState = (wrapper.vm as any).$?.setupState;

    expect(setupState.activeSection).toBe('server-settings');
  });

  it('supports messaging section query and activates messaging section', async () => {
    routeMock.query = { section: 'messaging' };
    const wrapper = mountSettings();
    await nextTick();
    const setupState = (wrapper.vm as any).$?.setupState;

    expect(setupState.activeSection).toBe('messaging');
  });

  it('supports mcp-servers section query and activates mcp-servers section', async () => {
    routeMock.query = { section: 'mcp-servers' };
    const wrapper = mountSettings();
    await nextTick();
    const setupState = (wrapper.vm as any).$?.setupState;

    expect(setupState.activeSection).toBe('mcp-servers');
  });

  it('navigates back to workspace when back item is clicked', async () => {
    const wrapper = mountSettings();
    await wrapper.get('[data-testid="settings-nav-back"]').trigger('click');

    expect(routerMock.push).toHaveBeenCalledWith('/workspace');
  });

});
