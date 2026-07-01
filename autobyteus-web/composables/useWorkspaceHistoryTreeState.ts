import { computed, ref, watch } from 'vue';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import { toWorkspaceHistorySessionKey, type WorkspaceHistorySessionRow } from '~/stores/runHistorySessionProjection';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

interface RunHistoryTreeStoreLike {
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  getTreeNodes: () => RunTreeWorkspaceNode[];
  getWorkspaceSessionNodes: (workspaceRootPath?: string) => WorkspaceHistorySessionRow[];
}

interface SelectionStoreLike {
  selectedType: string | null;
  selectedRunId: string | null;
}

export const useWorkspaceHistoryTreeState = (params: {
  runHistoryStore: RunHistoryTreeStoreLike;
  selectionStore: SelectionStoreLike;
}) => {
  const expandedWorkspaces = ref<Record<string, boolean>>({});
  const expandedSessions = ref<Record<string, boolean>>({});
  const expandedTeamMembers = ref<Record<string, boolean>>({});
  const observedSelectionKey = ref<string | null>(null);
  const revealAppliedForObservedKey = ref(false);
  const pendingRevealKey = ref<string | null>(null);

  const workspaceNodes = computed(() => params.runHistoryStore.getTreeNodes());

  const selectedSessionKey = computed<string | null>(() => {
    const selectedType = params.selectionStore.selectedType;
    const selectedRunId = params.selectionStore.selectedRunId?.trim() || '';
    if (selectedType === 'team' && selectedRunId) {
      return toWorkspaceHistorySessionKey('team', selectedRunId);
    }
    if (selectedType === 'agent' && selectedRunId) {
      return toWorkspaceHistorySessionKey('agent', selectedRunId);
    }

    const selectedTeamId = params.runHistoryStore.selectedTeamRunId?.trim() || '';
    if (selectedTeamId) {
      return toWorkspaceHistorySessionKey('team', selectedTeamId);
    }

    const selectedAgentRunId = params.runHistoryStore.selectedRunId?.trim() || '';
    if (selectedAgentRunId) {
      return toWorkspaceHistorySessionKey('agent', selectedAgentRunId);
    }

    return null;
  });

  const workspaceSessions = (workspaceRootPath: string): WorkspaceHistorySessionRow[] => {
    const key = normalizeRootPath(workspaceRootPath);
    if (!key) {
      return [];
    }
    return params.runHistoryStore.getWorkspaceSessionNodes(key);
  };

  const workspaceKey = (workspaceId: string): string => workspaceId.trim();

  const sessionKey = (value: string): string => value.trim();

  const teamMemberKey = (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
  ): string => {
    const normalizedWorkspace = workspaceKey(workspaceId);
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedMemberRouteKey = memberRouteKey.trim();
    return normalizedWorkspace && normalizedTeamRunId && normalizedMemberRouteKey
      ? `${normalizedWorkspace}::team-member::${normalizedTeamRunId}::${normalizedMemberRouteKey}`
      : '';
  };

  const isWorkspaceExpanded = (workspaceId: string): boolean => {
    const key = workspaceKey(workspaceId);
    return key ? expandedWorkspaces.value[key] ?? false : false;
  };

  const setWorkspaceExpanded = (workspaceId: string, expanded: boolean): void => {
    const key = workspaceKey(workspaceId);
    if (!key) return;
    expandedWorkspaces.value = { ...expandedWorkspaces.value, [key]: expanded };
  };

  const toggleWorkspace = (workspaceId: string): void => {
    setWorkspaceExpanded(workspaceId, !isWorkspaceExpanded(workspaceId));
  };

  const setWorkspaceExpandedByRootPath = (workspaceRootPath: string, expanded: boolean): void => {
    const target = normalizeRootPath(workspaceRootPath);
    const node = workspaceNodes.value.find((candidate) =>
      normalizeRootPath(candidate.workspaceRootPath) === target);
    if (node) setWorkspaceExpanded(node.workspaceId, expanded);
  };

  const isSessionExpanded = (rawSessionKey: string): boolean => {
    const key = sessionKey(rawSessionKey);
    return key ? expandedSessions.value[key] ?? false : false;
  };

  const setSessionExpanded = (rawSessionKey: string, expanded: boolean): void => {
    const key = sessionKey(rawSessionKey);
    if (!key) {
      return;
    }

    expandedSessions.value = {
      ...expandedSessions.value,
      [key]: expanded,
    };
  };

  const toggleSession = (rawSessionKey: string): void => {
    setSessionExpanded(rawSessionKey, !isSessionExpanded(rawSessionKey));
  };

  const isTeamMemberExpanded = (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
  ): boolean => {
    const key = teamMemberKey(workspaceId, teamRunId, memberRouteKey);
    return key ? expandedTeamMembers.value[key] ?? false : false;
  };

  const setTeamMemberExpanded = (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
    expanded: boolean,
  ): void => {
    const key = teamMemberKey(workspaceId, teamRunId, memberRouteKey);
    if (!key) {
      return;
    }

    expandedTeamMembers.value = {
      ...expandedTeamMembers.value,
      [key]: expanded,
    };
  };

  const toggleTeamMember = (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
  ): void => {
    setTeamMemberExpanded(
      workspaceId,
      teamRunId,
      memberRouteKey,
      !isTeamMemberExpanded(workspaceId, teamRunId, memberRouteKey),
    );
  };

  const findTeamMemberAncestorRouteKeys = (
    members: readonly TeamMemberTreeRow[],
    targetMemberRouteKey: string,
  ): string[] | null => {
    for (const member of members) {
      if (member.memberRouteKey === targetMemberRouteKey) {
        return [];
      }

      const childAncestors = findTeamMemberAncestorRouteKeys(
        member.children,
        targetMemberRouteKey,
      );
      if (childAncestors) {
        return member.memberKind === 'agent_team'
          ? [member.memberRouteKey, ...childAncestors]
          : childAncestors;
      }
    }

    return null;
  };

  const expandTeamMemberAncestors = (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
    memberTree: readonly TeamMemberTreeRow[],
  ): boolean => {
    const ancestorRouteKeys = findTeamMemberAncestorRouteKeys(memberTree, memberRouteKey);
    if (!ancestorRouteKeys) {
      return false;
    }

    for (const ancestorRouteKey of ancestorRouteKeys) {
      setTeamMemberExpanded(workspaceId, teamRunId, ancestorRouteKey, true);
    }
    return ancestorRouteKeys.length > 0;
  };

  const revealSessionAncestry = (targetSessionKey: string): boolean => {
    for (const workspaceNode of workspaceNodes.value) {
      const workspaceId = workspaceKey(workspaceNode.workspaceId);
      if (!workspaceId) {
        continue;
      }

      const matchingSession = workspaceSessions(workspaceNode.workspaceRootPath).find(
        (session) => session.sessionKey === targetSessionKey,
      );
      if (!matchingSession) {
        continue;
      }

      setWorkspaceExpanded(workspaceId, true);
      if (matchingSession.kind === 'team') {
        setSessionExpanded(matchingSession.sessionKey, true);
      }
      return true;
    }

    return false;
  };

  const applySelectedReveal = (key: string | null): void => {
    if (key !== observedSelectionKey.value) {
      observedSelectionKey.value = key;
      revealAppliedForObservedKey.value = false;
      pendingRevealKey.value = key;
    }

    if (!key) {
      pendingRevealKey.value = null;
      return;
    }

    if (revealAppliedForObservedKey.value) {
      return;
    }

    if (!revealSessionAncestry(key)) {
      pendingRevealKey.value = key;
      return;
    }

    revealAppliedForObservedKey.value = true;
    pendingRevealKey.value = null;
  };

  const revealDependencySignature = computed(() => workspaceNodes.value
    .map((workspaceNode) => {
      const rootPath = normalizeRootPath(workspaceNode.workspaceRootPath);
      const sessions = workspaceSessions(rootPath)
        .map((session) => `${session.sessionKey}:${session.lastActivityAt}`)
        .join(',');
      return `${rootPath}=${sessions}`;
    })
    .join('|'));

  watch(
    [selectedSessionKey, revealDependencySignature],
    ([key]) => {
      applySelectedReveal(key);
    },
    { immediate: true },
  );

  const canTerminateTeam = (status: AgentTeamStatus): boolean =>
    status !== AgentTeamStatus.Offline;

  const expandedWorkspaceIds = (): string[] =>
    Object.entries(expandedWorkspaces.value)
      .filter(([, expanded]) => expanded)
      .map(([workspaceId]) => workspaceId);

  const pruneWorkspace = (workspaceId: string): void => {
    const key = workspaceKey(workspaceId);
    if (!key) return;
    const prefix = `${key}::`;
    const omitPrefix = (record: Record<string, boolean>) => Object.fromEntries(
      Object.entries(record).filter(([candidate]) => candidate !== key && !candidate.startsWith(prefix)),
    );
    expandedWorkspaces.value = omitPrefix(expandedWorkspaces.value);
    expandedTeamMembers.value = omitPrefix(expandedTeamMembers.value);
    expandedSessions.value = {};
  };

  return {
    workspaceNodes,
    workspaceSessions,
    selectedSessionKey,
    isWorkspaceExpanded,
    setWorkspaceExpanded,
    setWorkspaceExpandedByRootPath,
    toggleWorkspace,
    isSessionExpanded,
    setSessionExpanded,
    toggleSession,
    isTeamMemberExpanded,
    setTeamMemberExpanded,
    toggleTeamMember,
    expandTeamMemberAncestors,
    canTerminateTeam,
    expandedWorkspaceIds,
    pruneWorkspace,
  };
};
