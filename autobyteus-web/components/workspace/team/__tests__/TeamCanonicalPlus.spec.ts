import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { markRaw } from 'vue'
import TeamView from '../TeamWorkspaceView.vue'
import RunPanel from '../../config/RunConfigPanel.vue'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { buildChatTeamLaunchConfig } from '~/services/chat/chatTeamLaunchConfig'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(async () => undefined), replace: vi.fn(async () => undefined) }))
vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => ({ path: '/workspace', query: {} }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/runHydration/teamCommunicationHydrationService', () => ({ fetchTeamCommunicationForTeam: vi.fn().mockResolvedValue([]) }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: () => ({
  availabilities: [{ runtimeKind: 'autobyteus', enabled: true }], fetchRuntimeAvailability: vi.fn().mockResolvedValue(null), isRuntimePending: () => false, fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]), availabilityByKind: () => ({ enabled: true }), isRuntimeEnabled: () => true, runtimeReason: () => null,
}) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({
  fetchProvidersWithModels: vi.fn().mockResolvedValue([]), ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined), providerSnapshots: () => [],
  catalogSnapshot: (runtimeKind: string) => ({ runtimeKind, state: 'ready', errorMessage: null }),
  models: () => ['model', 'replacement-model'], modelConfigSchemaByIdentifier: () => null,
  providersWithModelsForSelection: () => [{ provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false }, models: ['model', 'replacement-model'].map(model => ({ modelIdentifier: model, name: model, value: model, canonicalName: model, providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api', configSchema: { type: 'object', properties: { budget: { type: 'integer', minimum: 0 }, enabled: { type: 'boolean' } } } })) }],
}) }))
let canonical: any
let createdTree: any
const meta = { workspaceId: 'ws', workspaceRootPath: '/source', displayName: 'Source', kind: 'filesystem' as const }
const wrappers: ReturnType<typeof mount>[] = []
const mounted = (component: any) => { const w = mount(component, { global: { stubs: { AgentTeamEventMonitor: true, SkillImprovementComposerCta: true } } }); wrappers.push(w); return w }
const choice = (id: string) => ({ llmModelIdentifier: id, providerName: 'OpenAI', displayName: id,
  canonicalName: id, description: null, configSchema: { type: 'object',
    properties: { budget: { type: 'integer', minimum: 0 }, enabled: { type: 'boolean' } } }, recommended: false })
