import { defineStore } from 'pinia'
import {
  CREATE_CUSTOM_PROVIDER,
  DELETE_CUSTOM_PROVIDER,
  PROBE_CUSTOM_PROVIDER,
  RELOAD_LLM_MODELS,
  RELOAD_LLM_PROVIDER_MODELS,
  SAVE_GEMINI_AI_STUDIO,
  SAVE_GEMINI_VERTEX_EXPRESS,
  SAVE_GEMINI_VERTEX_PROJECT,
  SAVE_PROVIDER_API_KEY,
  SAVE_QWEN_CONFIGURATION,
  USE_GEMINI_MODE,
} from '~/graphql/mutations/llm_provider_mutations'
import {
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_GEMINI_SETUP_CONFIG,
  GET_PROVIDER_SETTINGS,
  GET_QWEN_SETUP_STATUS,
} from '~/graphql/queries/llm_provider_queries'
import type { LLMProvider } from '~/types/llm'
import { getApolloClient } from '~/utils/apolloClient'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import {
  defaultGeminiSetup,
  defaultQwenSetupStatus,
  type CatalogProviderRecord,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type GeminiConfigurationOption,
  type GeminiOptionSaveInput,
  type GeminiSetupConfigState,
  type ProviderSettingsGroup,
  type ProviderWithModels,
  type QwenConfigurationInput,
  type QwenSetupStatus,
} from './llmProviderConfigSupport'
export * from './llmProviderConfigSupport'

export const PROVIDER_SETTINGS_RUNTIME_KIND = 'autobyteus'

const requireMutationSuccess = (
  data: Record<string, unknown> | null | undefined,
  errors: readonly { message: string }[] | undefined,
  key: string,
): void => {
  throwGraphqlErrors(errors)
  if (data?.[key] !== true) throw new Error(`${key} did not complete`)
}

const throwGraphqlErrors = (
  errors: readonly { message: string }[] | null | undefined,
): void => {
  if (errors?.length) throw new Error(errors.map(error => error.message).join(', '))
}

export class QwenConfigurationMutationError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message)
    this.name = 'QwenConfigurationMutationError'
  }
}

const throwQwenGraphqlErrors = (
  errors: readonly { message: string; extensions?: Record<string, unknown> }[] | null | undefined,
): void => {
  const first = errors?.[0]
  if (!first) return
  const code = typeof first.extensions?.code === 'string' ? first.extensions.code : null
  throw new QwenConfigurationMutationError(first.message, code)
}

const normalizeQwenMutationFailure = (error: unknown): QwenConfigurationMutationError => {
  if (error instanceof QwenConfigurationMutationError) return error
  const graphQLError = (error as {
    graphQLErrors?: Array<{ message?: string; extensions?: Record<string, unknown> }>
  } | null)?.graphQLErrors?.[0]
  const message = graphQLError?.message
    || (error instanceof Error ? error.message : 'Qwen configuration operation failed')
  const code = typeof graphQLError?.extensions?.code === 'string'
    ? graphQLError.extensions.code
    : null
  return new QwenConfigurationMutationError(message, code)
}

