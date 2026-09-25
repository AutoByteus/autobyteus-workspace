import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { loadExistingRunModelOptions } from '~/services/runConfigEditing/existingRunModelOptionsClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useExistingRunConfigStore } from '../existingRunConfigStore'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({
  updateAgent: vi.fn(),
  updateTeam: vi.fn(),
  refreshAgent: vi.fn(),
  refreshTeam: vi.fn(),
  patchConfigOnly: vi.fn(),
  readOrg: vi.fn(),
  saveOrg: vi.fn(),
  resumeConfigByRunId: {} as Record<string, unknown>,
  teamResumeConfigByTeamRunId: {} as Record<string, unknown>,
}))

vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({ loadExistingRunModelOptions: vi.fn().mockResolvedValue({}) }))

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
vi.mock('~/stores/agentOrgContextsStore', () => ({
  useAgentOrgContextsStore: () => ({ readRunConfig: mocks.readOrg, saveRunConfig: mocks.saveOrg }),
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

describe('existingRunConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    for (const key of Object.keys(mocks.resumeConfigByRunId)) delete mocks.resumeConfigByRunId[key]
    for (const key of Object.keys(mocks.teamResumeConfigByTeamRunId)) delete mocks.teamResumeConfigByTeamRunId[key]
  })

  it('locks Settings until its network load completes and ignores a superseded selection response', async () => {
    const store = useExistingRunConfigStore()
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

  it('loads one canonical AgentOrg subject and saves recursive changed scopes as one aggregate command', async () => {
    const store = useExistingRunConfigStore()
    const executionTree = taskBearingView().execution_tree
    mocks.readOrg.mockResolvedValue({ orgRunId: 'org-run', executionTree, isActive: false, editability: editability() })
    await store.loadAgentOrgCanonical('org-run')
    expect(store.draft).toMatchObject({ kind: 'agent_org', orgRunId: 'org-run' })
    const addresses = Object.keys(store.draft!.kind === 'agent_org' ? store.draft.planner.scopesByAddress : {})
    for (const address of addresses) {
      store.modelOptionsByAddress[address] = { status: 'ready', options: {
        currentModelIdentifier: store.draft!.kind === 'agent_org'
          ? store.draft.planner.scopesByAddress[address]!.originalSelection.llmModelIdentifier : '',
        replacements: [], unavailableReason: null,
      } }
      store.setSchemaState(address, { status: 'ready', message: null })
    }
    store.updateAgentOrgScopeModelConfig('/', {
      llmModelIdentifier: store.draft!.kind === 'agent_org'
        ? store.draft.planner.scopesByAddress['/']!.originalSelection.llmModelIdentifier : '',
      llmConfig: { budget: 0, enabled: false, optional: null },
    })
    expect(store.patches.length).toBeGreaterThan(1)
    const canonical = structuredClone(executionTree)
    canonical.rootOrg.defaultLaunchConfiguration.llmConfig = { budget: 0, enabled: false, optional: null }
    for (const member of canonical.rootOrg.members) {
      if ('agentRunId' in member) member.launchConfiguration.llmConfig = { budget: 0, enabled: false, optional: null }
      else {
        member.defaultLaunchConfiguration.llmConfig = { budget: 0, enabled: false, optional: null }
        for (const agent of member.members) agent.launchConfiguration.llmConfig = { budget: 0, enabled: false, optional: null }
      }
    }
    mocks.saveOrg.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved', isActive: false,
      editability: editability(), canonicalExecutionTree: canonical, fieldErrors: [] })
    await expect(store.save()).resolves.toBe(true)
    expect(mocks.saveOrg).toHaveBeenCalledTimes(1)
    expect(mocks.saveOrg.mock.calls[0]![0]).toBe('org-run')
    expect(mocks.saveOrg.mock.calls[0]![1].modelPatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ scopeKind: 'CONFIGURED_ORG', scopeAddress: '/', llmConfig: { budget: 0, enabled: false, optional: null } }),
    ]))
    expect(store.dirty).toBe(false)
  })

  it('keeps submitted AgentOrg root/member edits correctable after determinate validation failure', async () => {
    const store = useExistingRunConfigStore()
    const executionTree = taskBearingView().execution_tree
    mocks.readOrg.mockResolvedValue({ orgRunId: 'org-run', executionTree, isActive: false, editability: editability() })
    await store.loadAgentOrgCanonical('org-run')
    if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
    for (const address of Object.keys(store.draft.planner.scopesByAddress)) {
      store.setSchemaState(address, { status: 'ready', message: null })
    }
    const model = store.draft.planner.scopesByAddress['/']!.originalSelection.llmModelIdentifier
    const invalidRoot = { llmModelIdentifier: model, llmConfig: { effort: 'invalid-root' } }
    const invalidMember = { llmModelIdentifier: model, llmConfig: { effort: 'invalid-member' } }
    store.updateAgentOrgScopeModelConfig('/', invalidRoot)
    store.updateAgentOrgScopeModelConfig('/team/worker', invalidMember)
    const submittedPatches = structuredClone(store.patches)
    mocks.saveOrg.mockResolvedValueOnce({
      success: false,
      outcome: 'VALIDATION_FAILED',
      message: 'One or more AgentOrg model settings are invalid.',
      isActive: false,
      editability: editability(),
      canonicalExecutionTree: executionTree,
      fieldErrors: [
        { path: 'patches[/].llmConfig.effort', message: 'Invalid root effort.' },
        { path: 'patches[/team/worker].llmConfig.effort', message: 'Invalid member effort.' },
      ],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(mocks.saveOrg).toHaveBeenCalledTimes(1)
    expect(store.draft.planner.scopesByAddress['/']!.draftSelection).toEqual(invalidRoot)
    expect(store.draft.planner.scopesByAddress['/team/worker']!.draftSelection).toEqual(invalidMember)
    expect(store.patches).toEqual(submittedPatches)
    expect(store.fieldErrors).toEqual([
      { path: 'patches[/].llmConfig.effort', message: 'Invalid root effort.' },
      { path: 'patches[/team/worker].llmConfig.effort', message: 'Invalid member effort.' },
    ])

    const correctedRoot = { llmModelIdentifier: model, llmConfig: { effort: 'high' } }
    const correctedMember = { llmModelIdentifier: model, llmConfig: { effort: 'medium' } }
    store.updateAgentOrgScopeModelConfig('/', correctedRoot)
    store.updateAgentOrgScopeModelConfig('/team/worker', correctedMember)
    expect(store.fieldErrors).toEqual([])
    const canonical = structuredClone(executionTree)
    canonical.rootOrg.defaultLaunchConfiguration.llmConfig = correctedRoot.llmConfig
    for (const member of canonical.rootOrg.members) {
      if ('agentRunId' in member) member.launchConfiguration.llmConfig = correctedRoot.llmConfig
      else {
        member.defaultLaunchConfiguration.llmConfig = correctedRoot.llmConfig
        for (const agent of member.members) {
          agent.launchConfiguration.llmConfig = agent.address === '/team/worker'
            ? correctedMember.llmConfig
            : correctedRoot.llmConfig
        }
      }
    }
    mocks.saveOrg.mockResolvedValueOnce({ success: true, outcome: 'UPDATED', message: 'Saved', isActive: false,
      editability: editability(), canonicalExecutionTree: canonical, fieldErrors: [] })

    await expect(store.save()).resolves.toBe(true)
    expect(mocks.saveOrg).toHaveBeenCalledTimes(2)
    expect(mocks.saveOrg.mock.calls[1]![1].modelPatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ scopeAddress: '/', llmConfig: correctedRoot.llmConfig }),
      expect.objectContaining({ scopeAddress: '/team/worker', llmConfig: correctedMember.llmConfig }),
    ]))
    expect(store.dirty).toBe(false)
  })

  it.each(['MODEL_UNAVAILABLE', 'SCHEMA_UNAVAILABLE', 'PERSISTENCE_FAILED'] as const)(
    'retains AgentOrg edits for determinate %s without canonical refresh',
    async outcome => {
      const store = useExistingRunConfigStore()
      const executionTree = taskBearingView().execution_tree
      mocks.readOrg.mockResolvedValue({ orgRunId: 'org-run', executionTree,
        isActive: false, editability: editability() })
      await store.loadAgentOrgCanonical('org-run')
      if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
      for (const address of Object.keys(store.draft.planner.scopesByAddress)) {
        store.setSchemaState(address, { status: 'ready', message: null })
      }
      const model = store.draft.planner.scopesByAddress['/']!.originalSelection.llmModelIdentifier
      const attemptedRoot = { llmModelIdentifier: model, llmConfig: { effort: `${outcome}-root` } }
      const attemptedMember = { llmModelIdentifier: model, llmConfig: { effort: `${outcome}-member` } }
      store.updateAgentOrgScopeModelConfig('/', attemptedRoot)
      store.updateAgentOrgScopeModelConfig('/team/worker', attemptedMember)
      mocks.saveOrg.mockResolvedValueOnce({ success: false, outcome, message: 'Determinate failure.',
        isActive: false, editability: editability(), canonicalExecutionTree: executionTree, fieldErrors: [] })

      await expect(store.save()).resolves.toBe(false)
      if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
      expect(store.draft.planner.scopesByAddress['/']!.draftSelection).toEqual(attemptedRoot)
      expect(store.draft.planner.scopesByAddress['/team/worker']!.draftSelection).toEqual(attemptedMember)
      expect(store.patches.length).toBeGreaterThan(0)
      expect(mocks.readOrg).toHaveBeenCalledTimes(1)
    },
  )

  it('replaces an attempted AgentOrg draft only after indeterminate canonical refresh', async () => {
    const store = useExistingRunConfigStore()
    const executionTree = taskBearingView().execution_tree
    mocks.readOrg.mockResolvedValueOnce({ orgRunId: 'org-run', executionTree, isActive: false, editability: editability() })
    await store.loadAgentOrgCanonical('org-run')
    if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
    for (const address of Object.keys(store.draft.planner.scopesByAddress)) {
      store.setSchemaState(address, { status: 'ready', message: null })
    }
    const model = store.draft.planner.scopesByAddress['/']!.originalSelection.llmModelIdentifier
    store.updateAgentOrgScopeModelConfig('/', { llmModelIdentifier: model, llmConfig: { effort: 'attempted' } })
    mocks.saveOrg.mockResolvedValueOnce({
      success: false,
      outcome: 'PERSISTENCE_INDETERMINATE',
      message: 'Update outcome is being verified.',
      isActive: false,
      editability: editability(),
      canonicalExecutionTree: executionTree,
      fieldErrors: [],
    })
    const verifiedTree = structuredClone(executionTree)
    verifiedTree.rootOrg.defaultLaunchConfiguration.llmConfig = { effort: 'stored' }
    mocks.readOrg.mockResolvedValueOnce({ orgRunId: 'org-run', executionTree: verifiedTree,
      isActive: false, editability: editability() })

    await expect(store.save()).resolves.toBe(false)
    expect(mocks.saveOrg).toHaveBeenCalledTimes(1)
    expect(mocks.readOrg).toHaveBeenCalledTimes(2)
    expect(store.reconciliationRequired).toBe(false)
    expect(store.draft.planner.scopesByAddress['/']!.originalSelection.llmConfig).toEqual({ effort: 'stored' })
    expect(store.draft.planner.scopesByAddress['/']!.draftSelection.llmConfig).toEqual({ effort: 'stored' })
    expect(store.patches).toEqual([])
  })

  it('allows cached lifecycle state to relock during loading but never unlocks from cache', async () => {
    const store = useExistingRunConfigStore()
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
    const store = useExistingRunConfigStore()
    const payload = agentPayload()
    store.syncAgentCanonical(payload)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ llmModelIdentifier: 'model-1', llmConfig: { effort: 'high' } })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'PERSISTENCE_INDETERMINATE',
      message: 'Update outcome is being verified.',
      isActive: false,
      editability: editability(),
      canonicalSelection: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'low' } },
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
    expect(store.draft).toMatchObject({ metadata: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'low' } } })
  })

  it.each([false, true])('verifies an indeterminate Team model Save without resubmission (refresh fails: %s)', async refreshFails => {
    const store = useExistingRunConfigStore()
    const original = teamPayload()
    const canonical = teamPayload({ rootEffort: 'high' })
    canonical.executionTree.root_team.default_launch_configuration.llm_model_identifier = 'larger'
    store.syncTeamCanonical(original as never)
    await Promise.resolve()
    store.modelOptionsByAddress['/'] = { status: 'ready', options: {
      currentModelIdentifier: 'root-model', replacements: [{ llmModelIdentifier: 'larger' }], unavailableReason: null,
    } }
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { llmModelIdentifier: 'larger', llmConfig: { effort: 'high' } })
    expect(store.canSave).toBe(true)
    mocks.updateTeam.mockResolvedValue({ success: false, outcome: 'PERSISTENCE_INDETERMINATE',
      message: 'Update outcome is being verified.', isActive: false, editability: editability(),
      canonicalExecutionTree: original.executionTree, fieldErrors: [],
    })
    const refresh = deferred<ReturnType<typeof teamPayload>>()
    mocks.refreshTeam.mockReturnValueOnce(refresh.promise)
    const saving = store.save()
    await vi.waitFor(() => expect(mocks.refreshTeam).toHaveBeenCalledWith('team-1'))
    expect(store.reconciliationRequired).toBe(true)
    expect(store.reconciling).toBe(true)
    expect(store.canSave).toBe(false)
    expect(await store.save()).toBe(false)
    if (refreshFails) {
      refresh.reject(new Error('Canonical Team verification temporarily unavailable.'))
      expect(await saving).toBe(false)
      expect(store.reconciling).toBe(false)
      expect(store.reconciliationRequired).toBe(true)
      expect(store.canSave).toBe(false)
      expect(await store.save()).toBe(false)
      mocks.refreshTeam.mockResolvedValueOnce(canonical)
      await store.retryCanonicalRefresh()
    } else {
      refresh.resolve(canonical)
      expect(await saving).toBe(false)
    }
    expect(mocks.updateTeam).toHaveBeenCalledTimes(1)
    expect(mocks.refreshTeam).toHaveBeenCalledTimes(refreshFails ? 2 : 1)
    expect(store.feedback).toBeNull()
    expect(store.reconciliationRequired).toBe(false)
    expect(store.dirty).toBe(false)
    expect(store.patches).toEqual([])
    expect(store.draft).toMatchObject({ kind: 'team', executionTree: canonical.executionTree,
      planner: { scopesByAddress: { '/': {
        originalSelection: { llmModelIdentifier: 'larger', llmConfig: { effort: 'high' } },
        draftSelection: { llmModelIdentifier: 'larger', llmConfig: { effort: 'high' } },
      } } },
    })
  })

  it('fails closed when the server reports that the fixed model or schema is unavailable', async () => {
    const store = useExistingRunConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ llmModelIdentifier: 'model-1', llmConfig: { effort: 'high' } })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'MODEL_UNAVAILABLE',
      message: 'Current model options are unavailable.',
      isActive: false,
      editability: editability(),
      canonicalSelection: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'low' } },
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
    const store = useExistingRunConfigStore()
    store.syncTeamCanonical(teamPayload() as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'unavailable', message: 'Unavailable' })
    store.updateTeamScopeModelConfig('/', { llmModelIdentifier: 'root-model', llmConfig: { effort: 'high' } })

    expect(store.patches.map((patch) => patch.scopeAddress)).toEqual(['/'])
    expect(store.canSave).toBe(false)

    store.setSchemaState('/member', { status: 'ready', message: null })
    expect(store.canSave).toBe(true)
  })

  it('keeps an Agent RUN_ACTIVE draft locked without refresh, rebase, or revision input', async () => {
    const store = useExistingRunConfigStore()
    store.syncAgentCanonical(agentPayload())
    store.setSchemaState('/', { status: 'ready', message: null })
    store.updateAgentModelConfig({ llmModelIdentifier: 'model-1', llmConfig: { effort: 'high' } })
    mocks.updateAgent.mockResolvedValue({
      success: false,
      outcome: 'RUN_ACTIVE',
      message: 'Another supported workflow resumed this run.',
      isActive: true,
      editability: activeEditability(),
      canonicalSelection: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'medium' } },
      fieldErrors: [],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(mocks.updateAgent).toHaveBeenCalledWith({
      agentRunId: 'run-1',
      llmModelIdentifier: 'model-1',
      llmConfig: { effort: 'high' },
    })
    expect(mocks.refreshAgent).not.toHaveBeenCalled()
    expect(store.draft).toMatchObject({
      isActive: true,
      metadata: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'medium' } },
      draftSelection: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'high' } },
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
      metadata: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'low' } },
      draftSelection: { llmModelIdentifier: 'model-1', llmConfig: { effort: 'low' } },
      editability: { editable: true },
    })
  })

  it('keeps a Team RUN_ACTIVE plan locked and sends only narrow patches', async () => {
    const store = useExistingRunConfigStore()
    const canonical = teamPayload()
    store.syncTeamCanonical(canonical as never)
    store.setSchemaState('/', { status: 'ready', message: null })
    store.setSchemaState('/member', { status: 'ready', message: null })
    store.updateTeamScopeModelConfig('/', { llmModelIdentifier: 'root-model', llmConfig: { effort: 'high' } })
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
        llmModelIdentifier: 'root-model',
        llmConfig: { effort: 'high' },
      }],
    })
    expect(mocks.refreshTeam).not.toHaveBeenCalled()
    expect(store.patches).toEqual([{
      scopeKind: 'CONFIGURED_TEAM',
      scopeAddress: '/',
        llmModelIdentifier: 'root-model',
      llmConfig: { effort: 'high' },
    }])
    expect(store.draft).toMatchObject({ isActive: true, editability: { editable: false } })
    expect(mocks.teamResumeConfigByTeamRunId['team-1']).toMatchObject({
      isActive: true,
      executionTree: { root_team: { default_launch_configuration: { llm_config: { effort: 'medium' } } } },
    })
  })
})

