import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_LLM_PROVIDER_CREDENTIAL_STATUS,
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_GEMINI_SETUP_CONFIG,
} from '~/graphql/queries/llm_provider_queries'
import {
  CREATE_CUSTOM_LLM_PROVIDER,
  DELETE_CUSTOM_LLM_PROVIDER,
  PROBE_CUSTOM_LLM_PROVIDER,
  REMOVE_LLM_PROVIDER_API_KEY,
  SET_LLM_PROVIDER_API_KEY,
  RELOAD_LLM_MODELS,
  RELOAD_LLM_PROVIDER_MODELS,
  REMOVE_GEMINI_CONFIGURATION_OPTION,
  SAVE_GEMINI_CONFIGURATION_OPTION,
  ACTIVATE_GEMINI_CONFIGURATION_OPTION,
  SAVE_AND_ACTIVATE_GEMINI_CONFIGURATION_OPTION,
} from '~/graphql/mutations/llm_provider_mutations'
import type { LLMProvider } from '~/types/llm'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import {
  defaultGeminiSetup,
  geminiOptionMutationVariables,
  replaceProviderConfiguredState,
  resolveGeminiActiveCredentialStatus,
  resolveGeminiProviderConfiguredState,
  syncProviderConfiguredState,
  type CredentialStatus,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type GeminiConfigurationOperationResult,
  type GeminiConfigurationOption,
  type GeminiOptionSaveInput,
  type LLMProviderConfig,
  type ModelInfo,
  type ProviderWithModels,
} from './llmProviderConfigSupport'
export type * from './llmProviderConfigSupport'

type GeminiMutationDocument =
  | typeof ACTIVATE_GEMINI_CONFIGURATION_OPTION
  | typeof SAVE_AND_ACTIVATE_GEMINI_CONFIGURATION_OPTION

