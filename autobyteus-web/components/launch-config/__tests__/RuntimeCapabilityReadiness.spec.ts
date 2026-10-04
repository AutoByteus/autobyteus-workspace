import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import RuntimeModelConfigFields from '../RuntimeModelConfigFields.vue'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { ControlledOrgApollo } from '~/test-support/agentOrgApolloFixture'
const io = vi.hoisted(() => ({ client: null as any, refresh: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: () => ({
  fetchProvidersWithModels: async () => undefined, refreshLocalCatalog: io.refresh,
  ensureMissingDynamicProviders: async () => undefined, providerSnapshots: () => [],
  catalogSnapshot: (runtimeKind: string) => ({ runtimeKind, state: 'ready', errorMessage: null }),
  providersWithModelsForSelection: () => [{
    provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
    models: [{ modelIdentifier: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', value: 'gpt-6.1-sol',
      canonicalName: 'gpt-6.1-sol', providerId: 'OPENAI', providerName: 'OpenAI',
      providerType: 'OPENAI', runtime: 'api', configSchema: null }],
  }],
}) }))
let transport: ControlledOrgApollo, wrapper: ReturnType<typeof mount>
const capability = (kind: string) => transport.pending('GetRuntimeAvailability')
  .find(call => call.operation.variables.runtimeKind === kind)!
const respond = (kind: string, enabled = true) => capability(kind).respond({ runtimeAvailability: {
  runtimeKind: kind, enabled, reason: enabled ? null : 'Missing CLI',
} })
const schema = () => wrapper.emitted('schema-state')?.at(-1)?.[0]
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  transport = new ControlledOrgApollo(); io.client = transport.client; io.refresh.mockResolvedValue(undefined)
})
afterEach(() => { wrapper?.unmount(); transport.client.stop(); vi.restoreAllMocks() })
describe('shared config fields with independently verified real capability store', () => {
  it('keeps exact Codex/model selection pending, then ready while unrelated discovery and collection remain pending', async () => {
    wrapper = mount(RuntimeModelConfigFields, { props: {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6.1-sol', runtimeSelectionLocked: true,
    } })
    await flushPromises()
    expect(schema()).toEqual({ status: 'loading', message: null })
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('codex_app_server')
    transport.pending('GetRuntimeAvailabilityKinds')[0]!.respond({ runtimeAvailabilityKinds: ['codex_app_server', 'antigravity_cli'] })
    await flushPromises(); respond('codex_app_server'); await flushPromises()
    expect(schema()).toEqual({ status: 'ready', message: null })
    expect(wrapper.text()).toContain('GPT-6.1 Sol')
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    expect(useRuntimeAvailabilityStore().isLoading).toBe(true)
    expect(useRuntimeAvailabilityStore().hasFetched).toBe(false)
    respond('antigravity_cli', false); await flushPromises()
    expect(schema()).toEqual({ status: 'ready', message: null })
  })
  it('shows selected verification failure and retries only that capability plus its catalog despite inventory failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6.1-sol' } })
    transport.pending('GetRuntimeAvailabilityKinds')[0]!.fail('Inventory unavailable')
    capability('codex_app_server').fail('Capability unavailable'); await flushPromises()
    expect(schema()).toEqual({ status: 'unavailable', message: 'Capability unavailable' })
    const retry = wrapper.findAll('button').find(button => button.text() === 'Retry')!
    expect(retry).toBeDefined(); await retry.trigger('click'); await flushPromises()
    expect(schema()).toEqual({ status: 'loading', message: null })
    expect(transport.named('GetRuntimeAvailabilityKinds')).toHaveLength(1)
    expect(transport.named('GetRuntimeAvailability').map(call => call.operation.variables.runtimeKind))
      .toEqual(['codex_app_server', 'codex_app_server'])
    expect(io.refresh).toHaveBeenCalledExactlyOnceWith('codex_app_server')
    respond('codex_app_server'); await flushPromises()
    expect(schema()).toEqual({ status: 'ready', message: null })
    expect(useRuntimeAvailabilityStore().hasFetched).toBe(false)
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
  })
  it('does not optimistically enable native capability for a blank inherited/default runtime', async () => {
    wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: '', allowBlankRuntime: true, llmModelIdentifier: 'gpt-6.1-sol' } })
    await flushPromises(); expect(schema()).toEqual({ status: 'loading', message: null })
    expect(useRuntimeAvailabilityStore().isRuntimeEnabled('autobyteus')).toBe(false)
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
    transport.pending('GetRuntimeAvailabilityKinds')[0]!.respond({ runtimeAvailabilityKinds: ['autobyteus'] })
    respond('autobyteus'); await flushPromises()
    expect(schema()).toEqual({ status: 'ready', message: null })
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
  })
})
