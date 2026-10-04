import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import Panel from '../AgentOrgRunConfigPanel.vue'
import MemberOverrideItem from '../MemberOverrideItem.vue'
import Fields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import { seedFixture } from '~/services/runConfigEditing/__tests__/orgSeedFixture'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgRunConfigStore } from '~/stores/agentOrgRunConfigStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useWorkspaceStore } from '~/stores/workspace'

const io = vi.hoisted(() => ({ client: null as any, route: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const kind = 'codex_app_server', exactModel = 'gpt-6.1-sol'
const config = { reasoning_effort: 'high', temperature: 0.2 }
const rawSchema = { type: 'object', properties: {
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
  temperature: { type: 'number', minimum: 0, maximum: 2 },
} }
const catalog = (runtimeKind: string) => [{
  __typename: 'ProviderModelCatalogSnapshotObject', runtimeKind,
  ownerProvider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false, baseUrl: null, catalogMode: 'STATIC' },
  sources: [{ modelKind: 'LLM', state: 'READY', modelCount: 1, successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null }],
  llmModels: [{ modelIdentifier: exactModel, name: 'GPT-6.1 Sol', description: null, value: exactModel, canonicalName: exactModel,
    providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: runtimeKind, hostUrl: null,
    configSchema: rawSchema, maxContextTokens: null, activeContextTokens: null, maxInputTokens: null,
    maxOutputTokens: null, metadataProvenance: null, selectionPresentation: { recommended: false } }],
  audioModels: [], imageModels: [], videoModels: [],
}]
let fixture: ReturnType<typeof seedFixture>, wrapper: ReturnType<typeof mount>
let requests: Array<{ kind: string; succeed(): void; fail(): void; delivered: boolean }>
let capabilityKinds: string[]
const pending = (runtimeKind = kind) => requests.find(r => r.kind === runtimeKind && !r.delivered)!
const settle = async () => { await flushPromises(); await flushPromises() }
const draft = () => useAgentOrgRunConfigStore()
const rootFields = () => wrapper.findAllComponents(Fields).find(w => w.props('idPrefix') === 'org-run')!
const member = () => wrapper.findAllComponents(MemberOverrideItem).find(w => w.props('node').address === '/team/lead')!
const scopes = ['/', '/director', '/worker', '/team', '/team/lead', '/team/worker']
const expectedStates = (status: string) => Object.fromEntries(scopes.map(address => [address, status]))
const states = () => Object.fromEntries(scopes.map(address => [address, draft().modelSchemaStateFor(address as any).status]))
const exactDraft = () => JSON.stringify({ runtimeKind: draft().runtimeKind, model: draft().llmModelIdentifier,
  config: draft().llmConfig, teams: draft().teamOverrides, agents: draft().agentOverrides })
const retry = async (w: ReturnType<typeof mount>) => {
  const button = w.findAll('button').find(b => b.text() === 'Retry')!
  expect(button).toBeDefined(); await button.trigger('click'); await settle()
}

beforeEach(() => {
  setActivePinia(createPinia()); fixture = seedFixture(); requests = []; capabilityKinds = []
  fixture.definition.defaultLaunchConfig = { runtimeKind: kind, llmModelIdentifier: exactModel, llmConfig: config }
  io.route = reactive({ query: { definitionId: fixture.definition.id, mode: 'configuration' } })
  const orgs = useAgentOrgDefinitionStore(); orgs.definitions = [fixture.definition]
  vi.spyOn(orgs, 'fetchAll').mockResolvedValue(undefined)
  const agents = useAgentDefinitionStore(); agents.agentDefinitions = Object.values(fixture.references.agents) as any
  const teams = useAgentTeamDefinitionStore(); teams.agentTeamDefinitions = Object.values(fixture.references.teams) as any
  vi.spyOn(agents, 'fetchAllAgentDefinitions').mockResolvedValue(undefined)
  vi.spyOn(teams, 'fetchAllAgentTeamDefinitions').mockResolvedValue(undefined)
  vi.spyOn(useWorkspaceStore(), 'fetchAllWorkspaces').mockResolvedValue(undefined)
  io.client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
    const runtime = operation.variables.runtimeKind
    if (operation.operationName === 'GetProviderModelCatalogSnapshots') {
      const request = { kind: runtime, delivered: false,
        succeed() { request.delivered = true; observer.next({ data: { providerModelCatalogSnapshots: catalog(runtime) } }); observer.complete() },
        fail() { request.delivered = true; observer.next({ errors: [{ message: `Transient catalog outage: ${runtime}` }] }); observer.complete() },
      }
      requests.push(request); return
    }
    let data: any
    if (operation.operationName === 'GetRuntimeAvailabilityKinds') data = { runtimeAvailabilityKinds: [kind, 'autobyteus'] }
    else if (operation.operationName === 'GetRuntimeAvailability') {
      capabilityKinds.push(runtime); data = { runtimeAvailability: { runtimeKind: runtime, enabled: true, reason: null } }
    } else if (operation.operationName === 'RuntimeCurrentModelDescriptors') {
      data = { runtimeCurrentModelDescriptors: operation.variables.identifiers.map((identifier: string) => ({ identifier, model: null })) }
    } else if (operation.operationName === 'GetAgentOrgReferencedTeam') data = { agentTeamDefinition: fixture.references.teams[operation.variables.id] }
    else if (operation.operationName === 'GetAgentOrgReferencedAgent') data = { agentDefinition: fixture.references.agents[operation.variables.id] }
    else throw new Error(`Unexpected local operation ${operation.operationName}`)
    setTimeout(() => { observer.next({ data }); observer.complete() }, 0)
  })) })

})
afterEach(() => { wrapper?.unmount(); useLLMProviderConfigStore().resetCatalogState(); io.client.stop(); vi.restoreAllMocks() })

