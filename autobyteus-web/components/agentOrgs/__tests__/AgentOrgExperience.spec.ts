import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentOrgExperience from '../AgentOrgExperience.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const { route, push, org, orgStore, agentStore, teamStore } = vi.hoisted(() => {
  const agents = [
    { id: 'requirements-agent', name: 'Requirements Engineer', description: 'Owns requirements.' },
    { id: 'architecture-agent', name: 'Architecture Designer', description: 'Owns architecture.' },
    { id: 'implementation-agent', name: 'Implementation Engineer', description: 'Owns implementation.' },
  ]
  const team = {
    id: 'software-team', name: 'Software Engineering', description: 'Builds the product.',
    coordinatorMemberName: 'architecture_designer', ownershipScope: 'SHARED',
    nodes: [
      { memberName: 'architecture_designer', ref: 'architecture-agent', refScope: 'SHARED' },
      { memberName: 'implementation_engineer', ref: 'implementation-agent', refScope: 'SHARED' },
    ],
  }
  const org = {
    id: 'software-org', name: 'Software Development Department', description: 'One complete delivery organization.',
    instructions: 'Coordinate the complete approved delivery lifecycle.',
    revision: 'org-rev-7',
    category: 'software-delivery',
    avatarUrl: 'https://example.test/software-org.png',
    defaultLaunchConfig: {
      llmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'autobyteus',
      llmConfig: { reasoning_effort: 'high' },
    },
    members: [
      { memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'software_engineering', ref: 'software-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ],
    handoffs: [{ from: '/requirements_engineer', to: '/software_engineering', rules: ['Requirements are approved.', 'Architecture may begin.'] }],
  }
  return {
    route: { query: { view: 'org-list' } as Record<string, string> },
    push: vi.fn().mockResolvedValue(undefined),
    org,
    orgStore: {
      definitions: [org], loading: false, error: null,
      byId: vi.fn((id: string) => id === org.id ? org : null),
      fetchAll: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(org),
      update: vi.fn().mockResolvedValue(org),
    },
    agentStore: {
      agentDefinitions: agents, sharedAgentDefinitions: agents,
      getAgentDefinitionById: vi.fn((id: string) => agents.find((agent) => agent.id === id)),
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    },
    teamStore: {
      rootAgentTeamDefinitions: [team], sharedAgentTeamDefinitions: [team],
      getCatalogAgentTeamDefinitionById: vi.fn((id: string) => id === team.id ? team : null),
      fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async () => ({ data: { agentOrgEndpointCatalog: {
  from: [
    { kind: 'agent', address: '/requirements_engineer', memberName: 'requirements_engineer', definitionId: 'requirements-agent', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/software_engineering/architecture_designer', memberName: 'architecture_designer', definitionId: 'architecture-agent', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/software_engineering/implementation_engineer', memberName: 'implementation_engineer', definitionId: 'implementation-agent', coordinatorAddress: null, coordinatorMemberName: null },
  ],
  to: [
    { kind: 'agent', address: '/requirements_engineer', memberName: 'requirements_engineer', definitionId: 'requirements-agent', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/software_engineering/architecture_designer', memberName: 'architecture_designer', definitionId: 'architecture-agent', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent', address: '/software_engineering/implementation_engineer', memberName: 'implementation_engineer', definitionId: 'implementation-agent', coordinatorAddress: null, coordinatorMemberName: null },
    { kind: 'agent_team', address: '/software_engineering', memberName: 'software_engineering', definitionId: 'software-team', coordinatorAddress: '/software_engineering/architecture_designer', coordinatorMemberName: 'architecture_designer' },
  ],
} } }) }) }))

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push }) }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => orgStore }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentStore }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => teamStore }))

const mountExperience = async (view: string, id?: string) => {
  route.query = { view, ...(id ? { id } : {}) }
  const wrapper = mount(AgentOrgExperience)
  await flushPromises()
  return wrapper
}

