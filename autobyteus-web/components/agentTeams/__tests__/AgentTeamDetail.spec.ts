import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import AgentTeamDetail from '../AgentTeamDetail.vue'

enableAutoUnmount(afterEach)

const { team, teamStore, agentStore, prepareTeamRun } = vi.hoisted(() => {
  const team = {
    id: 'team-1',
    name: 'Software Engineering',
    description: 'Build and review the product.',
    instructions: 'Coordinate delivery.',
    category: 'engineering',
    revision: 'rev-1',
    coordinatorMemberName: 'architecture_designer',
    ownershipScope: 'SHARED',
    nodes: [
      { memberName: 'architecture_designer', ref: 'agent-architecture', refScope: 'SHARED' },
      { memberName: 'implementation_engineer', ref: 'implementer', refScope: 'TEAM_LOCAL' },
    ],
    handoffs: [
      { from: '/architecture_designer', to: '/implementation_engineer', rules: ['The design is approved.', 'Implementation can begin.'] },
    ],
  }
  return {
    team,
    teamStore: {
      getCatalogAgentTeamDefinitionById: vi.fn((id: string) => id === 'team-1' ? team : null),
      fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
      deleteAgentTeamDefinition: vi.fn().mockResolvedValue(true),
    },
    agentStore: {
      getAgentDefinitionById: vi.fn((id: string) => ({
        id,
        name: id === 'agent-architecture' ? 'Architecture Designer' : id === 'team-local-agent:team-1:implementer' ? 'Implementation Engineer' : id,
      })),
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    },
    prepareTeamRun: vi.fn(),
  }
})

vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => teamStore }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentStore }))
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => ({ runTeam: prepareTeamRun }) }))

const translations: Record<string, string> = {
  'agentTeams.components.agentTeams.AgentTeamDetail.back_to_agent_teams': 'Back to Agent Teams',
  'agentTeams.components.agentTeams.AgentTeamDetail.backToAgentOrgs': 'Back to Agent Orgs',
  'agentTeams.components.agentTeams.AgentTeamDetail.loading_agent_team_details': 'Loading',
  'agentTeams.components.agentTeams.AgentTeamDetail.agent_team_not_found': 'Agent Team not found',
  'agentTeams.components.agentTeams.AgentTeamDetail.uncategorized': 'Uncategorized',
  'agentTeams.components.agentTeams.AgentTeamDetail.run': 'Run',
  'agentTeams.components.agentTeams.AgentTeamDetail.edit': 'Edit',
  'agentTeams.components.agentTeams.AgentTeamDetail.delete': 'Delete',
  'agentTeams.components.agentTeams.AgentTeamDetail.descriptionHeading': 'Description',
  'agentTeams.components.agentTeams.AgentTeamDetail.badgeCoordinator': 'Coordinator',
  'agentTeams.components.agentTeams.AgentTeamDetail.viewAgentAction': 'View ↗',
  'agentTeams.components.agentTeams.AgentTeamDetail.deleteItemType': 'Agent Team',
  'agentTeams.components.agentTeams.AgentTeamDetail.delete_agent_team_definition': 'Delete Agent Team',
  'agentTeams.components.agentTeams.AgentTeamDetail.delete_definition': 'Delete definition',
}

