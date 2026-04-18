import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentCard from '../AgentCard.vue'

const mockTranslations: Record<string, string> = {
  'agents.components.agents.AgentCard.teamLabel': 'Team: {{team}}',
  'agents.components.agents.AgentCard.sync': 'Sync',
  'agents.components.agents.AgentCard.run': 'Run',
}

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
      global: {
        mocks: {
          $t: (key: string, params?: Record<string, string>) => {
            if (key === 'agents.components.agents.AgentCard.teamLabel') {
              return `Team: ${params?.team ?? ''}`
            }
            return mockTranslations[key] ?? key
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Team: Software Engineering Team')
    expect(wrapper.text()).not.toContain('Sync')
    expect(wrapper.text()).toContain('Run')
  })

  it('renders combined team and application provenance for application-owned team-local agents', () => {
    const wrapper = mount(AgentCard, {
      props: {
        agentDef: buildAgentDefinition({
          id: 'team-local:bundle-team__pkg-1__brief-studio__launch-team:writer',
          ownershipScope: 'TEAM_LOCAL',
          ownerTeamId: 'bundle-team__pkg-1__brief-studio__launch-team',
          ownerTeamName: 'Launch Team',
          ownerApplicationId: 'bundle-app__pkg-1__brief-studio',
          ownerApplicationName: 'Brief Studio',
          ownerPackageId: 'built-in:applications',
        }),
      },
      global: {
        mocks: {
          $t: (key: string, params?: Record<string, string>) => {
            if (key === 'agents.components.agents.AgentCard.teamLabel') {
              return `Team: ${params?.team ?? ''}`
            }
            return mockTranslations[key] ?? key
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Team-local')
    expect(wrapper.text()).toContain('Team: Launch Team · Application: Brief Studio · built-in:applications')
    expect(wrapper.text()).not.toContain('Sync')
  })

  it('keeps shared agents visually unchanged', () => {
    const wrapper = mount(AgentCard, {
      props: {
        agentDef: buildAgentDefinition(),
      },
      global: {
        mocks: {
          $t: (key: string) => mockTranslations[key] ?? key,
        },
      },
    })

    expect(wrapper.text()).not.toContain('Team:')
    expect(wrapper.text()).toContain('Sync')
  })
})
