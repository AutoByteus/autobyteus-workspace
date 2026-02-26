import { ref } from 'vue';
import { getAgentAvatarKey, getAgentNodeKey } from '~/utils/workspace/history/runTreeDisplay';

export const useRunTreeViewState = () => {
  const expandedWorkspace = ref<Record<string, boolean>>({});
  const expandedAgents = ref<Record<string, boolean>>({});
  const expandedTeams = ref<Record<string, boolean>>({});
  const teamsSectionExpanded = ref(true);
  const brokenAvatarByAgentKey = ref<Record<string, boolean>>({});

  const isWorkspaceExpanded = (workspaceRootPath: string): boolean => {
    return expandedWorkspace.value[workspaceRootPath] ?? true;
  };

  const isAgentExpanded = (workspaceRootPath: string, agentDefinitionId: string): boolean => {
    const key = getAgentNodeKey(workspaceRootPath, agentDefinitionId);
    return expandedAgents.value[key] ?? true;
  };

  const isTeamExpanded = (teamId: string): boolean => {
    return expandedTeams.value[teamId] ?? true;
  };

  const toggleWorkspace = (workspaceRootPath: string): void => {
    expandedWorkspace.value = {
      ...expandedWorkspace.value,
      [workspaceRootPath]: !isWorkspaceExpanded(workspaceRootPath),
    };
  };

  const expandWorkspace = (workspaceRootPath: string): void => {
    expandedWorkspace.value = {
      ...expandedWorkspace.value,
      [workspaceRootPath]: true,
    };
  };

  const toggleAgent = (workspaceRootPath: string, agentDefinitionId: string): void => {
    const key = getAgentNodeKey(workspaceRootPath, agentDefinitionId);
    expandedAgents.value = {
      ...expandedAgents.value,
      [key]: !isAgentExpanded(workspaceRootPath, agentDefinitionId),
    };
  };

  const toggleTeamsSection = (): void => {
    teamsSectionExpanded.value = !teamsSectionExpanded.value;
  };

  const toggleTeam = (teamId: string): void => {
    expandedTeams.value = {
      ...expandedTeams.value,
      [teamId]: !isTeamExpanded(teamId),
    };
  };

  const showAgentAvatar = (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ): boolean => {
    const key = getAgentAvatarKey(workspaceRootPath, agentDefinitionId, avatarUrl);
    return Boolean((avatarUrl || '').trim()) && !brokenAvatarByAgentKey.value[key];
  };

  const markAvatarBroken = (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ): void => {
    const key = getAgentAvatarKey(workspaceRootPath, agentDefinitionId, avatarUrl);
    brokenAvatarByAgentKey.value = {
      ...brokenAvatarByAgentKey.value,
      [key]: true,
    };
  };

  const resetBrokenAvatars = (): void => {
    brokenAvatarByAgentKey.value = {};
  };

  return {
    expandedWorkspace,
    expandedAgents,
    expandedTeams,
    teamsSectionExpanded,
    isWorkspaceExpanded,
    isAgentExpanded,
    isTeamExpanded,
    toggleWorkspace,
    expandWorkspace,
    toggleAgent,
    toggleTeamsSection,
    toggleTeam,
    showAgentAvatar,
    markAvatarBroken,
    resetBrokenAvatars,
  };
};
