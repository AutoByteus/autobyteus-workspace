import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime';
import App from '../app.vue';

const { runtimeConfigMock, serverStoreMock, windowNodeContextStoreMock, localizationGateState, runtimeFeatureState, feedEnabledRefs, definitionFeedEnabledRefs, mobileRuntimeState, mobileSession, electronWindow } = vi.hoisted(() => ({
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
  localizationGateState: {
    ready: true,
  },
  // Settings (and with it the Notification Center) exists in desktop and browser windows, not the mobile client.
  runtimeFeatureState: {
    desktopSettings: true,
  },
  feedEnabledRefs: [] as Array<{ value: boolean }>,
  definitionFeedEnabledRefs: [] as Array<{ value: boolean }>,
  mobileRuntimeState: { phone: false },
  mobileSession: { store: null as null | { isPaired: boolean } },
  electronWindow: { value: true },
}));

vi.mock('~/utils/mobileFeatureGates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/mobileFeatureGates')>()),
  isFeatureAvailableInRuntime: (featureId: string) =>
    featureId === 'desktopSettings' ? runtimeFeatureState.desktopSettings : true,
}));

vi.mock('~/composables/notifications/useUpdateNotificationChangeFeed', () => ({
  useUpdateNotificationChangeFeed: (enabled: { value: boolean }) => { feedEnabledRefs.push(enabled); },
}));

vi.mock('~/composables/agentPackages/useAgentPackageDefinitionChangeFeed', () => ({
  useAgentPackageDefinitionChangeFeed: (enabled: { value: boolean }) => { definitionFeedEnabledRefs.push(enabled); },
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/remoteAccess/mobileRuntime')>()),
  isMobileRemoteAccessRuntime: () => mobileRuntimeState.phone,
}));

vi.mock('~/utils/browserServerConfig', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/browserServerConfig')>()),
  isElectronEnvironment: () => electronWindow.value,
}));

vi.mock('~/stores/mobileNodeSessionStore', async () => {
  const { reactive } = await import('vue');
  mobileSession.store = reactive({ isPaired: false });
  return { useMobileNodeSessionStore: () => mobileSession.store };
});

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

vi.mock('~/components/app/AppLocalizationGate.vue', () => ({
  default: {
    computed: {
      ready() {
        return localizationGateState.ready;
      },
    },
    template:
      '<div v-if="ready" data-testid="app-localization-slot"><slot /></div><div v-else data-testid="app-localization-gate" />',
  },
}));

vi.mock('~/components/notifications/NotificationCenter.vue', () => ({
  default: { template: '<div data-testid="notification-center" />' },
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
    localizationGateState.ready = true;
    runtimeFeatureState.desktopSettings = true;
    feedEnabledRefs.length = 0;
    definitionFeedEnabledRefs.length = 0;
    mobileRuntimeState.phone = false;
    if (mobileSession.store) mobileSession.store.isPaired = false;
    electronWindow.value = true;
  });

  it('holds product UI behind the localization gate while booting', async () => {
    localizationGateState.ready = false;
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="app-localization-gate"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="server-loading"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="server-shutdown"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="notification-center"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="toast-container"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(false);
  });

  it('shows embedded overlays and waits for readiness in the Electron embedded window', async () => {
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="server-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="server-shutdown"]').exists()).toBe(true);
    // The self-opening app-update card is gone; the Notification Center opens only on a click (DEC-001).
    expect(wrapper.find('[data-testid="app-update-notice"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="notification-center"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="toast-container"]').exists()).toBe(true);
  });

  it('mounts no server overlay in a browser page, phone included, so nothing checks health at start (autobyteus-435 AC-001-1)', async () => {
    electronWindow.value = false;
    serverStoreMock.status = 'running';
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="server-loading"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="server-shutdown"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(true);
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

  it('mounts no Notification Center and keeps no update-notification feed in the mobile client (AC-018, REQ-017)', async () => {
    runtimeFeatureState.desktopSettings = false;
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    serverStoreMock.status = 'running';
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="nuxt-layout"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="notification-center"]').exists()).toBe(false);
    expect(feedEnabledRefs.at(-1)?.value).toBe(false);
  });

  it('keeps the update-notification feed in a ready browser window of a server node', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    const wrapper = await mountSuspended(App, { route: '/' });

    expect(wrapper.find('[data-testid="notification-center"]').exists()).toBe(true);
    expect(feedEnabledRefs.at(-1)?.value).toBe(true);
  });

  it('keeps the agent package definitions feed in a ready desktop or browser window, paired or not', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    await mountSuspended(App, { route: '/' });

    expect(definitionFeedEnabledRefs.at(-1)?.value).toBe(true);
  });

  it('opens the definitions feed on the phone only while it has a paired session (autobyteus-426 AC-001)', async () => {
    mobileRuntimeState.phone = true;
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    await mountSuspended(App, { route: '/' });
    const enabled = definitionFeedEnabledRefs.at(-1)!;

    expect(enabled.value).toBe(false);
    mobileSession.store!.isPaired = true;
    expect(enabled.value).toBe(true);
    mobileSession.store!.isPaired = false;
    expect(enabled.value).toBe(false);
  });
});
