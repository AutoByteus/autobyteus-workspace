import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const { mobileRuntimeState, navigateToMock } = vi.hoisted(() => ({
  mobileRuntimeState: {
    runtime: true,
    homePath: '/',
  },
  navigateToMock: vi.fn(),
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({
  isMobileRemoteAccessRuntime: () => mobileRuntimeState.runtime,
  mobileRemoteAccessHomePath: () => mobileRuntimeState.homePath,
  stripMobileRuntimePrefix: (pathname: string) => {
    if (pathname === '/mobile') {
      return '/';
    }
    return pathname.startsWith('/mobile/') ? pathname.slice('/mobile'.length) : pathname;
  },
}));

mockNuxtImport('navigateTo', () => navigateToMock);
vi.stubGlobal('defineNuxtRouteMiddleware', vi.fn((fn: any) => fn));

import middleware from '../mobileFeatureGate.global';

describe('mobileFeatureGate.global middleware', () => {
  beforeEach(() => {
    mobileRuntimeState.runtime = true;
    mobileRuntimeState.homePath = '/';
    navigateToMock.mockReset();
  });

  it('redirects unsupported desktop routes to the mobile build root in the static phone app', async () => {
    await middleware({ path: '/settings', query: {} } as any);

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/',
      query: { unsupported: 'desktopSettings' },
    });
  });

  it('keeps mobile-safe workspace routes reachable', async () => {
    await middleware({ path: '/workspace', query: {} } as any);

    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('uses the standalone /mobile page as home outside the mobile static build', async () => {
    mobileRuntimeState.homePath = '/mobile';

    await middleware({ path: '/settings', query: {} } as any);

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/mobile',
      query: { unsupported: 'desktopSettings' },
    });
  });
});