describe('AgentOrgExperience', () => {
  beforeEach(() => { vi.clearAllMocks(); setActivePinia(createPinia()) })

  it('renders the baseline-native catalog with Run, member chips, and no fabricated run facts', async () => {
    const wrapper = await mountExperience('org-list')

    expect(wrapper.text()).toContain('Featured organizations')
    expect(wrapper.text()).toContain('Software Development Department')
    expect(wrapper.text()).toContain('requirements engineer')
    expect(wrapper.text()).toContain('software engineering')
    expect(wrapper.text()).toContain('Run')
    expect(wrapper.text()).not.toContain('Last run')
    expect(wrapper.text()).not.toContain('No coordinator')
  })

  it('uses an in-flow Agent/Team member chooser and exposes the Team coordinator', async () => {
    const wrapper = await mountExperience('org-create')
    await wrapper.get('[data-test="open-member-picker"]').trigger('click')

    expect(wrapper.find('[data-test="org-member-picker"]').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.get('[data-test="member-picker-teams"]').text()).toContain('Software Engineering')
    expect(wrapper.get('[data-test="member-picker-teams"]').text()).toContain('Architecture Designer')
  })

  it('shows same-identity Teams, their coordinator, and ordered From/To/When detail', async () => {
    const wrapper = await mountExperience('org-detail', org.id)

    expect(wrapper.text()).toContain('Coordinator: architecture designer')
    expect(wrapper.text()).toContain('/requirements_engineer')
    expect(wrapper.text()).toContain('/software_engineering')
    expect(wrapper.text().indexOf('Requirements are approved.')).toBeLessThan(wrapper.text().indexOf('Architecture may begin.'))
    expect(wrapper.text()).not.toContain('Handoff 1')
  })

  it('saves a visible edit while preserving hidden durable fields and rule order by omission', async () => {
    const wrapper = await mountExperience('org-edit', org.id)
    await wrapper.get('textarea').setValue('Updated visible description.')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(orgStore.update).toHaveBeenCalledWith(
      org.id,
      'org-rev-7',
      expect.objectContaining({
        description: 'Updated visible description.',
        members: org.members,
        handoffs: [{ from: '/requirements_engineer', to: '/software_engineering', rules: ['Requirements are approved.', 'Architecture may begin.'] }],
      }),
    )
    const update = orgStore.update.mock.calls[0]?.[2]
    expect(update).not.toHaveProperty('instructions')
    expect(update).not.toHaveProperty('category')
    expect(update).not.toHaveProperty('avatarUrl')
    expect(update).not.toHaveProperty('defaultLaunchConfig')
    expect(org).toMatchObject({
      instructions: 'Coordinate the complete approved delivery lifecycle.',
      category: 'software-delivery',
      avatarUrl: 'https://example.test/software-org.png',
      defaultLaunchConfig: {
        llmModelIdentifier: 'gpt-5.4',
        runtimeKind: 'autobyteus',
        llmConfig: { reasoning_effort: 'high' },
      },
    })
    expect(wrapper.text()).toContain('Agent Org saved.')
  })

  it('renders list, detail, create, and edit presentation through the Simplified Chinese catalog', async () => {
    await localizationRuntime.setPreference('zh-CN')
    try {
      const list = await mountExperience('org-list')
      expect(list.text()).toContain('精选智能体组织')
      expect(list.text()).toContain('运行')

      const detail = await mountExperience('org-detail', org.id)
      expect(detail.text()).toContain('返回智能体组织')
      expect(detail.text()).toContain('协调员：architecture designer')
      expect(detail.text()).toContain('交接规则')
      expect(detail.text()).toContain('来源')
      expect(detail.text()).toContain('目标')
      expect(detail.text()).toContain('Requirements are approved.')

      const create = await mountExperience('org-create')
      expect(create.text()).toContain('创建智能体组织')
      expect(create.text()).toContain('添加成员')
      expect(create.text()).toContain('添加交接规则')
      expect(create.text()).toContain('尚无交接规则')

      const edit = await mountExperience('org-edit', org.id)
      expect(edit.text()).toContain('编辑 Software Development Department')
      expect(edit.text()).toContain('保存更改')
      expect(edit.text()).toContain('交接规则')
      expect(edit.text()).toContain('编辑')
      expect(edit.text()).toContain('删除')
    } finally {
      await localizationRuntime.setPreference('en')
    }
  })
})
