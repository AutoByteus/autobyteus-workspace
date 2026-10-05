import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  orgs: [] as any[],
  references: { agents: {}, teams: {}, unavailable: [] } as any,
  inspection: vi.fn(),
  seed: vi.fn(),
  launch: vi.fn(),
  models: { autobyteus: ['first'], codex_app_server: ['gpt-codex'] } as Record<string, string[]>,
  enabled: new Set(['autobyteus', 'codex_app_server']),
}))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({
  useAgentOrgDefinitionStore: () => ({ fetchAll: vi.fn(async () => undefined), byId: (id: string) => mocks.orgs.find((org) => org.id === id) ?? null }),
}))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => null }) }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => ({ getCatalogAgentTeamDefinitionById: () => null }) }))
vi.mock('~/services/agentOrgDefinition/agentOrgDefinitionReferences', () => ({ loadAgentOrgDefinitionReferences: async () => mocks.references }))
vi.mock('~/services/agentOrgExecution/agentOrgRunInspection', () => ({ readAgentOrgRunInspection: mocks.inspection }))
vi.mock('~/services/runConfigEditing/agentOrgRunLaunchSeed', () => ({ buildEditableAgentOrgRunSeed: mocks.seed }))
vi.mock('~/services/agentOrgExecution/agentOrgLaunchService', () => ({ agentOrgLaunchService: { launch: mocks.launch } }))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: vi.fn(async () => undefined),
    models: (runtimeKind: string) => mocks.models[runtimeKind] ?? [],
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ hasFetched: true, fetchRuntimeAvailabilities: vi.fn(async () => []), isRuntimeEnabled: (kind: string) => mocks.enabled.has(kind) }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    tempWorkspaceId: 'temp', workspaceMetadataById: {}, workspaces: { temp: { workspaceId: 'temp', absolutePath: '/temp' }, known: { workspaceId: 'known', absolutePath: '/work/known' } },
    findWorkspaceInfoByRootPath: (path: string) => (path === '/work/known' ? { workspaceId: 'known' } : null),
  }),
}))

import { useAgentOrgLaunchDraftStore } from '../agentOrgLaunchDraftStore'

const org = {
  id: 'org-1', name: 'AutoByteus Org', members: [
    { memberName: 'product', ref: 'team-def', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    { memberName: 'analyst', ref: 'analyst-def', refType: 'AGENT', refScope: 'SHARED' },
  ],
  defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', llmConfig: null },
}
const references = {
  agents: { 'analyst-def': { id: 'analyst-def', name: 'Analyst' } },
  teams: { 'team-def': { id: 'team-def', name: 'Product Team', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'a' }, { memberName: 'writer', ref: 'b' }] } },
  unavailable: [],
}

