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

const teamPayload = () => ({
  teamRunId: 'team-1',
  isActive: false,
  modelConfigEditability: editability(),
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
      default_launch_configuration: launch('root-model', 'low'),
      task_executions: [],
      members: [{
        kind: 'configured_agent',
        address: '/member',
        agent_definition_id: 'agent-def',
        role: null,
        description: null,
        agent_run_id: 'member-run',
        platform_agent_run_id: null,
        launch_configuration: launch('different-model', 'medium'),
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
})
