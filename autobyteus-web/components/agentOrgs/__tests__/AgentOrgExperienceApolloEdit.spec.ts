import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import AgentOrgExperience from '../AgentOrgExperience.vue'
import { UpdateAgentOrgDefinition } from '~/graphql/mutations/agentOrgDefinitionMutations'

const { route, push, mockQuery, mockMutate, agentStore, teamStore } = vi.hoisted(() => {
  const agents = [
    { id: 'requirements-agent', name: 'Requirements Engineer', description: 'Owns requirements.' },
    { id: 'architecture-agent', name: 'Architecture Designer', description: 'Owns architecture.' },
  ]
  const team = {
    id: 'software-team', name: 'Software Engineering', description: 'Builds the product.',
    coordinatorMemberName: 'architecture_designer', ownershipScope: 'SHARED',
    nodes: [{ memberName: 'architecture_designer', ref: 'architecture-agent', refScope: 'SHARED' }],
  }
  return {
    route: { query: { view: 'org-edit', id: 'software-org' } as Record<string, string> },
    push: vi.fn().mockResolvedValue(undefined),
    mockQuery: vi.fn(),
    mockMutate: vi.fn(),
    agentStore: {
      agentDefinitions: agents, sharedAgentDefinitions: agents,
      getAgentDefinitionById: vi.fn((id: string) => agents.find((agent) => agent.id === id)),
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    },
    teamStore: {
      rootAgentTeamDefinitions: [team], sharedAgentTeamDefinitions: [team],
      getCatalogAgentTeamDefinitionById: vi.fn((id: string) => id === team.id ? team : null),
      fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push }) }))
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: mockQuery, mutate: mockMutate, cache: { updateQuery: vi.fn() } }),
}))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: vi.fn().mockResolvedValue(true) }),
}))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentStore }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => teamStore }))

describe('AgentOrgExperience Apollo edit boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('submits only declared member input fields after a normal fetched visible edit', async () => {
    const members = [
      { __typename: 'AgentOrgMember', memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT', refScope: 'SHARED' },
      { __typename: 'AgentOrgMember', memberName: 'software_engineering', ref: 'software-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ]
    const handoffs = [
      { from: '/requirements_engineer', to: '/software_engineering', rules: ['Requirements are approved.', 'Architecture may begin.'] },
    ]
    const fetched = {
      __typename: 'AgentOrgDefinition', id: 'software-org', name: 'Software Development Department',
      description: 'Original description.', instructions: 'Hidden durable instructions.', revision: 'org-rev-7',
      category: 'software-delivery', avatarUrl: 'https://example.test/software-org.png',
      defaultLaunchConfig: { llmModelIdentifier: 'gpt-5.4', runtimeKind: 'autobyteus', llmConfig: null },
      members, handoffs,
    }
    mockQuery.mockResolvedValue({ data: { agentOrgDefinitions: [fetched] }, errors: [] })
    mockMutate.mockResolvedValue({
      data: { updateAgentOrgDefinition: { ...fetched, description: 'Updated visible description.', revision: 'org-rev-8' } },
      errors: [],
    })
    const wrapper = mount(AgentOrgExperience)
    await flushPromises()

    await wrapper.get('textarea').setValue('Updated visible description.')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(mockMutate).toHaveBeenCalledWith({
      mutation: UpdateAgentOrgDefinition,
      fetchPolicy: 'no-cache',
      variables: { input: {
        id: 'software-org',
        expectedRevision: 'org-rev-7',
        name: 'Software Development Department',
        description: 'Updated visible description.',
        members: [
          { memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT', refScope: 'SHARED' },
          { memberName: 'software_engineering', ref: 'software-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
        ],
        handoffs,
      } },
    })
    const outbound = mockMutate.mock.calls[0]![0].variables.input
    expect(outbound).not.toHaveProperty('instructions')
    expect(outbound).not.toHaveProperty('category')
    expect(outbound).not.toHaveProperty('avatarUrl')
    expect(outbound).not.toHaveProperty('defaultLaunchConfig')
    expect(outbound.handoffs).toEqual(handoffs)
    expect(members.map((member) => member.__typename)).toEqual(['AgentOrgMember', 'AgentOrgMember'])
  })
})
