import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExistingRunModelConfigStore } from '../existingRunModelConfigStore'

const mocks = vi.hoisted(() => ({
  updateAgent: vi.fn(),
  updateTeam: vi.fn(),
  refreshAgent: vi.fn(),
  refreshTeam: vi.fn(),
  patchConfigOnly: vi.fn(),
  resumeConfigByRunId: {} as Record<string, unknown>,
  teamResumeConfigByTeamRunId: {} as Record<string, unknown>,
}))

vi.mock('~/services/runConfigEditing/existingRunModelConfigMutationClient', () => ({
  updateStoppedAgentModelConfig: mocks.updateAgent,
  updateStoppedTeamModelConfigs: mocks.updateTeam,
}))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    refreshAgentResumeConfig: mocks.refreshAgent,
    refreshTeamResumeConfig: mocks.refreshTeam,
    resumeConfigByRunId: mocks.resumeConfigByRunId,
    teamResumeConfigByTeamRunId: mocks.teamResumeConfigByTeamRunId,
  }),
}))
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({ patchConfigOnly: mocks.patchConfigOnly }),
}))

const editability = () => ({ editable: true, reason: null })
const activeEditability = () => ({ editable: false, reason: 'RUN_ACTIVE' })

const agentPayload = ({
  runId = 'run-1',
  llmConfig = { effort: 'low' } as Record<string, unknown> | null,
  isActive = false,
  modelConfigEditability = editability(),
} = {}) => ({
  runId,
  isActive,
  metadataConfig: {
    agentDefinitionId: 'agent-1',
    workspaceRootPath: '/workspace',
    llmModelIdentifier: 'model-1',
    llmConfig,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY' as const,
    runtimeKind: 'codex_app_server' as const,
  },
  modelConfigEditability,
})

const launch = (model: string, effort: string) => ({
  runtime_kind: 'codex_app_server',
  llm_model_identifier: model,
  llm_config: { effort },
  auto_execute_tools: false,
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace',
})

