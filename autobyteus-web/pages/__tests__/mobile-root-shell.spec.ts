import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import IndexPage from '../index.vue';

const { mobileRuntimeState, navigateToMock, routeState } = vi.hoisted(() => ({
  mobileRuntimeState: {
    enabled: true,
  },
  navigateToMock: vi.fn(),
  routeState: {
    current: {
      query: {} as Record<string, unknown>,
    },
  },
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({
  isMobileRemoteAccessRuntime: () => mobileRuntimeState.enabled,
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => routeState.current,
  };
});

mockNuxtImport('navigateTo', () => navigateToMock);

const mountMobileRoot = () => mount(IndexPage, {
  global: {
    mocks: {
      $t: (key: string) => key,
    },
  },
});

const toBase64Url = (value: object): string => btoa(JSON.stringify(value))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

describe('mobile static root shell rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    mobileRuntimeState.enabled = true;
    navigateToMock.mockReset();
    routeState.current = { query: {} };
    window.history.pushState({}, '', '/');
  });

  it('shows unsupported desktop-route feedback at the mobile root before the phone is paired', async () => {
    routeState.current = { query: { unsupported: 'desktopSettings' } };
    window.history.pushState({}, '', '/?unsupported=desktopSettings');

    const wrapper = mountMobileRoot();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-unsupported-feature"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Desktop settings are managed from the desktop app.');
    expect(wrapper.text()).toContain('Connect this phone');
    expect(wrapper.find('[data-testid="mobile-show-pairing-text"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-pairing-text"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Agent Teams');
    expect(wrapper.text()).not.toContain('Skills');
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('keeps generated pairing links on the mobile root in the phone pairing bootstrap', async () => {
    const pairingPayload = toBase64Url({
      version: 1,
      serverBaseUrl: 'http://desktop-private.local:29695',
      pairingCode: 'PAIR-123',
    });
    window.history.pushState({}, '', `/?pairing=${pairingPayload}`);

    const wrapper = mountMobileRoot();
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain('Connect this phone');
    expect(wrapper.find('[data-testid="mobile-pairing-detected"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-pairing-text"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-pair-button"]').text()).toContain('Pair this phone');
    expect(wrapper.find('[data-testid="mobile-unsupported-feature"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Agent Teams');
    expect(wrapper.text()).not.toContain('Skills');
    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
