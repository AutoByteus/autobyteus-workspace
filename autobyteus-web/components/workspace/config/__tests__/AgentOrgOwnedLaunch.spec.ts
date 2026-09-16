import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, watch, reactive, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Panel from '../AgentOrgRunConfigPanel.vue'
import { useAgentOrgDefinitionStore, type AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgRunConfigStore } from '~/stores/agentOrgRunConfigStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { GetAgentOrgReferencedAgent, GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'
import { CreateAgentOrgRun } from '~/graphql/mutations/agentOrgRunMutations'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const transport = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), replace: vi.fn(), route: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => transport }))
vi.mock('vue-router', () => ({ useRoute: () => transport.route, useRouter: () => ({ replace: transport.replace }) }))

const Fields = defineComponent({
  props: ['node', 'llmModelIdentifier'], emits: ['schema-state'],
  setup(props, { emit }) {
    watch(() => props.llmModelIdentifier, () => props.node ? emit('schema-state', props.node.address, { status: 'ready', message: null })
      : emit('schema-state', { status: 'ready', message: null }), { immediate: true })
  }, template: '<div />',
})
const Workspace = defineComponent({ template: '<div />' })
const teamId = (org: string) => `agent-org-owned-team:${org}:squad`
const directId = (org: string) => `agent-org-owned-agent:${org}:guide`
const localId = (org: string) => buildTeamLocalAgentDefinitionId(teamId(org), 'worker')
const definition = (id: string): AgentOrgDefinition => ({
  id, name: id, description: '', instructions: '', revision: '1', handoffs: [], avatarUrl: null,
  defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'model', llmConfig: null },
  members: [
    { memberName: 'group', ref: teamId(id), refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' },
    { memberName: 'guide', ref: directId(id), refType: 'AGENT', refScope: 'AGENT_ORG_OWNED' },
  ],
})
const exactResponse = ({ query, variables }: any) => {
  const id = variables.id
  const owner = id.includes('beta') ? 'beta' : 'alpha'
  if (query === GetAgentOrgReferencedTeam) return { data: { agentTeamDefinition: {
    id, name: 'Owned squad', description: '', instructions: 'Enclosing instructions',
    ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: owner, coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: 'worker', refScope: 'TEAM_LOCAL' }],
  } } }
  if (query === GetAgentOrgReferencedAgent) return { data: { agentDefinition: {
    id, name: id === directId(owner) ? 'Guide' : 'Worker', description: '',
    ownershipScope: id === directId(owner) ? 'AGENT_ORG_OWNED' : 'TEAM_LOCAL',
    ownerOrgId: id === directId(owner) ? owner : null,
    ownerTeamId: id === directId(owner) ? null : teamId(owner),
  } } }
  throw new Error('Unexpected query')
}
const deferred = () => {
  let resolve!: (value: any) => void
  const promise = new Promise<any>(done => { resolve = done })
  return { promise, resolve }
}
const wrappers: ReturnType<typeof mount>[] = []
const panel = () => {
  const wrapper = mount(Panel, { global: { stubs: {
    RuntimeModelConfigFields: Fields, WorkspaceSelector: Workspace, MemberOverrideItem: Fields, Icon: true,
  } } })
  wrappers.push(wrapper)
  return wrapper
}
const configure = () => {
  const draft = useAgentOrgRunConfigStore()
  draft.setWorkspaceSelection({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/isolated/selected' })
  draft.setRootLlmModelIdentifier('chosen-model')
  return draft
}
const disabled = (wrapper: ReturnType<typeof mount>) => wrapper.get('[data-test="run-agent-org"]').attributes('disabled') !== undefined

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  transport.route = reactive({ query: { definitionId: 'alpha' } })
  const orgs = useAgentOrgDefinitionStore()
  orgs.definitions = [definition('alpha'), definition('beta')]
  vi.spyOn(orgs, 'fetchAll').mockResolvedValue(undefined)
  vi.spyOn(useAgentDefinitionStore(), 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useAgentTeamDefinitionStore(), 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useWorkspaceStore(), 'fetchAllWorkspaces').mockResolvedValue(undefined)
  vi.spyOn(useWorkspaceStore(), 'createWorkspace').mockResolvedValue('workspace')
  vi.spyOn(useRunHistoryStore(), 'refreshTreeQuietly').mockResolvedValue(undefined)
  transport.query.mockImplementation(async request => exactResponse(request))
  transport.mutate.mockResolvedValue({ data: { createAgentOrgRun: { success: true, agentOrgRunId: 'new-org-run' } } })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await localizationRuntime.setPreference('en')
  vi.restoreAllMocks()
})

