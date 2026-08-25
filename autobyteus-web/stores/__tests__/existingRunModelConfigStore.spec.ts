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

const editability = (revision = 'revision-1') => ({
  editable: true,
  reason: null,
  configurationRevision: revision,
})

const activeEditability = (revision = 'revision-1') => ({
  editable: false,
  reason: 'RUN_ACTIVE',
  configurationRevision: revision,
})

const agentPayload = (revision = 'revision-1', llmConfig = { effort: 'low' }) => ({
  runId: 'run-1',
  isActive: false,
  metadataConfig: {
    agentDefinitionId: 'agent-1',
    workspaceRootPath: '/workspace',
    llmModelIdentifier: 'model-1',
    llmConfig,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY' as const,
    runtimeKind: 'codex_app_server' as const,
  },
  modelConfigEditability: editability(revision),
})

const launch = (model: string, effort: string) => ({
  runtime_kind: 'codex_app_server',
  llm_model_identifier: model,
  llm_config: { effort },
  auto_execute_tools: false,
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace',
})

const teamPayload = (
  revision = 'revision-1',
  rootEffort = 'low',
  memberEffort = 'medium',
) => ({
  teamRunId: 'team-1',
  isActive: false,
  modelConfigEditability: editability(revision),
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

describe('existingRunModelConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    for (const key of Object.keys(mocks.resumeConfigByRunId)) delete mocks.resumeConfigByRunId[key]
    for (const key of Object.keys(mocks.teamResumeConfigByTeamRunId)) delete mocks.teamResumeConfigByTeamRunId[key]
  })

  it('blocks another Save after an indeterminate result until canonical refresh succeeds', async () => {
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
    expect(store.dirty).toBe(true)
    expect(store.canSave).toBe(true)
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
  })

  it('requires every configured Team scope to be representable before enabling the shared Save action', () => {
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

  it('replaces an Agent draft after unchanged-revision RUN_ACTIVE when the stopped canonical refresh arrives', async () => {
    const store = useExistingRunModelConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'high' })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'This run resumed before settings were saved.',
      isActive: true,
      editability: activeEditability(),
      canonicalLlmConfig: { effort: 'low' },
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.draft).toMatchObject({
      kind: 'agent',
      canonicalLlmConfig: { effort: 'low' },
      draftLlmConfig: { effort: 'high' },
    })
    expect(store.reconciliationRequired).toBe(true)

    store.syncAgentCanonical(agentPayload())
    expect(store.draft).toMatchObject({
      kind: 'agent',
      canonicalLlmConfig: { effort: 'low' },
      draftLlmConfig: { effort: 'low' },
    })
    expect(store.dirty).toBe(false)
    expect(store.reconciliationRequired).toBe(false)
  })

  it('does not let an Agent draft rejected at RUN_ACTIVE save under another writer revision', async () => {
    const store = useExistingRunModelConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'high' })
    mocks.updateAgent.mockResolvedValueOnce({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'This run resumed before settings were saved.',
      isActive: true,
      editability: activeEditability('revision-2'),
      canonicalLlmConfig: { effort: 'medium' },
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.draft).toMatchObject({
      kind: 'agent',
      canonicalLlmConfig: { effort: 'medium' },
      draftLlmConfig: { effort: 'medium' },
      editability: { configurationRevision: 'revision-2' },
    })
    store.syncAgentCanonical(agentPayload('revision-2', { effort: 'medium' }))
    expect(store.dirty).toBe(false)
    await expect(store.save()).resolves.toBe(false)
    expect(mocks.updateAgent).toHaveBeenCalledTimes(1)

    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ effort: 'max' })
    mocks.updateAgent.mockResolvedValueOnce({
      success: true,
      outcome: 'UPDATED',
      message: 'Saved.',
      isActive: false,
      editability: editability('revision-3'),
      canonicalLlmConfig: { effort: 'max' },
      fieldErrors: [],
    })
    await expect(store.save()).resolves.toBe(true)
    expect(mocks.updateAgent).toHaveBeenLastCalledWith({
      agentRunId: 'run-1',
      expectedConfigurationRevision: 'revision-2',
      llmConfig: { effort: 'max' },
    })
  })

  it('replaces a Team planner after unchanged-revision RUN_ACTIVE when the stopped canonical refresh arrives', async () => {
    const store = useExistingRunModelConfigStore()
    const canonical = teamPayload()
    store.syncTeamCanonical(canonical as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { effort: 'high' })
    mocks.updateTeam.mockResolvedValue({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'This team resumed before settings were saved.',
      isActive: true,
      editability: activeEditability(),
      canonicalExecutionTree: canonical.executionTree,
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.patches).toEqual([{
      scopeKind: 'CONFIGURED_TEAM',
      scopeAddress: '/',
      llmConfig: { effort: 'high' },
    }])
    expect(store.reconciliationRequired).toBe(true)

    store.syncTeamCanonical(canonical as never)
    expect(store.patches).toEqual([])
    expect(store.reconciliationRequired).toBe(false)
  })

  it('does not let Team patches rejected at RUN_ACTIVE save under another writer revision', async () => {
    const store = useExistingRunModelConfigStore()
    store.syncTeamCanonical(teamPayload() as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { effort: 'high' })
    const advancedCanonical = teamPayload('revision-2', 'medium')
    mocks.updateTeam.mockResolvedValueOnce({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'This team resumed before settings were saved.',
      isActive: true,
      editability: activeEditability('revision-2'),
      canonicalExecutionTree: advancedCanonical.executionTree,
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.draft).toMatchObject({
      kind: 'team',
      editability: { configurationRevision: 'revision-2' },
      planner: { scopesByAddress: { '/': {
        originalLlmConfig: { effort: 'medium' },
        draftLlmConfig: { effort: 'medium' },
      } } },
    })
    store.syncTeamCanonical(advancedCanonical as never)
    expect(store.patches).toEqual([])
    await expect(store.save()).resolves.toBe(false)
    expect(mocks.updateTeam).toHaveBeenCalledTimes(1)

    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { effort: 'max' })
    const savedCanonical = teamPayload('revision-3', 'max')
    mocks.updateTeam.mockResolvedValueOnce({
      success: true,
      outcome: 'UPDATED',
      message: 'Saved.',
      isActive: false,
      editability: editability('revision-3'),
      canonicalExecutionTree: savedCanonical.executionTree,
      fieldErrors: [],
    })
    await expect(store.save()).resolves.toBe(true)
    expect(mocks.updateTeam).toHaveBeenLastCalledWith({
      teamRunId: 'team-1',
      expectedConfigurationRevision: 'revision-2',
      patches: [{
        scopeKind: 'CONFIGURED_TEAM',
        scopeAddress: '/',
        llmConfig: { effort: 'max' },
      }],
    })
  })
})