const teamPayload = ({
  rootEffort = 'low',
  memberEffort = 'medium',
  isActive = false,
  modelConfigEditability = editability(),
} = {}) => ({
  teamRunId: 'team-1',
  isActive,
  modelConfigEditability,
  executionTree: {
    schema_version: 2,
    created_at: '2026-08-25T00:00:00.000Z',
    archived_at: null,
    application_binding: null,
    handoffs: [],
    root_team: {
      address: '/',
      team_definition_id: 'team-def',
      team_definition_name: 'Team',
      team_run_id: 'team-1',
      coordinator_address: '/member',
      default_launch_configuration: launch('root-model', rootEffort),
      task_executions: [],
      members: [{
        kind: 'configured_agent',
        address: '/member',
        agent_definition_id: 'agent-def',
        role: null,
        description: null,
        agent_run_id: 'member-run',
        platform_agent_run_id: null,
        launch_configuration: launch('different-model', memberEffort),
      }],
    },
  },
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('existingRunModelConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    for (const key of Object.keys(mocks.resumeConfigByRunId)) delete mocks.resumeConfigByRunId[key]
    for (const key of Object.keys(mocks.teamResumeConfigByTeamRunId)) delete mocks.teamResumeConfigByTeamRunId[key]
  })

  it('locks Settings until its network load completes and ignores a superseded selection response', async () => {
    const store = useExistingRunModelConfigStore()
    const first = deferred<ReturnType<typeof agentPayload>>()
    const second = deferred<ReturnType<typeof agentPayload>>()
    mocks.refreshAgent.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const firstLoad = store.loadAgentCanonical('run-1')
    expect(store.loadingCanonical).toBe(true)
    expect(store.draft).toBeNull()
    const secondLoad = store.loadAgentCanonical('run-2')

    first.resolve(agentPayload({ runId: 'run-1' }))
    await firstLoad
    expect(store.loadingCanonical).toBe(true)
    expect(store.draft).toBeNull()

    second.resolve(agentPayload({ runId: 'run-2' }))
    await secondLoad
    expect(store.loadingCanonical).toBe(false)
    expect(store.draft).toMatchObject({ kind: 'agent', runId: 'run-2' })
    expect(mocks.refreshAgent).toHaveBeenNthCalledWith(1, 'run-1')
    expect(mocks.refreshAgent).toHaveBeenNthCalledWith(2, 'run-2')
  })

  it('allows cached lifecycle state to relock during loading but never unlocks from cache', async () => {
    const store = useExistingRunModelConfigStore()
    const load = deferred<ReturnType<typeof agentPayload>>()
    mocks.refreshAgent.mockReturnValueOnce(load.promise)
    const loading = store.loadAgentCanonical('run-1')
    store.applyCachedAgentLifecycle(agentPayload({
      isActive: true,
      modelConfigEditability: activeEditability(),
    }))
    load.resolve(agentPayload())
    await loading
    expect(store.draft).toMatchObject({ isActive: true, editability: { editable: false } })

    store.applyCachedAgentLifecycle(agentPayload())
    expect(store.draft).toMatchObject({ isActive: true, editability: { editable: false } })

    mocks.refreshAgent.mockResolvedValueOnce(agentPayload())
    await store.loadAgentCanonical('run-1')
    expect(store.draft).toMatchObject({ isActive: false, editability: { editable: true } })

    const teamLoad = deferred<ReturnType<typeof teamPayload>>()
    mocks.refreshTeam.mockReturnValueOnce(teamLoad.promise)
    const loadingTeam = store.loadTeamCanonical('team-1')
    store.applyCachedTeamLifecycle(teamPayload({
      isActive: true,
      modelConfigEditability: activeEditability(),
    }) as never)
    teamLoad.resolve(teamPayload())
    await loadingTeam
    expect(store.draft).toMatchObject({
      kind: 'team',
      isActive: true,
      editability: { editable: false, reason: 'RUN_ACTIVE' },
    })
  })

  it('blocks another Save after an indeterminate result until canonical verification succeeds', async () => {
    const store = useExistingRunModelConfigStore()
    const payload = agentPayload()
    store.syncAgentCanonical(payload)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'high' })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'PERSISTENCE_INDETERMINATE',
      message: 'Update outcome is being verified.',
      isActive: false,
      editability: editability(),
      canonicalLlmConfig: { effort: 'low' },
      fieldErrors: [],
    })
    mocks.refreshAgent.mockRejectedValueOnce(new Error('Stored settings could not be refreshed.'))

    await expect(store.save()).resolves.toBe(false)
    expect(store.reconciliationRequired).toBe(true)
    expect(store.canSave).toBe(false)

    mocks.refreshAgent.mockResolvedValueOnce(payload)
    await store.retryCanonicalRefresh()
    expect(store.reconciliationRequired).toBe(false)
    expect(store.dirty).toBe(false)
    expect(store.draft).toMatchObject({ canonicalLlmConfig: { effort: 'low' } })
  })

  it('fails closed when the server reports that the fixed model or schema is unavailable', async () => {
    const store = useExistingRunModelConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'high' })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'MODEL_UNAVAILABLE',
      message: 'Current model options are unavailable.',
      isActive: false,
      editability: editability(),
      canonicalLlmConfig: { effort: 'low' },
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.schemaStateByAddress['/']).toEqual({
      status: 'unavailable',
      message: 'Current model options are unavailable.',
    })
    expect(store.canSave).toBe(false)
    expect(mocks.refreshAgent).not.toHaveBeenCalled()
  })

  it('requires every configured Team scope to be representable before enabling Save', () => {
    const store = useExistingRunModelConfigStore()
    store.syncTeamCanonical(teamPayload() as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'unavailable', message: 'Unavailable' })
    store.updateTeamScopeModelConfig('/', { effort: 'high' })

    expect(store.patches.map((patch) => patch.scopeAddress)).toEqual(['/'])
    expect(store.canSave).toBe(false)

    store.setSchemaState('/member', { status: 'ready', message: null })
    expect(store.canSave).toBe(true)
  })

  it('keeps an Agent RUN_ACTIVE draft locked without refresh, rebase, or revision input', async () => {
    const store = useExistingRunModelConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'high' })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'Another supported workflow resumed this run.',
      isActive: true,
      editability: activeEditability(),
      canonicalLlmConfig: { effort: 'medium' },
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(mocks.updateAgent).toHaveBeenCalledWith({
      agentRunId: 'run-1',
      llmConfig: { effort: 'high' },
    })
    expect(mocks.refreshAgent).not.toHaveBeenCalled()
    expect(store.draft).toMatchObject({
      isActive: true,
      canonicalLlmConfig: { effort: 'low' },
      draftLlmConfig: { effort: 'high' },
      editability: { editable: false, reason: 'RUN_ACTIVE' },
    })
    expect(mocks.resumeConfigByRunId['run-1']).toMatchObject({
      isActive: true,
      metadataConfig: { llmConfig: { effort: 'medium' } },
    })

    store.applyCachedAgentLifecycle(agentPayload())
    expect(store.draft).toMatchObject({ isActive: true, editability: { editable: false } })
    mocks.refreshAgent.mockResolvedValueOnce(agentPayload())
    await store.loadAgentCanonical('run-1')
    expect(store.draft).toMatchObject({
      isActive: false,
      canonicalLlmConfig: { effort: 'low' },
      draftLlmConfig: { effort: 'low' },
      editability: { editable: true },
    })
  })

  it('keeps a Team RUN_ACTIVE plan locked and sends only narrow patches', async () => {
    const store = useExistingRunModelConfigStore()
    const canonical = teamPayload()
    store.syncTeamCanonical(canonical as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { effort: 'high' })
    mocks.updateTeam.mockResolvedValue({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'Another supported workflow resumed this team.',
      isActive: true,
      editability: activeEditability(),
      canonicalExecutionTree: teamPayload({ rootEffort: 'medium' }).executionTree,
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(mocks.updateTeam).toHaveBeenCalledWith({
      teamRunId: 'team-1',
      patches: [{
        scopeKind: 'CONFIGURED_TEAM',
        scopeAddress: '/',
        llmConfig: { effort: 'high' },
      }],
    })
    expect(mocks.refreshTeam).not.toHaveBeenCalled()
    expect(store.patches).toEqual([{
      scopeKind: 'CONFIGURED_TEAM',
      scopeAddress: '/',
      llmConfig: { effort: 'high' },
    }])
    expect(store.draft).toMatchObject({ isActive: true, editability: { editable: false } })
    expect(mocks.teamResumeConfigByTeamRunId['team-1']).toMatchObject({
      isActive: true,
      executionTree: { root_team: { default_launch_configuration: { llm_config: { effort: 'medium' } } } },
    })
  })
})
