import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentDefinitionDetailSections from '../AgentDefinitionDetailSections.vue'
import { useLocalization } from '~/composables/useLocalization'

/** autobyteus-554 (REQ-004, AC-004): the agent detail shows every agent's semantic memory folder; there is no on/off. */
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
  it('shows the folder sentence and the selectable folder for an agent whose config has no field', () => {
    const folder = '/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator'
    const section = mountSections(agent({ semanticMemoryPath: folder })).get('[data-testid="agent-semantic-memory"]')
    expect(section.text()).toContain(translate('agents.components.agents.AgentDetail.semanticMemoryHeading'))
    expect(translate('agents.components.agents.AgentDetail.semanticMemoryFolder')).toBe('The agent keeps its reusable knowledge in this folder:')
    expect(section.text()).toContain(translate('agents.components.agents.AgentDetail.semanticMemoryFolder'))
    const path = section.get('code')
    expect(path.text()).toBe(folder)
    expect(path.classes()).toContain('select-all')
    expect(section.text()).not.toMatch(/\bOff\b|\bOn\./)
  })
})
