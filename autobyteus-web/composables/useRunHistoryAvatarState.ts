import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';

interface AgentDefinitionAvatarLike {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
}

interface TeamDefinitionAvatarLike {
  id: string;
  avatarUrl?: string | null;
}

const toInitials = (value: string, fallback: string): string => {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return fallback;
  }
  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

const toTeamMemberDisplayName = (member: TeamMemberTreeRow): string => {
  const direct = member.memberName?.trim();
  if (direct) {
    return direct;
  }

  const routeKey = member.memberRouteKey || '';
  const routeLeaf = routeKey
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .pop();
  return routeLeaf || routeKey || 'Member';
};

export const useRunHistoryAvatarState = (params: {
  loading: Ref<boolean> | ComputedRef<boolean>;
  agentDefinitions: ComputedRef<AgentDefinitionAvatarLike[]>;
  teamDefinitions: ComputedRef<TeamDefinitionAvatarLike[]>;
}) => {
  const brokenAvatarByAgentKey = ref<Record<string, boolean>>({});
  const brokenAvatarByTeamKey = ref<Record<string, boolean>>({});
  const brokenAvatarByTeamMemberKey = ref<Record<string, boolean>>({});

  const getAgentNodeKey = (workspaceRootPath: string, agentDefinitionId: string): string => {
    return `${workspaceRootPath}::${agentDefinitionId}`;
  };

  const getAgentAvatarKey = (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ): string => {
    return `${getAgentNodeKey(workspaceRootPath, agentDefinitionId)}::${(avatarUrl || '').trim()}`;
  };

  const getAgentInitials = (agentName: string): string => toInitials(agentName || 'Agent', 'AG');

  const teamAvatarByDefinitionId = computed(() => {
    const next: Record<string, string> = {};
    for (const definition of params.teamDefinitions.value) {
      const key = (definition.id || '').trim();
      const avatarUrl = (definition.avatarUrl || '').trim();
      if (key && avatarUrl && !next[key]) {
        next[key] = avatarUrl;
      }
    }
    return next;
  });

  const memberAvatarByName = computed(() => {
    const next: Record<string, string> = {};
    for (const definition of params.agentDefinitions.value) {
      const key = (definition.name || '').trim().toLowerCase();
      const avatarUrl = (definition.avatarUrl || '').trim();
      if (key && avatarUrl && !next[key]) {
        next[key] = avatarUrl;
      }
    }
    return next;
  });

  const getTeamInitials = (teamName: string): string => getAgentInitials(teamName || 'Team');

  const getTeamAvatarUrl = (team: TeamTreeNode): string => {
    return teamAvatarByDefinitionId.value[(team.teamDefinitionId || '').trim()] || '';
  };

  const getTeamAvatarKey = (team: TeamTreeNode, avatarUrl: string): string => {
    return `${team.teamRunId}::${avatarUrl.trim()}`;
  };

  const showTeamAvatar = (team: TeamTreeNode): boolean => {
    const avatarUrl = getTeamAvatarUrl(team);
    if (!avatarUrl) {
      return false;
    }
    const key = getTeamAvatarKey(team, avatarUrl);
    return !brokenAvatarByTeamKey.value[key];
  };

  const onTeamAvatarError = (team: TeamTreeNode): void => {
    const avatarUrl = getTeamAvatarUrl(team);
    if (!avatarUrl) {
      return;
    }
    const key = getTeamAvatarKey(team, avatarUrl);
    brokenAvatarByTeamKey.value = {
      ...brokenAvatarByTeamKey.value,
      [key]: true,
    };
  };

  const getTeamMemberDisplayName = (member: TeamMemberTreeRow): string => {
    return toTeamMemberDisplayName(member);
  };

  const getTeamMemberInitials = (member: TeamMemberTreeRow): string => {
    return getAgentInitials(getTeamMemberDisplayName(member));
  };

  const getTeamMemberAvatarUrl = (member: TeamMemberTreeRow): string => {
    const memberNameKey = getTeamMemberDisplayName(member).trim().toLowerCase();
    return memberAvatarByName.value[memberNameKey] || '';
  };

  const getTeamMemberAvatarKey = (member: TeamMemberTreeRow, avatarUrl: string): string => {
    return `${member.teamRunId}::${member.memberRouteKey}::${avatarUrl.trim()}`;
  };

  const showTeamMemberAvatar = (member: TeamMemberTreeRow): boolean => {
    const avatarUrl = getTeamMemberAvatarUrl(member);
    if (!avatarUrl) {
      return false;
    }
    const key = getTeamMemberAvatarKey(member, avatarUrl);
    return !brokenAvatarByTeamMemberKey.value[key];
  };

  const onTeamMemberAvatarError = (member: TeamMemberTreeRow): void => {
    const avatarUrl = getTeamMemberAvatarUrl(member);
    if (!avatarUrl) {
      return;
    }
    const key = getTeamMemberAvatarKey(member, avatarUrl);
    brokenAvatarByTeamMemberKey.value = {
      ...brokenAvatarByTeamMemberKey.value,
      [key]: true,
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

  const onAgentAvatarError = (
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

  watch(
    () => params.loading.value,
    (loading, previousLoading) => {
      if (previousLoading && !loading) {
        brokenAvatarByAgentKey.value = {};
        brokenAvatarByTeamKey.value = {};
        brokenAvatarByTeamMemberKey.value = {};
      }
    },
  );

  return {
    getAgentInitials,
    getTeamInitials,
    getTeamAvatarUrl,
    getTeamMemberDisplayName,
    getTeamMemberInitials,
    getTeamMemberAvatarUrl,
    showAgentAvatar,
    showTeamAvatar,
    showTeamMemberAvatar,
    onAgentAvatarError,
    onTeamAvatarError,
    onTeamMemberAvatarError,
  };
};
