import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentOrgEndpointCatalog } from '../agentOrgEndpointCatalog'
import { GetAgentOrgEndpointCatalog } from '~/graphql/queries/agentOrgDefinitionQueries'

const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
const response = () => ({
  from: [
    { kind: 'agent', address: '/direct_role', memberName: 'direct_role', definitionId: 'agent-1', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/team_role/team_lead', memberName: 'team_lead', definitionId: 'agent-2', coordinatorAddress: null, coordinatorMemberName: null },
  ],
  to: [
    { kind: 'agent', address: '/direct_role', memberName: 'direct_role', definitionId: 'agent-1', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/team_role/team_lead', memberName: 'team_lead', definitionId: 'agent-2', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent_team', address: '/team_role', memberName: 'team_role', definitionId: 'team-1', coordinatorAddress: '/team_role/team_lead', coordinatorMemberName: 'team_lead' },
  ],
})

beforeEach(() => { vi.resetAllMocks(); io.query.mockResolvedValue({ data: { agentOrgEndpointCatalog: response() } }) })

describe('loadAgentOrgEndpointCatalog', () => {
  it('loads a fresh typed endpoint projection', async () => {
    await expect(loadAgentOrgEndpointCatalog('org-1')).resolves.toEqual(response())
    expect(io.query).toHaveBeenCalledWith({ query: GetAgentOrgEndpointCatalog, variables: { id: 'org-1' }, fetchPolicy: 'network-only' })
  })

  it.each([
    ['blank Org ID', async () => loadAgentOrgEndpointCatalog('  ')],
    ['GraphQL errors', async () => { io.query.mockResolvedValue({ data: {}, errors: [{ message: 'Unavailable' }] }); return loadAgentOrgEndpointCatalog('org-1') }],
    ['missing catalog', async () => { io.query.mockResolvedValue({ data: {} }); return loadAgentOrgEndpointCatalog('org-1') }],
    ['malformed endpoint', async () => { const value = response(); (value.to[2] as any).coordinatorMemberName = null; io.query.mockResolvedValue({ data: { agentOrgEndpointCatalog: value } }); return loadAgentOrgEndpointCatalog('org-1') }],
  ])('rejects %s', async (_label, operation) => {
    await expect(operation()).rejects.toThrow()
  })

  it('captures the bound client before awaiting the request', async () => {
    let resolve!: (value: any) => void
    io.query.mockReturnValue(new Promise(done => { resolve = done }))
    const request = loadAgentOrgEndpointCatalog('org-1')
    resolve({ data: { agentOrgEndpointCatalog: response() } })
    await expect(request).resolves.toEqual(response())
  })
})
