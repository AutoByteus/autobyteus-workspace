import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'

/**
 * AR-004 / DS-001 (SR-007): one Save bar. With copies' choices on a stopped run, Save sends them with
 * the run's own changed settings in one request and then re-reads the run; without them, the run's
 * own Save runs as before. A copy row's stop icon stops that copy of this run.
 */
const mocks = vi.hoisted(() => ({
  client: { loadDelegatedLaunchModelOptions: vi.fn(), updateDelegatedLaunchSelections: vi.fn(), stopDelegatedExecution: vi.fn() },
  store: null as null | Record<string, any>,
  inspect: vi.fn(async () => undefined),
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
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => ({ contextFor: () => null, selectedChild: () => null, inspect: mocks.inspect }) }))
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
    save: vi.fn(async () => true), discardChanges: vi.fn(), reloadCanonical: vi.fn(async () => true),
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
  mocks.client.loadDelegatedLaunchModelOptions.mockResolvedValue({ 'agent:copy': { status: 'ready', options: {
    currentModelIdentifier: 'opus', currentModel: null, unavailableReason: null,
    replacements: [{ llmModelIdentifier: 'sonnet', providerName: 'p', displayName: 'sonnet', canonicalName: 'sonnet', description: null, configSchema: null, recommended: false }],
  } } })
  mocks.store!.save.mockClear(); mocks.store!.discardChanges.mockClear(); mocks.store!.reloadCanonical.mockClear(); mocks.inspect.mockClear()
})

describe('ExistingRunConfigEditor: copies\' choices in the run\'s Save bar', () => {
  it('saves the copies\' choices with the stopped run\'s own model in one request, then re-reads the run', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    await flush()
    const delegated = useDelegatedLaunchDraftStore()
    delegated.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null })
    mocks.client.updateDelegatedLaunchSelections.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved.', fieldErrors: [] })
    await flush()
    expect(view.props('dirty')).toBe(true)
    expect(view.props('canSave')).toBe(true)
    view.vm.$emit('save')
    await flush()
    expect(mocks.client.updateDelegatedLaunchSelections).toHaveBeenCalledWith({ rootKind: 'AGENT', rootRunId: 'run-1',
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sonnet', llmConfig: null } }],
      configuredPatches: [{ scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6', llmConfig: null }] })
    expect(mocks.store!.save).not.toHaveBeenCalled()
    expect(mocks.store!.reloadCanonical).toHaveBeenCalled()
    // The hub's published view is re-read first, or the copy would show its old model after a successful Save (autobyteus-366).
    expect(mocks.inspect).toHaveBeenCalledWith('run-1')
    expect(mocks.inspect.mock.invocationCallOrder[0]).toBeLessThan(mocks.store!.reloadCanonical.mock.invocationCallOrder[0]!)
  })

  it('saves a copy\'s other agent runtime with its model, though the old runtime offers no such model (autobyteus-348)', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    await flush()
    const delegated = useDelegatedLaunchDraftStore()
    delegated.edit('agent:copy', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'opus', llmConfig: null }, { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null })
    mocks.client.updateDelegatedLaunchSelections.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved.', fieldErrors: [] })
    await flush()
    expect(view.props('canSave')).toBe(true)
    expect(view.props('runtimeChangePending')).toBe(true)
    view.vm.$emit('save')
    await flush()
    expect(mocks.client.updateDelegatedLaunchSelections).toHaveBeenCalledWith(expect.objectContaining({
      changes: [{ key: 'agent:copy', selection: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus', llmConfig: null } }] }))
  })

  it('without copies\' choices, Save is the run\'s own Save', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    view.vm.$emit('save')
    await flush()
    expect(mocks.store!.save).toHaveBeenCalled()
    expect(mocks.client.updateDelegatedLaunchSelections).not.toHaveBeenCalled()
  })

  it('a copy row\'s stop icon stops that copy of this run', async () => {
    const view = mountEditor().getComponent({ name: 'ExistingRunSettings' })
    mocks.client.stopDelegatedExecution.mockResolvedValue({ success: true, outcome: 'STOPPED', message: 'Stopped.', notStoppedUnattributed: 0 })
    view.vm.$emit('stop-delegated', { agentRunId: 'copy' })
    await flush()
    expect(mocks.client.stopDelegatedExecution).toHaveBeenCalledWith({ rootKind: 'AGENT', rootRunId: 'run-1' }, { agentRunId: 'copy' })
  })
})
