import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerLoading from '../ServerLoading.vue';

const { serverStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  serverStoreMock: {
    status: 'starting',
    connectionMessage: 'Connecting...',
    connectionAttempts: 0,
    maxConnectionAttempts: 5,
    isInitialStartup: false,
    urls: { graphql: 'http://localhost:29695/graphql' },
    healthCheckStatus: '',
    errorMessage: '',
    userFriendlyError: 'Server failed',
    checkServerHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    restartServer: vi.fn(),
    resetServerDataAndRestart: vi.fn(),
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

describe('ServerLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    serverStoreMock.status = 'starting';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders startup overlay for embedded windows', () => {
    const wrapper = mount(ServerLoading);
    expect(wrapper.find('.server-loading-container').exists()).toBe(true);
    wrapper.unmount();
  });

  it('does not render startup overlay for remote windows', () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = mount(ServerLoading);
    expect(wrapper.find('.server-loading-container').exists()).toBe(false);
    wrapper.unmount();
  });
});
