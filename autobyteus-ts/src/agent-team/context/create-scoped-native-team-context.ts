import { AgentConfig } from '../../agent/context/agent-config.js';
import { AgentTeamConfig } from './agent-team-config.js';
import type { AgentTeamContext } from './agent-team-context.js';
import type { TeamNodeConfig } from './team-node-config.js';
import type { TeamCommunicationContext, TeamCommunicationMember } from './team-communication-context.js';

const normalizeOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveNodeDescription = (node: TeamNodeConfig): string | null => {
  const nodeDef = node.nodeDefinition;
  if (nodeDef instanceof AgentConfig) {
    return normalizeOptionalString(nodeDef.description);
  }
  if (nodeDef instanceof AgentTeamConfig) {
    return normalizeOptionalString(nodeDef.role) ?? normalizeOptionalString(nodeDef.description);
  }
  return null;
};

export const createScopedNativeTeamContext = (
  teamContext: AgentTeamContext,
  currentMemberName: string,
) => {
  const liveAgentIdByName = new Map<string, string>();
  for (const agent of teamContext.agents) {
    const agentName = normalizeOptionalString(agent?.context?.config?.name);
    const agentId = normalizeOptionalString(agent?.agentId);
    if (agentName && agentId) {
      liveAgentIdByName.set(agentName, agentId);
    }
  }

  const members: TeamCommunicationMember[] = teamContext.config.nodes.map((node) => ({
    memberName: node.name,
    agentId: liveAgentIdByName.get(node.name) ?? null,
    role: node.nodeDefinition instanceof AgentTeamConfig
      ? normalizeOptionalString(node.nodeDefinition.role)
      : null,
    description: resolveNodeDescription(node),
  }));

  const communicationContext: TeamCommunicationContext = {
    members,
    dispatchInterAgentMessageRequest: async (event) => {
      const teamManager = teamContext.teamManager;
      if (!teamManager) {
        throw new Error('TeamManager is unavailable for native team communication.');
      }
      await teamManager.dispatchInterAgentMessageRequest(event);
    },
    resolveMemberNameByAgentId: (agentId: string): string | null => {
      const normalizedAgentId = normalizeOptionalString(agentId);
      if (!normalizedAgentId) {
        return null;
      }
      for (const member of members) {
        if (normalizeOptionalString(member.agentId) === normalizedAgentId) {
          return member.memberName;
        }
      }
      return teamContext.teamManager?.resolveMemberNameByAgentId(normalizedAgentId) ?? null;
    },
  };

  return {
    teamId: teamContext.teamId,
    config: teamContext.config,
    state: teamContext.state,
    teamManager: teamContext.teamManager,
    currentMemberName,
    communicationContext,
  };
};
