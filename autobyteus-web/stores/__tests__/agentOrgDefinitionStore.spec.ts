import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GetAgentOrgDefinitions } from '~/graphql/queries/agentOrgDefinitionQueries'
import { UpdateAgentOrgDefinition } from '~/graphql/mutations/agentOrgDefinitionMutations'
import { useAgentOrgDefinitionStore } from '../agentOrgDefinitionStore'

const mockQuery = vi.fn()
const mockMutate = vi.fn()
const mockWaitForBoundBackendReady = vi.fn()

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: mockQuery, mutate: mockMutate, cache: { updateQuery: vi.fn() } }),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: mockWaitForBoundBackendReady }),
}))

describe('agentOrgDefinitionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockWaitForBoundBackendReady.mockResolvedValue(true)
  })

  it('projects Apollo-hydrated direct and Team members to exact update input fields', async () => {
    const members = [
      {
        __typename: 'AgentOrgMember' as const,
        memberName: 'requirements_engineer',
        ref: 'requirements-agent',
        refType: 'AGENT' as const,
        refScope: 'SHARED' as const,
      },
      {
        __typename: 'AgentOrgMember' as const,
        memberName: 'software_engineering',
        ref: 'software-team',
        refType: 'AGENT_TEAM' as const,
        refScope: 'SHARED' as const,
      },
    ]
    const handoffs = [
      { from: '/requirements_engineer', to: '/software_engineering', rules: ['Requirements are approved.'] },
      { from: '/software_engineering/lead', to: '/requirements_engineer', rules: ['Implementation is ready.'] },
    ]
    const fetched = {
      __typename: 'AgentOrgDefinition',
      id: 'software-org',
      name: 'Software Development Department',
      description: 'Original description.',
      instructions: 'Hidden durable instructions.',
      category: 'software-delivery',
      avatarUrl: 'https://example.test/org.png',
      revision: 'org-rev-7',
      members,
      handoffs,
      defaultLaunchConfig: { llmModelIdentifier: 'gpt-5.4', runtimeKind: 'autobyteus', llmConfig: null },
    }
    mockQuery.mockResolvedValue({ data: { agentOrgDefinitions: [fetched] }, errors: [] })
    mockMutate.mockResolvedValue({
      data: { updateAgentOrgDefinition: { ...fetched, description: 'Updated visible description.', revision: 'org-rev-8' } },
      errors: [],
    })
    const store = useAgentOrgDefinitionStore()
    await store.fetchAll()

    await store.update(fetched.id, fetched.revision, {
      description: 'Updated visible description.',
      members: store.definitions[0]!.members,
      handoffs,
    })

    expect(mockQuery).toHaveBeenCalledWith({ query: GetAgentOrgDefinitions, fetchPolicy: 'cache-first' })
    expect(mockMutate).toHaveBeenCalledWith({
      mutation: UpdateAgentOrgDefinition,
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          id: 'software-org',
          expectedRevision: 'org-rev-7',
          description: 'Updated visible description.',
          members: [
            { memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT', refScope: 'SHARED' },
            { memberName: 'software_engineering', ref: 'software-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
          ],
          handoffs,
        },
      },
    })
    const outbound = mockMutate.mock.calls[0]![0].variables.input
    expect(outbound).not.toHaveProperty('instructions')
    expect(outbound).not.toHaveProperty('category')
    expect(outbound).not.toHaveProperty('avatarUrl')
    expect(outbound).not.toHaveProperty('defaultLaunchConfig')
    expect(outbound.members.map((member: { memberName: string }) => member.memberName)).toEqual([
      'requirements_engineer',
      'software_engineering',
    ])
    expect(outbound.handoffs).toEqual(handoffs)
    expect(members.map((member) => member.__typename)).toEqual(['AgentOrgMember', 'AgentOrgMember'])
  })
})
