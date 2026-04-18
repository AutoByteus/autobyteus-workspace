import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentDetail from '../AgentDetail.vue'
import { useLocalization } from '~/composables/useLocalization'

const {
  mockAgentDefinitionStore,
  mockRunConfigStore,
  mockSelectionStore,
} = vi.hoisted(() => ({
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

const flushMeasurement = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const translate = (key: string, params?: Record<string, string>): string =>
  useLocalization().t(key as never, params as never)

const setInstructionOverflow = async (
  wrapper: ReturnType<typeof mount>,
  scrollHeight: number,
  width = 1024,
): Promise<void> => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })

  const viewport = wrapper.get('[data-test="instruction-viewport"]').element as HTMLElement
  Object.defineProperty(viewport, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  })

  window.dispatchEvent(new Event('resize'))
  await flushMeasurement()
}

describe('AgentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

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
      ownershipScope: 'SHARED',
      ownerTeamId: null,
      ownerTeamName: null,
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
    expect(wrapper.text()).toContain(translate('agents.components.agents.AgentDetail.category'))
    expect(wrapper.text()).toContain('software-engineering')
  })

  it('shows the chevron toggle when instructions overflow', async () => {
    const longInstruction = 'Always create a concrete execution plan before coding.\n'.repeat(50)
    const agent = {
      id: 'agent-1',
      name: 'Planner',
      role: 'assistant',
      description: 'Plans work',
      category: 'software-engineering',
      instructions: longInstruction,
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

    await setInstructionOverflow(wrapper, 640)

    const toggle = wrapper.get('[data-test="instruction-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    await flushMeasurement()

    expect(wrapper.get('[data-test="instruction-toggle"]').attributes('aria-expanded')).toBe('true')
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

  it('shows team ownership and hides shared-only actions for team-local agents', async () => {
    const localAgent = {
      id: 'team-local:software-engineering:planner',
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
      ownershipScope: 'TEAM_LOCAL',
      ownerTeamId: 'software-engineering',
      ownerTeamName: 'Software Engineering Team',
    }

    mockAgentDefinitionStore.agentDefinitions = [localAgent]
    mockAgentDefinitionStore.getAgentDefinitionById.mockImplementation((id: string) =>
      id === localAgent.id ? localAgent : undefined,
    )

    const wrapper = mount(AgentDetail, {
      props: {
        agentDefinitionId: localAgent.id,
      },
      global: {
        stubs: {
          AgentDeleteConfirmDialog: true,
          AgentDuplicateButton: true,
        },
      },
    })

    const ownershipLines = wrapper.findAll('p.text-sm.text-gray-500.mt-1')
    expect(ownershipLines).toHaveLength(1)
    expect(ownershipLines[0]?.text().trim().length).toBeGreaterThan(0)
    expect(wrapper.text()).not.toContain('Duplicate')
    expect(wrapper.text()).not.toContain('Delete')
  })

  it('shows application provenance for team-local agents owned by an application bundle', async () => {
    const localAgent = {
      id: 'team-local:bundle-team__pkg-1__brief-studio__launch-team:planner',
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
      ownershipScope: 'TEAM_LOCAL',
      ownerTeamId: 'bundle-team__pkg-1__brief-studio__launch-team',
      ownerTeamName: 'Launch Team',
      ownerApplicationId: 'bundle-app__pkg-1__brief-studio',
      ownerApplicationName: 'Brief Studio',
      ownerPackageId: 'built-in:applications',
    }

    mockAgentDefinitionStore.agentDefinitions = [localAgent]
    mockAgentDefinitionStore.getAgentDefinitionById.mockImplementation((id: string) =>
      id === localAgent.id ? localAgent : undefined,
    )

    const wrapper = mount(AgentDetail, {
      props: {
        agentDefinitionId: localAgent.id,
      },
      global: {
        stubs: {
          AgentDeleteConfirmDialog: true,
          AgentDuplicateButton: true,
        },
      },
    })

    const ownershipLines = wrapper.findAll('p.text-sm.text-gray-500.mt-1')
    expect(ownershipLines).toHaveLength(2)
    expect(ownershipLines[0]?.text().trim().length).toBeGreaterThan(0)
    expect(ownershipLines[1]?.text().trim().length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain(
      translate('agents.components.agents.AgentDetail.ownership.teamLocal'),
    )
  })
})
