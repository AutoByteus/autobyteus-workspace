import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExistingRunModelConfigStore } from '~/stores/existingRunModelConfigStore'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({ readOrg: vi.fn(), saveOrg: vi.fn() }))

vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({
  loadExistingRunModelOptions: vi.fn().mockResolvedValue({}),
}))
vi.mock('~/services/runConfigEditing/existingRunModelConfigMutationClient', () => ({
  updateStoppedAgentModelConfig: vi.fn(),
  updateStoppedTeamModelConfigs: vi.fn(),
}))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ resumeConfigByRunId: {}, teamResumeConfigByTeamRunId: {} }),
}))
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({ patchConfigOnly: vi.fn() }),
}))
vi.mock('~/stores/agentOrgContextsStore', () => ({
  useAgentOrgContextsStore: () => ({
    readRunModelConfig: mocks.readOrg,
    saveRunModelConfigs: mocks.saveOrg,
  }),
}))

describe('review probe: determinate AgentOrg validation failure', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps the submitted draft visible so the reported field error remains correctable', async () => {
    const store = useExistingRunModelConfigStore()
    const executionTree = taskBearingView().execution_tree
    mocks.readOrg.mockResolvedValue({
      orgRunId: 'org-run', executionTree, isActive: false,
      editability: { editable: true, reason: null },
    })
    await store.loadAgentOrgCanonical('org-run')
    if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
    for (const address of Object.keys(store.draft.planner.scopesByAddress)) {
      store.setSchemaState(address, { status: 'ready', message: null })
    }
    const submitted = { llmModelIdentifier: store.draft.planner.scopesByAddress['/']!.originalSelection.llmModelIdentifier,
      llmConfig: { effort: 'invalid-for-schema' } }
    store.updateAgentOrgScopeModelConfig('/', submitted)
    expect(store.patches.length).toBeGreaterThan(0)
    mocks.saveOrg.mockResolvedValue({
      success: false,
      outcome: 'VALIDATION_FAILED',
      message: 'One or more AgentOrg model settings are invalid.',
      isActive: false,
      editability: { editable: true, reason: null },
      canonicalExecutionTree: executionTree,
      fieldErrors: [{ path: 'patches[/].llmConfig.effort', message: 'Invalid effort.' }],
    })

    await expect(store.save()).resolves.toBe(false)
    expect(store.draft?.kind).toBe('agent_org')
    if (store.draft?.kind !== 'agent_org') throw new Error('Expected AgentOrg draft.')
    expect(store.draft.planner.scopesByAddress['/']!.draftSelection).toEqual(submitted)
    expect(store.patches.length).toBeGreaterThan(0)
  })
})
