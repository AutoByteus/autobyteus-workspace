import { computed, ref } from 'vue';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import type { TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

interface RunHistoryTreeStoreLike {
  selectedRunId: string | null;
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
  const expandedTeams = ref<Record<string, boolean>>({});
  const activeStatusClass = 'bg-blue-500 animate-pulse';

  const workspaceNodes = computed(() => params.runHistoryStore.getTreeNodes());

  const selectedRunId = computed(() => {
    if (params.selectionStore.selectedType === 'agent' && params.selectionStore.selectedRunId) {
      return params.selectionStore.selectedRunId;
    }
    return params.runHistoryStore.selectedRunId;
  });

  const selectedTeamRunId = computed(() => {
    if (params.selectionStore.selectedType === 'team' && params.selectionStore.selectedRunId) {
      return params.selectionStore.selectedRunId;
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

  const isWorkspaceExpanded = (workspaceRootPath: string): boolean =>
    expandedWorkspace.value[workspaceRootPath] ?? true;

  const setWorkspaceExpanded = (workspaceRootPath: string, expanded: boolean): void => {
    expandedWorkspace.value = {
      ...expandedWorkspace.value,
      [workspaceRootPath]: expanded,
    };
  };

  const toggleWorkspace = (workspaceRootPath: string): void => {
    setWorkspaceExpanded(workspaceRootPath, !isWorkspaceExpanded(workspaceRootPath));
  };

  const isAgentExpanded = (workspaceRootPath: string, agentDefinitionId: string): boolean => {
    const key = `${workspaceRootPath}::${agentDefinitionId}`;
    return expandedAgents.value[key] ?? true;
  };

  const toggleAgent = (workspaceRootPath: string, agentDefinitionId: string): void => {
    const key = `${workspaceRootPath}::${agentDefinitionId}`;
    expandedAgents.value = {
      ...expandedAgents.value,
      [key]: !isAgentExpanded(workspaceRootPath, agentDefinitionId),
    };
  };

  const isTeamExpanded = (teamRunId: string): boolean => {
    if (selectedTeamRunId.value === teamRunId) {
      return true;
    }
    return expandedTeams.value[teamRunId] ?? false;
  };

  const toggleTeam = (teamRunId: string): void => {
    expandedTeams.value = {
      ...expandedTeams.value,
      [teamRunId]: !isTeamExpanded(teamRunId),
    };
  };

  const teamStatusClass = (status: AgentTeamStatus): string => {
    switch (status) {
      case AgentTeamStatus.Processing:
        return 'bg-blue-500 animate-pulse';
      case AgentTeamStatus.Idle:
        return 'bg-green-500';
      case AgentTeamStatus.Bootstrapping:
        return 'bg-purple-500 animate-pulse';
      case AgentTeamStatus.Error:
        return 'bg-red-500';
      case AgentTeamStatus.ShutdownComplete:
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const canTerminateTeam = (status: AgentTeamStatus): boolean =>
    status !== AgentTeamStatus.ShutdownComplete && status !== AgentTeamStatus.Uninitialized;

  return {
    activeStatusClass,
    workspaceNodes,
    selectedRunId,
    workspaceTeams,
    isWorkspaceExpanded,
    setWorkspaceExpanded,
    toggleWorkspace,
    isAgentExpanded,
    toggleAgent,
    isTeamExpanded,
    toggleTeam,
    teamStatusClass,
    canTerminateTeam,
  };
};
