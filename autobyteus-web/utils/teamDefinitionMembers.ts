import type {
  AgentTeamDefinition,
} from '~/stores/agentTeamDefinitionStore';

export interface TeamDefinitionLeafMember {
  memberName: string;
  memberRouteKey: string;
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

export const resolveLeafTeamMembers = (
  teamDefinition: AgentTeamDefinition,
  options: ResolveLeafMembersOptions,
): TeamDefinitionLeafMember[] => {
  const visited = new Set<string>();

  const visit = (definition: AgentTeamDefinition): TeamDefinitionLeafMember[] => {
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

    const members: TeamDefinitionLeafMember[] = [];
    for (const node of definition.nodes) {
      if (node.refType === 'AGENT') {
        members.push({
          memberName: node.memberName.trim(),
          memberRouteKey: normalizeMemberRouteKey(node.memberName),
          agentDefinitionId: node.ref.trim(),
        });
        continue;
      }

      const nestedDefinition = options.getTeamDefinitionById(node.ref.trim());
      if (!nestedDefinition) {
        throw new Error(`Nested team definition '${node.ref}' not found.`);
      }

      members.push(...visit(nestedDefinition));
    }

    visited.delete(normalizedDefinitionId);
    return members;
  };

  return visit(teamDefinition);
};