const mountWithOutage = async () => {
  wrapper = mount(Panel); await settle()
  draft().setWorkspaceSelection({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/fixture/root' }, 'explicit')
  await settle()
  expect(requests.filter(r => r.kind === kind)).toHaveLength(1) // shared initial read, actual Apollo query manager
  pending().fail(); await settle()
  expect(states()).toEqual(expectedStates('unavailable'))
}

describe('real shared catalog publication through mounted inherited Org scopes (CR-001)', () => {
  it.each(['root', 'inherited-member'])('recovers the exact affected scopes via %s Retry without an override/model/config write', async source => {
    await mountWithOutage()
    if (source === 'inherited-member') expect(member().get('[data-test="agent-runtime-catalog-error"]').text()).toContain(`Transient catalog outage: ${kind}`)
    expect(member().text()).toContain('Global default')
    const before = exactDraft(), epoch = draft().draftEpoch
    // Real schema/admission guards remain closed before the selected Retry response.
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
    await retry(source === 'root' ? rootFields() : member())
    expect(states()).toEqual(expectedStates('loading'))
    expect(requests.filter(r => r.kind === kind)).toHaveLength(2)
    pending().succeed(); await settle()
    expect(states()).toEqual(expectedStates('ready'))
    expect(member().find('[data-test="agent-runtime-catalog-error"]').exists()).toBe(false)
    expect(exactDraft()).toBe(before); expect(draft().draftEpoch).toBe(epoch)
    expect(draft().teamOverrides).toEqual({}); expect(draft().agentOverrides).toEqual({})
    expect(member().emitted('update:override')).toBeUndefined()
    expect(rootFields().emitted('update:llmModelIdentifier')).toBeUndefined()
    expect(rootFields().emitted('update:llmConfig')).toBeUndefined()
    expect(capabilityKinds.filter(k => k === kind)).toHaveLength(2)
  })

  it('does not heal a different-runtime outage, a missing selected model, or invalid inherited config', async () => {
    await mountWithOutage()
    draft().setTeamOverride('/team', { runtimeKind: 'autobyteus' }); await settle()
    pending('autobyteus').fail(); await settle()
    draft().setAgentOverride('/director', { llmModelIdentifier: 'unavailable-exact-model' }); await settle()
    const before = exactDraft()
    await retry(rootFields()); pending().succeed(); await settle()
    expect(draft().modelSchemaStateFor('/')).toMatchObject({ status: 'ready' })
    expect(draft().modelSchemaStateFor('/director')).toMatchObject({ status: 'unavailable' })
    expect(draft().modelSchemaStateFor('/team')).toMatchObject({ status: 'unavailable', message: 'Transient catalog outage: autobyteus' })
    expect(draft().modelSchemaStateFor('/team/lead')).toMatchObject({ status: 'unavailable', message: 'Transient catalog outage: autobyteus' })
    expect(exactDraft()).toBe(before)
    expect(requests.filter(r => r.kind === 'autobyteus')).toHaveLength(1)
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
    draft().setTeamOverride('/team', null); draft().setAgentOverride('/director', null)
    draft().setRootLlmConfig({ ...config, temperature: 9 }); await settle()
    expect(states()).toEqual(expectedStates('invalid'))
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
  })

  it('retains a failed explicit runtime edit until that requested edit is explicitly retried', async () => {
    wrapper = mount(Panel); await settle(); pending().succeed(); await settle()
    await member().get('select').setValue('autobyteus'); await settle(); pending('autobyteus').fail(); await settle()
    expect(draft().agentOverrides).toEqual({})
    expect(member().get('[data-test="agent-runtime-catalog-error"]').text()).toContain('autobyteus')
    const recovery = useLLMProviderConfigStore().refreshLocalCatalog('autobyteus')
    pending('autobyteus').succeed(); await recovery; await settle()
    expect(draft().modelSchemaStateFor('/team/lead')).toMatchObject({ status: 'unavailable', message: 'Transient catalog outage: autobyteus' })
    expect(draft().agentOverrides).toEqual({})
    await retry(member()); await settle()
    expect(draft().agentOverrides['/team/lead']).toEqual({ runtimeKind: 'autobyteus', llmConfig: null })
    expect(draft().modelSchemaStateFor('/team/lead')).toMatchObject({ status: 'ready' })
    expect(member().find('[data-test="agent-runtime-catalog-error"]').exists()).toBe(false)
  })
})