it('saves a model-only change and installs the canonical pair, not the submitted model', async () => {
  setActivePinia(createPinia())
  const store = useExistingRunConfigStore()
  store.syncAgentCanonical(agentPayload({ llmConfig: null }))
  await Promise.resolve()
  store.modelOptionsByAddress['/'] = { status: 'ready', options: { currentModelIdentifier: 'model-1', replacements: [{ llmModelIdentifier: 'larger' }], unavailableReason: null } }
  store.updateAgentModelConfig({ llmModelIdentifier: 'larger', llmConfig: null })
  store.setSchemaState('/', { status: 'ready', message: null })
  expect(store.dirty).toBe(true)
  expect(store.canSave).toBe(true)
  mocks.updateAgent.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved', isActive: false,
    editability: editability(), fieldErrors: [], canonicalSelection: { llmModelIdentifier: 'larger', llmConfig: null } })
  expect(await store.save()).toBe(true)
  expect(mocks.updateAgent).toHaveBeenLastCalledWith({ agentRunId: 'run-1', llmModelIdentifier: 'larger', llmConfig: null })
  expect(store.draft).toMatchObject({ metadata: { llmModelIdentifier: 'larger', llmConfig: null }, draftSelection: { llmModelIdentifier: 'larger', llmConfig: null } })
  expect(mocks.patchConfigOnly).toHaveBeenLastCalledWith('run-1', { llmModelIdentifier: 'larger', llmConfig: null })
  expect(store.dirty).toBe(false)
})
it('does not let missing replacement metadata block current-model settings', () => {
  setActivePinia(createPinia())
  const store = useExistingRunConfigStore()
  store.syncAgentCanonical(agentPayload())
  store.modelOptionsByAddress['/'] = { status: 'unavailable', options: null }
  store.updateAgentModelConfig({ llmModelIdentifier: 'model-1', llmConfig: { effort: 'high' } })
  store.setSchemaState('/', { status: 'ready', message: null })
  expect(store.canSave).toBe(true)
  store.updateAgentModelConfig({ llmModelIdentifier: 'unknown', llmConfig: null })
  expect(store.canSave).toBe(false)
})

