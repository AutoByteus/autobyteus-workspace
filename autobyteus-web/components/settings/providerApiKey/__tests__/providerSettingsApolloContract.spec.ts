// @ts-expect-error @apollo/client is supplied by the existing @nuxtjs/apollo integration.
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET_PROVIDER_CREDENTIAL_SETTINGS,
  GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS,
} from '~/graphql/queries/llm_provider_queries'
import {
  ENSURE_PROVIDER_MODEL_CATALOG,
  RELOAD_PROVIDER_MODEL_CATALOG,
} from '~/graphql/mutations/llm_provider_mutations'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'
import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}))

const provider = (id: string, catalogMode: 'STATIC' | 'DISCOVERED' = 'STATIC') => ({
  __typename: 'CatalogProviderObject',
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id,
  providerType: id,
  isCustom: false,
  baseUrl: null,
  catalogMode,
})
const model = (id: string, providerId: string) => ({
  __typename: 'ModelDetail',
  modelIdentifier: id,
  name: id,
  description: null,
  value: id,
  canonicalName: id,
  providerId,
  providerName: providerId,
  providerType: providerId,
  runtime: 'autobyteus',
  hostUrl: null,
  configSchema: null,
  maxContextTokens: null,
  activeContextTokens: null,
  maxInputTokens: null,
  maxOutputTokens: null,
  metadataProvenance: null,
})

describe('split provider credential/catalog Apollo contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('joins credential facts to credential-free local snapshots by provider ID', async () => {
    const cache = new InMemoryCache()
    const link = new ApolloLink((operation: { operationName: string }) => new Observable((observer: never) => {
      const sink = observer as never as { next: (value: unknown) => void; complete: () => void }
      const data = operation.operationName === 'GetProviderCredentialSettings'
        ? {
            providerCredentialSettings: [{
              __typename: 'ProviderCredentialSettingObject',
              provider: provider('OPENAI'),
              apiKeyConfigured: true,
            }],
          }
        : {
            providerModelCatalogSnapshots: [{
              __typename: 'ProviderModelCatalogSnapshotObject',
              runtimeKind: 'autobyteus',
              ownerProvider: provider('OPENAI'),
              sources: [],
              llmModels: [model('gpt-4.1', 'OPENAI')],
              audioModels: [], imageModels: [], videoModels: [],
            }],
          }
      sink.next({ data })
      sink.complete()
    }))
    const client = new ApolloClient({ cache, link })
    vi.mocked(getApolloClient).mockReturnValue(client as never)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(defineComponent({
      setup: () => ({ runtime: useProviderApiKeySectionRuntime() }),
      render: () => h('div'),
    }), { global: { plugins: [pinia] } })

    await (wrapper.vm as never as { runtime: { initialize: () => Promise<void> } }).runtime.initialize()
    await vi.waitFor(() => {
      expect(useLLMProviderConfigStore().catalogSnapshot('autobyteus').state).toBe('ready')
    })
    const runtime = (wrapper.vm as never as { runtime: Record<string, unknown> }).runtime
    const read = (value: unknown) => (value as { value?: unknown })?.value ?? value
    expect(read(runtime.selectedProviderId)).toBe('OPENAI')
    expect(read(runtime.selectedProviderConfigured)).toBe(true)
    expect(read(runtime.selectedProviderLlmModels)).toEqual([
      expect.objectContaining({ modelIdentifier: 'gpt-4.1' }),
    ])
    expect(useLLMProviderConfigStore().providers('autobyteus')[0]?.provider)
      .not.toHaveProperty('apiKeyConfigured')
    expect(JSON.stringify(cache.extract())).not.toContain('credentialStatus')
  })

  it('keeps a static credential command independent from catalog operations', async () => {
    const client = {
      mutate: vi.fn().mockResolvedValue({ data: {
        saveProviderApiKey: { provider: provider('OPENAI'), apiKeyConfigured: true },
      } }),
      query: vi.fn(),
    }
    vi.mocked(getApolloClient).mockReturnValue(client as never)
    setActivePinia(createPinia())
    const store = useLLMProviderConfigStore()

    await expect(store.setLLMProviderApiKey('OPENAI', 'synthetic-key'))
      .resolves.toMatchObject({ apiKeyConfigured: true })
    expect(client.mutate).toHaveBeenCalledTimes(1)
    expect(client.query).not.toHaveBeenCalled()
  })

  it('keeps credentials out of local snapshot and targeted catalog documents', () => {
    const credentialText = GET_PROVIDER_CREDENTIAL_SETTINGS.loc?.source.body ?? ''
    const catalogText = GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS.loc?.source.body ?? ''
    const ensureText = ENSURE_PROVIDER_MODEL_CATALOG.loc?.source.body ?? ''
    const reloadText = RELOAD_PROVIDER_MODEL_CATALOG.loc?.source.body ?? ''

    expect(credentialText).toContain('apiKeyConfigured')
    expect(catalogText).not.toContain('apiKeyConfigured')
    expect(catalogText).toContain('providerModelCatalogSnapshots')
    expect(catalogText).toContain('sources')
    expect(ensureText).toContain('ensureProviderModelCatalog')
    expect(reloadText).toContain('reloadProviderModelCatalog')
    expect(reloadText).not.toContain('reloadLlmModels')
  })
})
