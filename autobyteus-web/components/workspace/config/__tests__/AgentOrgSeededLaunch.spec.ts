import { createPinia, setActivePinia } from 'pinia'
import { reactive, shallowReactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Panel from '../AgentOrgRunConfigPanel.vue'
import OrgView from '../../org/AgentOrgWorkspaceView.vue'
import Fields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import { seedFixture } from '~/services/runConfigEditing/__tests__/orgSeedFixture'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgRunConfigStore } from '~/stores/agentOrgRunConfigStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { GetAgentOrgReferencedAgent, GetAgentOrgReferencedTeam } from '~/graphql/queries/agentOrgDefinitionQueries'
import { CreateAgentOrgRun } from '~/graphql/mutations/agentOrgRunMutations'
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), route: null as any, push: vi.fn(), replace: vi.fn(), models: vi.fn(), availability: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: io.push, replace: io.replace }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ refreshTreeQuietly: vi.fn(), applyAgentOrgActivity: vi.fn(), resolveWorkspaceMetadataByRootPath: () => null }) }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({
  fetchProvidersWithModels: io.models, ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined), providerSnapshots: () => [],
  providersWithModelsForSelection: () => [{ provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
    models: ['root-model', 'direct-model', 'team-model', 'mounted-model', 'catalog-model'].map(id => ({ modelIdentifier: id, name: id, value: id, canonicalName: id,
      providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api', configSchema: { type: 'object', properties: { budget: { type: 'integer', minimum: 0 }, enabled: { type: 'boolean' } } } })) }],
}) }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: () => ({
  availabilities: [{ runtimeKind: 'autobyteus', enabled: true }, { runtimeKind: 'codex_app_server', enabled: true }],
  fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]), availabilityByKind: io.availability,
  isRuntimeEnabled: () => true, runtimeReason: () => null,
}) }))
const wrappers: ReturnType<typeof mount>[] = []
let fixture: ReturnType<typeof seedFixture>
const deferred = () => { let resolve!: (v: any) => void; const promise = new Promise<any>(r => resolve = r); return { promise, resolve } }
const envelope = (view: typeof fixture.view) => ({ data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: view.execution_tree.rootOrg.orgRunId, root_org: view } } })
const panel = () => { const w = mount(Panel); wrappers.push(w); return w }
const disabled = (w: ReturnType<typeof mount>) => w.get('[data-test="run-agent-org"]').attributes('disabled') !== undefined
beforeEach(() => {
  vi.clearAllMocks(); setActivePinia(createPinia()); fixture = seedFixture()
  io.route = reactive({ query: { definitionId: fixture.definition.id, sourceOrgRunId: 'org-run', mode: 'configuration' } })
  io.push.mockImplementation(async ({ query }) => { io.route.query = query })
  io.models.mockResolvedValue([]); io.availability.mockReturnValue({ enabled: true })
  const orgs = useAgentOrgDefinitionStore(); orgs.definitions = [fixture.definition]
  vi.spyOn(orgs, 'fetchAll').mockResolvedValue(undefined)
  vi.spyOn(useAgentDefinitionStore(), 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useAgentTeamDefinitionStore(), 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useWorkspaceStore(), 'fetchAllWorkspaces').mockResolvedValue(undefined)
  vi.spyOn(useWorkspaceStore(), 'createWorkspace').mockResolvedValue('new-workspace')
  io.query.mockImplementation(async ({ query, variables }) => {
    if (query === GetAgentOrgRunInspection) return envelope(fixture.view)
    if (query === GetAgentOrgReferencedAgent) return { data: { agentDefinition: fixture.references.agents[variables.id] } }
    if (query === GetAgentOrgReferencedTeam) return { data: { agentTeamDefinition: fixture.references.teams[variables.id] } }
    return { data: { getAgentOrgMemberRunProjection: { ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
  })
  io.mutate.mockResolvedValue({ data: { createAgentOrgRun: { success: true, agentOrgRunId: 'fresh-id' } } })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks() })
describe('Plus through actual Org view, inspection, exact references, real form and Pinia launch', () => {
  it.each(['agent-director', 'agent-lead-configured'])('projects enclosing source from %s, edits and issues ordinary Create without source identity', async agentRunId => {
    const source = JSON.stringify(fixture.view)
    const staged = await stageAgentOrgExecutionContext({ orgRunId: 'org-run', view: fixture.view, source: 'inspection' }); staged.commitActivities()
    const contexts = useAgentOrgContextsStore(); contexts.contexts['org-run'] = shallowReactive(staged.context); contexts.select('org-run', { kind: 'agent_execution', agentRunId })
    io.route.query = { definitionId: fixture.definition.id, orgRunId: 'org-run', mode: 'history', rootSubjectKind: 'agent_org', agentRunId }
    const view = mount(OrgView, { global: { stubs: {
      AgentWorkspaceSurface: { emits: ['new-agent'], template: '<button data-test="plus" @click="$emit(\'new-agent\')">+</button>' },
      TeamWorkspaceSurface: { emits: ['new-team'], template: '<button data-test="plus" @click="$emit(\'new-team\')">+</button>' },
    } } }); wrappers.push(view)
    await flushPromises(); await view.get('[data-test="plus"]').trigger('click'); view.unmount()
    const w = panel(); await flushPromises()
    const draft = useAgentOrgRunConfigStore()
    expect(draft.llmModelIdentifier).toBe('root-model'); expect(draft.runtimeKind).toBe('codex_app_server')
    expect(draft.llmConfig).toEqual({ budget: 0, enabled: false }); expect(draft.agentOverrides['/director'].llmConfig).toEqual({ budget: 0, enabled: false })
    expect(draft.teamOverrides['/team'].llmConfig).toBeNull(); expect(draft.agentOverrides['/team/lead'].llmConfig).toEqual({ budget: 3, enabled: false })
    expect(draft.workspaceSelection.newWorkspacePath).toBe('/source/root'); expect(draft.teamWorkspaceSelections['/team'].newWorkspacePath).toBe('/source/team')
    expect(useWorkspaceStore().createWorkspace).not.toHaveBeenCalled(); expect(io.mutate).not.toHaveBeenCalled()
    expect(disabled(w)).toBe(false)
    await w.get('input[type="number"]').setValue('2')
    await flushPromises(); expect(draft.llmConfig?.budget).toBe(2)
    await w.get('[data-test="run-agent-org"]').trigger('click'); await flushPromises()
    expect(io.mutate).toHaveBeenCalledTimes(1)
    const request = io.mutate.mock.calls[0][0]; expect(request.mutation).toBe(CreateAgentOrgRun)
    expect(request.variables.input.rootConfiguration.llmConfig.budget).toBe(2)
    expect(request.variables.input.teamOverrides[0].configuration.workspaceRootPath).toBe('/source/team')
    expect(JSON.stringify(request)).not.toContain('org-run'); expect(JSON.stringify(request)).not.toContain('agent-director')
    expect(io.replace).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ orgRunId: 'fresh-id' }) }))
    expect(io.replace.mock.calls[0][0].query.sourceOrgRunId).toBeUndefined(); expect(JSON.stringify(fixture.view)).toBe(source)
  })
  it('gates real children until delayed source and exact references arrive; re-renders never overwrite edits', async () => {
    const held = deferred(), original = io.query.getMockImplementation()!
    io.query.mockImplementation(request => request.query === GetAgentOrgRunInspection ? held.promise : original(request))
    const w = panel(); await flushPromises(); expect(w.findComponent(Fields).exists()).toBe(false); expect(disabled(w)).toBe(true)
    held.resolve(envelope(fixture.view)); await flushPromises()
    const draft = useAgentOrgRunConfigStore(); draft.setRootLlmConfig({ budget: 9, enabled: false })
    const epoch = draft.draftEpoch; useAgentOrgDefinitionStore().definitions[0].revision = '2'; await flushPromises()
    expect(draft.llmConfig?.budget).toBe(9); expect(draft.draftEpoch).toBe(epoch)
    expect(io.query.mock.calls.filter(([r]) => r.query === GetAgentOrgRunInspection)).toHaveLength(1)
  })
  it('ignores source A after navigation to B, including stale model metadata callbacks', async () => {
    const held = deferred(), catalog = deferred(), original = io.query.getMockImplementation()!
    io.query.mockImplementation(request => request.query === GetAgentOrgRunInspection && request.variables.orgRunId === 'org-run' ? held.promise : original(request))
    const w = panel(); await flushPromises()
    fixture = seedFixture('source-B'); fixture.view.execution_tree.rootOrg.defaultLaunchConfiguration.llmConfig = { budget: 7, enabled: false }
    io.models.mockImplementation(() => catalog.promise)
    io.route.query.sourceOrgRunId = 'source-B'; await flushPromises()
    held.resolve(envelope(seedFixture().view)); catalog.resolve([]); await flushPromises()
    expect(useAgentOrgRunConfigStore().llmConfig?.budget).toBe(7); expect(disabled(w)).toBe(false)
  })
  it('keeps source failure blocked and retries explicitly, never falls back to catalog defaults', async () => {
    const original = io.query.getMockImplementation()!
    io.query.mockImplementation(request => request.query === GetAgentOrgRunInspection ? Promise.reject(new Error('Source unavailable')) : original(request))
    const w = panel(); await flushPromises(); expect(w.get('[data-test="org-seed-error"]').text()).toContain('Source unavailable')
    expect(disabled(w)).toBe(true); expect(w.findComponent(Fields).exists()).toBe(false)
    io.query.mockImplementation(original); await w.get('[data-test="org-seed-retry"]').trigger('click'); await flushPromises()
    expect(useAgentOrgRunConfigStore().llmModelIdentifier).toBe('root-model'); expect(disabled(w)).toBe(false)
  })
  it('retains fresh source-free defaults and reports actual missing-model producer state neutrally, including collapsed Agents', async () => {
    delete io.route.query.sourceOrgRunId; fixture.definition.defaultLaunchConfig!.llmModelIdentifier = ''
    const w = panel(); await flushPromises(); const draft = useAgentOrgRunConfigStore()
    expect(io.query.mock.calls.some(([request]) => request.query === GetAgentOrgRunInspection)).toBe(false)
    expect(draft.modelSchemaStateFor('/director')).toMatchObject({ status: 'invalid', reason: 'model_required' })
    expect(w.get('[data-test="org-config-schema-diagnostic"]').attributes('role')).toBe('status'); expect(disabled(w)).toBe(true)
    draft.setRootLlmModelIdentifier('root-model'); await flushPromises(); expect(draft.allModelSchemaScopesReady).toBe(true)
    draft.setRootLlmModelIdentifier('   '); await flushPromises(); expect(draft.modelSchemaStateFor('/').reason).toBe('model_required')
    draft.setAgentOverride('/director', { llmModelIdentifier: 'unavailable' }); await flushPromises()
    expect(w.get('[data-test="org-config-schema-diagnostic"]').attributes('role')).toBe('alert')
    expect(draft.firstModelSchemaBlock?.address).toBe('/director'); expect(w.text()).toContain('unavailable')
  })
  it('blocks changed definition placement after initialization without re-seeding user edits', async () => {
    const w = panel(); await flushPromises(); const draft = useAgentOrgRunConfigStore()
    draft.setRootLlmConfig({ budget: 9, enabled: false })
    const org = useAgentOrgDefinitionStore().definitions[0]
    org.members[0].ref = 'rebound'; fixture.references.agents.rebound = { id: 'rebound', name: 'Other', description: '' }; org.revision = '2'
    await flushPromises(); expect(disabled(w)).toBe(true); expect(w.get('[data-test="org-seed-error"]').text()).toContain('no longer matches')
    expect(draft.llmConfig?.budget).toBe(9)
  })
  it('waits for owned exact references without catalog insertion or definition-default reset', async () => {
    const held = deferred(), original = io.query.getMockImplementation()!
    fixture.definition.members.forEach(member => { member.refScope = 'AGENT_ORG_OWNED' })
    for (const summary of [...Object.values(fixture.references.agents), ...Object.values(fixture.references.teams)]) {
      Object.assign(summary, { ownershipScope: summary.id.includes('team') && summary.id !== 'team-definition' ? 'SHARED' : 'AGENT_ORG_OWNED', ownerOrgId: fixture.definition.id })
    }
    // Mounted children remain shared references; ownership is on immediate placements only.
    for (const node of fixture.references.teams['team-definition'].nodes) Object.assign(fixture.references.agents[node.ref], { ownershipScope: 'SHARED', ownerOrgId: null })
    io.query.mockImplementation(request => request.query === GetAgentOrgReferencedTeam ? held.promise : original(request))
    const w = panel(); await flushPromises(); expect(w.findComponent(Fields).exists()).toBe(false)
    held.resolve({ data: { agentTeamDefinition: fixture.references.teams['team-definition'] } }); await flushPromises()
    expect(useAgentOrgRunConfigStore().agentOverrides['/team/lead'].llmModelIdentifier).toBe('mounted-model')
    expect(disabled(w)).toBe(false); expect(useAgentTeamDefinitionStore().agentTeamDefinitions).toEqual([])
  })
  it('deliberate runtime edit clears model to required while late catalog completion cannot reset the next seeded intent', async () => {
    const w = panel(); await flushPromises()
    await w.get('#org-run-runtime-kind').setValue('autobyteus'); await flushPromises()
    expect(useAgentOrgRunConfigStore().modelSchemaStateFor('/').reason).toBe('model_required')
    expect(disabled(w)).toBe(true)
    fixture = seedFixture('source-B'); io.route.query.sourceOrgRunId = 'source-B'; await flushPromises()
    expect(useAgentOrgRunConfigStore().llmModelIdentifier).toBe('root-model')
    expect(useAgentOrgRunConfigStore().llmConfig).toEqual({ budget: 0, enabled: false })
  })
  it('preserves genuine schema and runtime/catalog failures rather than calling them missing selection', async () => {
    const w = panel(); await flushPromises(); const draft = useAgentOrgRunConfigStore()
    draft.setRootLlmConfig({ budget: -1 }); await flushPromises()
    expect(draft.modelSchemaStateFor('/')).toMatchObject({ status: 'invalid' }); expect(draft.modelSchemaStateFor('/').reason).toBeUndefined()
    expect(w.get('[data-test="org-config-schema-diagnostic"]').attributes('role')).toBe('alert')
    w.unmount(); io.models.mockRejectedValue(new Error('Catalog offline')); const failed = panel(); await flushPromises()
    expect(failed.text()).toContain('Catalog offline'); expect(disabled(failed)).toBe(true)
  })
})