const deferred = () => { let resolve!: (x: any) => void; const promise = new Promise<any>(r => resolve = r); return { promise, resolve } }
const resume = (tree = canonical) => ({ data: { getTeamRunResumeConfig: { closedTaskExecutions: [], teamRunId: tree.root_team.team_run_id, isActive: false, modelConfigEditability: { editable: true, reason: null }, executionTree: JSON.parse(JSON.stringify(tree)) } } })
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
    if (name === 'TeamRunModelOptions') return { data: { teamRunModelOptions: ['/', '/lead'].map(scopeAddress => ({ scopeAddress, currentModelIdentifier: 'model', currentModel: choice('model'), replacements: [choice('replacement-model')], unavailableReason: null })) } }
    if (name === 'RuntimeCurrentModelDescriptors') return { data: { runtimeCurrentModelDescriptors: variables.identifiers.map((identifier: string) => ({ identifier, model: { modelIdentifier: identifier, name: identifier, canonicalName: identifier, providerName: 'OpenAI', description: null, configSchema: null } })) } }
    if (variables.agentRunId) return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    if (name === 'GetRunFileChanges') return { data: { getRunFileChanges: [] } }
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
  // The saved-run settings edit the run's model config through their store (numeric parameters are not
  // presented as controls; REQ-022 presents enum/boolean settings only).
  useExistingRunConfigStore().updateTeamScopeModelConfig('/', { llmModelIdentifier: 'model', llmConfig: { budget: 0 } })
  if (differentMemberModel) {
    useExistingRunConfigStore().updateTeamScopeModelConfig('/lead', { llmModelIdentifier: 'replacement-model', llmConfig: { budget: 0 } })
  }
  await flushPromises()
  expect(panel.get('[data-test="existing-run-save-bar"]').exists()).toBe(true)
  expect(panel.get('[data-test="save-existing-model-config"]').attributes('disabled')).toBeUndefined()
  await panel.get('[data-test="save-existing-model-config"]').trigger('click'); await flushPromises()
  expect(canonical.root_team.default_launch_configuration.llm_config).toMatchObject({ budget: 0 })
  expect(source.view.getConfigurationView().root.effectiveConfig.llmConfig).toBeNull()
  expect(canonical.root_team.members[0].launch_configuration).toMatchObject({ llm_model_identifier: differentMemberModel ? 'replacement-model' : 'model', llm_config: { budget: 0 } })
  await panel.get('[data-test="run-config-back-to-events"]').trigger('click')
  expect(useWorkspaceCenterViewStore().mode).toBe('chat'); panel.unmount()
  return source
}
describe('Team canonical Save -> Back -> "+" (New chat prefilled, REQ-013)', () => {
  it.each([false, true])('copies the freshly saved config (different member model=%s) through the real loader into New chat and the Create serializer, without touching the source', async (different) => {
    const source = await saveAndBack(different), view = source.view, agent = view.getFocusedAgentContext()!, state = agent.state, config = view.getConfigurationView()
    agent.requirement = 'retained draft'
    agent.conversation.messages.push({ type: 'user', text: 'Retained conversation', timestamp: new Date() })
    const messages = agent.conversation.messages
    const activities = useAgentActivityStore(); activities.upsertSystemInstructionActivity('old-agent', { kind: 'system_instruction', activityId: 'instructions', timestamp: new Date(), content: 'Retained instructions' }); const retainedActivity = activities.getActivities('old-agent')[0]; const revision = activities.getActivityContentRevision('old-agent')
    const before = JSON.stringify(canonical), wrapper = mounted(TeamView); await flushPromises()
    const queryCount = io.query.mock.calls.length
    await wrapper.get('[data-test="workspace-header-new-run"]').trigger('click'); await flushPromises()

    expect(io.query.mock.calls.slice(queryCount)).toHaveLength(1)
    expect(router.push).toHaveBeenCalledWith('/chat')
    const draft = useChatDraftStore().draft!
    expect(draft.target).toEqual({ kind: 'team', teamDefinitionId: 'definition' })
    expect(draft.context.config.llmConfig).toMatchObject({ budget: 0 })
    expect(draft.teamAgentOverrides).toEqual(different ? { '/lead': expect.objectContaining({ llmModelIdentifier: 'replacement-model', llmConfig: { budget: 0 } }) } : {})
    // The source run is untouched.
    expect(useAgentTeamContextsStore().getTeamContextById('source')).toBe(source)
    expect(source.view).toBe(view); expect(view.getConfigurationView()).toBe(config); expect(agent.state).toBe(state)
    expect(agent.requirement).toBe('retained draft'); expect(agent.conversation.messages).toBe(messages)
    expect(activities.getActivityContentRevision('old-agent')).toBe(revision); expect(activities.getActivities('old-agent')[0]).toBe(retainedActivity)
    expect(useWorkspaceStore().createWorkspace).not.toHaveBeenCalled()

    // What New chat launches for this draft (chatLaunchService): the copied root and member settings.
    const teamConfig = buildChatTeamLaunchConfig(useAgentTeamDefinitionStore().agentTeamDefinitions[0]!, {
      runtimeKind: draft.context.config.runtimeKind, llmModelIdentifier: draft.context.config.llmModelIdentifier,
      llmConfig: draft.context.config.llmConfig ?? null, workspaceId: 'ws', workspaceMetadata: meta, autoExecuteTools: draft.autoExecuteTools,
    }, draft.teamAgentOverrides)
    const teams = useTeamRunConfigStore()
    teams.setRuntimeModelCatalog('autobyteus', ['model', 'replacement-model'])
    const draftId = teams.createDraft(teamConfig, '/lead')
    await useAgentTeamRunStore().launchDraft(teams.drafts.get(draftId)!); await flushPromises()
    const create = io.mutate.mock.calls.find(([r]) => r.mutation.definitions.some((d: any) => d.name?.value === 'CreateAgentTeamRun'))![0]
    expect(create.variables.input.teamConfigs[0].llmConfig).toMatchObject({ budget: 0 })
    expect(create.variables.input.memberConfigs[0]).toMatchObject({ llmModelIdentifier: different ? 'replacement-model' : 'model', llmConfig: { budget: 0 } })
    expect(JSON.stringify(create.variables)).not.toContain('old-agent'); expect(JSON.stringify(create.variables)).not.toContain('teamRunId')
    expect(JSON.stringify(canonical)).toBe(before)
  })

  it('coalesces clicks; a failed read opens New chat with the team defaults', async () => {
    await hydrate(); const wrapper = mounted(TeamView), held = deferred(); await flushPromises()
    const original = io.query.getMockImplementation()!; io.query.mockImplementation(() => held.promise)
    const button = wrapper.get('[data-test="workspace-header-new-run"]'), selection = useAgentSelectionStore().subject
    const readsBefore = io.query.mock.calls.length
    await button.trigger('click'); await button.trigger('click')
    expect(io.query.mock.calls.length - readsBefore).toBe(1)
    expect(wrapper.get('[data-test="team-copy-status"]').attributes('role')).toBe('status'); expect(useAgentSelectionStore().subject).toBe(selection)
    held.resolve({ errors: [{ message: 'Read offline' }] }); await flushPromises()
    io.query.mockImplementation(original)
    expect(router.push).toHaveBeenCalledWith('/chat')
    expect(useChatDraftStore().draft).toMatchObject({ target: { kind: 'team', teamDefinitionId: 'definition' }, teamAgentOverrides: {} })
  })

  it.each(['selection', 'unmount', 'replacement', 'newer-intent'])('opens nothing for a late copy after %s', async (action) => {
    await hydrate(); const wrapper = mounted(TeamView), held = deferred(); await flushPromises(); io.query.mockImplementation(() => held.promise)
    await wrapper.get('[data-test="workspace-header-new-run"]').trigger('click')
    if (action === 'newer-intent') useAgentSelectionStore().beginSelectionIntent()
    if (action === 'selection') useAgentSelectionStore().selectRun('elsewhere', 'agent')
    if (action === 'unmount') wrapper.unmount()
    if (action === 'replacement') useAgentTeamContextsStore().teams.delete('source')
    held.resolve(resume()); await flushPromises()
    expect(router.push).not.toHaveBeenCalled(); expect(useChatDraftStore().draft).toBeNull()
  })
})
