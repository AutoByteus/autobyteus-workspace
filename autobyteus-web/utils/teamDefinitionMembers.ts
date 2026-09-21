import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'

export interface TeamDefinitionAgentNode {
  readonly kind: 'agent'
  readonly address: AgentTeamAddress
  readonly displayName: string
  readonly agentDefinitionId: string
}
export interface TeamDefinitionAgentTeamNode {
  readonly kind: 'agent_team'
  readonly address: AgentTeamAddress
  readonly displayName: string
  readonly teamDefinitionId: string
  readonly coordinatorAddress: AgentTeamAddress
  readonly children: readonly TeamDefinitionMemberNode[]
}
export type TeamDefinitionMemberNode = TeamDefinitionAgentNode | TeamDefinitionAgentTeamNode
export interface TeamDefinitionLeafMember { displayName: string; address: AgentTeamAddress; agentDefinitionId: string }
interface ResolveLeafMembersOptions { getTeamDefinitionById: (id: string) => AgentTeamDefinition | null }

export const normalizeMemberAddress = (value: string): AgentTeamAddress => {
  const segments = value.trim().replace(/\\/g, '/').split('/').filter(Boolean)
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment !== segment.trim())) throw new Error(`Invalid member address '${value}'.`)
  return `/${segments.join('/')}`
}

export const buildTeamMemberTreeFromDefinition = (
  teamDefinition: AgentTeamDefinition,
  _options: ResolveLeafMembersOptions,
): readonly TeamDefinitionMemberNode[] => Object.freeze(teamDefinition.nodes.map((node) => Object.freeze({
  kind: 'agent' as const,
  address: normalizeMemberAddress(node.memberName),
  displayName: node.memberName.trim(),
  agentDefinitionId: node.refScope === 'TEAM_LOCAL'
    ? buildTeamLocalAgentDefinitionId(teamDefinition.id, node.ref)
    : node.ref.trim(),
})))

export const flattenLeafAgentMemberNodes = (nodes: readonly TeamDefinitionMemberNode[]): TeamDefinitionAgentNode[] =>
  nodes.filter((node): node is TeamDefinitionAgentNode => node.kind === 'agent')

export const flattenTeamMemberNodesForDisplay = (nodes: readonly TeamDefinitionMemberNode[]): Array<{ node: TeamDefinitionMemberNode; depth: number }> =>
  nodes.map((node) => ({ node, depth: 0 }))

export const resolveLeafTeamMembers = (teamDefinition: AgentTeamDefinition, options: ResolveLeafMembersOptions): TeamDefinitionLeafMember[] =>
  flattenLeafAgentMemberNodes(buildTeamMemberTreeFromDefinition(teamDefinition, options)).map((node) => ({
    displayName: node.displayName || memberAddressBasename(node.address),
    address: node.address,
    agentDefinitionId: node.agentDefinitionId,
  }))
