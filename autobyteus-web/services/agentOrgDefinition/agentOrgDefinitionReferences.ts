import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
import { getApolloClient } from '~/utils/apolloClient'
import { GetAgentOrgReferencedAgent, GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'
import type { AgentOrgMember } from '~/stores/agentOrgDefinitionStore'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'

type AgentSummary = Pick<AgentDefinition, 'id' | 'name' | 'description'>
type TeamSummary = AgentTeamDefinition
type Ownership = { ownershipScope?: string | null; ownerOrgId?: string | null; ownerTeamId?: string | null }
export type AgentOrgReferenceCatalogLookup = {
  getCatalogAgentById: (id: string) => (AgentSummary & Ownership) | null | undefined
  getCatalogTeamById: (id: string) => (Pick<AgentTeamDefinition, 'id' | 'name' | 'description' | 'coordinatorMemberName' | 'nodes'> & Ownership) | null | undefined
}
export type AgentOrgDefinitionReferences = {
  agents: Record<string, AgentSummary>
  teams: Record<string, TeamSummary>
  unavailable: string[]
}

// A read for the selected Org projection, not an insertion into the shared catalog.
// The existing Apollo client remains the only query/cache boundary.
export async function loadAgentOrgDefinitionReferences(
  orgId: string, members: readonly AgentOrgMember[], catalogLookup: AgentOrgReferenceCatalogLookup,
): Promise<AgentOrgDefinitionReferences> {
  const result: AgentOrgDefinitionReferences = { agents: {}, teams: {}, unavailable: [] }
  const read = async <T extends AgentSummary & Ownership>(
    id: string, scope: string, ownerId: string, kind: 'agent' | 'team',
  ): Promise<T | null> => {
    try {
      // Owned references are never resolved through shared catalog eligibility.
      let definition = scope === 'AGENT_ORG_OWNED' || scope === 'TEAM_LOCAL'
        ? null
        : kind === 'agent' ? catalogLookup.getCatalogAgentById(id) : catalogLookup.getCatalogTeamById(id)
      if (!definition) {
        const { data, errors } = await getApolloClient().query({
          query: kind === 'agent' ? GetAgentOrgReferencedAgent : GetAgentOrgReferencedTeam,
          variables: { id }, fetchPolicy: 'network-only',
        })
        if (errors?.length) throw new Error(id)
        definition = kind === 'agent' ? data?.agentDefinition : data?.agentTeamDefinition
      }
      if (!definition || definition.id !== id || (definition.ownershipScope ?? 'SHARED') !== scope
        || (scope === 'AGENT_ORG_OWNED' && definition.ownerOrgId !== ownerId)
        || (scope === 'TEAM_LOCAL' && definition.ownerTeamId !== ownerId)) throw new Error(id)
      return definition as T
    } catch {
      if (!result.unavailable.includes(id)) result.unavailable.push(id)
      return null
    }
  }
  const readAgent = async (id: string, scope: string, ownerId: string) => {
    const agent = await read(id, scope, ownerId, 'agent')
    if (agent) result.agents[id] = agent
  }
  await Promise.all(members.map(async (member) => {
    if (member.refType === 'AGENT') return readAgent(member.ref, member.refScope, orgId)
    const team = await read<TeamSummary & Ownership>(member.ref, member.refScope, orgId, 'team')
    if (!team) return
    try {
      if (!Array.isArray(team.nodes) || !team.nodes.length
        || new Set(team.nodes.map(node => node.memberName)).size !== team.nodes.length
        || !team.nodes.some(node => node.memberName === team.coordinatorMemberName)) throw new Error(team.id)
      await Promise.all(team.nodes.map(node => readAgent(
        node.refScope === 'TEAM_LOCAL' ? buildTeamLocalAgentDefinitionId(team.id, node.ref) : node.ref,
        node.refScope ?? 'SHARED', team.id,
      )))
      result.teams[team.id] = team
    } catch {
      result.unavailable.push(member.ref)
    }
  }))
  return result
}
