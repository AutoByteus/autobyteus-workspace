import { computed, type ComputedRef } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore';
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates';

export type ShellPrimaryNavKey =
  | 'agents'
  | 'agentTeams'
  | 'applications'
  | 'skills'
  | 'memory'
  | 'nodes';

export interface ShellPrimaryNavItem {
  key: ShellPrimaryNavKey;
  labelKey: string;
  icon: string;
}

export const SHELL_NODES_NETWORK_ICON = 'autobyteus:nodes-network';

const allShellPrimaryNavItems: readonly ShellPrimaryNavItem[] = [
  { key: 'agents', labelKey: 'shell.navigation.agents', icon: 'heroicons:users' },
  { key: 'agentTeams', labelKey: 'shell.navigation.agentTeams', icon: 'heroicons:user-group' },
  { key: 'applications', labelKey: 'shell.navigation.applications', icon: 'heroicons:squares-2x2' },
  { key: 'skills', labelKey: 'shell.navigation.skills', icon: 'heroicons:sparkles' },
  { key: 'memory', labelKey: 'shell.navigation.memory', icon: 'ph:brain' },
  { key: 'nodes', labelKey: 'shell.navigation.nodes', icon: SHELL_NODES_NETWORK_ICON },
];

export function resolveShellPrimaryRoute(key: ShellPrimaryNavKey): RouteLocationRaw {
  switch (key) {
    case 'agents':
      return { path: '/agents', query: { view: 'list' } };
    case 'agentTeams':
      return { path: '/agent-teams', query: { view: 'team-list' } };
    case 'applications':
      return '/applications';
    case 'skills':
      return '/skills';
    case 'memory':
      return '/memory';
    case 'nodes':
      return '/nodes';
  }
}

export function isShellPrimaryRouteActive(key: ShellPrimaryNavKey, path: string): boolean {
  switch (key) {
    case 'agents':
      return path.startsWith('/agents');
    case 'agentTeams':
      return path.startsWith('/agent-teams');
    case 'applications':
      return path.startsWith('/applications');
    case 'skills':
      return path.startsWith('/skills');
    case 'memory':
      return path.startsWith('/memory');
    case 'nodes':
      return path.startsWith('/nodes');
  }
}

export function useShellPrimaryNavigation(): {
  primaryNavItems: ComputedRef<readonly ShellPrimaryNavItem[]>;
  resolvePrimaryRoute: (key: ShellPrimaryNavKey) => RouteLocationRaw;
  isPrimaryNavActive: (key: ShellPrimaryNavKey) => boolean;
  ensurePrimaryNavigationReady: () => Promise<unknown>;
} {
  const route = useRoute();
  const applicationsCapabilityStore = useApplicationsCapabilityStore();

  const primaryNavItems = computed(() => {
    return allShellPrimaryNavItems.filter((item) => {
      if (item.key === 'applications') {
        return applicationsCapabilityStore.isEnabled && isFeatureAvailableInRuntime('applicationIframe');
      }
      if (item.key === 'nodes') {
        return isFeatureAvailableInRuntime('desktopSettings');
      }
      return true;
    });
  });

  return {
    primaryNavItems,
    resolvePrimaryRoute: resolveShellPrimaryRoute,
    isPrimaryNavActive: (key: ShellPrimaryNavKey) => isShellPrimaryRouteActive(key, route.path),
    ensurePrimaryNavigationReady: () => applicationsCapabilityStore.ensureResolved(),
  };
}
