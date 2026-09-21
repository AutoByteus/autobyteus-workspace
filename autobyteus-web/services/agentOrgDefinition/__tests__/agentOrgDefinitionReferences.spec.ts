import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentOrgDefinitionReferences } from '../agentOrgDefinitionReferences'
import { GetAgentOrgReferencedAgent, GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'
import type { AgentOrgMember } from '~/stores/agentOrgDefinitionStore'
const io = vi.hoisted(() => ({ query: vi.fn(), current: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.current }))
const member: AgentOrgMember = { memberName: 'group', ref: 'owned-team', refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' }
const team = () => ({ id: 'owned-team', name: 'Actual Team', description: '', ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: 'org', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'worker', refScope: 'TEAM_LOCAL' }] })
const catalog = { getCatalogAgentById: () => null, getCatalogTeamById: () => null }
beforeEach(() => { vi.resetAllMocks(); io.current = { query: io.query } })

describe('full Agent Org reference graph reads', () => {
  it('deduplicates exact tuples within a call but refreshes on each new operation', async () => {
    io.query.mockImplementation(async ({ query }) => ({ data: query === GetAgentOrgReferencedTeam
      ? { agentTeamDefinition: team() }
      : { agentDefinition: { id: 'team-local-agent:owned-team:worker', name: 'Worker', description: '', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'owned-team' } } }))
    const members = [member, { ...member, memberName: 'second_role' }]
    expect((await loadAgentOrgDefinitionReferences('org', members, catalog)).unavailable).toEqual([])
    expect(io.query).toHaveBeenCalledTimes(2)
    await loadAgentOrgDefinitionReferences('org', members, catalog)
    expect(io.query).toHaveBeenCalledTimes(4)
  })

  it.each(['empty', 'coordinator', 'duplicate'])('preserves full-loader %s topology validation', async invalid => {
    const value = team()
    if (invalid === 'empty') value.nodes = []
    if (invalid === 'coordinator') value.coordinatorMemberName = 'absent'
    if (invalid === 'duplicate') value.nodes.push(value.nodes[0]!)
    io.query.mockResolvedValue({ data: { agentTeamDefinition: value } })
    expect((await loadAgentOrgDefinitionReferences('org', [member], catalog)).unavailable).toEqual(['owned-team'])
    expect(io.query).toHaveBeenCalledTimes(1)
  })

  it.each(['SHARED', 'APPLICATION_OWNED'] as const)('retains eligible %s catalog policy', async scope => {
    const value = { id: 'agent', name: 'Cached Agent', description: '', ownershipScope: scope }
    const direct: AgentOrgMember = { memberName: 'agent', ref: 'agent', refType: 'AGENT', refScope: scope }
    const result = await loadAgentOrgDefinitionReferences('org', [direct], { ...catalog, getCatalogAgentById: () => value })
    expect(result.agents.agent?.name).toBe('Cached Agent')
    expect(io.query).not.toHaveBeenCalled()
  })

  it.each(['id', 'scope', 'owner', 'graphql', 'network'])('rejects exact %s mismatches', async failure => {
    const value = team()
    if (failure === 'id') value.id = 'other'
    if (failure === 'scope') value.ownershipScope = 'SHARED'
    if (failure === 'owner') value.ownerOrgId = 'other'
    io.query.mockImplementation(async () => {
      if (failure === 'network') throw new Error('offline')
      return { data: { agentTeamDefinition: value }, errors: failure === 'graphql' ? [{ message: 'unavailable' }] : [] }
    })
    const result = await loadAgentOrgDefinitionReferences('org', [member], catalog)
    expect(result.teams).toEqual({}); expect(result.unavailable).toEqual(['owned-team'])
  })

  it('retains the original bound client for child reads after an await', async () => {
    let resolve!: (value: any) => void
    const deferred = new Promise(done => { resolve = done })
    io.query.mockImplementation(({ query }) => query === GetAgentOrgReferencedTeam ? deferred : Promise.resolve({ data: { agentDefinition: {
      id: 'team-local-agent:owned-team:worker', name: 'Worker', description: '', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'owned-team',
    } } }))
    const request = loadAgentOrgDefinitionReferences('org', [member], catalog)
    const replacement = { query: vi.fn() }; io.current = replacement
    resolve({ data: { agentTeamDefinition: team() } })
    expect((await request).unavailable).toEqual([])
    expect(io.query).toHaveBeenCalledTimes(2)
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ query: GetAgentOrgReferencedAgent }))
    expect(replacement.query).not.toHaveBeenCalled()
  })
})
