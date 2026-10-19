import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentCard from '~/components/agents/AgentCard.vue'
import AgentTeamCard from '~/components/agentTeams/AgentTeamCard.vue'
import AgentOrgCatalogCard from '~/components/agentOrgs/AgentOrgCatalogCard.vue'
import type { DefinitionLoadIssueEntry } from '~/types/agentPackageDefinitions'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'

// SR-008 / DSN-004: a nested definition's issue is shown on the card of the unit that owns it.

const issue = (overrides: Partial<DefinitionLoadIssueEntry>): DefinitionLoadIssueEntry => ({
  kind: 'AGENT',
  definitionId: 'id',
  name: null,
  code: 'DEFINITION_CONTRACT_INVALID',
  reason: 'Invalid JSON',
  definitionPath: '/packages/x/agent-config.json',
  packageRoot: '/packages',
  usingLastGood: true,
  ...overrides,
})

const entryTexts = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-testid="definition-load-issue-entry"]').map((entry) => entry.text())

describe('catalog issues on the owning card', () => {
  it('shows team-local agent issues on the Team card, after the Team itself', () => {
    const teamDef = {
      id: 'delivery', name: 'Delivery Team', description: 'Ships', instructions: '', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: 'delivery-lead', refScope: 'TEAM_LOCAL' }],
      loadIssues: [
        issue({ kind: 'AGENT', definitionId: 'delivery-lead', name: 'Lead', definitionPath: '/packages/agent-teams/delivery/agents/lead/agent-config.json' }),
        issue({ definitionId: 'delivery-tester', name: null, usingLastGood: false, definitionPath: '/packages/agent-teams/delivery/agents/tester/agent-config.json', reason: 'Missing agent.md' }),
      ],
    } as unknown as AgentTeamDefinition
    const wrapper = mount(AgentTeamCard, { props: { teamDef }, global: { mocks: { $t: (key: string) => key } } })

    const badge = wrapper.get('[data-testid="definition-load-issue"]')
    expect(badge.text()).toContain("Some members couldn't be loaded")
    expect(badge.text()).toContain('(2)')
    const entries = entryTexts(wrapper)
    expect(entries[0]).toContain('Lead')
    expect(entries[0]).toContain('/packages/agent-teams/delivery/agents/lead/agent-config.json')
    expect(entries[1]).toContain('tester')
    expect(entries[1]).toContain('Missing agent.md')
  })

  it('shows no badge on a clean Team card', () => {
    const teamDef = { id: 'clean', name: 'Clean', description: '', instructions: '', coordinatorMemberName: 'lead', nodes: [], loadIssues: [] } as unknown as AgentTeamDefinition
    const wrapper = mount(AgentTeamCard, { props: { teamDef }, global: { mocks: { $t: (key: string) => key } } })
    expect(wrapper.find('[data-testid="definition-load-issue"]').exists()).toBe(false)
  })

  it('shows org-owned agent, org-owned Team and its local agent issues on the Org card', () => {
    const org: AgentOrgDefinition = {
      id: 'org', name: 'Studio Org', description: 'Org', instructions: '', revision: 'r1', members: [], handoffs: [],
      loadIssues: [
        issue({ definitionId: 'org-writer', name: 'Writer', definitionPath: '/packages/agent-orgs/org/agents/writer/agent-config.json' }),
        issue({ kind: 'AGENT_TEAM', definitionId: 'org-review', name: 'Review Team', definitionPath: '/packages/agent-orgs/org/agent-teams/review/team-config.json' }),
        issue({ definitionId: 'org-review-checker', name: 'Checker', definitionPath: '/packages/agent-orgs/org/agent-teams/review/agents/checker/agent.md' }),
      ],
    }
    const wrapper = mount(AgentOrgCatalogCard, { props: { org }, global: { stubs: { Icon: true } } })

    const badge = wrapper.get('[data-testid="definition-load-issue"]')
    expect(badge.text()).toContain('Using last working version')
    expect(badge.text()).toContain('(3)')
    const entries = entryTexts(wrapper)
    expect(entries.map((text) => text.split('File:')[0]!.trim())).toEqual(['Writer', 'Review Team', 'Checker'])
    expect(entries[2]).toContain('/packages/agent-orgs/org/agent-teams/review/agents/checker/agent.md')
  })

  it('passes an Agent card its own issue as a one-item list', () => {
    const agentDef = {
      id: 'writer', name: 'Writer', description: 'Writes', instructions: '', toolNames: [], skillNames: [],
      inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [],
      loadIssue: { code: 'DEFINITION_CONTRACT_INVALID', reason: 'Invalid JSON', definitionPath: '/packages/agents/writer/agent-config.json', packageRoot: '/packages' },
    } as unknown as AgentDefinition
    const wrapper = mount(AgentCard, { props: { agentDef }, global: { mocks: { $t: (key: string) => key } } })

    expect(wrapper.get('[data-testid="definition-load-issue"]').text()).toContain('Using last working version')
    expect(entryTexts(wrapper)).toHaveLength(1)
    expect(entryTexts(wrapper)[0]).toContain('Writer')
  })
})
