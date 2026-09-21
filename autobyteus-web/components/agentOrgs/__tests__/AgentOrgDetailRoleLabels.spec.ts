import { reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentOrgExperience from '../AgentOrgExperience.vue'
import { GetAgentOrgEndpointCatalog } from '~/graphql/queries/agentOrgDefinitionQueries'

const state = vi.hoisted(() => ({
  route: null as any,
  context: null as any,
  query: vi.fn(),
  push: vi.fn(),
  orgStore: null as any,
  agentStore: null as any,
  teamStore: null as any,
}))
vi.mock('vue-router', () => ({ useRoute: () => state.route, useRouter: () => ({ push: state.push }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: state.query }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => state.context }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => state.orgStore }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => state.agentStore }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => state.teamStore }))

const org = (id: string, directRole: string, teamRole: string) => ({
  id, name: `${id} organization`, description: 'Detail', instructions: '', revision: '1', handoffs: [
    { from: `/${directRole}`, to: `/${teamRole}`, rules: ['Delegate'] },
  ],
  members: [
    { memberName: directRole, ref: `${id}-opaque-agent`, refType: 'AGENT', refScope: 'AGENT_ORG_OWNED' },
    { memberName: teamRole, ref: `${id}-opaque-team`, refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' },
  ],
})
const alpha = org('alpha', 'Research_Lead', 'Delivery-Team')
const beta = org('beta', 'Quality_Lead', 'Release-Team')
const endpointCatalog = (definition: ReturnType<typeof org>, coordinatorRole: string) => {
  const direct = definition.members[0]!
  const team = definition.members[1]!
  const directAddress = `/${direct.memberName}`
  const teamAddress = `/${team.memberName}`
  const coordinatorAddress = `${teamAddress}/${coordinatorRole}`
  const directEndpoint = { kind: 'agent', address: directAddress, memberName: direct.memberName, definitionId: direct.ref, coordinatorAddress: null, coordinatorMemberName: null }
  const coordinator = { kind: 'agent', address: coordinatorAddress, memberName: coordinatorRole, definitionId: `${definition.id}-coordinator`, coordinatorAddress: null, coordinatorMemberName: null }
  const teamEndpoint = { kind: 'agent_team', address: teamAddress, memberName: team.memberName, definitionId: team.ref, coordinatorAddress, coordinatorMemberName: coordinatorRole }
  return { from: [directEndpoint, coordinator], to: [directEndpoint, coordinator, teamEndpoint] }
}
const deferred = () => { let resolve!: (value: any) => void; let reject!: (cause: unknown) => void; const promise = new Promise<any>((done, fail) => { resolve = done; reject = fail }); return { promise, resolve, reject } }
let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.clearAllMocks()
  state.route = reactive({ query: { view: 'org-detail', id: 'alpha' } })
  state.context = reactive({ bindingRevision: 0 })
  const definitions = [alpha, beta]
  state.orgStore = { definitions, byId: (id: string) => definitions.find(item => item.id === id), fetchAll: vi.fn().mockResolvedValue(undefined), remove: vi.fn() }
  state.agentStore = { sharedAgentDefinitions: [], getAgentDefinitionById: vi.fn(), fetchAllAgentDefinitions: vi.fn() }
  state.teamStore = { sharedAgentTeamDefinitions: [], getCatalogAgentTeamDefinitionById: vi.fn(), fetchAllAgentTeamDefinitions: vi.fn() }
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

describe('Agent Org detail role labels', () => {
  it('keeps direct roles stable while the aggregate Team topology settles', async () => {
    const request = deferred(); state.query.mockReturnValue(request.promise)
    wrapper = mount(AgentOrgExperience)
    expect(wrapper.text()).toContain('Research Lead')
    expect(wrapper.text()).toContain('Delivery Team')
    expect(wrapper.text()).toContain('Loading Team roles…')
    expect(wrapper.text()).not.toContain('alpha-opaque-agent')
    expect(wrapper.text()).not.toContain('alpha-opaque-team')
    request.resolve({ data: { agentOrgEndpointCatalog: endpointCatalog(alpha, 'Architecture_Lead') } }); await flushPromises()
    expect(wrapper.text()).toContain('Coordinator: Architecture Lead')
    expect(wrapper.text()).toContain('Research Lead')
    expect(wrapper.text()).toContain('Delivery Team')
    expect(wrapper.text()).not.toContain('alpha-opaque-agent')
    expect(state.query).toHaveBeenCalledTimes(1)
    expect(state.query).toHaveBeenCalledWith({ query: GetAgentOrgEndpointCatalog, variables: { id: 'alpha' }, fetchPolicy: 'network-only' })
    expect(state.agentStore.fetchAllAgentDefinitions).not.toHaveBeenCalled()
    expect(state.teamStore.fetchAllAgentTeamDefinitions).not.toHaveBeenCalled()
  })

  it('retains direct roles and shows ID-free unavailable feedback when topology fails', async () => {
    state.query.mockRejectedValue(new Error('alpha-opaque-team'))
    wrapper = mount(AgentOrgExperience); await flushPromises()
    expect(wrapper.text()).toContain('Research Lead')
    expect(wrapper.text()).toContain('Delivery Team')
    expect(wrapper.text()).toContain('Team role details are unavailable')
    expect(wrapper.text()).not.toContain('alpha-opaque-team')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('retires late topology after route and backend-binding changes', async () => {
    const alphaRequest = deferred(); const betaOldBinding = deferred(); const betaCurrentBinding = deferred()
    state.query.mockImplementation(({ variables }) => variables.id === 'alpha' ? alphaRequest.promise
      : state.context.bindingRevision === 0 ? betaOldBinding.promise : betaCurrentBinding.promise)
    wrapper = mount(AgentOrgExperience)
    state.route.query = { view: 'org-detail', id: 'beta' }; await flushPromises()
    expect(wrapper.text()).toContain('Quality Lead')
    state.context.bindingRevision = 1; await flushPromises()
    betaCurrentBinding.resolve({ data: { agentOrgEndpointCatalog: endpointCatalog(beta, 'Current_Coordinator') } }); await flushPromises()
    betaOldBinding.resolve({ data: { agentOrgEndpointCatalog: endpointCatalog(beta, 'Stale_Coordinator') } })
    alphaRequest.resolve({ data: { agentOrgEndpointCatalog: endpointCatalog(alpha, 'Alpha_Coordinator') } }); await flushPromises()
    expect(wrapper.text()).toContain('Coordinator: Current Coordinator')
    expect(wrapper.text()).not.toContain('Stale Coordinator')
    expect(wrapper.text()).not.toContain('Alpha Coordinator')
    expect(wrapper.text()).toContain('Release Team')
  })

  it('does not load endpoint topology for a direct-Agent-only detail', async () => {
    const directOnly = { ...alpha, id: 'direct-only', members: [alpha.members[0]!], handoffs: [] }
    state.orgStore.definitions.push(directOnly)
    state.route.query = { view: 'org-detail', id: 'direct-only' }
    wrapper = mount(AgentOrgExperience); await flushPromises()
    expect(wrapper.text()).toContain('Research Lead')
    expect(state.query).not.toHaveBeenCalled()
  })
})
