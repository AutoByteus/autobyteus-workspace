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

// One request-local reader owns identity/ownership validation and deduplication.
// Capture the bound client before any awaits so a later binding cannot retarget a read.
const createReferenceReader = (result: AgentOrgDefinitionReferences, catalogLookup: AgentOrgReferenceCatalogLookup) => {
  let client: ReturnType<typeof getApolloClient> | null = null
  try { client = getApolloClient() } catch { /* Catalog-only full reads still work. */ }
  const pending = new Map<string, Promise<(AgentSummary & Ownership) | null>>()
  const read = <T extends AgentSummary & Ownership>(
    id: string, scope: string, ownerId: string, kind: 'agent' | 'team',
  ): Promise<T | null> => {
    const key = JSON.stringify([kind, id, scope, ownerId])
    let request = pending.get(key)
    if (!request) {
      request = (async () => {
        try {
          // Owned references are never resolved through shared catalog eligibility.
          let definition = scope === 'AGENT_ORG_OWNED' || scope === 'TEAM_LOCAL'
            ? null
            : kind === 'agent' ? catalogLookup.getCatalogAgentById(id) : catalogLookup.getCatalogTeamById(id)
          if (!definition) {
            if (!client) throw new Error(id)
            const { data, errors } = await client.query({
              query: kind === 'agent' ? GetAgentOrgReferencedAgent : GetAgentOrgReferencedTeam,
              variables: { id }, fetchPolicy: 'network-only',
            })
            if (errors?.length) throw new Error(id)
            definition = kind === 'agent' ? data?.agentDefinition : data?.agentTeamDefinition
          }
          if (!definition || definition.id !== id || (definition.ownershipScope ?? 'SHARED') !== scope
            || (scope === 'AGENT_ORG_OWNED' && definition.ownerOrgId !== ownerId)
            || (scope === 'TEAM_LOCAL' && definition.ownerTeamId !== ownerId)) throw new Error(id)
          return definition
        } catch {
          if (!result.unavailable.includes(id)) result.unavailable.push(id)
          return null
        }
      })()
      pending.set(key, request)
    }
    return request as Promise<T | null>
  }
  return read
}

// Immediate definitions for catalog labels, not full-graph validity or launch readiness.
export async function loadAgentOrgMemberReferences(
  orgId: string, members: readonly AgentOrgMember[],
): Promise<AgentOrgDefinitionReferences> {
  const result: AgentOrgDefinitionReferences = { agents: {}, teams: {}, unavailable: [] }
  const read = createReferenceReader(result, { getCatalogAgentById: () => null, getCatalogTeamById: () => null })
  await Promise.all(members.map(async member => {
    if (member.refType === 'AGENT') {
      const agent = await read(member.ref, member.refScope, orgId, 'agent')
      if (agent) result.agents[member.ref] = agent
    } else {
      const team = await read<TeamSummary & Ownership>(member.ref, member.refScope, orgId, 'team')
      if (team) result.teams[member.ref] = team
    }
  }))
  return result
}

// A complete selected-Org graph for detail/authoring/launch, not catalog insertion.
export async function loadAgentOrgDefinitionReferences(
  orgId: string, members: readonly AgentOrgMember[], catalogLookup: AgentOrgReferenceCatalogLookup,
): Promise<AgentOrgDefinitionReferences> {
  const result: AgentOrgDefinitionReferences = { agents: {}, teams: {}, unavailable: [] }
  const read = createReferenceReader(result, catalogLookup)
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
