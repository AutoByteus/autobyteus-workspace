import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { buildTeamLocalAgentDefinitionId, buildTeamLocalTeamDefinitionId } from '~/utils/teamLocalDefinitionId';

export interface TeamDefinitionAgentNode {
  readonly kind: 'agent';
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly agentDefinitionId: string;
}
export interface TeamDefinitionAgentTeamNode {
  readonly kind: 'agent_team';
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly teamDefinitionId: string;
  readonly coordinatorAddress: AgentTeamAddress;
  readonly children: readonly TeamDefinitionMemberNode[];
}
export type TeamDefinitionMemberNode = TeamDefinitionAgentNode | TeamDefinitionAgentTeamNode;

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
): readonly TeamDefinitionMemberNode[] => {
  const ancestors = new Set<string>();
  const visit = (definition: AgentTeamDefinition, parentAddress: AgentTeamAddress): readonly TeamDefinitionMemberNode[] => {
    const definitionId = definition.id.trim();
    if (!definitionId || ancestors.has(definitionId)) throw new Error(`Circular or invalid team definition '${definitionId}'.`);
    ancestors.add(definitionId);
    const members = definition.nodes.map((definitionNode): TeamDefinitionMemberNode => {
      const displayName = definitionNode.memberName.trim();
      const address = appendAddress(parentAddress, displayName);
      if (definitionNode.refType === 'AGENT') return Object.freeze({
        kind: 'agent', address, displayName,
        agentDefinitionId: agentDefinitionId(definitionId, definitionNode),
      });
      const childDefinitionId = teamDefinitionId(definitionId, definitionNode);
      const nested = options.getTeamDefinitionById(childDefinitionId);
      if (!nested) throw new Error(`Nested team definition '${childDefinitionId}' not found.`);
      return Object.freeze({
        kind: 'agent_team', address, displayName,
        teamDefinitionId: nested.id.trim(),
        coordinatorAddress: appendAddress(address, nested.coordinatorMemberName || ''),
        children: visit(nested, address),
      });
    });
    ancestors.delete(definitionId);
    return Object.freeze(members);
  };
  return visit(teamDefinition, '/');
};

export const flattenLeafAgentMemberNodes = (nodes: readonly TeamDefinitionMemberNode[]): TeamDefinitionAgentNode[] => {
  const result: TeamDefinitionAgentNode[] = [];
  const visit = (node: TeamDefinitionMemberNode): void => { if (node.kind === 'agent') result.push(node); else node.children.forEach(visit); };
  nodes.forEach(visit); return result;
};
export const flattenTeamMemberNodesForDisplay = (nodes: readonly TeamDefinitionMemberNode[], depth = 0): Array<{ node: TeamDefinitionMemberNode; depth: number }> =>
  nodes.flatMap((node) => [{ node, depth }, ...(node.kind === 'agent_team' ? flattenTeamMemberNodesForDisplay(node.children, depth + 1) : [])]);
export const resolveLeafTeamMembers = (teamDefinition: AgentTeamDefinition, options: ResolveLeafMembersOptions): TeamDefinitionLeafMember[] =>
  flattenLeafAgentMemberNodes(buildTeamMemberTreeFromDefinition(teamDefinition, options)).map((node) => ({
    displayName: node.displayName || memberAddressBasename(node.address),
    address: node.address,
    agentDefinitionId: node.agentDefinitionId,
  }));
