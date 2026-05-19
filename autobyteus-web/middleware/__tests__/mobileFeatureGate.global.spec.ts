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

type MiddlewareRoute = Parameters<typeof middleware>[0];

const routeLocation = (
  path: string,
  query: Record<string, unknown> = {},
): MiddlewareRoute => ({ path, query }) as MiddlewareRoute;

const runMiddleware = async (
  path: string,
  query: Record<string, unknown> = {},
) => {
  await middleware(routeLocation(path, query), routeLocation('/previous'));
};

describe('mobileFeatureGate.global middleware', () => {
  beforeEach(() => {
    mobileRuntimeState.runtime = true;
    mobileRuntimeState.homePath = '/';
    navigateToMock.mockReset();
  });

  it('redirects unsupported desktop routes to the mobile build root in the static phone app', async () => {
    await runMiddleware('/settings');

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/',
      query: { unsupported: 'desktopSettings' },
    });
  });

  it('redirects the stale desktop workspace route to the phone-first mobile shell', async () => {
    await runMiddleware('/workspace');

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/',
      query: { unsupported: 'desktopWorkspace' },
    });
  });

  it('uses the standalone /mobile page as home outside the mobile static build', async () => {
    mobileRuntimeState.homePath = '/mobile';

    await runMiddleware('/settings');

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/mobile',
      query: { unsupported: 'desktopSettings' },
    });
  });
});
