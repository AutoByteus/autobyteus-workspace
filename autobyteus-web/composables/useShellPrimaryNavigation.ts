import { computed, type ComputedRef } from 'vue';
import { useRoute, type LocationQuery, type RouteLocationRaw } from 'vue-router';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore';
import {
  chatRouteRunId,
  isAgentOrgLaunchRoute,
  isAgentOrgRunRoute,
} from '~/services/workspace/workspaceNavigationService';
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates';

export type ShellPrimaryNavKey =
  | 'chat'
  | 'agents'
  | 'agentTeams'
  | 'agentOrgs'
  | 'applications'
  | 'skills'
  | 'memory'
  | 'nodes'
  | 'projects';

export interface ShellPrimaryNavItem {
  key: ShellPrimaryNavKey;
  labelKey: string;
  icon: string;
}

export const SHELL_NODES_NETWORK_ICON = 'autobyteus:nodes-network';

const allShellPrimaryNavItems: readonly ShellPrimaryNavItem[] = [
  { key: 'chat', labelKey: 'shell.navigation.chat', icon: 'heroicons:chat-bubble-left-right' },
  { key: 'agents', labelKey: 'shell.navigation.agents', icon: 'heroicons:users' },
  { key: 'agentTeams', labelKey: 'shell.navigation.agentTeams', icon: 'heroicons:user-group' },
  { key: 'agentOrgs', labelKey: 'shell.navigation.agentOrgs', icon: 'heroicons:building-office-2' },
  { key: 'projects', labelKey: 'shell.navigation.projects', icon: 'heroicons:briefcase' },
  { key: 'applications', labelKey: 'shell.navigation.applications', icon: 'heroicons:squares-2x2' },
  { key: 'skills', labelKey: 'shell.navigation.skills', icon: 'heroicons:sparkles' },
  { key: 'memory', labelKey: 'shell.navigation.memory', icon: 'ph:brain' },
  { key: 'nodes', labelKey: 'shell.navigation.nodes', icon: SHELL_NODES_NETWORK_ICON },
];

export function resolveShellPrimaryRoute(key: ShellPrimaryNavKey): RouteLocationRaw {
  switch (key) {
    case 'chat':
      return '/chat';
    case 'agents':
      return { path: '/agents', query: { view: 'list' } };
    case 'agentTeams':
      return { path: '/agent-teams', query: { view: 'team-list' } };
    case 'agentOrgs':
      return { path: '/agent-orgs', query: { view: 'org-list' } };
    case 'applications':
      return '/applications';
    case 'skills':
      return '/skills';
    case 'memory':
      return '/memory';
    case 'nodes':
      return '/nodes';
    case 'projects':
      return '/projects';
  }
}

export interface ShellRouteLocation {
  path: string;
  query: LocationQuery;
}

export function isShellPrimaryRouteActive(key: ShellPrimaryNavKey, { path, query }: ShellRouteLocation): boolean {
  switch (key) {
    case 'chat':
      // Chat means New chat: an open run (`/chat?id=…`) lights Workspaces instead.
      return path.startsWith('/chat') && chatRouteRunId(query) === null;
    case 'agents':
      return path.startsWith('/agents');
    case 'agentTeams':
      return path.startsWith('/agent-teams');
    case 'agentOrgs':
      return path.startsWith('/agent-orgs');
    case 'applications':
      return path.startsWith('/applications');
    case 'skills':
      return path.startsWith('/skills');
    case 'memory':
      return path.startsWith('/memory');
    case 'nodes':
      return path.startsWith('/nodes');
    case 'projects':
      return path.startsWith('/projects');
  }
}

export function useShellPrimaryNavigation(): {
  primaryNavItems: ComputedRef<readonly ShellPrimaryNavItem[]>;
  resolvePrimaryRoute: (key: ShellPrimaryNavKey) => RouteLocationRaw;
  isPrimaryNavActive: (key: ShellPrimaryNavKey) => boolean;
  isWorkspacesActive: ComputedRef<boolean>;
  ensurePrimaryNavigationReady: () => Promise<unknown>;
} {
  const route = useRoute();
  const applicationsCapabilityStore = useApplicationsCapabilityStore();
  const agentContextsStore = useAgentContextsStore();
  const selectionStore = useAgentSelectionStore();

  // Workspaces is lit while the center shows a run (DEC-005): a registered Agent run on `/chat`,
  // or an Org run or selected Team run on `/workspace`. Not New chat, the Org launch page, an empty
  // `/workspace`, or a run that is still opening.
  const isWorkspacesActive = computed(() => {
    if (route.path.startsWith('/chat')) {
      const runId = chatRouteRunId(route.query);
      return Boolean(runId && agentContextsStore.getRun(runId));
    }
    if (!route.path.startsWith('/workspace') || isAgentOrgLaunchRoute(route.query)) return false;
    return isAgentOrgRunRoute(route.query)
      || (selectionStore.selectedType === 'team' && Boolean(selectionStore.selectedRunId));
  });

  const primaryNavItems = computed(() => {
    return allShellPrimaryNavItems.filter((item) => {
      if (item.key === 'applications') {
        return applicationsCapabilityStore.isEnabled && isFeatureAvailableInRuntime('applicationIframe');
      }
      if (item.key === 'nodes') {
        return isFeatureAvailableInRuntime('desktopSettings');
      }
      if (item.key === 'projects') {
        return isFeatureAvailableInRuntime('projects');
      }
      return true;
    });
  });

  return {
    primaryNavItems,
    resolvePrimaryRoute: resolveShellPrimaryRoute,
    isPrimaryNavActive: (key: ShellPrimaryNavKey) => isShellPrimaryRouteActive(key, route),
    isWorkspacesActive,
    ensurePrimaryNavigationReady: () => Promise.allSettled([
      applicationsCapabilityStore.ensureResolved(),
    ]),
  };
}