export const useLLMProviderConfigStore = defineStore('llmProviderConfig', {
  state: () => ({
    providersWithModels: [] as ProviderWithModels[],
    audioProvidersWithModels: [] as ProviderWithModels[],
    imageProvidersWithModels: [] as ProviderWithModels[],
    videoProvidersWithModels: [] as ProviderWithModels[],
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
    videoModels(state): string[] {
      return state.videoProvidersWithModels.flatMap((row) => row.models.map((model) => model.modelIdentifier))
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
        this.videoProvidersWithModels = data?.availableVideoProvidersWithModels ?? []
        this.providerConfigs = syncProviderConfiguredState(this.providersWithModels, this.providerConfigs)
        this.modelRuntimeKind = runtimeKind
        this.hasFetchedProviders = true
        return this.providersWithModels
      } catch (error) {
        console.error('Failed to fetch providers and models:', error)
        this.providersWithModels = []
        this.audioProvidersWithModels = []
        this.imageProvidersWithModels = []
        this.videoProvidersWithModels = []
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
        this.videoProvidersWithModels = data?.availableVideoProvidersWithModels ?? []
        this.providerConfigs = syncProviderConfiguredState(this.providersWithModels, this.providerConfigs)
        this.modelRuntimeKind = runtimeKind
        this.hasFetchedProviders = true
        return this.providersWithModels
      } catch (error) {
        console.error('Failed to reload providers and models:', error)
        this.providersWithModels = []
        this.audioProvidersWithModels = []
        this.imageProvidersWithModels = []
        this.videoProvidersWithModels = []
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
          const credentialStatus: CredentialStatus = {
            vaultHealth: 'READY',
            storageState: 'CONFIGURED',
            instructionCode: null,
          }
          this.providerConfigs[providerId] = { credentialStatus }
          this.providersWithModels = replaceProviderConfiguredState(
            this.providersWithModels, providerId, credentialStatus,
          )

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

    async removeLLMProviderApiKey(providerId: string) {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_LLM_PROVIDER_API_KEY,
        variables: { providerId },
      })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const responseMessage = data?.removeLlmProviderApiKey
      if (!responseMessage || !responseMessage.includes('successfully')) {
        throw new Error(responseMessage || 'Failed to remove provider credential')
      }
      await this.reloadProvidersWithModels({ showLoading: false })
      return true
    },

    async getLLMProviderCredentialStatus(providerId: string) {
      const currentValue = this.providersWithModels.find((row) => row.provider.id === providerId)?.provider.credentialStatus
      if (currentValue) {
        this.providerConfigs[providerId] = { credentialStatus: currentValue }
        return currentValue
      }

      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_LLM_PROVIDER_CREDENTIAL_STATUS,
          variables: { providerId },
        })

        const credentialStatus = data?.getLlmProviderCredentialStatus as CredentialStatus | null
        this.providerConfigs[providerId] = { credentialStatus }
        return credentialStatus
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

    async saveGeminiConfigurationOption(
      input: GeminiOptionSaveInput,
    ): Promise<GeminiConfigurationOperationResult> {
      const client = getApolloClient()

      try {
        const { data, errors } = await client.mutate({
          mutation: SAVE_GEMINI_CONFIGURATION_OPTION,
          variables: geminiOptionMutationVariables(input),
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const result = data?.saveGeminiConfigurationOption as
          | GeminiConfigurationOperationResult
          | undefined
        if (!result || result.operation !== 'SAVED' || result.option !== input.option) {
          throw new Error('Failed to save Gemini configuration option')
        }

        await this.fetchGeminiSetupConfig()
        this.syncGeminiProviderConfiguredState()
        return result
      } catch (error) {
        console.error('Failed to save Gemini configuration option:', error)
        throw error
      }
    },

    async removeGeminiConfigurationOption(
      option: GeminiConfigurationOption,
    ): Promise<GeminiConfigurationOperationResult> {
      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate({
          mutation: REMOVE_GEMINI_CONFIGURATION_OPTION,
          variables: { option },
        })
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
        }

        const result = data?.removeGeminiConfigurationOption as
          | GeminiConfigurationOperationResult
          | undefined
        if (!result || result.operation !== 'REMOVED' || result.option !== option) {
          throw new Error('Failed to remove Gemini configuration option')
        }

        await this.fetchGeminiSetupConfig()
        this.syncGeminiProviderConfiguredState()
        return result
      } catch (error) {
        console.error('Failed to remove Gemini configuration option:', error)
        throw error
      }
    },

    async activateGeminiConfigurationOption(
      option: GeminiConfigurationOption,
    ): Promise<GeminiConfigurationOperationResult> {
      return this.runGeminiMutation(
        ACTIVATE_GEMINI_CONFIGURATION_OPTION,
        { option },
        'activateGeminiConfigurationOption',
        'ACTIVATED',
        option,
      )
    },

    async saveAndActivateGeminiConfigurationOption(
      input: GeminiOptionSaveInput,
    ): Promise<GeminiConfigurationOperationResult> {
      return this.runGeminiMutation(
        SAVE_AND_ACTIVATE_GEMINI_CONFIGURATION_OPTION,
        geminiOptionMutationVariables(input),
        'saveAndActivateGeminiConfigurationOption',
        'SAVED_AND_ACTIVATED',
        input.option,
      )
    },

    async runGeminiMutation(
      mutation: GeminiMutationDocument,
      variables: Record<string, unknown>,
      resultKey: string,
      expectedOperation: GeminiConfigurationOperationResult['operation'],
      option: GeminiConfigurationOption,
    ): Promise<GeminiConfigurationOperationResult> {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({ mutation, variables })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const result = data?.[resultKey] as GeminiConfigurationOperationResult | undefined
      if (!result || result.operation !== expectedOperation || result.option !== option) {
        throw new Error('Gemini configuration operation did not complete')
      }
      await this.fetchGeminiSetupConfig()
      this.syncGeminiProviderConfiguredState()
      return result
    },

    syncGeminiProviderConfiguredState() {
      const credentialStatus = resolveGeminiActiveCredentialStatus(this.geminiSetup)
      this.providerConfigs.GEMINI = { credentialStatus }
      this.providersWithModels = replaceProviderConfiguredState(
        this.providersWithModels, 'GEMINI', credentialStatus,
      )
      return resolveGeminiProviderConfiguredState(this.geminiSetup)
    },
  },
})
