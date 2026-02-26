import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerMonitor from '../ServerMonitor.vue';

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const { serverStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  serverStoreMock: {
    status: 'running',
    isElectron: true,
    userFriendlyError: '',
    healthCheckStatus: '',
    urls: { graphql: 'http://localhost:29695/graphql' },
    checkServerHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    restartServer: vi.fn(),
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}));

vi.mock('~/stores/serverStore', () => ({
  useServerStore: () => serverStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/components/server/ServerLogViewer.vue', () => ({
  default: {
    template: '<div data-testid="server-log-viewer"></div>',
  },
}));

describe('ServerMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverStoreMock.isElectron = true;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        restartServer: vi.fn(),
        getLogFilePath: vi.fn().mockResolvedValue('/tmp/server.log'),
      },
    });
  });

  it('renders unavailable message in remote windows', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = mount(ServerMonitor);
    expect(wrapper.text()).toContain('unavailable for remote node windows');
    expect(wrapper.find('.server-monitor').exists()).toBe(false);
  });

  it('renders monitor content in embedded windows and refreshes status', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    const wrapper = mount(ServerMonitor);
    await flushPromises();
    expect(wrapper.find('.server-monitor').exists()).toBe(true);
    expect(serverStoreMock.checkServerHealth).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Server Status');
    expect(wrapper.find('[data-testid="server-monitor-restart-button"]').exists()).toBe(true);
  });

  it('hides restart action when restart capability is unavailable', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    serverStoreMock.isElectron = false;
    const wrapper = mount(ServerMonitor);

    expect(wrapper.find('[data-testid="server-monitor-refresh-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="server-monitor-restart-button"]').exists()).toBe(false);
  });
});
