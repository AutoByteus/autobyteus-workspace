import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AgentOrgExperience from '../AgentOrgExperience.vue'
import AgentTeamDetail from '~/components/agentTeams/AgentTeamDetail.vue'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'

const io = vi.hoisted(() => ({ client: null as any, route: null as any, push: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: io.push }) }))
vi.mock('~/composables/useRunActions', () => ({ useRunActions: () => ({ prepareTeamRun: vi.fn() }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }),
}))

const makeAgent = (id: string, name: string, ownershipScope = 'SHARED', extra = {}) => ({
  __typename: 'AgentDefinition', id, name, description: `${name} description`, role: null, instructions: 'Agent instructions',
  category: null, avatarUrl: null, toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [],
  toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [],
  ownershipScope, ownerOrgId: null, ownerOrgName: null, ownerTeamId: null, ownerTeamName: null,
  ownerApplicationId: null, ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null,
  defaultLaunchConfig: null, ...extra,
})
const original = () => ({
  __typename: 'AgentOrgDefinition', id: 'owned-org', name: 'Owned organization', description: 'Original description',
  revision: 'org-rev-1', instructions: 'Hidden instructions', category: 'keep', avatarUrl: 'https://example.test/org.png',
  defaultLaunchConfig: { __typename: 'DefaultLaunchConfig', llmModelIdentifier: 'model', runtimeKind: 'autobyteus', llmConfig: { temperature: 0.3 } },
  members: [
    { __typename: 'AgentOrgMember', memberName: 'direct', ref: 'owned-direct', refType: 'AGENT', refScope: 'AGENT_ORG_OWNED' },
    { __typename: 'AgentOrgMember', memberName: 'team', ref: 'owned-team', refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' },
  ],
  handoffs: [
    { __typename: 'AgentOrgHandoff', from: '/direct', to: '/team', rules: ['First condition', 'Second condition'] },
    { __typename: 'AgentOrgHandoff', from: '/team/worker', to: '/direct', rules: ['Return condition'] },
  ],
})
const makeTeam = () => ({
  __typename: 'AgentTeamDefinition', id: 'owned-team', name: 'Local research', description: 'Exact local Team',
  instructions: 'Keep Team instructions', category: null, avatarUrl: null, revision: 'team-rev-1', handoffs: [],
  ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: 'owned-org', ownerOrgName: 'Owned organization',
  ownerTeamId: null, ownerTeamName: null, ownerApplicationId: null, ownerApplicationName: null,
  ownerPackageId: null, ownerLocalApplicationId: null, defaultLaunchConfig: null, coordinatorMemberName: 'lead',
  nodes: [
    { __typename: 'TeamMember', memberName: 'lead', ref: 'owned-lead', refScope: 'TEAM_LOCAL' },
    { __typename: 'TeamMember', memberName: 'worker', ref: 'shared-worker', refScope: 'SHARED' },
  ],
})

describe('cold Org-owned authoring through real stores and Apollo', () => {
  let wrapper: VueWrapper | undefined
  let org = original()
  let otherOrgs: ReturnType<typeof original>[] = []
  let team: ReturnType<typeof makeTeam> | null
  let direct: ReturnType<typeof makeAgent> | null
  let exactError = false
  let calls: Array<{ field: string; variables: any }>
  let heldTeamRead: (() => void) | null
  let holdTeam: boolean
  let holdCatalog: boolean
  let heldCatalog: (() => void) | null
  beforeEach(() => {
    setActivePinia(createPinia()); org = original(); otherOrgs = []; team = makeTeam()
    io.route = reactive({ query: {} }); io.push.mockImplementation(async ({ query }) => { io.route.query = query })
    direct = makeAgent('owned-direct', 'Local direct', 'AGENT_ORG_OWNED', { ownerOrgId: org.id })
    calls = []; heldTeamRead = null; holdTeam = false; exactError = false; holdCatalog = false; heldCatalog = null
    io.client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
      const field = (operation.query.definitions.find((d: any) => d.kind === 'OperationDefinition') as any).selectionSet.selections[0].name.value
      calls.push({ field, variables: structuredClone(operation.variables) })
      const complete = () => {
        if (exactError && field === 'agentTeamDefinition') { observer.error(new Error('Exact read unavailable')); return }
        let value: any
        if (field === 'agentOrgDefinitions') value = [org, ...otherOrgs]
        else if (field === 'agentTeamDefinitions') value = [{ ...makeTeam(), id: 'same-name-shared-team', ownershipScope: 'SHARED', ownerOrgId: null }]
        else if (field === 'agentDefinitions') value = [makeAgent('shared-worker', 'Worker'), makeAgent('same-name-shared-agent', 'Local direct')]
        else if (field === 'agentTeamDefinition') value = team
        else if (field === 'agentDefinition') value = operation.variables.id === 'owned-direct' ? direct
          : operation.variables.id === 'team-local-agent:owned-team:owned-lead' ? makeAgent('team-local-agent:owned-team:owned-lead', 'Exact coordinator', 'TEAM_LOCAL', { ownerTeamId: 'owned-team' }) : null
        else if (field === 'updateAgentOrgDefinition') {
          const { id, expectedRevision, ...input } = operation.variables.input
          expect(id).toBe(org.id); expect(expectedRevision).toBe(org.revision)
          expect(Object.keys(input).sort()).toEqual(['description', 'handoffs', 'members', 'name'])
          input.members.forEach((m: any) => expect(Object.keys(m).sort()).toEqual(['memberName', 'ref', 'refScope', 'refType']))
          org = { ...org, ...input, revision: `org-rev-${Number(org.revision.slice(-1)) + 1}` }; value = org
        } else throw new Error(`Unexpected I/O: ${field}`)
        observer.next({ data: { [field]: structuredClone(value) } }); observer.complete()
      }
      if (holdCatalog && field === 'agentTeamDefinitions') heldCatalog = complete
      else if (holdTeam && field === 'agentTeamDefinition') heldTeamRead = complete
      else complete()
    })) })
  })
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; io.client.stop() })
  const open = async (view = 'org-detail') => {
    io.route.query = { view, id: org.id }
    wrapper = mount(AgentOrgExperience); await flushPromises()
    return { push: io.push }
  }
  const mutations = () => calls.filter(c => c.field === 'updateAgentOrgDefinition')

  it('resolves exact owned detail/coordinator and saves/reopens without adding owned definitions to shared catalogs', async () => {
    const before = structuredClone(org); const router = await open('org-list')
    await wrapper!.findAll('button').find(b => b.text().includes('View Details'))!.trigger('click'); await flushPromises()
    expect(wrapper!.text()).toContain('Coordinator: Exact coordinator')
    expect(wrapper!.text()).toContain('Local direct'); expect(wrapper!.text()).toContain('Local research')
    expect(wrapper!.text()).not.toContain('Unavailable')
    await wrapper!.findAll('button').find(b => b.text() === 'Edit')!.trigger('click'); await flushPromises()
    await wrapper!.get('textarea').setValue('Description-only edit')
    await wrapper!.get('form').trigger('submit'); await flushPromises()
    expect(mutations()).toHaveLength(1)
    expect(org.members).toEqual(before.members.map(({ __typename, ...m }) => m))
    expect(org.handoffs).toEqual(before.handoffs.map(({ __typename, ...h }) => h))
    expect(org).toMatchObject({ instructions: before.instructions, category: before.category, avatarUrl: before.avatarUrl, defaultLaunchConfig: before.defaultLaunchConfig, revision: 'org-rev-2' })
    expect(useAgentOrgDefinitionStore().byId(org.id)?.description).toBe('Description-only edit')
    expect(useAgentTeamDefinitionStore().agentTeamDefinitions.map(t => t.id)).toEqual(['same-name-shared-team'])
    expect(useAgentDefinitionStore().sharedAgentDefinitions.map(a => a.id)).not.toContain('owned-direct')
    await wrapper!.get('[data-test="open-member-picker"]').trigger('click')
    await wrapper!.findAll('[role="tab"]')[1]!.trigger('click')
    expect(wrapper!.get('[data-test="member-picker-teams"]').findAll('li')).toHaveLength(1)
    await router.push({ path: '/agent-orgs', query: { view: 'org-detail', id: org.id } }); await flushPromises()
    expect(wrapper!.text()).toContain('Description-only edit'); expect(wrapper!.text()).not.toContain('Unavailable')
    wrapper!.unmount(); wrapper = undefined; await io.client.clearStore(); setActivePinia(createPinia()); await open('org-edit')
    expect((wrapper!.get('textarea').element as HTMLTextAreaElement).value).toBe('Description-only edit')
    await wrapper!.get('form').trigger('submit'); await flushPromises()
    expect(mutations()[1]!.variables.input.expectedRevision).toBe('org-rev-2')
    expect(org.members).toEqual(before.members.map(({ __typename, ...m }) => m))
  })

  it('opens the same mounted Team detail and all member names without publishing it to the shared list', async () => {
    await open()
    await wrapper!.findAll('button').find(b => b.text().startsWith('View ↗'))!.trigger('click')
    expect(io.push).toHaveBeenLastCalledWith({ path: '/agent-teams', query: { view: 'team-detail', id: 'owned-team', returnToOrg: 'owned-org' } })
    wrapper!.unmount()
    wrapper = mount(AgentTeamDetail, { props: { teamDefinitionId: 'owned-team', returnToOrgId: 'owned-org' } })
    await flushPromises()
    expect(wrapper.text()).toContain('Local research')
    expect(wrapper.text()).toContain('Exact coordinator')
    expect(wrapper.text()).toContain('Worker')
    expect(wrapper.text()).not.toContain('not found')
    expect(useAgentTeamDefinitionStore().getCatalogAgentTeamDefinitionById('owned-team')).toBeNull()
    expect(mutations()).toHaveLength(0)
  })

  it('does not inspect a Team through an unrelated Org return scope', async () => {
    await open(); wrapper!.unmount()
    wrapper = mount(AgentTeamDetail, { props: { teamDefinitionId: 'owned-team', returnToOrgId: 'wrong-org' } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Local research')
    expect(wrapper.text()).toContain('not found')
    expect(mutations()).toHaveLength(0)
  })

  it.each(['missing-team', 'wrong-team-id', 'wrong-org-owner', 'wrong-scope', 'missing-direct', 'invalid-coordinator', 'exact-read-error'])(
    'rejects %s without mutation, member/rule removal or same-name substitution', async (failure) => {
      if (failure === 'exact-read-error') exactError = true
      if (failure === 'missing-team') team = null
      if (failure === 'wrong-team-id') team!.id = 'same-name-shared-team'
      if (failure === 'wrong-org-owner') team!.ownerOrgId = 'other-org'
      if (failure === 'wrong-scope') team!.ownershipScope = 'SHARED'
      if (failure === 'missing-direct') direct = null
      if (failure === 'invalid-coordinator') team!.coordinatorMemberName = 'missing'
      const before = structuredClone(org); await open('org-edit')
      await wrapper!.get('textarea').setValue('Attempted edit')
      await wrapper!.get('form').trigger('submit'); await flushPromises()
      expect(mutations()).toHaveLength(0); expect(org).toEqual(before)
      expect(wrapper!.find('[role="alert"]').exists()).toBe(true)
    },
  )

  it('retains an open handoff draft while adding a member reloads exact references', async () => {
    await open('org-edit')
    await wrapper!.get('[data-test="add-handoff"]').trigger('click')
    await wrapper!.get('[data-test="handoff-from"]').setValue('/direct')
    await wrapper!.get('[data-test="handoff-to"]').setValue('/team/worker')
    await wrapper!.get('[data-test="when-condition-0"]').setValue('Unapplied handoff draft')
    holdTeam = true
    await wrapper!.get('[data-test="open-member-picker"]').trigger('click')
    await wrapper!.get('button[aria-label="Add Worker"]').trigger('click'); await flushPromises()
    expect(wrapper!.get('[data-test="handoff-editor"]').exists()).toBe(true)
    holdTeam = false; heldTeamRead!(); await flushPromises()
    expect((wrapper!.get('[data-test="when-condition-0"]').element as HTMLTextAreaElement).value).toBe('Unapplied handoff draft')
    expect((wrapper!.get('[data-test="handoff-to"]').element as HTMLSelectElement).value).toBe('/team/worker')
    expect(mutations()).toHaveLength(0)
  })

  it('retires pending reference publication when navigation leaves the owning Org', async () => {
    holdTeam = true; const router = await open('org-edit')
    const release = heldTeamRead!
    await router.push({ query: { view: 'org-create' } }); await flushPromises()
    await wrapper!.get('textarea').setValue('A different new Org draft')
    holdTeam = false; release(); await flushPromises()
    expect(wrapper!.text()).not.toContain('Exact coordinator')
    expect(wrapper!.text()).not.toContain('Local research')
    expect((wrapper!.get('textarea').element as HTMLTextAreaElement).value).toBe('A different new Org draft')
    expect(mutations()).toHaveLength(0)
  })

  it('hydrates from the Org read without waiting for the unrelated shared Team list or overwriting edits afterward', async () => {
    holdCatalog = true; await open('org-edit')
    expect((wrapper!.get('form input:not([type=file])').element as HTMLInputElement).value).toBe('Owned organization')
    expect(wrapper!.text()).toContain('Coordinator: Exact coordinator')
    await wrapper!.get('textarea').setValue('Draft before catalog completion')
    holdCatalog = false; heldCatalog!(); await flushPromises()
    expect((wrapper!.get('textarea').element as HTMLTextAreaElement).value).toBe('Draft before catalog completion')
    await wrapper!.get('form').trigger('submit'); await flushPromises()
    expect(mutations()).toHaveLength(1)
    expect(org.description).toBe('Draft before catalog completion')
  })

  it('keeps another Org edit scope intact when the previous exact read completes', async () => {
    otherOrgs = [{ ...original(), id: 'other-org', name: 'Other organization', members: [{ __typename: 'AgentOrgMember', memberName: 'worker', ref: 'shared-worker', refType: 'AGENT', refScope: 'SHARED' }], handoffs: [] }]
    holdTeam = true; const router = await open('org-edit')
    const release = heldTeamRead!
    await router.push({ query: { view: 'org-edit', id: 'other-org' } }); await flushPromises()
    await wrapper!.get('textarea').setValue('Other Org draft')
    holdTeam = false; release(); await flushPromises()
    expect(wrapper!.text()).toContain('Other organization')
    expect(wrapper!.text()).not.toContain('Exact coordinator')
    expect(wrapper!.find('[role="alert"]').exists()).toBe(false)
    expect((wrapper!.get('textarea').element as HTMLTextAreaElement).value).toBe('Other Org draft')
    expect(mutations()).toHaveLength(0)
  })

  it('does not invalidate handoffs while exact reads are pending or overwrite description edits when they finish', async () => {
    holdTeam = true; await open('org-edit')
    expect(calls.some(c => c.field === 'agentTeamDefinition')).toBe(true)
    expect((wrapper!.get('[data-test="handoff-manager-org"]').element.parentElement as HTMLElement).style.display).toBe('none')
    await wrapper!.get('textarea').setValue('Edited while loading')
    await wrapper!.get('form').trigger('submit'); expect(mutations()).toHaveLength(0)
    holdTeam = false; heldTeamRead!(); await flushPromises()
    expect((wrapper!.get('textarea').element as HTMLTextAreaElement).value).toBe('Edited while loading')
    await wrapper!.get('form').trigger('submit'); await flushPromises()
    expect(mutations()).toHaveLength(1); expect(org.description).toBe('Edited while loading')
  })
})
