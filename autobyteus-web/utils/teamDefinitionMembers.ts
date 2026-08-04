import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import type { AgentTeamMemberNode, SubTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/TeamExecutionAddress';
import { buildTeamLocalAgentDefinitionId, buildTeamLocalTeamDefinitionId } from '~/utils/teamLocalDefinitionId';

export interface TeamDefinitionLeafMember {
  displayName: string;
  address: AgentTeamAddress;
  agentDefinitionId: string;
}
interface ResolveLeafMembersOptions { getTeamDefinitionById: (id: string) => AgentTeamDefinition | null }

export const normalizeMemberAddress = (value: string): AgentTeamAddress => {
  const segments = value.trim().replace(/\\/g, '/').split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment !== segment.trim())) {
    throw new Error(`Invalid member address '${value}'.`);
  }
  return `/${segments.join('/')}`;
};
const appendAddress = (parent: AgentTeamAddress, name: string): AgentTeamAddress =>
  normalizeMemberAddress(`${parent}/${name.trim()}`);
const agentDefinitionId = (definitionId: string, node: { ref: string; refScope?: string | null }): string =>
  node.refScope === 'TEAM_LOCAL' ? buildTeamLocalAgentDefinitionId(definitionId, node.ref) : node.ref.trim();
const teamDefinitionId = (definitionId: string, node: { ref: string; refScope?: string | null }): string =>
  node.refScope === 'TEAM_LOCAL' ? buildTeamLocalTeamDefinitionId(definitionId, node.ref) : node.ref.trim();

export const buildTeamMemberTreeFromDefinition = (
  teamDefinition: AgentTeamDefinition,
  options: ResolveLeafMembersOptions,
  runtimeRootId = 'draft',
): TeamMemberNode[] => {
  const visited = new Set<string>();
  const visit = (definition: AgentTeamDefinition, parentAddress: AgentTeamAddress): TeamMemberNode[] => {
    const definitionId = definition.id.trim();
    if (!definitionId || visited.has(definitionId)) throw new Error(`Circular or invalid team definition '${definitionId}'.`);
    visited.add(definitionId);
    const members = definition.nodes.map((definitionNode): TeamMemberNode => {
      const displayName = definitionNode.memberName.trim();
      const address = appendAddress(parentAddress, displayName);
      if (definitionNode.refType === 'AGENT') return {
        kind: 'agent', address, displayName,
        agentRunId: `${runtimeRootId}:${address}`,
        agentDefinitionId: agentDefinitionId(definitionId, definitionNode),
      } satisfies AgentTeamMemberNode;
      const childDefinitionId = teamDefinitionId(definitionId, definitionNode);
      const nested = options.getTeamDefinitionById(childDefinitionId);
      if (!nested) throw new Error(`Nested team definition '${childDefinitionId}' not found.`);
      const coordinatorAddress = appendAddress(address, nested.coordinatorMemberName || '');
      return {
        kind: 'agent_team', address, displayName,
        teamDefinitionId: nested.id.trim(),
        teamRunId: `${runtimeRootId}:${address}`,
        coordinatorAddress,
        children: visit(nested, address),
      } satisfies SubTeamMemberNode;
    });
    visited.delete(definitionId);
    return members;
  };
  return visit(teamDefinition, '/');
};

export const buildTeamRunRootFromDefinition = (
  definition: AgentTeamDefinition,
  options: ResolveLeafMembersOptions,
  teamRunId: string,
): SubTeamMemberNode => ({
  kind: 'agent_team', address: '/', displayName: definition.name,
  teamDefinitionId: definition.id,
  teamRunId,
  coordinatorAddress: normalizeMemberAddress(definition.coordinatorMemberName),
  children: buildTeamMemberTreeFromDefinition(definition, options, teamRunId),
});

export const flattenLeafAgentMemberNodes = (nodes: readonly TeamMemberNode[]): AgentTeamMemberNode[] => {
  const result: AgentTeamMemberNode[] = [];
  const visit = (node: TeamMemberNode): void => { if (node.kind === 'agent') result.push(node); else node.children.forEach(visit); };
  nodes.forEach(visit); return result;
};
export const indexTeamMemberNodesByAddress = (root: SubTeamMemberNode): Map<AgentTeamAddress, TeamMemberNode> => {
  const result = new Map<AgentTeamAddress, TeamMemberNode>();
  const visit = (node: TeamMemberNode): void => { result.set(node.address, node); if (node.kind === 'agent_team') node.children.forEach(visit); };
  visit(root); return result;
};
export const flattenTeamMemberNodesForDisplay = (nodes: readonly TeamMemberNode[], depth = 0): Array<{ node: TeamMemberNode; depth: number }> =>
  nodes.flatMap((node) => [{ node, depth }, ...(node.kind === 'agent_team' ? flattenTeamMemberNodesForDisplay(node.children, depth + 1) : [])]);
export const resolveInitialFocusedMemberAddress = (root: SubTeamMemberNode): AgentTeamAddress =>
  indexTeamMemberNodesByAddress(root).has(root.coordinatorAddress)
    ? root.coordinatorAddress
    : flattenLeafAgentMemberNodes(root.children)[0]?.address ?? root.address;
export const resolveLeafTeamMembers = (teamDefinition: AgentTeamDefinition, options: ResolveLeafMembersOptions): TeamDefinitionLeafMember[] =>
  flattenLeafAgentMemberNodes(buildTeamMemberTreeFromDefinition(teamDefinition, options)).map((node) => ({
    displayName: node.displayName || memberAddressBasename(node.address),
    address: node.address,
    agentDefinitionId: node.agentDefinitionId,
  }));
