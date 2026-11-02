import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import ExistingRunConfigEditor from '../ExistingRunConfigEditor.vue'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'

// Render the real editor + Settings/Save bar with real draft stores. Only network, unrelated
// runtime stores and leaf controls are replaced; the stale live view deliberately never changes.
const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { read: vi.fn(), mutate: vi.fn(), live: null as any, stored: null as any, active: false, schema: null as any,
    /** The copy focused in the left tree (autobyteus-366: Settings show it). */
    focused: ref<string | null>('copy') }
})
const launch = () => ({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'old', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null })
const snapshot = () => ({ execution_tree: { taskExecutions: [{ address: '/writer', agentRunId: 'copy', platformAgentRunId: null, delegatorAgentRunId: 'host',
  startedAt: '2026-10-13T00:00:00.000Z', source: { kind: 'agent', agentDefinitionId: 'writer', launchConfiguration: launch() } }] }, closed_task_executions: [] })
const choice = (id: string) => ({ llmModelIdentifier: id, displayName: id, canonicalName: id, providerName: 'test', configSchema: null })
const options = () => ({ status: 'ready', options: { currentModelIdentifier: 'old', currentModel: choice('old'), replacements: [choice('new')], unavailableReason: null } })
vi.mock('~/services/runConfigEditing/delegatedLaunchSelectionClient', async original => ({ ...await original<object>(),
  loadDelegatedLaunchModelOptions: async () => ({ 'agent:copy': options(), 'team:team-copy': options(), 'agent:follower': options(), 'agent:own': options() }), updateDelegatedLaunchSelections: mocks.mutate,
}))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({ loadExistingRunModelOptions: async () => ({ '/': options() }) }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({ subject: { kind: 'agent_run', runId: 'host' } }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ resumeConfigByRunId: {}, teamResumeConfigByTeamRunId: {},
  refreshAgentResumeConfig: async () => ({ runId: 'host', isActive: mocks.active, modelConfigEditability: { editable: !mocks.active, reason: mocks.active ? 'RUN_ACTIVE' : null },
    metadataConfig: { agentDefinitionId: 'host', ...launch() } }),
}) }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({ getConfigForRun: () => null }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => ({ name: 'Host' }) }) }))
// autobyteus-358 (DS-004): Settings takes the hub's stored view from the collaboration store (`viewFor`).
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => ({ viewFor: mocks.read, inspect: async () => undefined, selectedChild: () => mocks.focused.value,
  contextFor: () => ({ view: mocks.live, getAgentContext: () => null }) }) }))
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({ ensureCatalog: vi.fn(), schemaFor: () => mocks.schema, modelLabel: (_runtime: string, id: string) => id }) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({ modelConfigSchemaByIdentifier: () => mocks.schema }) }))
vi.mock('~/composables/runSettings/useRunStopAction', async () => {
  const { ref } = await import('vue')
  return { useRunStopAction: () => ({ pending: ref(false), error: ref(null), label: ref('Stop'), stop: vi.fn() }) }
})
const flatten = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...flatten(node.children)])
const rows = defineComponent({ props: ['nodes'], emits: ['change'], setup: (props, { emit }) => () => h('section', flatten(props.nodes).map((node: any) => h('div', [
  h('span', { 'data-test': node.key }, `${node.values.llmModelIdentifier}:${JSON.stringify(node.values.llmConfig)}`),
  h('button', { 'data-test': `edit-${node.key}`, onClick: () => emit('change', node.key, { field: 'model', choice: choice('new') }) }, 'Change'),
]))) })
const subjectCard = defineComponent({ props: ['node'], emits: ['change'], setup: (props, { emit }) => () => h('div', [
  h('span', { 'data-test': props.node.key }, `${props.node.values.llmModelIdentifier}:${JSON.stringify(props.node.values.llmConfig)}`),
  h('button', { 'data-test': `edit-${props.node.key}`, onClick: () => emit('change', { field: 'model', choice: choice('new') }) }, 'Change'),
]) })
const mountEditor = () => mount(ExistingRunConfigEditor, { global: { stubs: { RunMembersSection: rows, RunSubjectCard: subjectCard, RunSettingsCard: true, RunSubjectHeader: true, Icon: true }, mocks: { $t: (key: string) => key } } })

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.read.mockReset(); mocks.mutate.mockReset()
  mocks.active = false; mocks.schema = null; mocks.focused.value = 'copy'
  mocks.live = snapshot(); mocks.stored = snapshot()
  mocks.read.mockImplementation(async () => structuredClone(mocks.stored))
  mocks.mutate.mockImplementation(async ({ changes }) => {
    for (const { key, selection } of changes) {
      const entries = mocks.stored.execution_tree.taskExecutions.flatMap((e: any) => [e, ...(e.members ?? [])])
      const entry = entries.find((e: any) => key === `agent:${e.agentRunId}` || key === `team:${e.teamRunId}`)
      entry[key.startsWith('team:') ? 'userTeamLaunchSelection' : 'userLaunchSelection'] = { ...selection, selectedAt: '2026-10-13T01:00:00.000Z' }
    }
    return { success: true, outcome: 'UPDATED', message: 'Saved.', fieldErrors: [] }
  })
})

