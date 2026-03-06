import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AgentDuplicateButton from '../AgentDuplicateButton.vue'

const mockAgentDefinitionStore = vi.hoisted(() => ({
  agentDefinitions: [] as Array<{ id: string; name: string }>,
  duplicateAgentDefinition: vi.fn(),
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => mockAgentDefinitionStore,
}))

describe('AgentDuplicateButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('duplicates without window.prompt, picks collision-safe name, and emits duplicated id', async () => {
    mockAgentDefinitionStore.agentDefinitions = [
      { id: 'planner', name: 'Planner' },
      { id: 'planner-copy', name: 'Planner Copy' },
    ]
    mockAgentDefinitionStore.duplicateAgentDefinition.mockResolvedValue({ id: 'planner-copy-2' })

    const promptSpy = vi.spyOn(window, 'prompt')

    const wrapper = mount(AgentDuplicateButton, {
      props: {
        agentId: 'planner',
        defaultName: 'Planner',
      },
    })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(promptSpy).not.toHaveBeenCalled()
    expect(mockAgentDefinitionStore.duplicateAgentDefinition).toHaveBeenCalledWith({
      sourceId: 'planner',
      newName: 'Planner Copy 2',
    })
    expect(wrapper.emitted('duplicated')).toEqual([['planner-copy-2']])

    promptSpy.mockRestore()
  })
})
