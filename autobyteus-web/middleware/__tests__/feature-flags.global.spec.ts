import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const { mockRuntimeConfig, navigateToMock } = vi.hoisted(() => ({
  mockRuntimeConfig: {
    public: {
      enableApplications: false,
    },
  },
  navigateToMock: vi.fn(),
}));

mockNuxtImport('useRuntimeConfig', () => () => mockRuntimeConfig);
mockNuxtImport('navigateTo', () => navigateToMock);
vi.stubGlobal('defineNuxtRouteMiddleware', vi.fn((fn: any) => fn));

// Now import the middleware
import middleware from '../feature-flags.global';

describe('feature-flags.global middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntimeConfig.public.enableApplications = false;
  });

  it('redirects to / when accessing /applications and feature is disabled', () => {
    const to = { path: '/applications' } as any;
    middleware(to);

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('redirects to / when accessing /applications/123 and feature is disabled', () => {
    const to = { path: '/applications/123' } as any;
    middleware(to);

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('does not redirect when accessing /applications and feature is enabled', () => {
    mockRuntimeConfig.public.enableApplications = true;
    const to = { path: '/applications' } as any;
    middleware(to);

    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('does not redirect when accessing other routes', () => {
    const to = { path: '/agents' } as any;
    middleware(to);

    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
