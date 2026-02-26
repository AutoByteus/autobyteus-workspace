import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentDefinitionOptionsStore } from '~/stores/agentDefinitionOptionsStore'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

const buildQueryMock = (data: any) => {
  return vi.fn().mockResolvedValue({ data })
}

describe('agentDefinitionOptionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('populates optional processor name lists from the API', async () => {
    const queryResult = {
      availableToolNames: ['tool_a', 'tool_b'],
      availableOptionalInputProcessorNames: ['OptionalInput'],
      availableOptionalLlmResponseProcessorNames: ['OptionalLlm'],
      availableOptionalSystemPromptProcessorNames: ['OptionalPrompt'],
      availableOptionalToolExecutionResultProcessorNames: ['OptionalToolResult'],
      availableOptionalToolInvocationPreprocessorNames: ['OptionalInvocation'],
      availableOptionalLifecycleProcessorNames: ['OptionalLifecycle'],
      availablePromptCategories: [
        { category: 'cat', names: ['p1', 'p2'] },
      ],
    }

    const queryMock = buildQueryMock(queryResult)
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any)

    const store = useAgentDefinitionOptionsStore()
    await store.fetchAllAvailableOptions()

    expect(store.toolNames).toEqual(['tool_a', 'tool_b'])
    expect(store.inputProcessors).toEqual(['OptionalInput'])
    expect(store.llmResponseProcessors).toEqual(['OptionalLlm'])
    expect(store.systemPromptProcessors).toEqual(['OptionalPrompt'])
    expect(store.toolExecutionResultProcessors).toEqual(['OptionalToolResult'])
    expect(store.toolInvocationPreprocessors).toEqual(['OptionalInvocation'])
    expect(store.lifecycleProcessors).toEqual(['OptionalLifecycle'])
  })
})
