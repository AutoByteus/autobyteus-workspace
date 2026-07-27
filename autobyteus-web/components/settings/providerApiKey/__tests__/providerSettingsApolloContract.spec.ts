// @ts-expect-error @apollo/client is supplied by the existing @nuxtjs/apollo integration.
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApolloClient } from '~/utils/apolloClient'
import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string>) =>
      `${key}${params?.provider ? `:${params.provider}` : ''}`,
  }),
}))

const provider = (id: string, configured: boolean) => ({
  __typename: 'LlmProviderObject',
  id,
  name: id === 'OPENAI' ? 'OpenAI' : 'Anthropic',
  providerType: id,
  isCustom: false,
  baseUrl: null,
  apiKeyConfigured: configured,
  status: 'NOT_APPLICABLE',
  statusMessage: null,
})

const model = (id: string, providerType: string) => ({
  __typename: 'ModelDetail', modelIdentifier: id, name: id, providerType,
})

describe('provider-centric Settings Apollo contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps one exact provider status across subordinate LLM/audio/image rows', async () => {
    const cache = new InMemoryCache()
    const link = new ApolloLink((operation: { operationName: string }) => new Observable((
      observer: {
        next: (value: { data: Record<string, unknown> }) => void
        complete: () => void
      },
    ) => {
      const data = operation.operationName === 'GetGeminiSetupConfig'
        ? {
            getGeminiSetupConfig: {
              __typename: 'GeminiSetupStateObject',
              activeMode: null,
              aiStudioConfigured: false,
              vertexExpressConfigured: false,
              vertexProject: null,
            },
          }
        : {
            providerSettings: [
              {
                __typename: 'ProviderSettingsGroup',
                provider: provider('ANTHROPIC', false),
                llmModels: [model('claude', 'ANTHROPIC')],
                audioModels: [], imageModels: [], videoModels: [],
              },
              {
                __typename: 'ProviderSettingsGroup',
                provider: provider('OPENAI', true),
                llmModels: [model('gpt-4.1', 'OPENAI')],
                audioModels: [model('whisper-1', 'OPENAI')],
                imageModels: [model('gpt-image-1', 'OPENAI')],
                videoModels: [],
              },
            ],
          }
      observer.next({ data })
      observer.complete()
    }))
    const client = new ApolloClient({ cache, link })
    vi.mocked(getApolloClient).mockReturnValue(client as any)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(defineComponent({
      setup() {
        const runtime = useProviderApiKeySectionRuntime()
        return { runtime }
      },
      render: () => h('div'),
    }), { global: { plugins: [pinia] } })

    await (wrapper.vm as any).runtime.initialize()

    const runtime = (wrapper.vm as any).runtime
    const read = (value: any) => value?.value ?? value
    expect(read(runtime.allProvidersWithModels).filter((row: any) => !row.isDraft)).toHaveLength(2)
    expect(read(runtime.selectedProviderId)).toBe('OPENAI')
    expect(read(runtime.selectedProviderConfigured)).toBe(true)
    expect(read(runtime.selectedProviderLlmModels)).toHaveLength(1)
    expect(read(runtime.selectedProviderAudioModels)).toHaveLength(1)
    expect(read(runtime.selectedProviderImageModels)).toHaveLength(1)
    expect(runtime.isProviderConfigured('ANTHROPIC')).toBe(false)
    expect(runtime.isProviderConfigured('OPENAI')).toBe(true)

    const extracted = cache.extract()
    expect(extracted['LlmProviderObject:OPENAI']).toEqual(expect.objectContaining({
      apiKeyConfigured: true,
    }))
    expect(JSON.stringify(extracted)).not.toContain('credentialStatus')
  })
})