describe('agentOrgLaunchDraftStore (UIS-004)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.orgs = [structuredClone(org)]
    mocks.references = structuredClone(references)
    mocks.enabled = new Set(['autobyteus', 'codex_app_server'])
  })

  it('opens with the Org’s default launch config, the temp workspace and Auto-approve (REQ-021)', async () => {
    const store = useAgentOrgLaunchDraftStore()
    const draft = store.start({ orgDefinitionId: 'org-1' })
    expect(draft.phase).toBe('preparing')
    await flushPromises()

    expect(store.draft).toMatchObject({
      phase: 'ready', unavailable: false,
      root: { workspace: { kind: 'existing', workspaceId: 'temp' }, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex', autoExecuteTools: true },
    })
    expect(store.memberNodes.map((node) => node.key)).toEqual(['/product', '/analyst'])
    expect(store.readiness).toEqual({ ready: true })
  })

  it('"+" copies the run’s settings and member overrides; a placed team keeps its workspace only where it differs', async () => {
    mocks.inspection.mockResolvedValue({ execution_tree: {} })
    mocks.seed.mockReturnValue({
      definitionId: 'org-1', runtimeKind: 'autobyteus', llmModelIdentifier: 'first', llmConfig: { service_tier: 'fast' }, autoExecuteTools: false,
      workspaceSelection: { mode: 'existing', existingWorkspaceId: 'known', newWorkspacePath: '' },
      teamOverrides: { '/product': { autoExecuteTools: true, workspace: { workspaceId: 'known', workspaceMetadata: null } } },
      agentOverrides: { '/analyst': { llmModelIdentifier: 'other', llmConfig: null } },
      teamWorkspaceSelections: { '/product': { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/work/known' } },
    })
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1', sourceOrgRunId: 'org-run-9' })
    await flushPromises()

    expect(mocks.inspection).toHaveBeenCalledWith('org-run-9')
    expect(store.draft).toMatchObject({
      phase: 'ready',
      root: { workspace: { kind: 'existing', workspaceId: 'known' }, runtimeKind: 'autobyteus', llmModelIdentifier: 'first', llmConfig: { service_tier: 'fast' }, autoExecuteTools: false },
      teamOverrides: { '/product': { autoExecuteTools: true } },
      teamWorkspaces: {},
      agentOverrides: { '/analyst': { llmModelIdentifier: 'other', llmConfig: null } },
    })
  })

  it('a failed copy keeps the Org’s defaults', async () => {
    mocks.inspection.mockRejectedValue(new Error('offline'))
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1', sourceOrgRunId: 'org-run-9' })
    await flushPromises()
    expect(store.draft).toMatchObject({ phase: 'ready', root: { llmModelIdentifier: 'gpt-codex' }, agentOverrides: {} })
  })

  it('drops a late result when a newer start replaced the draft', async () => {
    let release!: (value: unknown) => void
    mocks.inspection.mockReturnValue(new Promise((resolve) => { release = resolve }))
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1', sourceOrgRunId: 'org-run-9' })
    const second = store.start({ orgDefinitionId: 'org-1' })
    await flushPromises()
    release({ execution_tree: {} })
    await flushPromises()
    expect(store.draft?.key).toBe(second.key)
    expect(mocks.seed).not.toHaveBeenCalled()
  })

  it('shows the unavailable state for a missing Org or an unreadable reference', async () => {
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'missing' })
    await flushPromises()
    expect(store.draft?.unavailable).toBe(true)
    mocks.references = { ...references, unavailable: ['team-def'] }
    store.start({ orgDefinitionId: 'org-1' })
    await flushPromises()
    expect(store.draft?.unavailable).toBe(true)
    expect(store.readiness).toMatchObject({ ready: false })
  })

  it('blocks Run with the spec reason: no model anywhere, or a runtime that is unavailable', async () => {
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1' })
    await flushPromises()
    store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: '' })
    expect(store.readiness).toEqual({ ready: false, reason: expect.any(String) })
    store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex' })
    expect(store.readiness).toEqual({ ready: true })
    mocks.enabled.delete('autobyteus')
    store.changeMember('/analyst', { field: 'model', choice: { runtimeKind: 'autobyteus', llmModelIdentifier: 'first' } })
    expect(store.readiness).toMatchObject({ ready: false })
  })

  it('keeps a placed team’s workspace only where it differs from the Org’s; Reset all clears every member', async () => {
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1' })
    await flushPromises()
    store.changeMember('/product', { field: 'workspace', choice: { kind: 'folder', rootPath: '/work/product' } })
    expect(store.draft!.teamWorkspaces).toEqual({ '/product': { kind: 'folder', rootPath: '/work/product' } })
    store.changeMember('/product', { field: 'workspace', choice: { kind: 'existing', workspaceId: 'temp' } })
    expect(store.draft!.teamWorkspaces).toEqual({})

    store.changeMember('/product/writer', { field: 'approval', value: false })
    expect(store.draft!.agentOverrides).toEqual({ '/product/writer': { autoExecuteTools: false } })
    expect(store.memberNodes[0]!.children[1]!.customized.approval).toBe(true)
    store.resetAllMembers()
    expect(store.draft!.agentOverrides).toEqual({})
  })

  it('Run launches with no recipient and opens the launched Org run; a failure keeps the page and values', async () => {
    const navigate = vi.fn(async () => undefined)
    const store = useAgentOrgLaunchDraftStore()
    store.start({ orgDefinitionId: 'org-1' })
    await flushPromises()
    store.changeMember('/analyst', { field: 'approval', value: false })

    mocks.launch.mockRejectedValueOnce(new Error('server said no'))
    await store.launch(navigate)
    expect(store.draft).toMatchObject({ phase: 'ready', error: expect.any(String), agentOverrides: { '/analyst': { autoExecuteTools: false } } })
    expect(navigate).not.toHaveBeenCalled()

    mocks.launch.mockResolvedValueOnce('org-run-2')
    await store.launch(navigate)
    expect(mocks.launch.mock.calls[1]![0]).toMatchObject({ orgDefinitionId: 'org-1', agentOverrides: { '/analyst': { autoExecuteTools: false } } })
    expect(navigate).toHaveBeenCalledWith({
      path: '/workspace', query: { rootSubjectKind: 'agent_org', definitionId: 'org-1', orgRunId: 'org-run-2', mode: 'active' },
    })
    expect(store.draft).toBeNull()
  })
})
