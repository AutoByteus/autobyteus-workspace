import { computed, ref, watch } from 'vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { buildWorkspaceTeamDefinitionDisplayGroups } from '~/components/workspace/history/workspaceHistoryTeamDefinitionGroups';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import type { RunHistoryWorkspaceGroup, TeamRunHistoryDefinitionGroup, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

interface RunHistoryTreeStoreLike {
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  workspaceGroups: RunHistoryWorkspaceGroup[];
  getTreeNodes: () => RunTreeWorkspaceNode[];
  getTeamNodes: (workspaceRootPath?: string) => TeamTreeNode[];
}

interface SelectionStoreLike {
  selectedType: string | null;
  selectedRunId: string | null;
}

export const useWorkspaceHistoryTreeState = (params: {
  runHistoryStore: RunHistoryTreeStoreLike;
  selectionStore: SelectionStoreLike;
}) => {
  const expandedWorkspace = ref<Record<string, boolean>>({});
  const expandedAgents = ref<Record<string, boolean>>({});
  const expandedTeamDefinitions = ref<Record<string, boolean>>({});
  const expandedTeams = ref<Record<string, boolean>>({});
  const observedSelectionKey = ref<string | null>(null);
  const revealAppliedForObservedKey = ref(false);
  const pendingRevealKey = ref<string | null>(null);
  const activeStatusClass = 'bg-blue-500 animate-pulse';

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

  const workspaceKey = (workspaceRootPath: string): string =>
    normalizeRootPath(workspaceRootPath);

  const agentKey = (workspaceRootPath: string, agentDefinitionId: string): string => {
    const normalizedWorkspace = workspaceKey(workspaceRootPath);
    const normalizedAgent = agentDefinitionId.trim();
    return normalizedWorkspace && normalizedAgent
      ? `${normalizedWorkspace}::agent::${normalizedAgent}`
      : '';
  };

  const teamDefinitionKey = (workspaceRootPath: string, groupKey: string): string => {
    const normalizedWorkspace = workspaceKey(workspaceRootPath);
    const normalizedGroup = groupKey.trim();
    return normalizedWorkspace && normalizedGroup
      ? `${normalizedWorkspace}::team-definition::${normalizedGroup}`
      : '';
  };

  const isWorkspaceExpanded = (workspaceRootPath: string): boolean => {
    const key = workspaceKey(workspaceRootPath);
    return key ? expandedWorkspace.value[key] ?? false : false;
  };

  const setWorkspaceExpanded = (workspaceRootPath: string, expanded: boolean): void => {
    const key = workspaceKey(workspaceRootPath);
    if (!key) {
      return;
    }

    expandedWorkspace.value = {
      ...expandedWorkspace.value,
      [key]: expanded,
    };
  };

  const toggleWorkspace = (workspaceRootPath: string): void => {
    setWorkspaceExpanded(workspaceRootPath, !isWorkspaceExpanded(workspaceRootPath));
  };

  const isAgentExpanded = (workspaceRootPath: string, agentDefinitionId: string): boolean => {
    const key = agentKey(workspaceRootPath, agentDefinitionId);
    return key ? expandedAgents.value[key] ?? false : false;
  };

  const setAgentExpanded = (
    workspaceRootPath: string,
    agentDefinitionId: string,
    expanded: boolean,
  ): void => {
    const key = agentKey(workspaceRootPath, agentDefinitionId);
    if (!key) {
      return;
    }

    expandedAgents.value = {
      ...expandedAgents.value,
      [key]: expanded,
    };
  };

  const toggleAgent = (workspaceRootPath: string, agentDefinitionId: string): void => {
    setAgentExpanded(
      workspaceRootPath,
      agentDefinitionId,
      !isAgentExpanded(workspaceRootPath, agentDefinitionId),
    );
  };

  const isTeamDefinitionExpanded = (workspaceRootPath: string, groupKey: string): boolean => {
    const key = teamDefinitionKey(workspaceRootPath, groupKey);
    return key ? expandedTeamDefinitions.value[key] ?? false : false;
  };

  const setTeamDefinitionExpanded = (
    workspaceRootPath: string,
    groupKey: string,
    expanded: boolean,
  ): void => {
    const key = teamDefinitionKey(workspaceRootPath, groupKey);
    if (!key) {
      return;
    }

    expandedTeamDefinitions.value = {
      ...expandedTeamDefinitions.value,
      [key]: expanded,
    };
  };

  const toggleTeamDefinition = (workspaceRootPath: string, groupKey: string): void => {
    setTeamDefinitionExpanded(
      workspaceRootPath,
      groupKey,
      !isTeamDefinitionExpanded(workspaceRootPath, groupKey),
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

  const revealAgentRunAncestry = (runId: string): boolean => {
    for (const workspaceNode of workspaceNodes.value) {
      const workspaceRootPath = workspaceKey(workspaceNode.workspaceRootPath);
      if (!workspaceRootPath) {
        continue;
      }

      const agentNode = workspaceNode.agents.find((agent) =>
        agent.runs.some((run) => run.runId === runId),
      );
      if (!agentNode) {
        continue;
      }

      setWorkspaceExpanded(workspaceRootPath, true);
      setAgentExpanded(workspaceRootPath, agentNode.agentDefinitionId, true);
      return true;
    }

    return false;
  };

  const revealTeamRunAncestry = (teamRunId: string): boolean => {
    for (const workspaceNode of workspaceNodes.value) {
      const workspaceRootPath = workspaceKey(workspaceNode.workspaceRootPath);
      if (!workspaceRootPath) {
        continue;
      }

      const teamGroups = buildWorkspaceTeamDefinitionDisplayGroups(
        workspaceTeamHistoryGroups(workspaceRootPath),
        workspaceTeams(workspaceRootPath),
      );
      const matchingGroup = teamGroups.find((group) =>
        group.runs.some((team) => team.teamRunId === teamRunId),
      );
      if (!matchingGroup) {
        continue;
      }

      setWorkspaceExpanded(workspaceRootPath, true);
      setTeamDefinitionExpanded(workspaceRootPath, matchingGroup.key, true);
      setTeamExpanded(teamRunId, true);
      return true;
    }

    return false;
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

  const revealDependencySignature = computed(() => {
    const agentRuns = workspaceNodes.value
      .map((workspaceNode) => {
        const rootPath = workspaceKey(workspaceNode.workspaceRootPath);
        const runs = workspaceNode.agents
          .map((agent) => `${agent.agentDefinitionId}:${agent.runs.map((run) => run.runId).join(',')}`)
          .join(';');
        return `${rootPath}=${runs}`;
      })
      .join('|');

    const teamRuns = params.runHistoryStore.getTeamNodes()
      .map((team) => `${workspaceKey(team.workspaceRootPath)}:${team.teamRunId}:${team.teamDefinitionId}:${team.teamDefinitionName}`)
      .join('|');

    const teamHistoryGroups = (params.runHistoryStore.workspaceGroups ?? [])
      .map((workspaceGroup) => {
        const rootPath = workspaceKey(workspaceGroup.workspaceRootPath);
        const groups = workspaceGroup.teamDefinitions
          .map((group) => `${group.teamDefinitionId}:${group.teamDefinitionName}:${group.runs.map((run) => run.teamRunId).join(',')}`)
          .join(';');
        return `${rootPath}=${groups}`;
      })
      .join('|');

    return `${agentRuns}::${teamRuns}::${teamHistoryGroups}`;
  });

  watch(
    [selectedRevealKey, revealDependencySignature],
    ([key]) => {
      applySelectedReveal(key);
    },
    { immediate: true },
  );

  const teamStatusClass = (status: AgentTeamStatus): string => {
    switch (status) {
      case AgentTeamStatus.Initializing:
        return 'bg-amber-500 animate-pulse';
      case AgentTeamStatus.Running:
        return 'bg-blue-500 animate-pulse';
      case AgentTeamStatus.Idle:
        return 'bg-green-500';
      case AgentTeamStatus.Error:
        return 'bg-red-500';
      case AgentTeamStatus.Offline:
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const runStatusClass = (status: AgentStatus): string => {
    switch (status) {
      case AgentStatus.Initializing:
        return 'bg-amber-500 animate-pulse';
      case AgentStatus.Running:
        return 'bg-blue-500 animate-pulse';
      case AgentStatus.Idle:
        return 'bg-green-500';
      case AgentStatus.Error:
        return 'bg-red-500';
      case AgentStatus.Offline:
      default:
        return 'bg-gray-400';
    }
  };

  const canTerminateTeam = (status: AgentTeamStatus): boolean =>
    status !== AgentTeamStatus.Offline;

  return {
    activeStatusClass,
    workspaceNodes,
    selectedRunId,
    workspaceTeams,
    workspaceTeamHistoryGroups,
    isWorkspaceExpanded,
    setWorkspaceExpanded,
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
    runStatusClass,
    teamStatusClass,
    canTerminateTeam,
  };
};