it('saves workspace-only and mixed Org intentions independently; invalid destination stays unsavable', async () => {
  setActivePinia(createPinia())
  const store = useExistingRunConfigStore()
  const tree = JSON.parse(JSON.stringify(taskBearingView().execution_tree))
  tree.rootOrg.members[2].defaultLaunchConfiguration.workspaceRootPath = '/A'
  tree.rootOrg.members[2].members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/A' })
  store.syncAgentOrgCanonical({ orgRunId: 'org-run', executionTree: tree, isActive: false, editability: editability() })
  const ready = () => {
    if (store.draft?.kind !== 'agent_org') throw new Error('fixture')
    for (const [address, scope] of Object.entries(store.draft.planner.scopesByAddress)) {
      store.setSchemaState(address, { status: 'ready', message: null })
      store.modelOptionsByAddress[address] = { status: 'ready', options: { currentModelIdentifier: scope.originalSelection.llmModelIdentifier,
        replacements: [], unavailableReason: null } }
    }
  }
  const modelBaseline = JSON.stringify(store.draft!.kind === 'agent_org' && store.draft.planner)
  store.updateAgentOrgWorkspaceSelection('/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: ' ' })
  ready(); expect(store.dirty).toBe(true); expect(store.canSave).toBe(false)
  store.updateAgentOrgWorkspaceSelection('/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/B' })
  ready(); expect(store.canSave).toBe(true); expect(store.patches).toEqual([])
  expect(JSON.stringify(store.draft!.kind === 'agent_org' && store.draft.planner)).toBe(modelBaseline)
  const canonical = JSON.parse(JSON.stringify(tree))
  canonical.rootOrg.members[2].defaultLaunchConfiguration.workspaceRootPath = '/B'
  canonical.rootOrg.members[2].members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/B' })
  mocks.saveOrg.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved', isActive: false,
    editability: editability(), canonicalExecutionTree: canonical, fieldErrors: [] })
  await expect(store.save()).resolves.toBe(true)
  expect(mocks.saveOrg).toHaveBeenLastCalledWith('org-run', { modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] })
  expect(store.dirty).toBe(false)
  store.updateAgentOrgWorkspaceSelection('/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/C' })
  if (store.draft?.kind !== 'agent_org') throw new Error('fixture')
  store.updateAgentOrgScopeModelConfig('/team/lead', { ...store.draft.planner.scopesByAddress['/team/lead']!.draftSelection, llmConfig: { effort: 'high' } })
  ready(); await store.save()
  expect(mocks.saveOrg.mock.lastCall?.[1]).toMatchObject({ modelPatches: [expect.objectContaining({ scopeAddress: '/team/lead' })],
    teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/C' }] })
  store.clear()
})


