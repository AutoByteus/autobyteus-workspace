import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_LLM_PROVIDER_API_KEY_CONFIGURED,
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_GEMINI_SETUP_CONFIG,
} from '~/graphql/queries/llm_provider_queries'
import {
  CREATE_CUSTOM_LLM_PROVIDER,
  DELETE_CUSTOM_LLM_PROVIDER,
  PROBE_CUSTOM_LLM_PROVIDER,
  SET_LLM_PROVIDER_API_KEY,
  RELOAD_LLM_MODELS,
  RELOAD_LLM_PROVIDER_MODELS,
  SET_GEMINI_SETUP_CONFIG,
} from '~/graphql/mutations/llm_provider_mutations'
import type { LLMProvider } from '~/types/llm'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'

interface LLMProviderConfig {
  apiKeyConfigured?: boolean
}

export type LlmProviderStatus = 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE'

export interface LlmProviderRecord {
  id: string
  name: string
  providerType: LLMProvider
  isCustom: boolean
  baseUrl?: string | null
  apiKeyConfigured: boolean
  status: LlmProviderStatus
  statusMessage?: string | null
}

export interface ModelInfo {
  modelIdentifier: string
  name: string
  value: string
  canonicalName: string
  providerId: string
  providerName: string
  providerType: LLMProvider
  runtime: string
  hostUrl?: string | null
  configSchema?: Record<string, unknown> | null
  maxContextTokens?: number | null
  activeContextTokens?: number | null
  maxInputTokens?: number | null
  maxOutputTokens?: number | null
}

export interface ProviderWithModels {
  provider: LlmProviderRecord
  models: ModelInfo[]
}

export interface CustomLlmProviderDraftInput {
  name: string
  providerType: LLMProvider | string
  baseUrl: string
  apiKey: string
}

export interface CustomLlmProviderProbeModel {
  id: string
  name: string
}

export interface CustomLlmProviderProbeResult {
  name: string
  providerType: LLMProvider
  baseUrl: string
  discoveredModels: CustomLlmProviderProbeModel[]
}

export type GeminiSetupMode = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT'

export interface GeminiSetupConfigState {
  mode: GeminiSetupMode
  geminiApiKeyConfigured: boolean
  vertexApiKeyConfigured: boolean
  vertexProject: string | null
  vertexLocation: string | null
}

export interface GeminiSetupConfigInput {
  mode: GeminiSetupMode
  geminiApiKey?: string | null
  vertexApiKey?: string | null
  vertexProject?: string | null
  vertexLocation?: string | null
}

const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  mode: 'AI_STUDIO',
  geminiApiKeyConfigured: false,
  vertexApiKeyConfigured: false,
  vertexProject: null,
  vertexLocation: null,
})

const syncProviderConfiguredState = (
  rows: ProviderWithModels[],
  providerConfigs: Record<string, LLMProviderConfig>,
): Record<string, LLMProviderConfig> => {
  const nextConfigs = { ...providerConfigs }
  for (const row of rows) {
    nextConfigs[row.provider.id] = {
      ...(nextConfigs[row.provider.id] ?? {}),
      apiKeyConfigured: row.provider.apiKeyConfigured,
    }
  }
  return nextConfigs
}

const replaceProviderConfiguredState = (
  rows: ProviderWithModels[],
  providerId: string,
  apiKeyConfigured: boolean,
): ProviderWithModels[] =>
  rows.map((row) =>
    row.provider.id === providerId
      ? {
          ...row,
          provider: {
            ...row.provider,
            apiKeyConfigured,
          },
        }
      : row,
  )

const resolveGeminiProviderConfiguredState = (setup: GeminiSetupConfigState): boolean => {
  if (setup.mode === 'VERTEX_EXPRESS') {
    return setup.vertexApiKeyConfigured
  }

  if (setup.mode === 'VERTEX_PROJECT') {
    return Boolean((setup.vertexProject ?? '').trim() && (setup.vertexLocation ?? '').trim())
  }

  return setup.geminiApiKeyConfigured
}