const mountDetail = async (returnToOrgId?: string, teamDefinitionId = 'team-1') => {
  const wrapper = mount(AgentTeamDetail, {
    props: { teamDefinitionId, returnToOrgId },
    global: {
      mocks: {
        $t: (key: string, params?: { count?: number }) => key.includes('membersHeading') ? `Members (${params?.count ?? 0})` : translations[key] ?? key,
      },
      stubs: {
        AgentDeleteConfirmDialog: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('AgentTeamDetail flat Team experience', () => {
  beforeEach(() => vi.clearAllMocks())

  it('places Members directly after Description and before the instruction and handoff cards', async () => {
    const wrapper = await mountDetail()

    expect(wrapper.findAll('section').map((section) => section.get('h2').text())).toEqual([
      'Description', 'Members (2)', 'Instructions', 'Handoffs',
    ])
    expect(wrapper.get('[data-test="instruction-viewport"]').text()).toBe(team.instructions)
    const members = wrapper.findAll('section')[1]
    const cards = members.findAll('article')
    expect(cards).toHaveLength(team.nodes.length)
    expect(cards[0].text()).toContain('architecture_designer')
    expect(cards[0].text()).toContain('Coordinator')
    expect(cards[1].text()).toContain('implementation_engineer')
    expect(cards[1].text()).not.toContain('Coordinator')
    expect(members.get('.grid').classes()).toContain('lg:grid-cols-2')
  })

  it('uses the same order for another Team while preserving ownership-conditioned actions', async () => {
    teamStore.getCatalogAgentTeamDefinitionById.mockReturnValueOnce({
      ...team, id: 'research-team', name: 'Research Team', ownershipScope: 'APPLICATION_OWNED',
    })
    const wrapper = await mountDetail(undefined, 'research-team')

    expect(wrapper.get('h1').text()).toBe('Research Team')
    expect(wrapper.findAll('section').map((section) => section.get('h2').text())).toEqual([
      'Description', 'Members (2)', 'Instructions', 'Handoffs',
    ])
    expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('Delete')
    expect(wrapper.findAll('[data-test="agent-member-view"]')).toHaveLength(2)
  })

  it('keeps loaded sections out of loading and not-found states', async () => {
    let finishLoading!: () => void
    teamStore.fetchAllAgentTeamDefinitions.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishLoading = resolve
    }))
    const loading = await mountDetail()
    expect(loading.text()).toContain('Loading')
    expect(loading.findAll('section')).toHaveLength(0)
    finishLoading()
    await flushPromises()
    expect(loading.findAll('section')).toHaveLength(4)

    const missing = await mountDetail(undefined, 'missing-team')
    expect(missing.text()).toContain('Agent Team not found')
    expect(missing.findAll('section')).toHaveLength(0)
  })

  it('preserves shared member identity and Team return context', async () => {
    const wrapper = await mountDetail()
    await wrapper.findAll('[data-test="agent-member-view"]')[0].trigger('click')

    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({
      target: 'agents', view: 'detail', id: 'agent-architecture', returnToTeam: 'team-1',
    })
  })

  it('preserves Back, Edit and confirmed Delete actions', async () => {
    const wrapper = await mountDetail()
    const button = (label: string) => wrapper.findAll('button').find((item) => item.text().includes(label))!
    await button('Back to Agent Teams').trigger('click')
    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ view: 'team-list' })
    await button('Edit').trigger('click')
    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ view: 'team-edit', id: team.id })
    await button('Delete').trigger('click')
    const dialog = wrapper.getComponent({ name: 'AgentDeleteConfirmDialog' })
    expect(dialog.props('show')).toBe(true)
    expect(teamStore.deleteAgentTeamDefinition).not.toHaveBeenCalled()
    dialog.vm.$emit('cancel')
    await flushPromises()
    expect(dialog.props('show')).toBe(false)
    await button('Delete').trigger('click')
    dialog.vm.$emit('confirm')
    await flushPromises()
    expect(teamStore.deleteAgentTeamDefinition).toHaveBeenCalledWith(team.id)
    expect(dialog.props('show')).toBe(false)
    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ view: 'team-list' })
  })

  it('renders only direct Agent members, the exact coordinator, and ordered handoffs', async () => {
    const wrapper = await mountDetail()
    const handoffCard = wrapper.get('[data-test^="handoff-card-"]')

    expect(wrapper.text()).toContain('Software Engineering')
    expect(wrapper.text()).toContain('Architecture Designer')
    expect(wrapper.text()).toContain('Implementation Engineer')
    expect(wrapper.text()).toContain('Coordinator')
    expect(handoffCard.text()).toContain('architecture_designer')
    expect(handoffCard.text()).toContain('implementation_engineer')
    expect(handoffCard.text()).not.toContain('/architecture_designer')
    expect(handoffCard.text()).not.toContain('/implementation_engineer')
    expect(wrapper.text()).toContain('The design is approved.')
    expect(wrapper.text().indexOf('The design is approved.')).toBeLessThan(wrapper.text().indexOf('Implementation can begin.'))
    expect(wrapper.text()).not.toContain('Nested Team')
    expect(wrapper.findAll('[data-test="agent-member-view"]')).toHaveLength(2)
  })

  it('routes a Team-local Agent through its canonical definition identity', async () => {
    const wrapper = await mountDetail()
    await wrapper.findAll('[data-test="agent-member-view"]')[1].trigger('click')

    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({
      target: 'agents',
      view: 'detail',
      id: 'team-local-agent:team-1:implementer',
      returnToTeam: 'team-1',
    })
  })

  it('Run opens New chat for the Team through the single start intent (REQ-005)', async () => {
    const wrapper = await mountDetail()
    await wrapper.findAll('button').find((button) => button.text() === 'Run')!.trigger('click')

    expect(prepareTeamRun).toHaveBeenCalledWith(team.id)
  })

  it('returns to the owning Agent Org detail without inferring a parent Team', async () => {
    const wrapper = await mountDetail('org-1')
    expect(wrapper.findAll('button')[0].text()).toContain('Back to Agent Orgs')
    await wrapper.findAll('button')[0].trigger('click')

    expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ target: 'agent-orgs', view: 'org-detail', id: 'org-1' })
  })
})