describe('stopped Agent same-view canonical saved rows', () => {
  it('keeps the accepted saved model in the mounted row after Save, not the stale live view', async () => {
    const wrapper = mountEditor(); await flushPromises()
    const row = () => wrapper.get('[data-test="/writer@copy"]').text()
    expect(row()).toBe('old:null')
    await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click'); await flushPromises()
    expect(row()).toBe('new:null')
    await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
    expect(mocks.stored.execution_tree.taskExecutions[0].userLaunchSelection.llmModelIdentifier).toBe('new')
    expect(mocks.live.execution_tree.taskExecutions[0].source.launchConfiguration.llmModelIdentifier).toBe('old')
    expect(row()).toBe('new:null')
    expect(useDelegatedLaunchDraftStore().dirty).toBe(false)
    expect(useExistingRunConfigStore().reconciliationRequired).toBe(false)
    wrapper.unmount()
  })
})

it('retains the mounted Settings view and edit lock through readback, then uses the new value as the next original', async () => {
  const wrapper = mountEditor(); await flushPromises()
  const mounted = wrapper.get('[data-test="existing-run-settings"]').element
  await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
  let finish!: (value: any) => void
  mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  const delegated = useDelegatedLaunchDraftStore()
  expect(delegated.saving).toBe(true)
  expect(delegated.feedback).toBeNull()
  expect(wrapper.get('[data-test="existing-run-settings"]').element).toBe(mounted)
  expect(wrapper.get('[data-test="save-existing-model-config"]').attributes('disabled')).toBeDefined()
  finish(structuredClone(mocks.stored)); await flushPromises()
  expect(wrapper.get('[data-test="existing-run-settings"]').element).toBe(mounted)
  const settings = wrapper.getComponent({ name: 'ExistingRunSettings' })
  settings.vm.$emit('change-delegated', '/writer@copy', { field: 'thinking', llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } })
  await flushPromises()
  expect(delegated.originals['agent:copy']).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'new', llmConfig: null })
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('new:{"reasoning_effort":"high","service_tier":"fast"}')
  expect(delegated.dirty).toBe(false)
  wrapper.unmount()
  const reopened = mountEditor(); await flushPromises()
  expect(reopened.get('[data-test="/writer@copy"]').text()).toContain('new:{"reasoning_effort":"high"')
  reopened.unmount()
})

