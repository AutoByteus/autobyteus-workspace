import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'

/**
 * autobyteus-461 CR-461-077 (F-57): after a copy's model is saved from its delegator's Settings, the copy's row shows what
 * its run now has (the run's own save answer) at once, though the row's record (the stopped delegator's snapshot) still
 * holds the launch it was read with; nothing is reopened.
 */
const mocks = vi.hoisted(() => ({
  client: { loadDelegatedRunOptions: vi.fn(), saveDelegatedRuns: vi.fn(), terminateDelegatedRun: vi.fn() },
  store: null as null | Record<string, any>,
}))
vi.mock('~/services/runConfigEditing/delegatedLaunchSelectionClient', async (original) => ({ ...await original<object>(), ...mocks.client }))
vi.mock('pinia', async (original) => {
  const { toRefs } = await import('vue')
  const actual = await original<typeof import('pinia')>()
  return { ...actual, storeToRefs: (store: object) => ('draft' in store ? toRefs(store as any) : actual.storeToRefs(store as never)) }
})
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ subject: { kind: 'agent_run', runId: 'run-1' } }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ resumeConfigByRunId: {}, teamResumeConfigByTeamRunId: {}, agentOrgHistory: [] }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => ({ name: 'Writer' }) }) }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({ getConfigForRun: () => null }) }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => ({ contextFor: () => null, selectedChild: () => 'copy' }) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({ modelConfigSchemaByIdentifier: () => null }) }))
vi.mock('~/composables/runSettings/useRunStopAction', async () => {
  const { ref } = await import('vue')
  return { useRunStopAction: () => ({ pending: ref(false), error: ref(null), label: ref('Terminate run'), stop: vi.fn() }) }
})
vi.mock('~/stores/existingRunConfigStore', async () => {
  const { reactive } = await import('vue')
  mocks.store = reactive({
    draft: {
      kind: 'agent', runId: 'run-1', isActive: false, editability: { editable: true, reason: null },
      metadata: { agentDefinitionId: 'writer', runtimeKind: 'codex_app_server', autoExecuteTools: true, llmModelIdentifier: 'gpt-5.5', workspaceRootPath: null },
      draftSelection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5', llmConfig: null },
      // The stopped delegator's snapshot: its copy's record, with the launch it was read with.
      delegatedSnapshot: { closed_task_executions: [], remote_task_executions: [], execution_tree: { subjectKind: 'agent', createdAt: '2026-11-01T00:00:00.000Z',
        host: { address: '/writer', agentRunId: 'run-1', agentDefinitionId: 'writer' },
        taskExecutions: [{ address: '/copy', agentRunId: 'copy', platformAgentRunId: null, delegatorAgentRunId: 'run-1', startedAt: '2026-11-01T00:00:00.000Z',
          source: { kind: 'agent', agentDefinitionId: 'copy', launchConfiguration: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null } } }] } },
    },
    loadingCanonical: false, saving: false, reconciling: false, reconciliationRequired: false,
    feedback: null, fieldErrors: [], modelOptionsByAddress: {}, dirty: false, canSave: true,
    loadAgentCanonical: vi.fn(), clear: vi.fn(), applyCachedAgentLifecycle: vi.fn(),
    // A committed own save leaves nothing of the run's own unsaved.
    save: vi.fn(async () => true), discardChanges: vi.fn(), reloadCanonical: vi.fn(async () => true),
  })
  return { useExistingRunConfigStore: () => mocks.store }
})

const mountEditor = () => mount(ExistingRunConfigEditor, {
  global: { stubs: { ExistingRunSettings: { name: 'ExistingRunSettings', props: ['dirty', 'canSave', 'runtimeChangePending', 'subject'], template: '<div />' } }, mocks: { $t: (key: string) => key } },
})
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(mocks.client).forEach((mock) => mock.mockReset())
  mocks.client.loadDelegatedRunOptions.mockResolvedValue({ complete: true, options: { 'agent:copy': { status: 'ready', options: {
    currentModelIdentifier: 'opus', currentModel: null, unavailableReason: null,
    replacements: [{ llmModelIdentifier: 'sonnet', providerName: 'p', displayName: 'sonnet', canonicalName: 'sonnet', description: null, configSchema: null, recommended: false }],
  } } } })
  mocks.store!.save.mockClear(); mocks.store!.discardChanges.mockClear(); mocks.store!.reloadCanonical.mockClear()
})

const modelOf = (view: { props(name: string): unknown }): string | undefined =>
  (view.props('subject') as { subject?: { values?: { llmModelIdentifier?: string } } })?.subject?.values?.llmModelIdentifier

describe('ExistingRunConfigEditor: a copy\'s row after its model is saved (CR-461-077)', () => {
  it('shows the saved model at once, from the run\'s own save answer, while the row\'s record still holds the old one', async () => {
    const view = mountEditor().findComponent({ name: 'ExistingRunSettings' })
    await flush()
    expect(modelOf(view)).toBe('opus')
    const delegated = useDelegatedLaunchDraftStore()
    delegated.optionsByKey = (await mocks.client.loadDelegatedRunOptions()).options
    delegated.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    mocks.client.saveDelegatedRuns.mockResolvedValue({ success: true, message: 'Saved.', fieldErrors: [],
      saved: { 'agent:copy': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } } })
    await flush()
    view.vm.$emit('save')
    await flush(); await flush()
    expect(mocks.client.saveDelegatedRuns).toHaveBeenCalledOnce()
    // The edit is gone and the record is unchanged (the stopped delegator's snapshot); the row shows the saved model.
    expect(delegated.dirty).toBe(false)
    expect(mocks.store!.draft.delegatedSnapshot.execution_tree.taskExecutions[0].source.launchConfiguration.llmModelIdentifier).toBe('opus')
    expect(modelOf(view)).toBe('sonnet')
  })
})
