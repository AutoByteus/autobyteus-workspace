import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  query: { definitionId: 'org-1' } as Record<string, string>,
  orgs: [] as any[],
  references: { agents: {}, teams: {}, unavailable: [] } as any,
  enabled: new Set(['autobyteus', 'codex_app_server']),
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: mocks.query }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => ({ switchTarget: vi.fn() }) }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({
  useAgentOrgDefinitionStore: () => ({ fetchAll: vi.fn(async () => undefined), byId: (id: string) => mocks.orgs.find((org) => org.id === id) ?? null }),
}))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => null }) }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => ({ getCatalogAgentTeamDefinitionById: () => null }) }))
vi.mock('~/services/agentOrgDefinition/agentOrgDefinitionReferences', () => ({ loadAgentOrgDefinitionReferences: async () => mocks.references }))
vi.mock('~/services/agentOrgExecution/agentOrgRunInspection', () => ({ readAgentOrgRunInspection: vi.fn() }))
vi.mock('~/services/agentOrgExecution/agentOrgLaunchService', () => ({ agentOrgLaunchService: { launch: vi.fn() } }))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: vi.fn(async () => undefined),
    models: (runtimeKind: string) => (runtimeKind === 'codex_app_server' ? ['gpt-codex'] : ['first']),
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ hasFetched: true, fetchRuntimeAvailabilities: vi.fn(async () => []), isRuntimeEnabled: (kind: string) => mocks.enabled.has(kind) }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    tempWorkspaceId: 'temp', workspacesFetched: true, workspaceMetadataById: {}, workspaces: { temp: { workspaceId: 'temp', absolutePath: '/temp' } },
    findWorkspaceInfoByRootPath: () => null,
  }),
}))

import OrgLaunchPage from '../OrgLaunchPage.vue'
import { useAgentOrgLaunchDraftStore } from '~/stores/agentOrgLaunchDraftStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const org = {
  id: 'org-1', name: 'AutoByteus Org', members: [
    { memberName: 'product', ref: 'team-def', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    { memberName: 'analyst', ref: 'analyst-def', refType: 'AGENT', refScope: 'SHARED' },
  ],
  defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', llmConfig: null },
}
const references = () => ({
  agents: { 'analyst-def': { id: 'analyst-def', name: 'Analyst' } },
  teams: { 'team-def': { id: 'team-def', name: 'Product Team', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'a' }, { memberName: 'writer', ref: 'b' }] } },
  unavailable: [],
})

const mountPage = async () => {
  const wrapper = mount(OrgLaunchPage, {
    global: {
      stubs: { RunTargetSwitcher: true, RunSettingsCard: true, RunMembersLine: true, Icon: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('OrgLaunchPage readiness (DI-004, slice S2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    mocks.query = { definitionId: 'org-1' }
    mocks.orgs = [structuredClone(org)]
    mocks.references = references()
    mocks.enabled = new Set(['autobyteus', 'codex_app_server'])
  })

  it('a ready Org can run; the status line is empty', async () => {
    const page = await mountPage()
    expect(page.get('[data-test="org-launch-page"]').attributes('data-state')).toBe('ready')
    expect(page.get('[data-test="org-launch-run"]').attributes('disabled')).toBeUndefined()
    expect(page.find('[data-test="org-launch-status"]').exists()).toBe(false)
  })

  it('a blocked topology shows the unavailable copy and disables Run (as a missing Org does)', async () => {
    const unavailableCopy = localizationRuntime.translate('runSettings.orgLaunch.unavailable')
    mocks.query = { definitionId: 'missing' }
    const missing = await mountPage()
    expect(missing.get('[data-test="org-launch-page"]').attributes('data-state')).toBe('unavailable')
    expect(useAgentOrgLaunchDraftStore().readiness).toEqual({ ready: false, reason: unavailableCopy })
    missing.unmount()

    setActivePinia(createPinia())
    mocks.query = { definitionId: 'org-1' }
    mocks.references.teams['team-def'].coordinatorMemberName = 'nobody'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const page = await mountPage()
    expect(page.get('[data-test="org-launch-page"]').attributes('data-state')).toBe('blocked')
    expect(page.get('[data-test="org-launch-status"]').text()).toBe(unavailableCopy)
    expect(page.get('[data-test="org-launch-run"]').attributes('disabled')).toBeDefined()
    warn.mockRestore()
  })

  it('AC-002 order is unchanged: a member on a disabled runtime is named before a missing model', async () => {
    const page = await mountPage()
    const store = useAgentOrgLaunchDraftStore()
    store.changeMember('/analyst', { field: 'model', choice: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus' } })
    store.draft!.root.llmModelIdentifier = ''
    await flushPromises()
    expect(store.readiness).toMatchObject({ ready: false })
    expect(page.get('[data-test="org-launch-status"]').text()).toContain('Claude')
    expect(page.get('[data-test="org-launch-run"]').attributes('disabled')).toBeDefined()

    store.changeMember('/analyst', { field: 'model', choice: { runtimeKind: 'autobyteus', llmModelIdentifier: 'first' } })
    await flushPromises()
    expect(page.get('[data-test="org-launch-status"]').text()).toBe(localizationRuntime.translate('chat.launch.chooseModel'))
  })
})
