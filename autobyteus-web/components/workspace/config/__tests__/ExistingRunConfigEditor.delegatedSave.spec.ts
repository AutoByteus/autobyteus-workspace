import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'

/**
 * One Save bar (SR-007; autobyteus-461 SR-064): with delegated runs' choices, Save saves the run's own changed settings by
 * its own save, then each delegated run's by its own, then re-reads the run; without them, the run's own Save runs as
 * before. A delegated row's stop icon stops that run as itself (SR-066).
 */
const mocks = vi.hoisted(() => ({
  client: { loadDelegatedRunOptions: vi.fn(), loadDelegatedRunLaunches: vi.fn(async () => ({})), saveDelegatedRuns: vi.fn(), terminateDelegatedRun: vi.fn() },
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
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => ({ contextFor: () => null, selectedChild: () => null }) }))
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
      draftSelection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6', llmConfig: null }, delegatedSnapshot: null,
    },
    loadingCanonical: false, saving: false, reconciling: false, reconciliationRequired: false,
    feedback: null, fieldErrors: [], modelOptionsByAddress: {}, dirty: true, canSave: true,
    loadAgentCanonical: vi.fn(), clear: vi.fn(), applyCachedAgentLifecycle: vi.fn(),
    // A committed own save leaves nothing of the run's own unsaved.
    save: vi.fn(async () => { mocks.store!.dirty = false; return true }), discardChanges: vi.fn(), reloadCanonical: vi.fn(async () => true),
  })
  return { useExistingRunConfigStore: () => mocks.store }
})

const mountEditor = () => mount(ExistingRunConfigEditor, {
  global: { stubs: { ExistingRunSettings: { name: 'ExistingRunSettings', props: ['dirty', 'canSave', 'runtimeChangePending'], template: '<div />' } }, mocks: { $t: (key: string) => key } },
})
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(mocks.client).forEach((mock) => mock.mockReset())
  mocks.client.loadDelegatedRunLaunches.mockResolvedValue({})
  mocks.client.loadDelegatedRunOptions.mockResolvedValue({ complete: true, options: { 'agent:copy': { status: 'ready', options: {
    currentModelIdentifier: 'opus', currentModel: null, unavailableReason: null,
    replacements: [{ llmModelIdentifier: 'sonnet', providerName: 'p', displayName: 'sonnet', canonicalName: 'sonnet', description: null, configSchema: null, recommended: false }],
  } } } })
  mocks.store!.save.mockClear(); mocks.store!.discardChanges.mockClear(); mocks.store!.reloadCanonical.mockClear(); mocks.store!.dirty = true
})

describe('ExistingRunConfigEditor: copies\' choices in the run\'s Save bar', () => {
  it('saves the stopped run\'s own model by its own save, then each delegated run\'s by its own, then re-reads the run (SR-064)', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    await flush()
    const delegated = useDelegatedLaunchDraftStore()
    // The row's options, as its own run's query answers them (SR-065).
    delegated.optionsByKey = (await mocks.client.loadDelegatedRunOptions()).options
    delegated.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    mocks.client.saveDelegatedRuns.mockResolvedValue({ success: true, message: 'Saved.', fieldErrors: [], saved: {} })
    await flush()
    expect(view.props('dirty')).toBe(true)
    expect(view.props('canSave')).toBe(true)
    view.vm.$emit('save')
    await flush()
    expect(mocks.store!.save).toHaveBeenCalledOnce()
    expect(mocks.client.saveDelegatedRuns).toHaveBeenCalledWith(expect.objectContaining({
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } }] }))
    expect(mocks.store!.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.client.saveDelegatedRuns.mock.invocationCallOrder[0]!)
    // A committed Save re-reads the run, its hub view included (autobyteus-366, CR-003).
    expect(mocks.store!.reloadCanonical).toHaveBeenCalledWith(true)
  })

  it('saves a copy\'s other agent runtime with its model, though the old runtime offers no such model (autobyteus-348)', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    await flush()
    const delegated = useDelegatedLaunchDraftStore()
    delegated.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null })
    mocks.client.saveDelegatedRuns.mockResolvedValue({ success: true, message: 'Saved.', fieldErrors: [], saved: {} })
    await flush()
    expect(view.props('canSave')).toBe(true)
    expect(view.props('runtimeChangePending')).toBe(true)
    view.vm.$emit('save')
    await flush()
    expect(mocks.client.saveDelegatedRuns).toHaveBeenCalledWith(expect.objectContaining({
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null } }] }))
  })

  it('without copies\' choices, Save is the run\'s own Save', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    view.vm.$emit('save')
    await flush()
    expect(mocks.store!.save).toHaveBeenCalled()
    expect(mocks.client.saveDelegatedRuns).not.toHaveBeenCalled()
  })

  it('a delegated row\'s stop icon stops that run as itself (SR-066)', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    mocks.client.terminateDelegatedRun.mockResolvedValue({ success: true, message: 'Stopped.' })
    view.vm.$emit('stop-delegated', { agentRunId: 'copy' })
    await flush()
    expect(mocks.client.terminateDelegatedRun).toHaveBeenCalledWith({ agentRunId: 'copy' })
  })
})
