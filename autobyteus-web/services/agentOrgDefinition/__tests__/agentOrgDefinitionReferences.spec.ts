import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentOrgDefinitionReferences, loadAgentOrgMemberReferences } from '../agentOrgDefinitionReferences'
import { GetAgentOrgReferencedAgent, GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'
import type { AgentOrgMember } from '~/stores/agentOrgDefinitionStore'
const io = vi.hoisted(() => ({ query: vi.fn(), current: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.current }))
const member: AgentOrgMember = { memberName: 'group', ref: 'owned-team', refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' }
const team = () => ({ id: 'owned-team', name: 'Actual Team', description: '', ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: 'org', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'worker', refScope: 'TEAM_LOCAL' }] })
const catalog = { getCatalogAgentById: () => null, getCatalogTeamById: () => null }
beforeEach(() => { vi.resetAllMocks(); io.current = { query: io.query } })

describe('immediate member versus full graph read operations', () => {
  it('deduplicates immediate exact tuples within a call but refreshes on each new operation', async () => {
    io.query.mockResolvedValue({ data: { agentTeamDefinition: team() } })
    const members = [member, { ...member, memberName: 'second_role' }]
    const result = await loadAgentOrgMemberReferences('org', members)
    expect(result.teams['owned-team']?.name).toBe('Actual Team')
    expect(result.unavailable).toEqual([])
    expect(io.query).toHaveBeenCalledTimes(1)
    expect(io.query).toHaveBeenCalledWith({ query: GetAgentOrgReferencedTeam, variables: { id: 'owned-team' }, fetchPolicy: 'network-only' })
    await loadAgentOrgMemberReferences('org', members)
    expect(io.query).toHaveBeenCalledTimes(2)
  })
  it('does not make Team labels depend on children, but full loader still rejects a missing child', async () => {
    io.query.mockImplementation(async ({ query }) => ({ data: query === GetAgentOrgReferencedTeam ? { agentTeamDefinition: team() } : { agentDefinition: null } }))
    expect((await loadAgentOrgMemberReferences('org', [member])).unavailable).toEqual([])
    expect(io.query).toHaveBeenCalledTimes(1)
    const full = await loadAgentOrgDefinitionReferences('org', [member], catalog)
    expect(full.unavailable).toEqual(['team-local-agent:owned-team:worker'])
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ query: GetAgentOrgReferencedAgent, variables: { id: 'team-local-agent:owned-team:worker' } }))
  })
  it.each(['empty', 'coordinator', 'duplicate'])('preserves full-loader %s topology validation while labels remain display-only', async invalid => {
    const value = team()
    if (invalid === 'empty') value.nodes = []
    if (invalid === 'coordinator') value.coordinatorMemberName = 'absent'
    if (invalid === 'duplicate') value.nodes.push(value.nodes[0]!)
    io.query.mockResolvedValue({ data: { agentTeamDefinition: value } })
    expect((await loadAgentOrgMemberReferences('org', [member])).teams['owned-team']?.name).toBe('Actual Team')
    expect((await loadAgentOrgDefinitionReferences('org', [member], catalog)).unavailable).toEqual(['owned-team'])
    expect(io.query).toHaveBeenCalledTimes(2)
  })
  it.each(['SHARED', 'APPLICATION_OWNED'] as const)('retains eligible %s catalog policy only for the full loader', async scope => {
    const value = { id: 'agent', name: 'Cached Agent', description: '', ownershipScope: scope }
    const direct: AgentOrgMember = { memberName: 'agent', ref: 'agent', refType: 'AGENT', refScope: scope }
    const full = await loadAgentOrgDefinitionReferences('org', [direct], { ...catalog, getCatalogAgentById: () => value })
    expect(full.agents['agent']?.name).toBe('Cached Agent')
    expect(io.query).not.toHaveBeenCalled()
    io.query.mockResolvedValue({ data: { agentDefinition: { ...value, name: 'Fresh Agent' } } })
    expect((await loadAgentOrgMemberReferences('org', [direct])).agents['agent']?.name).toBe('Fresh Agent')
    expect(io.query).toHaveBeenCalledTimes(1)
  })
  it.each(['id', 'scope', 'owner', 'graphql', 'network'])('shares exact %s rejection in both operations', async failure => {
    const value = team()
    if (failure === 'id') value.id = 'other'
    if (failure === 'scope') value.ownershipScope = 'SHARED'
    if (failure === 'owner') value.ownerOrgId = 'other'
    io.query.mockImplementation(async () => {
      if (failure === 'network') throw new Error('offline')
      return { data: { agentTeamDefinition: value }, errors: failure === 'graphql' ? [{ message: 'unavailable' }] : [] }
    })
    for (const result of [await loadAgentOrgMemberReferences('org', [member]), await loadAgentOrgDefinitionReferences('org', [member], catalog)]) {
      expect(result.teams).toEqual({}); expect(result.unavailable).toEqual(['owned-team'])
    }
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
    expect(replacement.query).not.toHaveBeenCalled()
  })
})
