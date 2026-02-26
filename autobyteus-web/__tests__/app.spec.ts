import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime';
import App from '../app.vue';

const { runtimeConfigMock, serverStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  runtimeConfigMock: {
    public: {
      showDebugErrorPanel: false,
    },
  },
  serverStoreMock: {
    status: 'starting',
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}));

mockNuxtImport('useRuntimeConfig', () => () => runtimeConfigMock);
mockComponent('NuxtLayout', () => ({
  template: '<div data-testid="nuxt-layout"><slot /></div>',
}));
mockComponent('NuxtPage', () => ({
  template: '<div data-testid="nuxt-page" />',
}));

vi.mock('~/stores/serverStore', () => ({
  useServerStore: () => serverStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/components/server/ServerLoading.vue', () => ({
  default: { template: '<div data-testid="server-loading" />' },
}));

vi.mock('~/components/server/ServerShutdown.vue', () => ({
  default: { template: '<div data-testid="server-shutdown" />' },
}));

vi.mock('~/components/ui/UiErrorPanel.vue', () => ({
  default: { template: '<div data-testid="error-panel" />' },
}));

vi.mock('~/components/common/ToastContainer.vue', () => ({
  default: { template: '<div data-testid="toast-container" />' },
}));

describe('app.vue', () => {
  beforeEach(() => {
    runtimeConfigMock.public.showDebugErrorPanel = false;
    serverStoreMock.status = 'starting';
    windowNodeContextStoreMock.isEmbeddedWindow = true;
  });

  it('shows embedded overlays and waits for readiness in embedded windows', async () => {
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="server-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="server-shutdown"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="toast-container"]').exists()).toBe(true);
  });

  it('renders app layout immediately for remote windows', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="server-loading"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="server-shutdown"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nuxt-page"]').exists()).toBe(true);
  });

  it('renders debug error panel only when enabled', async () => {
    runtimeConfigMock.public.showDebugErrorPanel = true;
    serverStoreMock.status = 'running';
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="error-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(true);
  });
});
