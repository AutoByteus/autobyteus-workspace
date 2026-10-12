import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DefinitionLoadIssueBadge from '../DefinitionLoadIssueBadge.vue'
import type { DefinitionLoadIssueEntry } from '~/types/agentPackageDefinitions'

const issue = (overrides: Partial<DefinitionLoadIssueEntry> = {}): DefinitionLoadIssueEntry => ({
  kind: 'AGENT',
  definitionId: 'writer',
  name: 'Writer',
  code: 'DEFINITION_CONTRACT_INVALID',
  reason: 'Invalid JSON: Unexpected end of JSON input',
  definitionPath: '/packages/agents/writer/agent-config.json',
  packageRoot: '/packages',
  usingLastGood: true,
  ...overrides,
})

const badge = (issues: DefinitionLoadIssueEntry[] | null) => mount(DefinitionLoadIssueBadge, { props: { issues } })
const status = (wrapper: ReturnType<typeof badge>) => wrapper.get('[data-testid="definition-load-issue-status"]').text()
const count = (wrapper: ReturnType<typeof badge>) => wrapper.get('[data-testid="definition-load-issue-count"]').text()

describe('DefinitionLoadIssueBadge', () => {
  it('renders nothing for a definition without issues', () => {
    expect(badge(null).find('[data-testid="definition-load-issue"]').exists()).toBe(false)
    expect(badge([]).find('[data-testid="definition-load-issue"]').exists()).toBe(false)
  })

  it('marks a one-item last-good list and names the definition, the file and the reason', () => {
    const wrapper = badge([issue()])
    expect(status(wrapper)).toBe('Using last working version')
    expect(count(wrapper)).toBe('(1)')
    const entries = wrapper.findAll('[data-testid="definition-load-issue-entry"]')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.text()).toContain('Writer')
    expect(entries[0]!.text()).toContain('/packages/agents/writer/agent-config.json')
    expect(entries[0]!.text()).toContain('Unexpected end of JSON input')
    expect(entries[0]!.text()).not.toContain('No working version')
  })

  it('lists every entry of a multi-item list in order, using the folder when a definition has no name', () => {
    const wrapper = badge([
      issue({ kind: 'AGENT_TEAM', definitionId: 'team', name: 'Delivery Team', definitionPath: '/packages/agent-teams/team/team-config.json' }),
      issue({ definitionId: 'team-reviewer', name: 'Reviewer', definitionPath: '/packages/agent-teams/team/agents/reviewer/agent-config.json' }),
      issue({ definitionId: 'team-tester', name: null, definitionPath: '/packages/agent-teams/team/agents/tester/agent.md' }),
    ])
    expect(status(wrapper)).toBe('Using last working version')
    expect(count(wrapper)).toBe('(3)')
    const labels = wrapper.findAll('[data-testid="definition-load-issue-entry"]').map((entry) => entry.find('p').text())
    expect(labels).toEqual(['Delivery Team', 'Reviewer', 'tester'])
  })

  it("says some members couldn't be loaded when any entry has no working version, and marks that entry", () => {
    const wrapper = badge([
      issue({ name: 'Reviewer' }),
      issue({ definitionId: 'tester', name: null, usingLastGood: false, definitionPath: '/packages/agent-teams/team/agents/tester/agent-config.json' }),
    ])
    expect(status(wrapper)).toBe("Some members couldn't be loaded")
    expect(count(wrapper)).toBe('(2)')
    const entries = wrapper.findAll('[data-testid="definition-load-issue-entry"]')
    expect(entries[0]!.text()).not.toContain('No working version')
    expect(entries[1]!.text()).toContain('tester')
    expect(entries[1]!.text()).toContain('No working version')
  })

  it('explains a missing or unreadable package folder from the root issue', () => {
    const wrapper = badge([
      issue({ code: 'DEFINITION_SOURCE_UNAVAILABLE', definitionPath: '/packages/agents/writer', reason: "The package folder '/packages' is missing" }),
    ])
    expect(status(wrapper)).toBe('Package folder unavailable')
    expect(wrapper.text()).toContain('could not be found or read')
  })
})