export const useLLMProviderConfigStore = defineStore('llmProviderConfig', {
  state: () => ({
    providersWithModels: [] as ProviderWithModels[],
    audioProvidersWithModels: [] as ProviderWithModels[],
    imageProvidersWithModels: [] as ProviderWithModels[],
    videoProvidersWithModels: [] as ProviderWithModels[],
    providerSettingsGroups: [] as ProviderSettingsGroup[],
    isLoadingModels: false,
    isLoadingProviderSettings: false,
    isReloadingModels: false,
    isReloadingProviderModels: false,
    reloadingProvider: null as string | null,
    hasFetchedProviders: false,
    hasFetchedProviderSettings: false,
    modelRuntimeKind: 'autobyteus',
    providerSettingsRuntimeKind: null as typeof PROVIDER_SETTINGS_RUNTIME_KIND | null,
    geminiSetup: defaultGeminiSetup(),
    qwenSetup: defaultQwenSetupStatus(),
  }),
  getters: {
    providers(state): string[] {
      return state.providersWithModels.map(({ provider }) => provider.id)
    },
    models(state): string[] {
      return state.providersWithModels.flatMap(({ models }) =>
        models.map(({ modelIdentifier }) => modelIdentifier))
    },
    audioModels(state): string[] {
      return state.audioProvidersWithModels.flatMap(({ models }) =>
        models.map(({ modelIdentifier }) => modelIdentifier))
    },
    imageModels(state): string[] {
      return state.imageProvidersWithModels.flatMap(({ models }) =>
        models.map(({ modelIdentifier }) => modelIdentifier))
    },
    videoModels(state): string[] {
      return state.videoProvidersWithModels.flatMap(({ models }) =>
        models.map(({ modelIdentifier }) => modelIdentifier))
    },
    providerById(state): (providerId: string | null | undefined) => CatalogProviderRecord | null {
      return (providerId) => providerId
        ? state.providersWithModels.find(({ provider }) => provider.id === providerId)?.provider ?? null
        : null
    },
    providersWithModelsForSelection(state): ProviderWithModels[] {
      return state.providersWithModels.filter(({ models }) => models.length > 0)
    },
    modelConfigSchemaByIdentifier(state): (modelIdentifier: string | null | undefined) => UiModelConfigSchema | null {
      return (modelIdentifier) => {
        if (!modelIdentifier) return null
        for (const { models } of state.providersWithModels) {
          const schema = models.find((entry) => entry.modelIdentifier === modelIdentifier)?.configSchema
          const normalized = schema ? normalizeModelConfigSchema(schema) : null
          if (normalized && Object.keys(normalized).length > 0) return normalized
        }
        return null
      }
    },
    canonicalModels(state): string[] {
      const canonicalSet = new Set<string>()
      state.providersWithModels.forEach(({ models }) => models.forEach(({ canonicalName }) => {
        if (canonicalName) canonicalSet.add(canonicalName)
      }))
      return ['default', ...Array.from(canonicalSet).sort()]
    },
  },
  actions: {
    getProviderForModel(modelIdentifier: string): LLMProvider | null {
      for (const { models } of this.providersWithModels) {
        const model = models.find((entry) => entry.modelIdentifier === modelIdentifier)
        if (model) return model.providerType
      }
      return null
    },

    getModelValue(modelIdentifier: string): string | null {
      for (const { models } of this.providersWithModels) {
        const model = models.find((entry) => entry.modelIdentifier === modelIdentifier)
        if (model) return model.value
      }
      return null
    },

    getModelIdentifierByValue(value: string): string | null {
      for (const { models } of this.providersWithModels) {
        const model = models.find((entry) => entry.value === value)
        if (model) return model.modelIdentifier
      }
      return null
    },

    async fetchProvidersWithModels(runtimeKind = 'autobyteus') {
      if (this.hasFetchedProviders && this.modelRuntimeKind === runtimeKind) return this.providersWithModels
      return this.queryProviderCatalog(runtimeKind, false)
    },

    async reloadProvidersWithModels(options: { showLoading?: boolean; runtimeKind?: string } = {}) {
      const runtimeKind = options.runtimeKind ?? this.modelRuntimeKind
      return this.queryProviderCatalog(runtimeKind, true, options.showLoading ?? true)
    },

    async queryProviderCatalog(runtimeKind: string, networkOnly: boolean, showLoading = true) {
      if (showLoading) this.isLoadingModels = true
      try {
        const { data } = await getApolloClient().query({
          query: GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
          variables: { runtimeKind },
          ...(networkOnly ? { fetchPolicy: 'network-only' as const } : {}),
        })
        this.providersWithModels = data?.availableLlmProvidersWithModels ?? []
        this.audioProvidersWithModels = data?.availableAudioProvidersWithModels ?? []
        this.imageProvidersWithModels = data?.availableImageProvidersWithModels ?? []
        this.videoProvidersWithModels = data?.availableVideoProvidersWithModels ?? []
        this.modelRuntimeKind = runtimeKind
        this.hasFetchedProviders = true
        return this.providersWithModels
      } catch (error) {
        this.providersWithModels = []
        this.audioProvidersWithModels = []
        this.imageProvidersWithModels = []
        this.videoProvidersWithModels = []
        throw error
      } finally {
        if (showLoading) this.isLoadingModels = false
      }
    },

    async fetchProviderSettings(networkOnly = false) {
      if (!networkOnly
        && this.hasFetchedProviderSettings
        && this.providerSettingsRuntimeKind === PROVIDER_SETTINGS_RUNTIME_KIND) {
        return this.providerSettingsGroups
      }
      this.isLoadingProviderSettings = true
      try {
        const { data } = await getApolloClient().query({
          query: GET_PROVIDER_SETTINGS,
          variables: { runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND },
          ...(networkOnly ? { fetchPolicy: 'network-only' as const } : {}),
        })
        this.providerSettingsGroups = data?.providerSettings ?? []
        this.providerSettingsRuntimeKind = PROVIDER_SETTINGS_RUNTIME_KIND
        this.hasFetchedProviderSettings = true
        return this.providerSettingsGroups
      } catch (error) {
        this.providerSettingsGroups = []
        this.providerSettingsRuntimeKind = null
        this.hasFetchedProviderSettings = false
        throw error
      } finally {
        this.isLoadingProviderSettings = false
      }
    },

    async reloadModels(runtimeKind?: string) {
      const effectiveRuntimeKind = runtimeKind ?? this.modelRuntimeKind
      this.isReloadingModels = true
      try {
        const { data, errors } = await getApolloClient().mutate({
          mutation: RELOAD_LLM_MODELS,
          variables: { runtimeKind: effectiveRuntimeKind },
        })
        throwGraphqlErrors(errors)
        if (!data?.reloadLlmModels?.includes('successfully')) throw new Error('Failed to reload models')
        await Promise.all([
          this.reloadProvidersWithModels({
            showLoading: false,
            runtimeKind: effectiveRuntimeKind,
          }),
          this.fetchProviderSettings(true),
        ])
        return true
      } finally {
        this.isReloadingModels = false
      }
    },

    async reloadModelsForProvider(providerId: string, runtimeKind?: string) {
      if (!providerId) throw new Error('Provider is required to reload models.')
      const effectiveRuntimeKind = runtimeKind ?? this.modelRuntimeKind
      this.isReloadingProviderModels = true
      this.reloadingProvider = providerId
      try {
        const { data, errors } = await getApolloClient().mutate({
          mutation: RELOAD_LLM_PROVIDER_MODELS,
          variables: { providerId, runtimeKind: effectiveRuntimeKind },
        })
        throwGraphqlErrors(errors)
        if (!data?.reloadLlmProviderModels?.includes('successfully')) throw new Error('Failed to reload provider models')
        await Promise.all([
          this.reloadProvidersWithModels({
            showLoading: false,
            runtimeKind: effectiveRuntimeKind,
          }),
          this.fetchProviderSettings(true),
        ])
        return true
      } finally {
        this.isReloadingProviderModels = false
        this.reloadingProvider = null
      }
    },

    async setLLMProviderApiKey(providerId: string, apiKey: string) {
      const { data, errors } = await getApolloClient().mutate({
        mutation: SAVE_PROVIDER_API_KEY,
        variables: { providerId, apiKey },
      })
      requireMutationSuccess(data, errors, 'saveProviderApiKey')
      if (providerId === 'AUTOBYTEUS') await this.reloadModels(PROVIDER_SETTINGS_RUNTIME_KIND)
      else await this.fetchProviderSettings(true)
      return true
    },

    async probeCustomProvider(input: CustomLlmProviderDraftInput) {
      const { data, errors } = await getApolloClient().mutate({
        mutation: PROBE_CUSTOM_PROVIDER,
        variables: { input },
      })
      throwGraphqlErrors(errors)
      if (!data?.probeCustomProvider) throw new Error('Failed to probe custom provider')
      return data.probeCustomProvider as CustomLlmProviderProbeResult
    },

    async createCustomProvider(input: CustomLlmProviderDraftInput) {
      const { data, errors } = await getApolloClient().mutate({
        mutation: CREATE_CUSTOM_PROVIDER,
        variables: { input },
      })
      throwGraphqlErrors(errors)
      const providerId = data?.createCustomProvider as string | undefined
      if (!providerId) throw new Error('Failed to create custom provider')
      await Promise.all([
        this.reloadProvidersWithModels({
          showLoading: false,
          runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND,
        }),
        this.fetchProviderSettings(true),
      ])
      return providerId
    },

    async deleteCustomProvider(providerId: string) {
      const { data, errors } = await getApolloClient().mutate({
        mutation: DELETE_CUSTOM_PROVIDER,
        variables: { providerId },
      })
      requireMutationSuccess(data, errors, 'deleteCustomProvider')
      await Promise.all([
        this.reloadProvidersWithModels({
          showLoading: false,
          runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND,
        }),
        this.fetchProviderSettings(true),
      ])
      return true
    },

    async fetchGeminiSetupConfig() {
      const { data } = await getApolloClient().query({
        query: GET_GEMINI_SETUP_CONFIG,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      })
      if (!data?.getGeminiSetupConfig) throw new Error('Failed to fetch Gemini setup config')
      this.geminiSetup = data.getGeminiSetupConfig
      return this.geminiSetup
    },

    async fetchQwenSetupStatus() {
      const { data, errors } = await getApolloClient().query({
        query: GET_QWEN_SETUP_STATUS,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      })
      throwQwenGraphqlErrors(errors)
      if (!data?.qwenSetupStatus) throw new Error('Failed to fetch Qwen setup status')
      this.qwenSetup = data.qwenSetupStatus as QwenSetupStatus
      return this.qwenSetup
    },

    async refreshProviderDataAfterQwenSave() {
      await Promise.all([
        this.fetchProviderSettings(true),
        this.reloadProvidersWithModels({
          showLoading: false,
          runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND,
        }),
      ])
    },

    async saveQwenConfiguration(input: QwenConfigurationInput): Promise<QwenSetupStatus> {
      try {
        const { data, errors } = await getApolloClient().mutate({
          mutation: SAVE_QWEN_CONFIGURATION,
          variables: { input },
          errorPolicy: 'all',
        })
        throwQwenGraphqlErrors(errors)
        const status = data?.saveQwenConfiguration as QwenSetupStatus | undefined
        if (!status) throw new Error('Qwen configuration operation did not complete')
        this.qwenSetup = status
        return status
      } catch (error) {
        throw normalizeQwenMutationFailure(error)
      }
    },

    async saveGeminiConfigurationOption(
      input: GeminiOptionSaveInput,
      activateAfterSave: boolean,
    ): Promise<GeminiSetupConfigState> {
      const command = input.option === 'AI_STUDIO'
        ? { mutation: SAVE_GEMINI_AI_STUDIO, key: 'saveGeminiAiStudio', variables: { apiKey: input.apiKey, activateAfterSave } }
        : input.option === 'VERTEX_EXPRESS'
          ? { mutation: SAVE_GEMINI_VERTEX_EXPRESS, key: 'saveGeminiVertexExpress', variables: { apiKey: input.apiKey, activateAfterSave } }
          : { mutation: SAVE_GEMINI_VERTEX_PROJECT, key: 'saveGeminiVertexProject', variables: { project: input.project, location: input.location, activateAfterSave } }
      return this.runGeminiMutation(command.mutation, command.key, command.variables)
    },

    async activateGeminiConfigurationOption(option: GeminiConfigurationOption) {
      return this.runGeminiMutation(USE_GEMINI_MODE, 'useGeminiMode', { mode: option })
    },

    async runGeminiMutation(mutation: unknown, key: string, variables: Record<string, unknown>) {
      const { data, errors } = await getApolloClient().mutate({ mutation, variables })
      throwGraphqlErrors(errors)
      const state = data?.[key] as GeminiSetupConfigState | undefined
      if (!state) throw new Error('Gemini configuration operation did not complete')
      this.geminiSetup = state
      await this.fetchProviderSettings(true)
      return state
    },
  },
})