it('clears committed edits, locks stale rows with an honest error and retries reads without saving again', async () => {
  const wrapper = mountEditor(); await flushPromises()
  const store = useExistingRunConfigStore()
  store.updateAgentModelConfig({ llmModelIdentifier: 'new', llmConfig: null })
  await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
  mocks.read.mockRejectedValueOnce(new Error('read unavailable'))
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(store.reconciliationRequired).toBe(true)
  expect(store.dirty).toBe(false)
  expect(useDelegatedLaunchDraftStore().dirty).toBe(false)
  expect(useDelegatedLaunchDraftStore().feedback).toBeNull()
  expect(wrapper.get('[data-test="existing-run-note"]').text()).toContain('Settings were saved, but could not be refreshed')
  expect(wrapper.find('[data-test="existing-run-save-bar"]').exists()).toBe(false)
  await wrapper.get('[data-test="existing-run-refresh"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('new:null')
  expect(store.reconciliationRequired).toBe(false)
  expect(mocks.mutate).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

it('initial failed snapshot load has no stale live fallback and exposes a working Refresh', async () => {
  mocks.read.mockRejectedValueOnce(new Error('read unavailable'))
  const wrapper = mountEditor(); await flushPromises()
  expect(wrapper.find('[data-test="/writer@copy"]').exists()).toBe(false)
  await wrapper.get('[data-test="existing-run-refresh"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('old:null')
  expect(mocks.mutate).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('Cancel writes nothing and rejected Save keeps the recoverable edit without Saved feedback', async () => {
  const wrapper = mountEditor(); await flushPromises()
  await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
  await wrapper.get('[data-test="existing-run-cancel"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('old:null')
  expect(mocks.mutate).not.toHaveBeenCalled()
  await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
  mocks.mutate.mockResolvedValueOnce({ success: false, message: 'Copy running', fieldErrors: [] })
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('new:null')
  expect(wrapper.get('[data-test="existing-run-note"]').text()).toContain('Copy running')
  expect(useDelegatedLaunchDraftStore().dirty).toBe(true)
  expect(mocks.read).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})


it('renders the refreshed canonical settings on the real card of the focused copy', async () => {
  mocks.schema = { reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] }, service_tier: { type: 'string', enum: ['fast'], title: 'Fast mode' } }
  const wrapper = mount(ExistingRunConfigEditor, { global: { stubs: { RunSettingsCard: true, Icon: true } } })
  await flushPromises()
  const values = () => wrapper.get('[data-test="existing-run-subject-card"]').getComponent({ name: 'RunSettingsCard' }).props('values')
  expect(values().llmModelIdentifier).toBe('old')
  const settings = wrapper.getComponent({ name: 'ExistingRunSettings' })
  settings.vm.$emit('change-delegated', '/writer@copy', { field: 'model', choice: choice('new') })
  await flushPromises()
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(values().llmModelIdentifier).toBe('new')
  settings.vm.$emit('change-delegated', '/writer@copy', { field: 'thinking', llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } })
  await flushPromises()
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(values().llmConfig).toEqual({ reasoning_effort: 'high', service_tier: 'fast' })
  wrapper.unmount()
})

it('refreshes a Team selection and its follower, preserves own defaults and neighboring instances', async () => {
  const own = { ...launch(), llmModelIdentifier: 'own-model' }
  mocks.stored.execution_tree.taskExecutions.push({ address: '/team', teamRunId: 'team-copy', delegatorAgentRunId: 'host', startedAt: '2026-10-13T00:00:00.000Z',
    taskExecutions: [], members: [
      { address: '/team/lead', agentRunId: 'follower', platformAgentRunId: null },
      { address: '/team/own', agentRunId: 'own', platformAgentRunId: null },
    ],
    source: { kind: 'agent_team', teamDefinitionId: 'team', coordinatorAddress: '/team/lead', handoffs: [], defaultLaunchConfiguration: launch(), members: [
      { address: '/team/lead', agentDefinitionId: 'lead', launchConfiguration: launch(), followsTeam: true },
      { address: '/team/own', agentDefinitionId: 'own', launchConfiguration: own, followsTeam: false, launchSource: { origin: 'agent_default', fallbacks: [] } },
    ] } })
  mocks.focused.value = 'follower'
  const wrapper = mountEditor(); await flushPromises()
  // The member's own card first; the switch shows its Team copy and that copy's agents.
  expect(wrapper.find('[data-test="/team@team-copy"]').exists()).toBe(false)
  await wrapper.get('[data-test="run-settings-switch-group"]').trigger('click')
  await wrapper.get('[data-test="edit-/team@team-copy"]').trigger('click')
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/team@team-copy"]').text()).toBe('new:null')
  expect(wrapper.get('[data-test="/team/lead@follower"]').text()).toBe('new:null')
  expect(wrapper.get('[data-test="/team/own@own"]').text()).toBe('own-model:null')
  // A following member can now choose its own model/config without changing the Team or sibling.
  wrapper.getComponent({ name: 'ExistingRunSettings' }).vm.$emit('change-delegated', '/team/lead@follower', { field: 'thinking', llmConfig: { reasoning_effort: 'high' } })
  await flushPromises()
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/team/lead@follower"]').text()).toBe('new:{"reasoning_effort":"high"}')
  expect(wrapper.get('[data-test="/team@team-copy"]').text()).toBe('new:null')
  // A neighboring copy is untouched; another focus starts at that agent's own settings.
  mocks.focused.value = 'copy'; await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('old:null')
  expect(wrapper.find('[data-test="/team@team-copy"]').exists()).toBe(false)
  wrapper.unmount()
})

describe('edits across focus changes (autobyteus-366, AC-005)', () => {
  const twoCopies = () => mocks.stored.execution_tree.taskExecutions.push({ address: '/reviewer', agentRunId: 'follower', platformAgentRunId: null, delegatorAgentRunId: 'host',
    startedAt: '2026-10-13T00:00:00.000Z', source: { kind: 'agent', agentDefinitionId: 'reviewer', launchConfiguration: launch() } })
  const saveText = (wrapper: ReturnType<typeof mountEditor>) => wrapper.get('[data-test="existing-run-save-text"]').text()

  it('an edit stays pending after the focus moves, the save bar names it, and Save commits exactly it', async () => {
    twoCopies()
    const wrapper = mountEditor(); await flushPromises()
    await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click'); await flushPromises()
    expect(saveText(wrapper)).toContain('writer')
    mocks.focused.value = 'follower'; await flushPromises()
    expect(wrapper.get('[data-test="/reviewer@follower"]').text()).toBe('old:null')
    expect(saveText(wrapper)).toContain('writer')
    expect(saveText(wrapper)).not.toContain('reviewer')
    await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
    expect(mocks.mutate).toHaveBeenCalledTimes(1)
    expect(mocks.mutate.mock.calls[0]![0].changes.map((change: any) => change.key)).toEqual(['agent:copy'])
    expect(wrapper.get('[data-test="/reviewer@follower"]').text()).toBe('old:null')
    mocks.focused.value = 'copy'; await flushPromises()
    expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('new:null')
    wrapper.unmount()
  })

  it('Cancel discards the edit of an agent no longer on screen; edits on two agents are both named', async () => {
    twoCopies()
    const wrapper = mountEditor(); await flushPromises()
    await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
    mocks.focused.value = 'follower'; await flushPromises()
    await wrapper.get('[data-test="edit-/reviewer@follower"]').trigger('click'); await flushPromises()
    expect(saveText(wrapper)).toContain('writer, reviewer')
    await wrapper.get('[data-test="existing-run-cancel"]').trigger('click'); await flushPromises()
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="/reviewer@follower"]').text()).toBe('old:null')
    mocks.focused.value = 'copy'; await flushPromises()
    expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('old:null')
    wrapper.unmount()
  })
})

it('leaves active Agent rows live-view-backed and does not request a stopped snapshot after Save', async () => {
  mocks.active = true
  const mutate = mocks.mutate.getMockImplementation()!
  mocks.mutate.mockImplementation(async (input) => {
    const result = await mutate(input)
    mocks.live = structuredClone(mocks.stored) // stand-in for the existing live checkpoint publication
    return result
  })
  const wrapper = mountEditor(); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('old:null')
  await wrapper.get('[data-test="edit-/writer@copy"]').trigger('click')
  await wrapper.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(wrapper.get('[data-test="/writer@copy"]').text()).toBe('new:null')
  expect(mocks.read).not.toHaveBeenCalled()
  expect(useDelegatedLaunchDraftStore().feedback?.kind).toBe('success')
  wrapper.unmount()
})
