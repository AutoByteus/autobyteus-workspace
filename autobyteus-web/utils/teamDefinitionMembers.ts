import type {
  AgentTeamDefinition,
} from '~/stores/agentTeamDefinitionStore';
import type {
  AgentTeamMemberNode,
  SubTeamMemberNode,
  TeamMemberNode,
} from '~/types/agent/AgentTeamContext';
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalAgentDefinitionId';

export interface TeamDefinitionLeafMember {
  memberName: string;
  memberRouteKey: string;
  memberPath: string[];
  agentDefinitionId: string;
}

interface ResolveLeafMembersOptions {
  getTeamDefinitionById: (id: string) => AgentTeamDefinition | null;
}

export const normalizeMemberRouteKey = (memberRouteKey: string): string => {
  const normalized = memberRouteKey
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '');

  if (!normalized) {
    throw new Error('memberRouteKey cannot be empty.');
  }

  return normalized;
};

export const buildMemberRouteKeyFromPath = (memberPath: readonly string[]): string =>
  normalizeMemberRouteKey(memberPath.join('/'));

const normalizeMemberName = (memberName: string): string => {
  const normalized = memberName.trim();
  if (!normalized) {
    throw new Error('memberName cannot be empty.');
  }
  return normalized;
};

const resolveAgentDefinitionId = (
  definitionId: string,
  node: { ref: string; refScope?: string | null },
): string => (
  node.refScope === 'TEAM_LOCAL'
    ? buildTeamLocalAgentDefinitionId(definitionId, node.ref)
    : node.ref.trim()
);

export const buildTeamMemberTreeFromDefinition = (
  teamDefinition: AgentTeamDefinition,
  options: ResolveLeafMembersOptions,
): TeamMemberNode[] => {
  const visited = new Set<string>();

  const visit = (
    definition: AgentTeamDefinition,
    parentPath: string[] = [],
  ): TeamMemberNode[] => {
    const normalizedDefinitionId = definition.id.trim();
    if (!normalizedDefinitionId) {
      throw new Error('teamDefinition.id cannot be empty.');
    }
    if (visited.has(normalizedDefinitionId)) {
      throw new Error(
        `Circular dependency detected in team definitions involving ID: ${normalizedDefinitionId}`,
      );
    }

    visited.add(normalizedDefinitionId);

    const members: TeamMemberNode[] = [];
    for (const node of definition.nodes) {
      const memberName = normalizeMemberName(node.memberName);
      const memberPath = [...parentPath, memberName];
      const memberRouteKey = buildMemberRouteKeyFromPath(memberPath);

      if (node.refType === 'AGENT') {
        members.push({
          memberKind: 'agent',
          memberName,
          displayName: memberName,
          memberPath,
          memberRouteKey,
          memberRunId: null,
          agentDefinitionId: resolveAgentDefinitionId(normalizedDefinitionId, node),
        } satisfies AgentTeamMemberNode);
        continue;
      }

      const nestedDefinition = options.getTeamDefinitionById(node.ref.trim());
      if (!nestedDefinition) {
        throw new Error(`Nested team definition '${node.ref}' not found.`);
      }

      members.push({
        memberKind: 'agent_team',
        memberName,
        displayName: memberName,
        memberPath,
        memberRouteKey,
        memberRunId: null,
        teamRunId: null,
        teamDefinitionId: nestedDefinition.id.trim(),
        coordinatorMemberRouteKey: nestedDefinition.coordinatorMemberName
          ? buildMemberRouteKeyFromPath([...memberPath, nestedDefinition.coordinatorMemberName])
          : null,
        children: visit(nestedDefinition, memberPath),
      } satisfies SubTeamMemberNode);
    }

    visited.delete(normalizedDefinitionId);
    return members;
  };

  return visit(teamDefinition);
};

export const flattenLeafAgentMemberNodes = (
  memberTree: readonly TeamMemberNode[],
): AgentTeamMemberNode[] => {
  const leaves: AgentTeamMemberNode[] = [];
  const visit = (members: readonly TeamMemberNode[]): void => {
    for (const member of members) {
      if (member.memberKind === 'agent') {
        leaves.push(member);
      } else {
        visit(member.children);
      }
    }
  };
  visit(memberTree);
  return leaves;
};

export const indexTeamMemberNodesByRouteKey = (
  memberTree: readonly TeamMemberNode[],
): Map<string, TeamMemberNode> => {
  const byRouteKey = new Map<string, TeamMemberNode>();
  const visit = (members: readonly TeamMemberNode[]): void => {
    for (const member of members) {
      byRouteKey.set(member.memberRouteKey, member);
      if (member.memberKind === 'agent_team') {
        visit(member.children);
      }
    }
  };
  visit(memberTree);
  return byRouteKey;
};

export const flattenTeamMemberNodesForDisplay = (
  memberTree: readonly TeamMemberNode[],
  depth = 0,
): Array<{ node: TeamMemberNode; depth: number }> =>
  memberTree.flatMap((node) => [
    { node, depth },
    ...(node.memberKind === 'agent_team'
      ? flattenTeamMemberNodesForDisplay(node.children, depth + 1)
      : []),
  ]);

export const resolveInitialFocusedMemberRouteKey = (params: {
  memberTree: readonly TeamMemberNode[];
  coordinatorMemberRouteKey?: string | null;
}): string => {
  const nodeIndex = indexTeamMemberNodesByRouteKey(params.memberTree);
  const coordinatorRouteKey = params.coordinatorMemberRouteKey?.trim() || '';
  if (coordinatorRouteKey && nodeIndex.has(coordinatorRouteKey)) {
    return coordinatorRouteKey;
  }

  return flattenLeafAgentMemberNodes(params.memberTree)[0]?.memberRouteKey
    || params.memberTree[0]?.memberRouteKey
    || '';
};

export const resolveLeafTeamMembers = (
  teamDefinition: AgentTeamDefinition,
  options: ResolveLeafMembersOptions,
): TeamDefinitionLeafMember[] => {
  return flattenLeafAgentMemberNodes(
    buildTeamMemberTreeFromDefinition(teamDefinition, options),
  ).map((node) => ({
    memberName: node.memberName,
    memberRouteKey: node.memberRouteKey,
    memberPath: [...node.memberPath],
    agentDefinitionId: node.agentDefinitionId,
  }));
};
