import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Chips from '../AgentOrgCatalogMemberChips.vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import Experience from '../AgentOrgExperience.vue'
import { useAgentOrgDefinitionStore, type AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), push: vi.fn(), route: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: io.push }) }))
const org: AgentOrgDefinition = {
  id: 'alpha', name: 'Alpha Org', description: 'Test catalog', instructions: '', revision: '1', handoffs: [],
  members: [
    { memberName: 'research_group', ref: 'agent-org-owned-team:alpha:squad', refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' },
    { memberName: 'lead_agent', ref: 'agent-org-owned-agent:alpha:guide', refType: 'AGENT', refScope: 'AGENT_ORG_OWNED' },
    { memberName: 'shared_group', ref: 'shared-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    { memberName: 'shared_worker', ref: 'shared-agent', refType: 'AGENT', refScope: 'SHARED' },
  ],
}
const names = ['Actual Research Team', 'Actual Director', 'Shared Team Name', 'Shared Agent Name']
let fetchedNames = [...names]
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(done => { resolve = done }); return { promise, resolve } }
const wrappers: ReturnType<typeof mount>[] = []
const mountList = () => { const w = mount(Experience); wrappers.push(w); return w }
beforeEach(() => {
  setActivePinia(createPinia()); vi.resetAllMocks(); fetchedNames = [...names]; io.route = reactive({ query: { view: 'org-list' } })
  useAgentOrgDefinitionStore().definitions = [structuredClone(org)]
  vi.spyOn(useAgentOrgDefinitionStore(), 'fetchAll').mockResolvedValue(undefined)
  vi.spyOn(useAgentDefinitionStore(), 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useAgentTeamDefinitionStore(), 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
  io.query.mockImplementation(async ({ query, variables }) => {
    const index = org.members.findIndex(m => m.ref === variables.id), member = org.members[index]!
    const value = { id: member.ref, name: fetchedNames[index], description: '', ownershipScope: member.refScope,
      ownerOrgId: member.refScope === 'AGENT_ORG_OWNED' ? org.id : null, coordinatorMemberName: 'worker',
      nodes: [{ memberName: 'worker', ref: 'deliberately-not-read', refScope: 'TEAM_LOCAL' }] }
    return { data: query === GetAgentOrgReferencedTeam ? { agentTeamDefinition: value } : { agentDefinition: value } }
  })
})
afterEach(async () => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks(); await localizationRuntime.setPreference('en') })

describe('ordinary Org list exact member names', () => {
  it('shows actual Agent/Team names for owned/shared refs without detail or catalog insertion and reads no Team children', async () => {
    const w = mountList(); await flushPromises()
    const chips = w.findAll('[data-test^="org-member-"]')
    expect(chips.map(c => c.text())).toEqual(names)
    expect(chips.map(c => c.attributes('aria-label'))).toEqual(['Team Actual Research Team', 'Agent Actual Director', 'Team Shared Team Name', 'Agent Shared Agent Name'])
    expect(io.query.mock.calls.map(([request]) => request.variables.id).sort()).toEqual(org.members.map(m => m.ref).sort())
    expect(io.query.mock.calls.every(([request]) => request.fetchPolicy === 'network-only')).toBe(true)
    expect(useAgentDefinitionStore().agentDefinitions).toEqual([])
    expect(useAgentTeamDefinitionStore().agentTeamDefinitions).toEqual([])
    expect(io.mutate).not.toHaveBeenCalled()
  })
  it('refreshes referenced names on explicit Reload at the same Org revision and preserves actions/search', async () => {
    const w = mountList(); await flushPromises()
    fetchedNames[0] = 'Renamed Research Team'
    fetchedNames[1] = 'Renamed Director'
    await w.findAll('button').find(b => b.text() === 'Reload')!.trigger('click'); await flushPromises()
    expect(w.findAll('[data-test^="org-member-"]').map(c => c.text())).toEqual(fetchedNames)
    expect(useAgentOrgDefinitionStore().definitions[0]!.revision).toBe('1')
    expect(io.query).toHaveBeenCalledTimes(8)
    await w.findAll('button').find(b => b.text() === 'Run')!.trigger('click')
    expect(io.push).toHaveBeenCalledWith({ path: '/workspace', query: { rootSubjectKind: 'agent_org', definitionId: 'alpha', mode: 'configuration' } })
    await w.findAll('button').find(b => b.text().includes('View Details'))!.trigger('click')
    expect(io.push).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ view: 'org-detail', id: 'alpha' }) }))
    await w.get('input').setValue('unmatched')
    expect(w.find('[data-test="org-card-alpha"]').exists()).toBe(false)
    await w.get('input').setValue('Alpha')
    await flushPromises()
    expect(w.text()).toContain('Renamed Research Team')
    expect(io.mutate).not.toHaveBeenCalled()
  })
  it('shows readable role fallback while pending and after rejection, never raw references in text or aria', async () => {
    const held = deferred(); io.query.mockReturnValue(held.promise)
    const w = mountList()
    const expected = ['research group', 'lead agent', 'shared group', 'shared worker']
    expect(w.findAll('[data-test^="org-member-"]').map(c => c.text())).toEqual(expected)
    held.resolve({ errors: [{ message: 'Unavailable' }] }); await flushPromises()
    expect(w.findAll('[data-test^="org-member-"]').map(c => c.text())).toEqual(expected)
    for (const member of org.members) {
      expect(w.text()).not.toContain(member.ref)
      expect(w.findAll('[data-test^="org-member-"]').map(c => c.attributes('aria-label')).join(' ')).not.toContain(member.ref)
    }
  })
  it.each(['id', 'scope', 'owner', 'network'])('does not borrow a label after %s validation failure', async failure => {
    const original = io.query.getMockImplementation()!
    io.query.mockImplementation(async request => {
      if (failure === 'network') throw new Error('offline')
      const response = await original(request)
      const value = response.data.agentTeamDefinition ?? response.data.agentDefinition
      if (failure === 'id') value.id = 'other'
      if (failure === 'scope') value.ownershipScope = 'TEAM_LOCAL'
      if (failure === 'owner') value.ownerOrgId = 'beta'
      return response
    })
    const w = mountList(); await flushPromises()
    expect(w.findAll('[data-test^="org-member-"]').slice(0,2).map(c => c.text())).toEqual(['research group', 'lead agent'])
    expect(io.mutate).not.toHaveBeenCalled()
  })
  it('uses localized type-only fallback for unusable member roles and supports empty cards', async () => {
    await localizationRuntime.setPreference('zh-CN')
    io.query.mockRejectedValue(new Error('offline'))
    useAgentOrgDefinitionStore().definitions[0]!.members = org.members.slice(0,2).map(m => ({ ...m, memberName: ' __-- ' }))
    const w = mountList(); await flushPromises()
    expect(w.findAll('[data-test^="org-member-"]').map(c => c.text())).toEqual(['团队', '智能体'])
    useAgentOrgDefinitionStore().definitions[0]!.members = []
    await flushPromises()
    expect(w.findAll('[data-test^="org-member-"]')).toHaveLength(0)
  })
  it.each(['revision', 'binding', 'refresh', 'remove'])('retires late names after %s changes', async change => {
    const held = deferred(); let initial = true
    const original = io.query.getMockImplementation()!
    io.query.mockImplementation(request => initial ? held.promise : original(request))
    const w = mountList(); initial = false
    fetchedNames[0] = 'Current Team'
    if (change === 'revision') useAgentOrgDefinitionStore().definitions[0]!.revision = '2'
    if (change === 'binding') useWindowNodeContextStore().bindingRevision += 1
    if (change === 'refresh') await w.findAll('button').find(b => b.text() === 'Reload')!.trigger('click')
    if (change === 'remove') useAgentOrgDefinitionStore().definitions = []
    await flushPromises()
    held.resolve({ data: { agentTeamDefinition: { id: org.members[0]!.ref, name: 'Stale Team', description: '', ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: 'alpha' } } })
    await flushPromises()
    expect(w.text()).not.toContain('Stale Team')
    if (change === 'remove') expect(w.find('[data-test="org-card-alpha"]').exists()).toBe(false)
    else expect(w.text()).toContain('Current Team')
  })
  it('isolates cards with identical member roles and rejects a removed component response', async () => {
    const beta = { ...structuredClone(org), id: 'beta', name: 'Beta Org', members: [{ ...org.members[0]!, ref: 'agent-org-owned-team:beta:squad' }] }
    useAgentOrgDefinitionStore().definitions.push(beta)
    const original = io.query.getMockImplementation()!
    io.query.mockImplementation(request => request.variables.id === beta.members[0]!.ref
      ? Promise.resolve({ data: { agentTeamDefinition: { id: beta.members[0]!.ref, name: 'Beta Team', description: '', ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: 'beta' } } }) : original(request))
    const w = mountList(); await flushPromises()
    expect(w.get('[data-test="org-card-alpha"]').text()).toContain('Actual Research Team')
    expect(w.get('[data-test="org-card-beta"]').text()).toContain('Beta Team')
    expect(w.get('[data-test="org-card-alpha"]').text()).not.toContain('Beta Team')
    const held = deferred(); io.query.mockReturnValue(held.promise)
    const isolated = mount(Chips, { props: { org: structuredClone(org), refreshKey: 0 } })
    isolated.unmount(); held.resolve({ data: {} }); await flushPromises()
    expect(io.mutate).not.toHaveBeenCalled()
  })

})
