import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applicationsCapabilityStoreMock, runtime } = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
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
    runtime.mobile = false;
    vi.clearAllMocks();
  });

  // projects-always-on (AC-001): Projects needs no capability; it is always shown on desktop.
  it.each<{ applicationsEnabled: boolean; expectedKeys: string[] }>([
    { applicationsEnabled: false, expectedKeys: ['chat', 'agents', 'agentTeams', 'agentOrgs', 'projects', 'skills', 'memory', 'nodes'] },
    { applicationsEnabled: true, expectedKeys: ['chat', 'agents', 'agentTeams', 'agentOrgs', 'projects', 'applications', 'skills', 'memory', 'nodes'] },
  ])('always shows Projects immediately after Agent Orgs on desktop (Applications enabled: $applicationsEnabled)', ({ applicationsEnabled, expectedKeys }) => {
    applicationsCapabilityStoreMock.isEnabled = applicationsEnabled;

    expect(navKeys()).toEqual(expectedKeys);
  });

  it('keeps Projects hidden in the mobile remote-access runtime (AC-004)', () => {
    runtime.mobile = true;

    expect(navKeys()).toEqual(['chat', 'agents', 'agentTeams', 'agentOrgs', 'skills', 'memory']);
  });

  it('resolves only the Applications capability when navigation readiness is requested, tolerating failures', async () => {
    applicationsCapabilityStoreMock.ensureResolved.mockRejectedValueOnce(new Error('boom'));

    await expect(useShellPrimaryNavigation().ensurePrimaryNavigationReady()).resolves.toBeDefined();
    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce();
  });

  it('routes and matches the Projects destination', () => {
    expect(resolveShellPrimaryRoute('projects')).toBe('/projects');
    expect(isShellPrimaryRouteActive('projects', '/projects/project_1')).toBe(true);
    expect(isShellPrimaryRouteActive('projects', '/applications')).toBe(false);
  });
});
