import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import IndexPage from '../index.vue';

const { mobileRuntimeState, navigateToMock } = vi.hoisted(() => ({
  mobileRuntimeState: {
    enabled: false,
  },
  navigateToMock: vi.fn(),
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({
  isMobileRemoteAccessRuntime: () => mobileRuntimeState.enabled,
}));

vi.mock('~/components/mobile/MobileRemoteAccessShell.vue', () => ({
  default: {
    template: '<div data-testid="mobile-remote-access-shell" />',
  },
}));

mockNuxtImport('navigateTo', () => navigateToMock);

const mountIndexPage = () => mount(IndexPage, {
  global: {
    mocks: {
      $t: (key: string) => key,
    },
  },
});

describe('mobile root entry page', () => {
  beforeEach(() => {
    mobileRuntimeState.enabled = false;
    navigateToMock.mockReset();
  });

  it('renders the phone shell at the mobile static root instead of redirecting to the desktop agent shell', async () => {
    mobileRuntimeState.enabled = true;

    const wrapper = mountIndexPage();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-remote-access-shell"]').exists()).toBe(true);
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('keeps the desktop root redirect outside the mobile runtime', async () => {
    const wrapper = mountIndexPage();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-remote-access-shell"]').exists()).toBe(false);
    expect(navigateToMock).toHaveBeenCalledWith('/agents', { replace: true });
  });
});
