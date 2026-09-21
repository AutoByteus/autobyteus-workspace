import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Experience from '../AgentOrgExperience.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { useAgentOrgDefinitionStore, type AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), push: vi.fn(), route: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: io.push }) }))
const org: AgentOrgDefinition = {
  id: 'alpha', name: 'Alpha Org', description: 'Test catalog', instructions: '', revision: '1', handoffs: [],
  members: [
    { memberName: 'Research_Group', ref: 'agent-org-owned-team:alpha:squad', refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' },
    { memberName: 'lead-agent', ref: 'agent-org-owned-agent:alpha:guide', refType: 'AGENT', refScope: 'AGENT_ORG_OWNED' },
    { memberName: 'shared_group', ref: 'shared-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    { memberName: 'sharedWorker', ref: 'shared-agent', refType: 'AGENT', refScope: 'SHARED' },
  ],
}
const wrappers: ReturnType<typeof mount>[] = []
const mountList = () => { const wrapper = mount(Experience); wrappers.push(wrapper); return wrapper }
beforeEach(() => {
  setActivePinia(createPinia()); vi.resetAllMocks(); io.route = reactive({ query: { view: 'org-list' } })
  useAgentOrgDefinitionStore().definitions = [structuredClone(org)]
  vi.spyOn(useAgentOrgDefinitionStore(), 'fetchAll').mockResolvedValue(undefined)
  vi.spyOn(useAgentDefinitionStore(), 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useAgentTeamDefinitionStore(), 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
})
afterEach(async () => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks(); await localizationRuntime.setPreference('en') })

describe('Agent Org catalog role labels', () => {
  it('renders stable casing-preserving member roles without any reference or catalog query', async () => {
    const wrapper = mountList()
    const expected = ['Research Group', 'lead agent', 'shared group', 'sharedWorker']
    expect(wrapper.findAll('[data-test^="org-member-"]').map(chip => chip.text())).toEqual(expected)
    expect(wrapper.findAll('[data-test^="org-member-"]').map(chip => chip.attributes('aria-label')))
      .toEqual(['Team Research Group', 'Agent lead agent', 'Team shared group', 'Agent sharedWorker'])
    await flushPromises()
    expect(io.query).not.toHaveBeenCalled()
    expect(useAgentDefinitionStore().fetchAllAgentDefinitions).not.toHaveBeenCalled()
    expect(useAgentTeamDefinitionStore().fetchAllAgentTeamDefinitions).not.toHaveBeenCalled()
    expect(io.mutate).not.toHaveBeenCalled()
  })

  it('keeps role labels stable through Reload and preserves list actions and search', async () => {
    const wrapper = mountList(); await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === 'Reload')!.trigger('click'); await flushPromises()
    expect(wrapper.findAll('[data-test^="org-member-"]').map(chip => chip.text()))
      .toEqual(['Research Group', 'lead agent', 'shared group', 'sharedWorker'])
    expect(useAgentOrgDefinitionStore().fetchAll).toHaveBeenCalledWith(true)
    expect(io.query).not.toHaveBeenCalled()
    await wrapper.findAll('button').find(button => button.text() === 'Run')!.trigger('click')
    expect(io.push).toHaveBeenCalledWith({ path: '/workspace', query: { rootSubjectKind: 'agent_org', definitionId: 'alpha', mode: 'configuration' } })
    await wrapper.findAll('button').find(button => button.text().includes('View Details'))!.trigger('click')
    expect(io.push).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ view: 'org-detail', id: 'alpha' }) }))
    await wrapper.get('input').setValue('unmatched')
    expect(wrapper.find('[data-test="org-card-alpha"]').exists()).toBe(false)
    await wrapper.get('input').setValue('Alpha'); await flushPromises()
    expect(wrapper.text()).toContain('Research Group')
  })

  it('updates only when refreshed membership changes and never exposes refs', async () => {
    const wrapper = mountList(); await flushPromises()
    useAgentOrgDefinitionStore().definitions[0]!.members[0]!.memberName = 'Research_Director'
    await flushPromises()
    expect(wrapper.findAll('[data-test^="org-member-"]')[0]!.text()).toBe('Research Director')
    for (const member of org.members) {
      expect(wrapper.text()).not.toContain(member.ref)
      expect(wrapper.findAll('[data-test^="org-member-"]').map(chip => chip.attributes('aria-label')).join(' ')).not.toContain(member.ref)
    }
    expect(io.query).not.toHaveBeenCalled()
  })

  it('uses localized type-only fallback for unusable roles and supports empty cards', async () => {
    await localizationRuntime.setPreference('zh-CN')
    useAgentOrgDefinitionStore().definitions[0]!.members = org.members.slice(0, 2).map(member => ({ ...member, memberName: ' __-- ' }))
    const wrapper = mountList(); await flushPromises()
    expect(wrapper.findAll('[data-test^="org-member-"]').map(chip => chip.text())).toEqual(['团队', '智能体'])
    useAgentOrgDefinitionStore().definitions[0]!.members = []; await flushPromises()
    expect(wrapper.findAll('[data-test^="org-member-"]')).toHaveLength(0)
    expect(io.query).not.toHaveBeenCalled()
  })
})
