import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

export function useTeamMemberPresentation() {
  const agentDefinitionStore = useAgentDefinitionStore();

  const getRouteLeaf = (memberRouteKey: string): string => {
    return memberRouteKey
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .pop() || memberRouteKey;
  };

  const getMemberDisplayName = (
    memberRouteKey: string,
    memberContext?: AgentContext | null,
  ): string => {
    return memberContext?.config.agentDefinitionName?.trim()
      || memberContext?.state.conversation.agentName?.trim()
      || getRouteLeaf(memberRouteKey)
      || memberRouteKey
      || 'Team member';
  };

  const getMemberAvatarUrl = (
    memberRouteKey: string,
    memberContext?: AgentContext | null,
  ): string => {
    const fromContext = memberContext?.config.agentAvatarUrl?.trim();
    if (fromContext) {
      return fromContext;
    }

    const definitionId = memberContext?.config.agentDefinitionId?.trim();
    if (definitionId) {
      const fromDefinition = agentDefinitionStore.getAgentDefinitionById(definitionId)?.avatarUrl?.trim();
      if (fromDefinition) {
        return fromDefinition;
      }
    }

    const normalizedName = getMemberDisplayName(memberRouteKey, memberContext).trim().toLowerCase();
    if (!normalizedName) {
      return '';
    }

    return agentDefinitionStore.agentDefinitions.find((definition) =>
      (definition.name || '').trim().toLowerCase() === normalizedName
    )?.avatarUrl?.trim() || '';
  };

  const getMemberInitials = (displayName: string): string => {
    const name = displayName.trim();
    if (!name) {
      return 'AI';
    }

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return initials || 'AI';
  };

  const getInterAgentSenderNameById = (team: AgentTeamContext | null): Record<string, string> => {
    if (!team) {
      return {};
    }

    const mapping: Record<string, string> = {};
    team.members.forEach((memberContext, memberRouteKey) => {
      const memberRunId = String(memberContext.state.runId || '').trim();
      if (!memberRunId || mapping[memberRunId]) {
        return;
      }
      mapping[memberRunId] = getMemberDisplayName(memberRouteKey, memberContext);
    });

    return mapping;
  };

  return {
    getMemberDisplayName,
    getMemberAvatarUrl,
    getMemberInitials,
    getInterAgentSenderNameById,
  };
}
