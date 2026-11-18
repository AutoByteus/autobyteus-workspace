import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentDefinitionDetailSections from '../AgentDefinitionDetailSections.vue'
import { useLocalization } from '~/composables/useLocalization'

/** agent-semantic-memory (REQ-002, AC-007): the agent detail shows whether semantic memory is on and, when on, its folder. */
const translate = (key: string): string => useLocalization().t(key as never)
const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 'computer-use-operator', name: 'Computer Use Operator', description: 'Operates', instructions: 'Operate.',
  toolNames: [], skillNames: [], skillScope: 'CONFIGURED', inputProcessorNames: [], llmResponseProcessorNames: [],
  toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], ...overrides,
})
const mountSections = (agentDef: Record<string, unknown>) => mount(AgentDefinitionDetailSections, {
  props: { agentDef: agentDef as never },
  global: { stubs: { ExpandableInstructionCard: true }, mocks: { $t: translate } },
})

describe('AgentDefinitionDetailSections semantic memory', () => {
  it('shows On and the selectable folder when on', () => {
    const folder = '/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator'
    const section = mountSections(agent({ semanticMemoryEnabled: true, semanticMemoryPath: folder })).get('[data-testid="agent-semantic-memory"]')
    expect(section.text()).toContain(translate('agents.components.agents.AgentDetail.semanticMemoryHeading'))
    expect(section.text()).toContain(translate('agents.components.agents.AgentDetail.semanticMemoryOn'))
    const path = section.get('code')
    expect(path.text()).toBe(folder)
    expect(path.classes()).toContain('select-all')
  })

  it('shows Off without a folder when off or absent', () => {
    for (const definition of [agent({ semanticMemoryEnabled: false, semanticMemoryPath: null }), agent()]) {
      const section = mountSections(definition).get('[data-testid="agent-semantic-memory"]')
      expect(section.text()).toContain(translate('agents.components.agents.AgentDetail.semanticMemoryOff'))
      expect(section.find('code').exists()).toBe(false)
    }
  })
})
