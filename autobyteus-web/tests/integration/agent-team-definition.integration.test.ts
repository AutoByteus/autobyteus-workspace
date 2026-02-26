import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

const mockQuery = vi.fn()
const mockMutate = vi.fn()

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: mockQuery,
    mutate: mockMutate,
  }),
}))

describe('agent-team-definition integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('persists ownership node in create flow', async () => {
    mockMutate.mockResolvedValue({
      data: {
        createAgentTeamDefinition: { id: 'team-42' },
      },
      errors: [],
    })
    mockQuery.mockResolvedValue({
      data: {
        agentTeamDefinitions: [
          {
            id: 'team-42',
            name: 'Distributed Team',
            description: 'Team across nodes',
            role: null,
            coordinatorMemberName: 'writer_agent',
            nodes: [
              {
                memberName: 'writer_agent',
                referenceId: 'agent-1',
                referenceType: 'AGENT',
                homeNodeId: 'embedded-local',
              },
            ],
          },
        ],
      },
      errors: [],
    })

    const store = useAgentTeamDefinitionStore()
    const created = await store.createAgentTeamDefinition({
      name: 'Distributed Team',
      description: 'Team across nodes',
      coordinatorMemberName: 'writer_agent',
      nodes: [
        {
          __typename: 'TeamMember',
          memberName: 'writer_agent',
          referenceId: 'agent-1',
          referenceType: 'AGENT',
          homeNodeId: 'embedded-local',
        } as any,
      ],
    })

    const mutatePayload = mockMutate.mock.calls[0]?.[0]
    expect(mutatePayload?.variables?.input?.nodes?.[0]).toEqual({
      memberName: 'writer_agent',
      referenceId: 'agent-1',
      referenceType: 'AGENT',
      homeNodeId: 'embedded-local',
    })
    expect(created?.nodes?.[0]?.homeNodeId).toBe('embedded-local')
  })
})
