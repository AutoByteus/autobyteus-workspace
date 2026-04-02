import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentCard from '../AgentCard.vue'

const buildAgentDefinition = (overrides: Record<string, unknown> = {}) => ({
  id: 'agent-1',
  name: 'Architect Designer',
  description: 'Designs system structure.',
  toolNames: ['tool-a'],
  skillNames: ['skill-a'],
  inputProcessorNames: [],
  llmResponseProcessorNames: [],
  systemPromptProcessorNames: [],
  toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [],
  lifecycleProcessorNames: [],
  ownershipScope: 'SHARED',
  ownerTeamId: null,
  ownerTeamName: null,
  ...overrides,
})

describe('AgentCard', () => {
  it('renders the owning team line for team-local agents and hides sync', () => {
    const wrapper = mount(AgentCard, {
      props: {
        agentDef: buildAgentDefinition({
          id: 'team-local:software-engineering:architect-designer',
          ownershipScope: 'TEAM_LOCAL',
          ownerTeamId: 'software-engineering',
          ownerTeamName: 'Software Engineering Team',
        }),
      },
    })

    expect(wrapper.text()).toContain('Team: Software Engineering Team')
    expect(wrapper.text()).not.toContain('Sync')
    expect(wrapper.text()).toContain('Run')
  })

  it('keeps shared agents visually unchanged', () => {
    const wrapper = mount(AgentCard, {
      props: {
        agentDef: buildAgentDefinition(),
      },
    })

    expect(wrapper.text()).not.toContain('Team:')
    expect(wrapper.text()).toContain('Sync')
  })
})
