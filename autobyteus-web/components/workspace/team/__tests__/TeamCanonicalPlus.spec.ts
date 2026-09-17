import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { markRaw } from 'vue'
import TeamView from '../TeamWorkspaceView.vue'
import RunPanel from '../../config/RunConfigPanel.vue'
import RunningPanel from '../../running/RunningAgentsPanel.vue'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useExistingRunModelConfigStore } from '~/stores/existingRunModelConfigStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/runHydration/teamCommunicationHydrationService', () => ({ fetchTeamCommunicationForTeam: vi.fn().mockResolvedValue([]) }))
vi.mock('~/services/runHydration/taskDelegationHydrationService', () => ({ fetchTaskDelegationRecordsForTeam: vi.fn().mockResolvedValue([]) }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: () => ({
  availabilities: [{ runtimeKind: 'autobyteus', enabled: true }], fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]), availabilityByKind: () => ({ enabled: true }), isRuntimeEnabled: () => true, runtimeReason: () => null,
}) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({
  fetchProvidersWithModels: vi.fn().mockResolvedValue([]), ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined), providerSnapshots: () => [],
  providersWithModelsForSelection: () => [{ provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false }, models: ['model', 'replacement-model'].map(model => ({ modelIdentifier: model, name: model, value: model, canonicalName: model, providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api', configSchema: { type: 'object', properties: { budget: { type: 'integer', minimum: 0 }, enabled: { type: 'boolean' } } } })) }],
}) }))
let canonical: any
let createdTree: any
const meta = { workspaceId: 'ws', workspaceRootPath: '/source', displayName: 'Source', kind: 'filesystem' as const }
const wrappers: ReturnType<typeof mount>[] = []
const mounted = (component: any) => { const w = mount(component, { global: { stubs: { AgentTeamEventMonitor: true, SkillImprovementComposerCta: true } } }); wrappers.push(w); return w }
const deferred = () => { let resolve!: (x: any) => void; const promise = new Promise<any>(r => resolve = r); return { promise, resolve } }
const resume = (tree = canonical) => ({ data: { getTeamRunResumeConfig: { teamRunId: tree.root_team.team_run_id, isActive: false, modelConfigEditability: { editable: true, reason: null }, executionTree: JSON.parse(JSON.stringify(tree)) } } })
beforeEach(async () => {
  vi.clearAllMocks(); setActivePinia(createPinia()); createdTree = null
  canonical = JSON.parse(JSON.stringify(buildTestTeamContext({ teamRunId: 'source', teamDefinitionId: 'definition', teamDefinitionName: 'Source Team',
    coordinatorAddress: '/lead', workspaceRootPath: '/source', rootChildren: [testAgentNode('/lead', { agentRunId: 'old-agent', agentDefinitionId: 'agent', llmModelIdentifier: 'model', llmConfig: null, workspaceRootPath: '/source' })],
  }).view.getExecutionTree()))
  const teams = useAgentTeamDefinitionStore(); teams.agentTeamDefinitions = [{ id: 'definition', name: 'Source Team', description: '', instructions: '', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'agent', refScope: 'SHARED' }] }]
  vi.spyOn(teams, 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
  const agents = useAgentDefinitionStore(); agents.agentDefinitions = [{ id: 'agent', name: 'Lead' }] as any; vi.spyOn(agents, 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  const workspaces = useWorkspaceStore(); workspaces.workspaceMetadataById.ws = meta; workspaces.workspacesFetched = true
  vi.spyOn(workspaces, 'fetchAllWorkspaces').mockResolvedValue(undefined)
  vi.spyOn(workspaces, 'createWorkspace').mockResolvedValue('ws')
  vi.spyOn(workspaces, 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(meta)
  io.query.mockImplementation(async ({ query, variables }) => {
    const name = query.definitions.find((d: any) => d.name)?.name.value
    if (name === 'GetTeamRunResumeConfig') return resume(variables.teamRunId === 'new-team' ? createdTree : canonical)
    if (name === 'TeamRunModelOptions') return { data: { teamRunModelOptions: ['/', '/lead'].map(scopeAddress => ({ scopeAddress, currentModelIdentifier: 'model', currentContextTokens: 100, replacements: [{ llmModelIdentifier: 'replacement-model', contextTokens: 200 }], unavailableReason: null })) } }
    if (variables.agentRunId) return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    throw new Error('Unexpected query: ' + name)
  })
  io.mutate.mockImplementation(async ({ mutation, variables: { input } }) => {
    const name = mutation.definitions.find((d: any) => d.name)?.name.value
    if (name === 'UpdateStoppedTeamRunModelConfigs') {
      for (const patch of input.patches) {
        const launch = patch.scopeAddress === '/' ? canonical.root_team.default_launch_configuration : canonical.root_team.members.find((m: any) => m.address === patch.scopeAddress).launch_configuration
        launch.llm_config = patch.llmConfig; launch.llm_model_identifier = patch.llmModelIdentifier
      }
      return { data: { updateStoppedTeamRunModelConfigs: { success: true, outcome: 'UPDATED', message: 'Saved', isActive: false, editability: { editable: true, reason: null }, fieldErrors: [], canonicalExecutionTree: JSON.parse(JSON.stringify(canonical)) } } }
    }
    // Simulated allocation at the transport only; frontend create/hydration/publication remain real.
    createdTree = JSON.parse(JSON.stringify(canonical))
    createdTree.root_team.team_run_id = 'new-team'
    createdTree.root_team.members[0].agent_run_id = 'new-agent'
    return { data: { createAgentTeamRun: { success: true, teamRunId: 'new-team' } } }
  })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks() })
async function hydrate() {
  const candidate = await hydrateLiveTeamRunContext({ teamRunId: 'source', agentRunId: 'old-agent', resolveWorkspaceMetadataByRootPath: async () => meta })
  useAgentTeamContextsStore().teams.set('source', markRaw(candidate.hydratedContext))
  useAgentSelectionStore().selectRun('source', 'team')
  return candidate.hydratedContext
}
async function saveAndBack(differentMemberModel = false) {
  const source = await hydrate(), panel = mounted(RunPanel); await flushPromises()
  await panel.get('input[type="number"]').setValue('0'); await flushPromises()
  if (differentMemberModel) {
    useExistingRunModelConfigStore().updateTeamScopeModelConfig('/lead', { llmModelIdentifier: 'replacement-model', llmConfig: { budget: 0 } })
    await flushPromises()
  }
  expect(panel.get('[data-test="save-existing-model-config"]').attributes('disabled')).toBeUndefined()
  await panel.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(canonical.root_team.default_launch_configuration.llm_config).toMatchObject({ budget: 0 })
  expect(source.view.getConfigurationView().root.effectiveConfig.llmConfig).toBeNull()
  expect(canonical.root_team.members[0].launch_configuration).toMatchObject({ llm_model_identifier: differentMemberModel ? 'replacement-model' : 'model', llm_config: { budget: 0 } })
  await panel.get('[data-test="run-config-back-to-events"]').trigger('click')
  expect(useWorkspaceCenterViewStore().mode).toBe('chat'); panel.unmount()
  return source
}
describe('Team canonical Save -> Back -> both Plus consumers', () => {
  it.each(['header', 'group'].flatMap(entry => [false, true].map(different => [entry, different] as const)))('%s copies freshly saved config (different member model=%s) through real hydration/editor/loader/draft/Create serializer without replacing retained state', async (entry, different) => {
    const source = await saveAndBack(different), view = source.view, agent = view.getFocusedAgentContext()!, state = agent.state, config = view.getConfigurationView()
    agent.requirement = 'retained draft'; agent.contextFilePaths = [{ kind: 'workspace_path', id: 'attachment', locator: '/source/note.txt', displayName: 'note.txt', type: 'Text' }]
    agent.conversation.messages.push({ type: 'user', text: 'Retained conversation', timestamp: new Date() })
    const files = agent.contextFilePaths, messages = agent.conversation.messages
    const activities = useAgentActivityStore(); activities.upsertSystemInstructionActivity('old-agent', { kind: 'system_instruction', activityId: 'instructions', timestamp: new Date(), content: 'Retained instructions' }); const retainedActivity = activities.getActivities('old-agent')[0]; const revision = activities.getActivityContentRevision('old-agent')
    const before = JSON.stringify(canonical), wrapper = mounted(entry === 'header' ? TeamView : RunningPanel); await flushPromises()
    const queryCount = io.query.mock.calls.length
    await wrapper.get(entry === 'header' ? '[data-test="workspace-header-new-run"]' : '.create-btn').trigger('click'); await flushPromises()
    const draft = useTeamRunConfigStore().selectedDraft!
    expect(draft.config.rootConfig.llmConfig).toMatchObject({ budget: 0 })
    expect(io.query.mock.calls.slice(queryCount)).toHaveLength(1)
    expect(useAgentTeamContextsStore().getTeamContextById('source')).toBe(source)
    expect(source.view).toBe(view); expect(view.getConfigurationView()).toBe(config); expect(agent.state).toBe(state)
    expect(agent.requirement).toBe('retained draft'); expect(agent.contextFilePaths).toBe(files); expect(agent.conversation.messages).toBe(messages)
    expect(activities.getActivityContentRevision('old-agent')).toBe(revision); expect(useWorkspaceStore().createWorkspace).not.toHaveBeenCalled()
    const createPanel = mounted(RunPanel); await flushPromises(); expect(createPanel.get('.run-btn').attributes('disabled')).toBeUndefined()
    await createPanel.get('.run-btn').trigger('click'); await flushPromises()
    const create = io.mutate.mock.calls.find(([r]) => r.mutation.definitions.some((d: any) => d.name?.value === 'CreateAgentTeamRun'))![0]
    expect(create.variables.input.teamConfigs[0].llmConfig).toMatchObject({ budget: 0 })
    expect(create.variables.input.memberConfigs[0]).toMatchObject({ llmModelIdentifier: different ? 'replacement-model' : 'model', llmConfig: { budget: 0 } })
    expect(JSON.stringify(create.variables)).not.toContain('old-agent'); expect(JSON.stringify(create.variables)).not.toContain('teamRunId')
    expect(JSON.stringify(canonical)).toBe(before)
    expect(useAgentSelectionStore().selectedRunId).toBe('new-team')
    expect(useAgentTeamContextsStore().getTeamContextById('new-team')?.view.getFocusedAgentRunId()).toBe('new-agent')
    expect(activities.getActivities('old-agent')[0]).toBe(retainedActivity)
  })
  it.each(['header', 'group'])('%s coalesces clicks and preserves screen/draft on failure; same action retries', async entry => {
    await hydrate(); const wrapper = mounted(entry === 'header' ? TeamView : RunningPanel), held = deferred(); await flushPromises()
    const original = io.query.getMockImplementation()!; io.query.mockImplementation(() => held.promise)
    const button = wrapper.get(entry === 'header' ? '[data-test="workspace-header-new-run"]' : '.create-btn'), selection = useAgentSelectionStore().subject
    const readsBefore = io.query.mock.calls.length
    await button.trigger('click'); await button.trigger('click')
    expect(io.query.mock.calls.length - readsBefore).toBe(1)
    expect(wrapper.get('[data-test="team-copy-status"]').attributes('role')).toBe('status'); expect(useAgentSelectionStore().subject).toBe(selection)
    held.resolve({ errors: [{ message: 'Read offline' }] }); await flushPromises()
    expect(wrapper.get('[data-test="team-copy-status"]').attributes('role')).toBe('alert'); expect(useAgentSelectionStore().subject).toBe(selection)
    expect(useTeamRunConfigStore().selectedDraft).toBeNull(); io.query.mockImplementation(original)
    await button.trigger('click'); await flushPromises(); expect(useTeamRunConfigStore().selectedDraft).not.toBeNull()
  })
  it.each(['header', 'group'].flatMap(entry => ['selection', 'unmount', 'replacement', 'newer-intent'].map(action => [entry, action])))('%s rejects late copy after %s', async (entry, action) => {
    await hydrate(); const wrapper = mounted(entry === 'header' ? TeamView : RunningPanel), held = deferred(); await flushPromises(); io.query.mockImplementation(() => held.promise)
    await wrapper.get(entry === 'header' ? '[data-test="workspace-header-new-run"]' : '.create-btn').trigger('click')
    if (action === 'newer-intent') useAgentSelectionStore().beginSelectionIntent()
    if (action === 'selection') useAgentSelectionStore().selectRun('elsewhere', 'agent')
    if (action === 'unmount') wrapper.unmount()
    if (action === 'replacement') useAgentTeamContextsStore().teams.delete('source')
    held.resolve(resume()); await flushPromises(); expect(useTeamRunConfigStore().selectedDraft).toBeNull()
  })
  it('preserves the source-free template branch without canonical IO', async () => {
    const wrapper = mounted(RunningPanel); await flushPromises(); const count = io.query.mock.calls.length
    await (wrapper.vm as any).createTeamRun('definition'); await flushPromises()
    expect(useTeamRunConfigStore().selectedDraft?.config.teamDefinitionId).toBe('definition'); expect(io.query.mock.calls.length).toBe(count)
  })
})
