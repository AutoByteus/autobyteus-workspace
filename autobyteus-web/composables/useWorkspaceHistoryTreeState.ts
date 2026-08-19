import { computed, ref, watch } from 'vue';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import type {
  RunHistoryWorkspaceGroup,
  TeamRunHistoryDefinitionGroup,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

interface RunHistoryTreeStoreLike {
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  navigationTopologyRevision: number;
  getTreeNodes: () => RunTreeWorkspaceNode[];
  getTeamNodes: (workspaceRootPath?: string) => TeamTreeNode[];
  getAgentNavigationAncestry: (runId: string) => {
    workspaceId: string;
    agentDefinitionId: string;
  } | null;
  getTeamNavigationAncestry: (teamRunId: string) => {
    workspaceId: string;
    teamDefinitionGroupKey: string;
  } | null;
  getTeamMemberNavigationAncestorRowKeys: (
    teamRunId: string,
    agentRunId: string,
  ) => string[];
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
  const expandedAgents = ref<Record<string, boolean>>({});
  const expandedTeamDefinitions = ref<Record<string, boolean>>({});
  const expandedTeams = ref<Record<string, boolean>>({});
  const expandedTeamMembers = ref<Record<string, boolean>>({});
  const observedSelectionKey = ref<string | null>(null);
  const revealAppliedForObservedKey = ref(false);
  const pendingRevealKey = ref<string | null>(null);

  const workspaceNodes = computed(() => params.runHistoryStore.getTreeNodes());

  const selectedRunId = computed(() => {
    if (params.selectionStore.selectedType === 'agent' && params.selectionStore.selectedRunId) {
      return params.selectionStore.selectedRunId;
    }
    return params.runHistoryStore.selectedRunId;
  });

  const selectedRevealKey = computed<string | null>(() => {
    const selectedType = params.selectionStore.selectedType;
    const selectedRunId = params.selectionStore.selectedRunId?.trim() || '';
    if (selectedType === 'team' && selectedRunId) {
      return `team:${selectedRunId}`;
    }
    if (selectedType === 'agent' && selectedRunId) {
      return `agent:${selectedRunId}`;
    }

    const selectedTeamId = params.runHistoryStore.selectedTeamRunId?.trim() || '';
    if (selectedTeamId) {
      return `team:${selectedTeamId}`;
    }

    const selectedAgentRunId = params.runHistoryStore.selectedRunId?.trim() || '';
    if (selectedAgentRunId) {
      return `agent:${selectedAgentRunId}`;
    }

    return null;
  });

  const workspaceTeams = (workspaceRootPath: string): TeamTreeNode[] => {
    const key = normalizeRootPath(workspaceRootPath);
    if (!key) {
      return [];
    }
    return params.runHistoryStore.getTeamNodes(key);
  };

  const workspaceTeamHistoryGroups = (
    workspaceRootPath: string,
  ): TeamRunHistoryDefinitionGroup[] => {
    const key = normalizeRootPath(workspaceRootPath);
    if (!key) {
      return [];
    }

    const workspaceGroup = (params.runHistoryStore.workspaceGroups ?? []).find(
      (group) => normalizeRootPath(group.workspaceRootPath) === key,
    );
    return workspaceGroup?.teamDefinitions ?? [];
  };

  const workspaceKey = (workspaceId: string): string => workspaceId.trim();

  const agentKey = (workspaceId: string, agentDefinitionId: string): string => {
    const normalizedWorkspace = workspaceKey(workspaceId);
    const normalizedAgent = agentDefinitionId.trim();
    return normalizedWorkspace && normalizedAgent
      ? `${normalizedWorkspace}::agent::${normalizedAgent}`
      : '';
  };

  const teamDefinitionKey = (workspaceId: string, groupKey: string): string => {
    const normalizedWorkspace = workspaceKey(workspaceId);
    const normalizedGroup = groupKey.trim();
    return normalizedWorkspace && normalizedGroup
      ? `${normalizedWorkspace}::team-definition::${normalizedGroup}`
      : '';
  };

  const teamMemberKey = (
    workspaceId: string,
    teamRunId: string,
    rowKey: string,
  ): string => {
    const normalizedWorkspace = workspaceKey(workspaceId);
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedRowKey = rowKey.trim();
    return normalizedWorkspace && normalizedTeamRunId && normalizedRowKey
      ? `${normalizedWorkspace}::team-member::${normalizedTeamRunId}::${normalizedRowKey}`
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

  const isAgentExpanded = (workspaceId: string, agentDefinitionId: string): boolean => {
    const key = agentKey(workspaceId, agentDefinitionId);
    return key ? expandedAgents.value[key] ?? false : false;
  };

  const setAgentExpanded = (
    workspaceId: string,
    agentDefinitionId: string,
    expanded: boolean,
  ): void => {
    const key = agentKey(workspaceId, agentDefinitionId);
    if (!key) {
      return;
    }

    expandedAgents.value = {
      ...expandedAgents.value,
      [key]: expanded,
    };
  };

  const toggleAgent = (workspaceId: string, agentDefinitionId: string): void => {
    setAgentExpanded(
      workspaceId,
      agentDefinitionId,
      !isAgentExpanded(workspaceId, agentDefinitionId),
    );
  };

  const isTeamDefinitionExpanded = (workspaceId: string, groupKey: string): boolean => {
    const key = teamDefinitionKey(workspaceId, groupKey);
    return key ? expandedTeamDefinitions.value[key] ?? false : false;
  };

  const setTeamDefinitionExpanded = (
    workspaceId: string,
    groupKey: string,
    expanded: boolean,
  ): void => {
    const key = teamDefinitionKey(workspaceId, groupKey);
    if (!key) {
      return;
    }

    expandedTeamDefinitions.value = {
      ...expandedTeamDefinitions.value,
      [key]: expanded,
    };
  };

  const toggleTeamDefinition = (workspaceId: string, groupKey: string): void => {
    setTeamDefinitionExpanded(
      workspaceId,
      groupKey,
      !isTeamDefinitionExpanded(workspaceId, groupKey),
    );
  };

  const isTeamExpanded = (teamRunId: string): boolean => {
    const normalizedTeamRunId = teamRunId.trim();
    return normalizedTeamRunId ? expandedTeams.value[normalizedTeamRunId] ?? false : false;
  };

  const setTeamExpanded = (teamRunId: string, expanded: boolean): void => {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }

    expandedTeams.value = {
      ...expandedTeams.value,
      [normalizedTeamRunId]: expanded,
    };
  };

  const toggleTeam = (teamRunId: string): void => {
    setTeamExpanded(teamRunId, !isTeamExpanded(teamRunId));
  };

  const isTeamMemberExpanded = (
    workspaceId: string,
    teamRunId: string,
    rowKey: string,
  ): boolean => {
    const key = teamMemberKey(workspaceId, teamRunId, rowKey);
    return key ? expandedTeamMembers.value[key] ?? false : false;
  };

  const setTeamMemberExpanded = (
    workspaceId: string,
    teamRunId: string,
    rowKey: string,
    expanded: boolean,
  ): void => {
    const key = teamMemberKey(workspaceId, teamRunId, rowKey);
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
    rowKey: string,
  ): void => {
    setTeamMemberExpanded(
      workspaceId,
      teamRunId,
      rowKey,
      !isTeamMemberExpanded(workspaceId, teamRunId, rowKey),
    );
  };

  const expandTeamMemberAncestors = (
    workspaceId: string,
    teamRunId: string,
    agentRunId: string,
  ): boolean => {
    const ancestorRowKeys = params.runHistoryStore
      .getTeamMemberNavigationAncestorRowKeys(teamRunId, agentRunId);
    for (const ancestorRowKey of ancestorRowKeys) {
      setTeamMemberExpanded(workspaceId, teamRunId, ancestorRowKey, true);
    }
    return ancestorRowKeys.length > 0;
  };

  const revealAgentRunAncestry = (runId: string): boolean => {
    const ancestry = params.runHistoryStore.getAgentNavigationAncestry(runId);
    if (!ancestry) return false;
    setWorkspaceExpanded(ancestry.workspaceId, true);
    setAgentExpanded(ancestry.workspaceId, ancestry.agentDefinitionId, true);
    return true;
  };

  const revealTeamRunAncestry = (teamRunId: string): boolean => {
    const ancestry = params.runHistoryStore.getTeamNavigationAncestry(teamRunId);
    if (!ancestry) return false;
    setWorkspaceExpanded(ancestry.workspaceId, true);
    setTeamDefinitionExpanded(ancestry.workspaceId, ancestry.teamDefinitionGroupKey, true);
    setTeamExpanded(teamRunId, true);
    return true;
  };

  const revealSelectedAncestry = (key: string): boolean => {
    const separatorIndex = key.indexOf(':');
    if (separatorIndex <= 0) {
      return false;
    }

    const kind = key.slice(0, separatorIndex);
    const id = key.slice(separatorIndex + 1).trim();
    if (!id) {
      return false;
    }

    if (kind === 'agent') {
      return revealAgentRunAncestry(id);
    }
    if (kind === 'team') {
      return revealTeamRunAncestry(id);
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

    if (!revealSelectedAncestry(key)) {
      pendingRevealKey.value = key;
      return;
    }

    revealAppliedForObservedKey.value = true;
    pendingRevealKey.value = null;
  };

  const revealDependencySignature = computed(() => params.runHistoryStore.navigationTopologyRevision);

  watch(
    [selectedRevealKey, revealDependencySignature],
    ([key]) => {
      applySelectedReveal(key);
    },
    { immediate: true },
  );

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
    expandedAgents.value = omitPrefix(expandedAgents.value);
    expandedTeamDefinitions.value = omitPrefix(expandedTeamDefinitions.value);
    expandedTeamMembers.value = omitPrefix(expandedTeamMembers.value);
  };

  return {
    workspaceNodes,
    selectedRunId,
    workspaceTeams,
    workspaceTeamHistoryGroups,
    isWorkspaceExpanded,
    setWorkspaceExpanded,
    setWorkspaceExpandedByRootPath,
    toggleWorkspace,
    isAgentExpanded,
    setAgentExpanded,
    toggleAgent,
    isTeamDefinitionExpanded,
    setTeamDefinitionExpanded,
    toggleTeamDefinition,
    isTeamExpanded,
    setTeamExpanded,
    toggleTeam,
    isTeamMemberExpanded,
    setTeamMemberExpanded,
    toggleTeamMember,
    expandTeamMemberAncestors,
    expandedWorkspaceIds,
    pruneWorkspace,
  };
};
