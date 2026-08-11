import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

export function useTeamMemberPresentation() {
  const agentDefinitionStore = useAgentDefinitionStore();

  const getRouteLeaf = (memberAddress: string): string => {
    return memberAddress
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .pop() || memberAddress;
  };

  const getMemberDisplayName = (
    memberAddress: string,
    memberContext?: AgentContext | null,
  ): string => {
    return getRouteLeaf(memberAddress)
      || memberContext?.state.conversation.agentName?.trim()
      || memberContext?.config.agentDefinitionName?.trim()
      || memberAddress
      || 'Team member';
  };

  const getMemberAvatarUrl = (
    memberAddress: string,
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

    const normalizedName = getMemberDisplayName(memberAddress, memberContext).trim().toLowerCase();
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
    team.executions.listAgentContextEntries().forEach(({ executionAddress, agentContext: memberContext }) => {
      if (executionAddress.rootTeamRunId !== team.executions.getRootTeamRunId()) return;
      const executionNode = team.topology.getNode(executionAddress.memberAddress);
      if (!executionNode || executionNode.kind !== 'agent') return;
      const agentRunId = memberContext.state.runId?.trim();
      if (!agentRunId || (executionAddress.taskAgentRunId !== null && executionAddress.taskAgentRunId !== agentRunId) || mapping[agentRunId]) return;
      mapping[agentRunId] = executionNode.displayName
        || getMemberDisplayName(executionAddress.memberAddress, memberContext);
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
