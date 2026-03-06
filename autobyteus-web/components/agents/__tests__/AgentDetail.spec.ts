import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentDetail from '../AgentDetail.vue'

const { mockAgentDefinitionStore, mockRunConfigStore, mockSelectionStore } = vi.hoisted(() => ({
  mockAgentDefinitionStore: {
    agentDefinitions: [] as any[],
    getAgentDefinitionById: vi.fn(),
    fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    deleteAgentDefinition: vi.fn().mockResolvedValue({ success: true }),
  },
  mockRunConfigStore: {
    setTemplate: vi.fn(),
  },
  mockSelectionStore: {
    clearSelection: vi.fn(),
  },
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => mockAgentDefinitionStore,
}))

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => mockRunConfigStore,
}))

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => mockSelectionStore,
}))

describe('AgentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const agent = {
      id: 'agent-1',
      name: 'Planner',
      role: 'assistant',
      description: 'Plans work',
      category: 'software-engineering',
      instructions: 'Always create a concrete execution plan before coding.',
      avatarUrl: null,
      toolNames: ['run_bash'],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: ['planning'],
    }

    mockAgentDefinitionStore.agentDefinitions = [agent]
    mockAgentDefinitionStore.getAgentDefinitionById.mockImplementation((id: string) =>
      id === 'agent-1' ? agent : undefined,
    )
  })

  it('renders instructions and category for the selected agent', async () => {
    const wrapper = mount(AgentDetail, {
      props: {
        agentDefinitionId: 'agent-1',
      },
      global: {
        stubs: {
          AgentDeleteConfirmDialog: true,
          AgentDuplicateButton: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Instructions')
    expect(wrapper.text()).toContain('Always create a concrete execution plan before coding.')
    expect(wrapper.text()).toContain('Category')
    expect(wrapper.text()).toContain('software-engineering')
  })

  it('navigates to edit view after duplicate completes', async () => {
    const wrapper = mount(AgentDetail, {
      props: {
        agentDefinitionId: 'agent-1',
      },
      global: {
        stubs: {
          AgentDeleteConfirmDialog: true,
          AgentDuplicateButton: {
            template: '<button data-test="duplicate" @click="$emit(\'duplicated\', \'agent-copy-1\')">Duplicate</button>',
          },
        },
      },
    })

    await wrapper.get('[data-test="duplicate"]').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([[{ view: 'edit', id: 'agent-copy-1' }]])
  })
})
