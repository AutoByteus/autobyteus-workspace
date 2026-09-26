import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applicationsCapabilityStoreMock, projectsCapabilityStoreMock, runtime } = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  projectsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  runtime: { mobile: false },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/agents' }),
}));

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}));

vi.mock('~/stores/projectsCapabilityStore', () => ({
  useProjectsCapabilityStore: () => projectsCapabilityStoreMock,
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({
  isMobileRemoteAccessRuntime: () => runtime.mobile,
  stripMobileRuntimePrefix: (path: string) => path.replace(/^\/mobile/, '') || '/',
}));

import {
  isShellPrimaryRouteActive,
  resolveShellPrimaryRoute,
  useShellPrimaryNavigation,
} from '../useShellPrimaryNavigation';

const navKeys = () => useShellPrimaryNavigation().primaryNavItems.value.map((item) => item.key);

describe('useShellPrimaryNavigation capability gating', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false;
    projectsCapabilityStoreMock.isEnabled = false;
    runtime.mobile = false;
    vi.clearAllMocks();
  });

  it('hides Projects while the capability is disabled', () => {
    expect(navKeys()).not.toContain('projects');
  });

  it('shows Projects after Nodes when the capability is enabled', () => {
    projectsCapabilityStoreMock.isEnabled = true;

    const keys = navKeys();
    expect(keys.indexOf('projects')).toBe(keys.indexOf('nodes') + 1);
  });

  it('keeps Projects hidden in the mobile remote-access runtime', () => {
    projectsCapabilityStoreMock.isEnabled = true;
    runtime.mobile = true;

    expect(navKeys()).not.toContain('projects');
  });

  it('gates Projects independently of Applications', () => {
    applicationsCapabilityStoreMock.isEnabled = true;

    expect(navKeys()).toContain('applications');
    expect(navKeys()).not.toContain('projects');
  });

  it('resolves both capabilities when navigation readiness is requested, tolerating failures', async () => {
    projectsCapabilityStoreMock.ensureResolved.mockRejectedValueOnce(new Error('boom'));

    await expect(useShellPrimaryNavigation().ensurePrimaryNavigationReady()).resolves.toBeDefined();
    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce();
    expect(projectsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce();
  });

  it('routes and matches the Projects destination', () => {
    expect(resolveShellPrimaryRoute('projects')).toBe('/projects');
    expect(isShellPrimaryRouteActive('projects', '/projects/project_1')).toBe(true);
    expect(isShellPrimaryRouteActive('projects', '/applications')).toBe(false);
  });
});
