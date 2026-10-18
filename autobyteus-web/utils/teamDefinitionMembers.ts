import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'

/** A member of a Team definition. Teams are flat: every member is an Agent. */
export interface TeamDefinitionAgentNode {
  readonly kind: 'agent'
  readonly address: AgentTeamAddress
  readonly displayName: string
  readonly agentDefinitionId: string
}
export interface TeamDefinitionLeafMember { displayName: string; address: AgentTeamAddress; agentDefinitionId: string }

export const normalizeMemberAddress = (value: string): AgentTeamAddress => {
  const segments = value.trim().replace(/\\/g, '/').split('/').filter(Boolean)
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment !== segment.trim())) throw new Error(`Invalid member address '${value}'.`)
  return `/${segments.join('/')}`
}

export const buildTeamMemberTreeFromDefinition = (
  teamDefinition: AgentTeamDefinition,
): readonly TeamDefinitionAgentNode[] => Object.freeze(teamDefinition.nodes.map((node) => Object.freeze({
  kind: 'agent' as const,
  address: normalizeMemberAddress(node.memberName),
  displayName: node.memberName.trim(),
  agentDefinitionId: node.refScope === 'TEAM_LOCAL'
    ? buildTeamLocalAgentDefinitionId(teamDefinition.id, node.ref)
    : node.ref.trim(),
})))

export const resolveLeafTeamMembers = (teamDefinition: AgentTeamDefinition): TeamDefinitionLeafMember[] =>
  buildTeamMemberTreeFromDefinition(teamDefinition).map((node) => ({
    displayName: node.displayName || memberAddressBasename(node.address),
    address: node.address,
    agentDefinitionId: node.agentDefinitionId,
  }))