describe('selected Org launch references through real panel, stores, projector and Apollo reader', () => {
  it('direct configuration resolves exact owned Teams and Agents without prior detail/public insertion, then issues ordinary Create', async () => {
    expect(useAgentTeamDefinitionStore().getCatalogAgentTeamDefinitionById(teamId('alpha'))).toBeNull()
    expect(transport.query).not.toHaveBeenCalled()
    const wrapper = panel()
    const draft = configure()
    draft.setAgentOverride('/group/lead', { autoExecuteTools: true })
    await flushPromises()
    expect(transport.query.mock.calls.map(([request]) => request.variables.id).sort())
      .toEqual([teamId('alpha'), directId('alpha'), localId('alpha')].sort())
    expect(useAgentTeamDefinitionStore().getCatalogAgentTeamDefinitionById(teamId('alpha'))).toBeNull()
    expect(useAgentTeamDefinitionStore().agentTeamDefinitions).toEqual([])
    expect(useAgentDefinitionStore().agentDefinitions).toEqual([])
    expect(disabled(wrapper)).toBe(false)
    expect(transport.mutate).not.toHaveBeenCalled()
    await wrapper.get('[data-test="run-agent-org"]').trigger('click')
    await flushPromises()
    expect(transport.mutate).toHaveBeenCalledTimes(1)
    expect(transport.mutate).toHaveBeenCalledWith({ mutation: CreateAgentOrgRun, variables: { input: {
      agentOrgDefinitionId: 'alpha',
      rootConfiguration: { runtimeKind: 'autobyteus', llmModelIdentifier: 'chosen-model', llmConfig: null,
        autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/isolated/selected' },
      teamOverrides: [], agentOverrides: [{ address: '/group/lead', configuration: { autoExecuteTools: true } }],
    } } })
    expect(transport.replace).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ orgRunId: 'new-org-run' }) }))
  })

  it('blocks while pending without premature missing-Team error and preserves drafts without refetch on form edits', async () => {
    const pending = deferred()
    transport.query.mockImplementation(request => request.query === GetAgentOrgReferencedTeam ? pending.promise : Promise.resolve(exactResponse(request)))
    const wrapper = panel()
    const draft = configure()
    draft.setTeamOverride('/group', { autoExecuteTools: true })
    draft.setAgentOverride('/group/lead', { llmModelIdentifier: 'worker-model' })
    await nextTick()
    expect(wrapper.get('[data-test="org-config-reference-diagnostic"]').attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Loading organization members')
    expect(wrapper.find('[data-test="org-config-projection-error"]').exists()).toBe(false)
    expect(disabled(wrapper)).toBe(true)
    await wrapper.get('[data-test="run-agent-org"]').trigger('click')
    expect(transport.mutate).not.toHaveBeenCalled()
    pending.resolve(exactResponse({ query: GetAgentOrgReferencedTeam, variables: { id: teamId('alpha') } }))
    await flushPromises()
    expect(draft.llmModelIdentifier).toBe('chosen-model')
    expect(draft.workspaceSelection.newWorkspacePath).toBe('/isolated/selected')
    expect(draft.agentOverrides['/group/lead']?.llmModelIdentifier).toBe('worker-model')
    expect(draft.teamOverrides['/group']?.autoExecuteTools).toBe(true)
    const count = transport.query.mock.calls.length
    draft.setRootAutoExecuteTools(true)
    draft.setRootLlmModelIdentifier('another-model')
    await flushPromises()
    expect(transport.query).toHaveBeenCalledTimes(count)
    expect(disabled(wrapper)).toBe(false)
  })

  it.each(['missing-team', 'missing-child', 'network', 'graphql', 'wrong-id', 'wrong-scope', 'wrong-org', 'wrong-team-owner'])(
    'fails closed on %s even with a partial Team snapshot', async failure => {
      transport.query.mockImplementation(async request => {
        const response = exactResponse(request)
        const team = request.query === GetAgentOrgReferencedTeam
        const child = request.variables.id === localId('alpha')
        if (failure === 'network' && team) throw new Error('offline')
        if (failure === 'graphql' && team) return { ...response, errors: [{ message: 'unavailable' }] }
        if (failure === 'missing-team' && team) return { data: { agentTeamDefinition: null } }
        if (failure === 'missing-child' && child) return { data: { agentDefinition: null } }
        const data = response.data as any
        if (team && failure === 'wrong-id') data.agentTeamDefinition.id = teamId('beta')
        if (team && failure === 'wrong-scope') data.agentTeamDefinition.ownershipScope = 'SHARED'
        if (team && failure === 'wrong-org') data.agentTeamDefinition.ownerOrgId = 'beta'
        if (child && failure === 'wrong-team-owner') data.agentDefinition.ownerTeamId = teamId('beta')
        return response
      })
      const wrapper = panel()
      configure()
      await flushPromises()
      expect(wrapper.get('[data-test="org-config-reference-diagnostic"]').attributes('role')).toBe('alert')
      expect(wrapper.text()).toContain('Unable to load organization members:')
      expect(disabled(wrapper)).toBe(true)
      expect(transport.mutate).not.toHaveBeenCalled()
      expect(useAgentTeamDefinitionStore().agentTeamDefinitions).toEqual([])
    },
  )

  it.each(['route', 'revision', 'members', 'unmount'])('ignores a pending completion after %s invalidation', async change => {
    const old = deferred(), current = deferred()
    let calls = 0
    transport.query.mockImplementation(request => {
      if (request.query !== GetAgentOrgReferencedTeam) return Promise.resolve(exactResponse(request))
      return ++calls === 1 ? old.promise : current.promise
    })
    const wrapper = panel()
    const draft = configure()
    const orgs = useAgentOrgDefinitionStore()
    if (change === 'route') transport.route.query.definitionId = 'beta'
    else if (change === 'revision') orgs.definitions[0]!.revision = '2'
    else if (change === 'members') orgs.definitions[0]!.members[0]!.memberName = 'renamed'
    else wrapper.unmount()
    await nextTick()
    old.resolve(exactResponse({ query: GetAgentOrgReferencedTeam, variables: { id: teamId('alpha') } }))
    await flushPromises()
    expect(transport.mutate).not.toHaveBeenCalled()
    if (change === 'unmount') return
    expect(disabled(wrapper)).toBe(true)
    expect(wrapper.text()).toContain('Loading organization members')
    if (change !== 'route') {
      expect(draft.llmModelIdentifier).toBe('chosen-model')
      expect(draft.workspaceSelection.newWorkspacePath).toBe('/isolated/selected')
    }
    configure()
    current.resolve(exactResponse({ query: GetAgentOrgReferencedTeam, variables: { id: teamId(change === 'route' ? 'beta' : 'alpha') } }))
    await flushPromises()
    expect(disabled(wrapper)).toBe(false)
  })

  it('retains unknown overrides as a blocked projection instead of discarding them', async () => {
    const wrapper = panel()
    const draft = configure()
    draft.setAgentOverride('/removed', { autoExecuteTools: true })
    await flushPromises()
    expect(disabled(wrapper)).toBe(true)
    expect(wrapper.find('[data-test="org-config-projection-error"]').exists()).toBe(true)
    expect(draft.agentOverrides['/removed']).toEqual({ autoExecuteTools: true })
  })

  it('localizes loading and unavailable status in Simplified Chinese', async () => {
    await localizationRuntime.setPreference('zh-CN')
    const pending = deferred()
    transport.query.mockReturnValue(pending.promise)
    const wrapper = panel()
    expect(wrapper.text()).toContain('正在加载组织成员')
    pending.resolve({ data: {} })
    await flushPromises()
    expect(wrapper.text()).toContain('无法加载组织成员')
  })
})
