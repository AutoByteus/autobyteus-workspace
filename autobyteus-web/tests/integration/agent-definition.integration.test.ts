import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'

const mockMutate = vi.fn()
const mockQuery = vi.fn()

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: mockQuery,
    mutate: mockMutate,
  }),
}))

describe('agent-definition integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('submits md-centric create payload with instructions/category and no prompt fields', async () => {
    mockMutate.mockResolvedValue({
      data: {
        createAgentDefinition: {
          id: 'agent-42',
          name: 'Planner',
          role: 'assistant',
          description: 'Plans tasks',
          instructions: 'You are a planning agent.',
          category: 'software-engineering',
          avatarUrl: null,
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
        },
      },
      errors: [],
    })

    const store = useAgentDefinitionStore()
    await store.createAgentDefinition({
      name: 'Planner',
      role: 'assistant',
      description: 'Plans tasks',
      instructions: 'You are a planning agent.',
      category: 'software-engineering',
    })

    const mutatePayload = mockMutate.mock.calls[0]?.[0]
    const input = mutatePayload?.variables?.input ?? {}

    expect(input.instructions).toBe('You are a planning agent.')
    expect(input.category).toBe('software-engineering')
    expect(input).not.toHaveProperty('activePromptVersion')
    expect(input).not.toHaveProperty('promptName')
    expect(input).not.toHaveProperty('promptCategory')
  })
})