export const useLLMProviderConfigStore = defineStore('llmProviderConfig', {
  state: () => ({
    providersWithModels: [] as ProviderWithModels[],
    audioProvidersWithModels: [] as ProviderWithModels[],
    imageProvidersWithModels: [] as ProviderWithModels[],
    providerConfigs: {} as Record<string, LLMProviderConfig>,
    isLoadingModels: false,
    isReloadingModels: false,
    isReloadingProviderModels: false,
    reloadingProvider: null as string | null,
    hasFetchedProviders: false,
    modelRuntimeKind: 'autobyteus',
    geminiSetup: defaultGeminiSetup(),
  }),
  getters: {
    providers(state): string[] {
      return state.providersWithModels.map((row) => row.provider.id)
    },
    models(state): string[] {
      return state.providersWithModels.flatMap((row) => row.models.map((model) => model.modelIdentifier))
    },
    audioModels(state): string[] {
      return state.audioProvidersWithModels.flatMap((row) => row.models.map((model) => model.modelIdentifier))
    },
    imageModels(state): string[] {
      return state.imageProvidersWithModels.flatMap((row) => row.models.map((model) => model.modelIdentifier))
    },
    providerById(state): (providerId: string | null | undefined) => LlmProviderRecord | null {
      return (providerId: string | null | undefined) => {
        if (!providerId) return null
        return state.providersWithModels.find((row) => row.provider.id === providerId)?.provider ?? null
      }
    },
    providersWithModelsForSelection(state): ProviderWithModels[] {
      return state.providersWithModels.filter((row) => row.models && row.models.length > 0)
    },
    modelConfigSchemaByIdentifier(state): (modelIdentifier: string | null | undefined) => UiModelConfigSchema | null {
      return (modelIdentifier: string | null | undefined) => {
        if (!modelIdentifier) return null
        for (const provider of state.providersWithModels) {
          const model = provider.models.find((entry) => entry.modelIdentifier === modelIdentifier)
          if (model?.configSchema) {
            const normalized = normalizeModelConfigSchema(model.configSchema)
            if (normalized && Object.keys(normalized).length > 0) {
              return normalized
            }
          }
        }
        return null
      }
    },
    canonicalModels(state): string[] {
      const canonicalSet = new Set<string>()
      state.providersWithModels.forEach((provider) => {
        provider.models.forEach((model) => {
          if (model.canonicalName) {
            canonicalSet.add(model.canonicalName)
          }
        })
      })
      const models = Array.from(canonicalSet).sort()
      models.unshift('default')
      return models
    },
  },
  actions: {
    getProviderForModel(modelIdentifier: string): LLMProvider | null {
      if (!modelIdentifier || !this.providersWithModels) {
        return null
      }

      for (const providerGroup of this.providersWithModels) {
        const model = providerGroup.models.find((entry) => entry.modelIdentifier === modelIdentifier)
        if (model) {
          return model.providerType
        }
      }

      return null
    },

    getModelValue(modelIdentifier: string): string | null {
      for (const providerGroup of this.providersWithModels) {
        const model = providerGroup.models.find((entry) => entry.modelIdentifier === modelIdentifier)
        if (model) {
          return model.value
        }
      }
      return null
    },

    getModelIdentifierByValue(value: string): string | null {
      for (const providerGroup of this.providersWithModels) {
        const model = providerGroup.models.find((entry) => entry.value === value)
        if (model) {
          return model.modelIdentifier
        }
      }
      return null
    },

    async fetchProvidersWithModels(runtimeKind = 'autobyteus') {
      if (this.hasFetchedProviders && this.modelRuntimeKind === runtimeKind) return this.providersWithModels
      this.isLoadingModels = true
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
          variables: { runtimeKind },
        })

        this.providersWithModels = data?.availableLlmProvidersWithModels ?? []
        this.audioProvidersWithModels = data?.availableAudioProvidersWithModels ?? []
        this.imageProvidersWithModels = data?.availableImageProvidersWithModels ?? []
        this.providerConfigs = syncProviderConfiguredState(this.providersWithModels, this.providerConfigs)
        this.modelRuntimeKind = runtimeKind
        this.hasFetchedProviders = true
        return this.providersWithModels
      } catch (error) {
        console.error('Failed to fetch providers and models:', error)
        this.providersWithModels = []
        this.audioProvidersWithModels = []
        this.imageProvidersWithModels = []
        throw error
      } finally {
        this.isLoadingModels = false
      }
    },

    async reloadProvidersWithModels(options: { showLoading?: boolean; runtimeKind?: string } = {}) {
      const { showLoading = true } = options
      const runtimeKind = options.runtimeKind ?? this.modelRuntimeKind ?? 'autobyteus'
      if (showLoading) {
        this.isReloadingModels = true
      }
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
          variables: { runtimeKind },
          fetchPolicy: 'network-only',
        })

        this.providersWithModels = data?.availableLlmProvidersWithModels ?? []
        this.audioProvidersWithModels = data?.availableAudioProvidersWithModels ?? []
        this.imageProvidersWithModels = data?.availableImageProvidersWithModels ?? []
        this.providerConfigs = syncProviderConfiguredState(this.providersWithModels, this.providerConfigs)
        this.modelRuntimeKind = runtimeKind
        this.hasFetchedProviders = true
        return this.providersWithModels
      } catch (error) {
        console.error('Failed to reload providers and models:', error)
        this.providersWithModels = []
        this.audioProvidersWithModels = []
        this.imageProvidersWithModels = []
        throw error
      } finally {
        if (showLoading) {
          this.isReloadingModels = false
        }
      }
    },

    async reloadModels() {
      this.isReloadingModels = true

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: RELOAD_LLM_MODELS,
          variables: {
            runtimeKind: this.modelRuntimeKind,
          },
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const responseMessage = data?.reloadLlmModels

        if (responseMessage && responseMessage.includes('successfully')) {
          await this.reloadProvidersWithModels()
          return true
        }

        throw new Error(responseMessage || 'Failed to reload models')
      } catch (error) {
        console.error('Failed to reload models:', error)
        throw error
      } finally {
        this.isReloadingModels = false
      }
    },

    async reloadModelsForProvider(providerId: string) {
      if (!providerId) {
        throw new Error('Provider is required to reload models.')
      }

      this.isReloadingProviderModels = true
      this.reloadingProvider = providerId

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: RELOAD_LLM_PROVIDER_MODELS,
          variables: {
            providerId,
            runtimeKind: this.modelRuntimeKind,
          },
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const responseMessage = data?.reloadLlmProviderModels

        if (responseMessage && responseMessage.includes('successfully')) {
          await this.reloadProvidersWithModels({ showLoading: false })
          return true
        }

        throw new Error(responseMessage || 'Failed to reload provider models')
      } catch (error) {
        console.error(`Failed to reload models for provider ${providerId}:`, error)
        throw error
      } finally {
        this.isReloadingProviderModels = false
        this.reloadingProvider = null
      }
    },

    async setLLMProviderApiKey(providerId: string, apiKey: string) {
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: SET_LLM_PROVIDER_API_KEY,
          variables: { providerId, apiKey },
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const responseMessage = data?.setLlmProviderApiKey

        if (responseMessage && responseMessage.includes('successfully')) {
          this.providerConfigs[providerId] = { apiKeyConfigured: true }
          this.providersWithModels = replaceProviderConfiguredState(this.providersWithModels, providerId, true)

          if (providerId === 'AUTOBYTEUS') {
            await this.reloadModels()
          }
          return true
        }

        throw new Error(responseMessage || 'Failed to set API key')
      } catch (error) {
        console.error('Failed to set provider API key:', error)
        throw error
      }
    },

    async getLLMProviderApiKeyConfigured(providerId: string) {
      const currentValue = this.providersWithModels.find((row) => row.provider.id === providerId)?.provider.apiKeyConfigured
      if (typeof currentValue === 'boolean') {
        this.providerConfigs[providerId] = { apiKeyConfigured: currentValue }
        return currentValue
      }

      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_LLM_PROVIDER_API_KEY_CONFIGURED,
          variables: { providerId },
        })

        const apiKeyConfigured = Boolean(data?.getLlmProviderApiKeyConfigured)
        this.providerConfigs[providerId] = { apiKeyConfigured }
        return apiKeyConfigured
      } catch (error) {
        console.error(`Failed to get provider API key configured status for ${providerId}:`, error)
        throw error
      }
    },

    async probeCustomProvider(input: CustomLlmProviderDraftInput) {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: PROBE_CUSTOM_LLM_PROVIDER,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      return data?.probeCustomLlmProvider as CustomLlmProviderProbeResult
    },

    async createCustomProvider(input: CustomLlmProviderDraftInput, runtimeKind?: string) {
      const resolvedRuntimeKind = runtimeKind ?? this.modelRuntimeKind
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: CREATE_CUSTOM_LLM_PROVIDER,
        variables: { input, runtimeKind: resolvedRuntimeKind },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const provider = data?.createCustomLlmProvider as LlmProviderRecord | undefined
      if (!provider) {
        throw new Error('Failed to create custom provider')
      }

      await this.reloadProvidersWithModels({ showLoading: false, runtimeKind: resolvedRuntimeKind })
      return provider
    },

    async deleteCustomProvider(providerId: string, runtimeKind?: string) {
      const resolvedRuntimeKind = runtimeKind ?? this.modelRuntimeKind
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DELETE_CUSTOM_LLM_PROVIDER,
        variables: { providerId, runtimeKind: resolvedRuntimeKind },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const responseMessage = data?.deleteCustomLlmProvider as string | undefined
      if (!responseMessage || !responseMessage.includes('successfully')) {
        throw new Error(responseMessage || 'Failed to delete custom provider')
      }

      delete this.providerConfigs[providerId]
      await this.reloadProvidersWithModels({ showLoading: false, runtimeKind: resolvedRuntimeKind })
      return true
    },

    async fetchGeminiSetupConfig() {
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_GEMINI_SETUP_CONFIG,
          fetchPolicy: 'network-only',
        })

        this.geminiSetup = data?.getGeminiSetupConfig ?? defaultGeminiSetup()
        return this.geminiSetup
      } catch (error) {
        console.error('Failed to fetch Gemini setup config:', error)
        this.geminiSetup = defaultGeminiSetup()
        throw error
      }
    },

    async setGeminiSetupConfig(input: GeminiSetupConfigInput) {
      const client = getApolloClient()

      try {
        const { data, errors } = await client.mutate({
          mutation: SET_GEMINI_SETUP_CONFIG,
          variables: {
            mode: input.mode,
            geminiApiKey: input.geminiApiKey ?? null,
            vertexApiKey: input.vertexApiKey ?? null,
            vertexProject: input.vertexProject ?? null,
            vertexLocation: input.vertexLocation ?? null,
          },
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const responseMessage = data?.setGeminiSetupConfig
        if (!responseMessage || !responseMessage.includes('successfully')) {
          throw new Error(responseMessage || 'Failed to save Gemini setup')
        }

        await this.fetchGeminiSetupConfig()
        const geminiConfigured = resolveGeminiProviderConfiguredState(this.geminiSetup)
        this.providerConfigs.GEMINI = { apiKeyConfigured: geminiConfigured }
        this.providersWithModels = replaceProviderConfiguredState(this.providersWithModels, 'GEMINI', geminiConfigured)
        return true
      } catch (error) {
        console.error('Failed to set Gemini setup config:', error)
        throw error
      }
    },
  },
})