describe('Org destination request guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(loadExistingRunModelOptions).mockReset().mockResolvedValue({})
    mocks.readOrg.mockReset(); mocks.saveOrg.mockReset()
  })
  const payload = () => {
    const executionTree = JSON.parse(JSON.stringify(taskBearingView().execution_tree))
    executionTree.rootOrg.members[2].defaultLaunchConfiguration.workspaceRootPath = '/A'
    return { orgRunId: 'org-run', executionTree, isActive: false, editability: editability() }
  }
  it('ignores superseded destination options and a late response from an old window binding', async () => {
    const store = useExistingRunConfigStore()
    store.syncAgentOrgCanonical(payload()); await Promise.resolve()
    const first = deferred<any>(), second = deferred<any>()
    vi.mocked(loadExistingRunModelOptions).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const oldRequest = store.refreshModelOptions()
    const newRequest = store.refreshModelOptions()
    const latest = { '/team': { status: 'unavailable' as const, options: null } }
    second.resolve(latest); await newRequest
    first.resolve({ '/old': { status: 'unavailable', options: null } }); await oldRequest
    expect(store.modelOptionsByAddress).toEqual(latest)
    const pending = deferred<any>()
    vi.mocked(loadExistingRunModelOptions).mockReturnValueOnce(pending.promise)
    const request = store.refreshModelOptions()
    const loading = JSON.stringify(store.modelOptionsByAddress)
    useWindowNodeContextStore().bindingRevision++
    pending.resolve(latest); await request
    expect(JSON.stringify(store.modelOptionsByAddress)).toBe(loading)
    store.clear()
  })
  it('debounces typed destinations and never queries an invalid blank destination', async () => {
    vi.useFakeTimers()
    try {
      const store = useExistingRunConfigStore()
      store.syncAgentOrgCanonical(payload()); await Promise.resolve()
      vi.mocked(loadExistingRunModelOptions).mockClear()
      const select = (path: string) => store.updateAgentOrgWorkspaceSelection('/team', {
        mode: 'new', existingWorkspaceId: null, newWorkspacePath: path,
      })
      select('/B'); select('/C')
      await vi.advanceTimersByTimeAsync(250)
      expect(loadExistingRunModelOptions).toHaveBeenCalledTimes(1)
      expect(vi.mocked(loadExistingRunModelOptions).mock.lastCall?.[0]).toMatchObject({ workspaceDraft: { '/team': { rootPath: '/C' } } })
      select(' '); await vi.advanceTimersByTimeAsync(250)
      expect(loadExistingRunModelOptions).toHaveBeenCalledTimes(1)
      expect(store.canSave).toBe(false)
      store.clear()
    } finally { vi.useRealTimers() }
  })
  it('ignores late Org canonical loads after a window binding change', async () => {
    const store = useExistingRunConfigStore(), pending = deferred<any>()
    mocks.readOrg.mockReturnValueOnce(pending.promise)
    const request = store.loadAgentOrgCanonical('org-run')
    useWindowNodeContextStore().bindingRevision++
    pending.resolve(payload()); await request
    expect(store.draft).toBeNull(); expect(store.feedback).toBeNull()
    store.clear()
  })
  it('does not install a late save into a replacement editor for the same Org', async () => {
    const store = useExistingRunConfigStore(), pending = deferred<any>()
    store.syncAgentOrgCanonical(payload()); await Promise.resolve()
    if (store.draft?.kind !== 'agent_org') throw new Error('fixture')
    for (const address of Object.keys(store.draft.planner.scopesByAddress)) store.setSchemaState(address, { status: 'ready', message: null })
    store.updateAgentOrgScopeModelConfig('/', { ...store.draft.planner.scopesByAddress['/']!.draftSelection, llmConfig: { effort: 'high' } })
    mocks.saveOrg.mockReturnValueOnce(pending.promise)
    const save = store.save()
    expect(mocks.saveOrg).toHaveBeenCalledTimes(1)
    store.clear(); store.syncAgentOrgCanonical(payload())
    const replacement = store.draft
    pending.resolve({ success: true, outcome: 'UPDATED', message: 'Saved', isActive: false,
      editability: editability(), canonicalExecutionTree: payload().executionTree, fieldErrors: [] })
    expect(await save).toBe(false)
    expect(store.draft).toBe(replacement); expect(store.feedback).toBeNull()
    store.clear()
  })
})
