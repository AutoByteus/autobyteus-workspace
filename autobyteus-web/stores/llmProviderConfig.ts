import { defineStore } from 'pinia'
import {
  CREATE_CUSTOM_PROVIDER,
  DELETE_CUSTOM_PROVIDER,
  ENSURE_PROVIDER_MODEL_CATALOG,
  PROBE_CUSTOM_PROVIDER,
  RELOAD_PROVIDER_MODEL_CATALOG,
  SAVE_GEMINI_AI_STUDIO,
  SAVE_GEMINI_VERTEX_EXPRESS,
  SAVE_GEMINI_VERTEX_PROJECT,
  SAVE_PROVIDER_API_KEY,
  SAVE_QWEN_CONFIGURATION,
  USE_GEMINI_MODE,
} from '~/graphql/mutations/llm_provider_mutations'
import {
  GET_GEMINI_SETUP_CONFIG,
  GET_PROVIDER_CREDENTIAL_SETTINGS,
  GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS,
  GET_QWEN_SETUP_STATUS,
} from '~/graphql/queries/llm_provider_queries'
import type { LLMProvider } from '~/types/llm'
import { getApolloClient } from '~/utils/apolloClient'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import {
  captureRuntimeProviderRequestTokens,
  indexProviderCatalogSnapshots,
  mergeWholeCatalogProviders,
} from './llmProviderCatalogPublication'
import {
  defaultGeminiSetup,
  defaultQwenSetupStatus,
  emptyRuntimeCatalogSnapshot,
  normalizeCatalogRuntimeKind,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type DiscoverySettingCatalogTarget,
  type GeminiConfigurationCommandResult,
  type GeminiConfigurationOption,
  type GeminiOptionSaveInput,
  type GeminiSetupConfigState,
  type ModelGroupKind,
  type ModelKind,
  type ProviderCredentialSetting,
  type ProviderModelCatalogSnapshot,
  type ProviderWithModels,
  type QwenConfigurationCommandResult,
  type QwenConfigurationInput,
  type QwenSetupStatus,
  type RuntimeCatalogSnapshot,
} from './llmProviderConfigSupport'
export * from './llmProviderConfigSupport'

export const PROVIDER_SETTINGS_RUNTIME_KIND = 'autobyteus'
const inFlightCatalogReads = new Map<string, Promise<RuntimeCatalogSnapshot>>()
const requestKey = (runtime: string, providerId: string): string => `${runtime}:${providerId}`
const throwGraphqlErrors = (errors: readonly { message: string }[] | null | undefined): void => {
  if (errors?.length) throw new Error(errors.map(error => error.message).join(', '))
}
const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'MODEL_CATALOG_REQUEST_FAILED'

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
  return new QwenConfigurationMutationError(
    graphQLError?.message || (error instanceof Error ? error.message : 'Qwen configuration operation failed'),
    typeof graphQLError?.extensions?.code === 'string' ? graphQLError.extensions.code : null,
  )
}
const modelGroup = (
  snapshot: ProviderModelCatalogSnapshot,
  kind: 'llm' | ModelGroupKind,
) => kind === 'llm'
  ? snapshot.llmModels
  : kind === 'audio'
    ? snapshot.audioModels
    : kind === 'image'
      ? snapshot.imageModels
      : snapshot.videoModels
type PreparedProviderCatalogRequest = { epoch: number; requestId: number }

export const useLLMProviderConfigStore = defineStore('llmProviderConfig', {
  state: () => ({
    providerCredentialSettings: [] as ProviderCredentialSetting[],
    isLoadingProviderCredentialSettings: false,
    hasFetchedProviderCredentialSettings: false,
    catalogEpoch: 0,
    nextCatalogRequestId: 0,
    catalogByRuntimeKind: {} as Record<string, RuntimeCatalogSnapshot>,
    providerRequestIdByKey: {} as Record<string, number>,
    providerRequestModeByKey: {} as Record<string, 'ensure' | 'reload' | undefined>,
    geminiSetup: defaultGeminiSetup(),
    qwenSetup: defaultQwenSetupStatus(),
  }),
  getters: {
    catalogSnapshot: state => (runtimeKind: string): RuntimeCatalogSnapshot => {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      return state.catalogByRuntimeKind[runtime] ?? emptyRuntimeCatalogSnapshot(runtime)
    },
    providerSnapshots(): (runtimeKind: string) => ProviderModelCatalogSnapshot[] {
      return runtimeKind => Object.values(this.catalogSnapshot(runtimeKind).providersById)
        .sort((left, right) => left.ownerProvider.name.localeCompare(right.ownerProvider.name))
    },
    providerSnapshot(): (runtimeKind: string, providerId: string | null | undefined) => ProviderModelCatalogSnapshot | null {
      return (runtimeKind, providerId) => providerId
        ? this.catalogSnapshot(runtimeKind).providersById[providerId] ?? null
        : null
    },
    providers(): (runtimeKind: string) => ProviderWithModels[] {
      return runtimeKind => this.providerSnapshots(runtimeKind).map(snapshot => ({
        provider: snapshot.ownerProvider,
        models: snapshot.llmModels,
      }))
    },
    models(): (runtimeKind: string) => string[] {
      return runtimeKind => this.providers(runtimeKind).flatMap(({ models }) =>
        models.map(({ modelIdentifier }) => modelIdentifier))
    },
    providerById(): (runtimeKind: string, providerId: string | null | undefined) => ProviderWithModels['provider'] | null {
      return (runtimeKind, providerId) => this.providerSnapshot(runtimeKind, providerId)?.ownerProvider ?? null
    },
    providersWithModelsForSelection(): (runtimeKind: string) => ProviderWithModels[] {
      return runtimeKind => this.providers(runtimeKind).filter(({ models }) => models.length > 0)
    },
    modelConfigSchemaByIdentifier(): (runtimeKind: string, modelIdentifier: string | null | undefined) => UiModelConfigSchema | null {
      return (runtimeKind, modelIdentifier) => {
        if (!modelIdentifier) return null
        for (const { models } of this.providers(runtimeKind)) {
          const schema = models.find(entry => entry.modelIdentifier === modelIdentifier)?.configSchema
          const normalized = schema ? normalizeModelConfigSchema(schema) : null
          if (normalized && Object.keys(normalized).length > 0) return normalized
        }
        return null
      }
    },
    canonicalModels(): (runtimeKind: string) => string[] {
      return runtimeKind => {
        const names = new Set<string>()
        this.providers(runtimeKind).forEach(({ models }) => models.forEach(({ canonicalName }) => {
          if (canonicalName) names.add(canonicalName)
        }))
        return ['default', ...Array.from(names).sort()]
      }
    },
  },
  actions: {
    providerGroups(runtimeKind: string, kind: ModelGroupKind): ProviderWithModels[] {
      return this.providerSnapshots(runtimeKind).map(snapshot => ({
        provider: snapshot.ownerProvider,
        models: modelGroup(snapshot, kind),
      }))
    },
    getProviderForModel(runtimeKind: string, modelIdentifier: string): LLMProvider | null {
      for (const { models } of this.providers(runtimeKind)) {
        const model = models.find(entry => entry.modelIdentifier === modelIdentifier)
        if (model) return model.providerType
      }
      return null
    },
    getModelValue(runtimeKind: string, modelIdentifier: string): string | null {
      for (const { models } of this.providers(runtimeKind)) {
        const model = models.find(entry => entry.modelIdentifier === modelIdentifier)
        if (model) return model.value
      }
      return null
    },
    getModelIdentifierByValue(runtimeKind: string, value: string): string | null {
      for (const { models } of this.providers(runtimeKind)) {
        const model = models.find(entry => entry.value === value)
        if (model) return model.modelIdentifier
      }
      return null
    },
    async fetchProvidersWithModels(runtimeKind: string): Promise<RuntimeCatalogSnapshot> {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      const current = this.catalogSnapshot(runtime)
      if (current.state === 'ready') return current
      const inFlight = inFlightCatalogReads.get(runtime)
      if (inFlight) return inFlight
      const epoch = this.catalogEpoch
      const requestId = ++this.nextCatalogRequestId
      const providerTokensAtReadStart = captureRuntimeProviderRequestTokens(
        runtime,
        this.providerRequestIdByKey,
      )
      this.catalogByRuntimeKind[runtime] = { ...current, currentRequestId: requestId, state: 'loading', errorMessage: null }
      const request = (async () => {
        try {
          const { data, errors } = await getApolloClient().query({
            query: GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS,
            variables: { runtimeKind: runtime },
            fetchPolicy: 'network-only',
          })
          throwGraphqlErrors(errors)
          if (!this.isCurrentCatalogRequest(runtime, epoch, requestId)) return this.catalogSnapshot(runtime)
          const incomingProviders = indexProviderCatalogSnapshots(
            (data?.providerModelCatalogSnapshots ?? []) as ProviderModelCatalogSnapshot[],
          )
          this.catalogByRuntimeKind[runtime] = {
            runtimeKind: runtime,
            currentRequestId: requestId,
            state: 'ready',
            hasSuccessfulPayload: true,
            providersById: mergeWholeCatalogProviders(
              runtime,
              incomingProviders,
              this.catalogSnapshot(runtime).providersById,
              providerTokensAtReadStart,
              this.providerRequestIdByKey,
            ),
            errorMessage: null,
          }
          return this.catalogByRuntimeKind[runtime]
        } catch (error) {
          if (this.isCurrentCatalogRequest(runtime, epoch, requestId)) {
            this.catalogByRuntimeKind[runtime] = { ...this.catalogSnapshot(runtime), state: 'error', errorMessage: errorMessage(error) }
          }
          throw error
        }
      })()
      inFlightCatalogReads.set(runtime, request)
      void request.finally(() => {
        if (inFlightCatalogReads.get(runtime) === request) inFlightCatalogReads.delete(runtime)
      }).catch(() => undefined)
      return request
    },
    async refreshLocalCatalog(runtimeKind: string): Promise<RuntimeCatalogSnapshot> {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      this.catalogByRuntimeKind[runtime] = { ...this.catalogSnapshot(runtime), state: 'idle' }
      return this.fetchProvidersWithModels(runtime)
    },
    ensureProviderModelCatalog(runtimeKind: string, providerId: string): Promise<ProviderModelCatalogSnapshot> {
      return this.runProviderCatalogMutation(runtimeKind, providerId, false)
    },
    reloadProvider(runtimeKind: string, providerId: string): Promise<ProviderModelCatalogSnapshot> {
      return this.runProviderCatalogMutation(runtimeKind, providerId, true)
    },
    convergeAfterDiscoverySettingCommit(
      runtimeKind: string,
      target: DiscoverySettingCatalogTarget,
    ): Promise<ProviderModelCatalogSnapshot> {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      const providerId = target.ownerProviderId.trim()
      if (!providerId) throw new Error('Provider is required')
      const affectedKinds = new Set<ModelKind>(target.modelKinds)
      const epoch = this.catalogEpoch
      const requestId = ++this.nextCatalogRequestId
      const key = requestKey(runtime, providerId)
      this.providerRequestIdByKey[key] = requestId
      this.providerRequestModeByKey[key] = 'ensure'
      const previous = this.providerSnapshot(runtime, providerId)
      if (previous) {
        this.applyProviderSnapshotLocal(runtime, {
          ...previous,
          sources: previous.sources.map(source => affectedKinds.has(source.modelKind)
            ? {
                ...source,
                state: 'IDLE',
                modelCount: 0,
                successfulUnitCount: 0,
                failedUnitCount: 0,
                safeMessage: null,
              }
            : source),
          llmModels: affectedKinds.has('LLM') ? [] : previous.llmModels,
          audioModels: affectedKinds.has('AUDIO') ? [] : previous.audioModels,
          imageModels: affectedKinds.has('IMAGE') ? [] : previous.imageModels,
          videoModels: affectedKinds.has('VIDEO') ? [] : previous.videoModels,
        })
      }
      return this.runProviderCatalogMutation(
        runtime,
        providerId,
        false,
        affectedKinds,
        { epoch, requestId },
      )
    },
    async ensureMissingDynamicProviders(runtimeKind: string): Promise<void> {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      await this.fetchProvidersWithModels(runtime)
      const missing = this.providerSnapshots(runtime).filter(snapshot =>
        snapshot.ownerProvider.catalogMode === 'DISCOVERED'
        && snapshot.sources.some(source => source.state === 'IDLE'))
      await Promise.allSettled(missing.map(snapshot =>
        this.ensureProviderModelCatalog(runtime, snapshot.ownerProvider.id)))
    },
    async runProviderCatalogMutation(
      runtimeKind: string,
      providerId: string,
      force: boolean,
      affectedKinds?: ReadonlySet<ModelKind>,
      preparedRequest?: PreparedProviderCatalogRequest,
    ): Promise<ProviderModelCatalogSnapshot> {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      if (!providerId.trim()) throw new Error('Provider is required')
      const epoch = preparedRequest?.epoch ?? this.catalogEpoch
      const requestId = preparedRequest?.requestId ?? ++this.nextCatalogRequestId
      const key = requestKey(runtime, providerId)
      this.providerRequestIdByKey[key] = requestId
      this.providerRequestModeByKey[key] = force ? 'reload' : 'ensure'
      const previous = this.providerSnapshot(runtime, providerId)
      if (previous) {
        const hasRows = previous.llmModels.length + previous.audioModels.length + previous.imageModels.length > 0
        this.applyProviderSnapshotLocal(runtime, {
          ...previous,
          sources: previous.sources.map(source => !affectedKinds || affectedKinds.has(source.modelKind)
            ? {
                ...source,
                state: hasRows ? 'REFRESHING' : 'LOADING',
                safeMessage: null,
              }
            : source),
        })
      }
      try {
        const { data, errors } = await getApolloClient().mutate({
          mutation: force ? RELOAD_PROVIDER_MODEL_CATALOG : ENSURE_PROVIDER_MODEL_CATALOG,
          variables: { providerId, runtimeKind: runtime },
        })
        throwGraphqlErrors(errors)
        const snapshot = (force
          ? data?.reloadProviderModelCatalog
          : data?.ensureProviderModelCatalog) as ProviderModelCatalogSnapshot | undefined
        if (!snapshot) throw new Error('Provider model catalog operation did not complete')
        if (this.catalogEpoch === epoch && this.providerRequestIdByKey[key] === requestId) {
          this.applyProviderSnapshotLocal(runtime, snapshot)
        }
        return snapshot
      } catch (error) {
        if (this.catalogEpoch === epoch && this.providerRequestIdByKey[key] === requestId && previous) {
          const hasRows = previous.llmModels.length
            + previous.audioModels.length
            + previous.imageModels.length
            + previous.videoModels.length > 0
          this.applyProviderSnapshotLocal(runtime, {
            ...previous,
            sources: previous.sources.map(source => !affectedKinds || affectedKinds.has(source.modelKind)
              ? {
                  ...source,
                  state: hasRows ? 'STALE_ERROR' : 'ERROR',
                  safeMessage: 'MODEL_CATALOG_REQUEST_FAILED',
                }
              : source),
          })
        }
        throw error
      } finally {
        if (this.providerRequestIdByKey[key] === requestId) this.providerRequestModeByKey[key] = undefined
      }
    },
    applyProviderSnapshotLocal(runtimeKind: string, snapshot: ProviderModelCatalogSnapshot): void {
      const runtime = normalizeCatalogRuntimeKind(runtimeKind)
      const current = this.catalogSnapshot(runtime)
      this.catalogByRuntimeKind[runtime] = {
        ...current,
        state: 'ready',
        hasSuccessfulPayload: true,
        providersById: { ...current.providersById, [snapshot.ownerProvider.id]: snapshot },
        errorMessage: null,
      }
    },
    isCurrentCatalogRequest(runtime: string, epoch: number, requestId: number): boolean {
      return this.catalogEpoch === epoch && this.catalogByRuntimeKind[runtime]?.currentRequestId === requestId
    },
    resetCatalogState(): void {
      this.catalogEpoch += 1
      this.catalogByRuntimeKind = {}
      this.providerRequestIdByKey = {}
      this.providerRequestModeByKey = {}
      inFlightCatalogReads.clear()
    },
    async fetchProviderCredentialSettings(networkOnly = false): Promise<ProviderCredentialSetting[]> {
      if (!networkOnly && this.hasFetchedProviderCredentialSettings) return this.providerCredentialSettings
      this.isLoadingProviderCredentialSettings = true
      try {
        const { data, errors } = await getApolloClient().query({
          query: GET_PROVIDER_CREDENTIAL_SETTINGS,
          variables: { runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND },
          ...(networkOnly ? { fetchPolicy: 'network-only' as const } : {}),
        })
        throwGraphqlErrors(errors)
        this.providerCredentialSettings = (data?.providerCredentialSettings ?? []) as ProviderCredentialSetting[]
        this.hasFetchedProviderCredentialSettings = true
        return this.providerCredentialSettings
      } catch (error) {
        this.providerCredentialSettings = []
        this.hasFetchedProviderCredentialSettings = false
        throw error
      } finally {
        this.isLoadingProviderCredentialSettings = false
      }
    },
    async setLLMProviderApiKey(providerId: string, apiKey: string): Promise<ProviderCredentialSetting> {
      const { data, errors } = await getApolloClient().mutate({ mutation: SAVE_PROVIDER_API_KEY, variables: { providerId, apiKey } })
      throwGraphqlErrors(errors)
      const setting = data?.saveProviderApiKey as ProviderCredentialSetting | undefined
      if (!setting) throw new Error('saveProviderApiKey did not complete')
      this.applyCredentialSetting(setting)
      return setting
    },
    async probeCustomProvider(input: CustomLlmProviderDraftInput): Promise<CustomLlmProviderProbeResult> {
      const { data, errors } = await getApolloClient().mutate({ mutation: PROBE_CUSTOM_PROVIDER, variables: { input } })
      throwGraphqlErrors(errors)
      if (!data?.probeCustomProvider) throw new Error('Failed to probe custom provider')
      return data.probeCustomProvider as CustomLlmProviderProbeResult
    },
    async createCustomProvider(input: CustomLlmProviderDraftInput): Promise<ProviderCredentialSetting> {
      const { data, errors } = await getApolloClient().mutate({ mutation: CREATE_CUSTOM_PROVIDER, variables: { input } })
      throwGraphqlErrors(errors)
      const setting = data?.createCustomProvider as ProviderCredentialSetting | undefined
      if (!setting) throw new Error('Failed to create custom provider')
      this.applyCredentialSetting(setting)
      await this.refreshLocalCatalog(PROVIDER_SETTINGS_RUNTIME_KIND)
      return setting
    },
    async deleteCustomProvider(providerId: string): Promise<boolean> {
      const { data, errors } = await getApolloClient().mutate({ mutation: DELETE_CUSTOM_PROVIDER, variables: { providerId } })
      throwGraphqlErrors(errors)
      const result = data?.deleteCustomProvider
      if (!result?.deleted || result.providerId !== providerId) throw new Error('deleteCustomProvider did not complete')
      const key = requestKey(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
      this.providerRequestIdByKey[key] = ++this.nextCatalogRequestId
      this.providerRequestModeByKey[key] = undefined
      this.providerCredentialSettings = this.providerCredentialSettings.filter(setting => setting.provider.id !== providerId)
      const runtime = this.catalogSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND)
      const { [providerId]: _removed, ...remaining } = runtime.providersById
      this.catalogByRuntimeKind[PROVIDER_SETTINGS_RUNTIME_KIND] = { ...runtime, providersById: remaining }
      return true
    },
    async fetchGeminiSetupConfig(): Promise<GeminiSetupConfigState> {
      const { data } = await getApolloClient().query({ query: GET_GEMINI_SETUP_CONFIG, fetchPolicy: 'network-only', errorPolicy: 'all' })
      if (!data?.getGeminiSetupConfig) throw new Error('Failed to fetch Gemini setup config')
      this.geminiSetup = data.getGeminiSetupConfig
      return this.geminiSetup
    },
    async fetchQwenSetupStatus(): Promise<QwenSetupStatus> {
      const { data, errors } = await getApolloClient().query({ query: GET_QWEN_SETUP_STATUS, fetchPolicy: 'network-only', errorPolicy: 'all' })
      throwQwenGraphqlErrors(errors)
      if (!data?.qwenSetupStatus) throw new Error('Failed to fetch Qwen setup status')
      this.qwenSetup = data.qwenSetupStatus as QwenSetupStatus
      return this.qwenSetup
    },
    async saveQwenConfiguration(input: QwenConfigurationInput): Promise<QwenSetupStatus> {
      try {
        const { data, errors } = await getApolloClient().mutate({ mutation: SAVE_QWEN_CONFIGURATION, variables: { input }, errorPolicy: 'all' })
        throwQwenGraphqlErrors(errors)
        const result = data?.saveQwenConfiguration as QwenConfigurationCommandResult | undefined
        if (!result) throw new Error('Qwen configuration operation did not complete')
        this.qwenSetup = result.setup
        this.applyCredentialSetting(result.credentialSetting)
        return result.setup
      } catch (error) { throw normalizeQwenMutationFailure(error) }
    },
    async saveGeminiConfigurationOption(input: GeminiOptionSaveInput, activateAfterSave: boolean): Promise<GeminiSetupConfigState> {
      const command = input.option === 'AI_STUDIO'
        ? { mutation: SAVE_GEMINI_AI_STUDIO, key: 'saveGeminiAiStudio', variables: { apiKey: input.apiKey, activateAfterSave } }
        : input.option === 'VERTEX_EXPRESS'
          ? { mutation: SAVE_GEMINI_VERTEX_EXPRESS, key: 'saveGeminiVertexExpress', variables: { apiKey: input.apiKey, activateAfterSave } }
          : { mutation: SAVE_GEMINI_VERTEX_PROJECT, key: 'saveGeminiVertexProject', variables: { project: input.project, location: input.location, activateAfterSave } }
      return this.runGeminiMutation(command.mutation, command.key, command.variables)
    },
    async activateGeminiConfigurationOption(option: GeminiConfigurationOption): Promise<GeminiSetupConfigState> {
      return this.runGeminiMutation(USE_GEMINI_MODE, 'useGeminiMode', { mode: option })
    },
    async runGeminiMutation(mutation: unknown, key: string, variables: Record<string, unknown>): Promise<GeminiSetupConfigState> {
      const { data, errors } = await getApolloClient().mutate({ mutation, variables })
      throwGraphqlErrors(errors)
      const result = data?.[key] as GeminiConfigurationCommandResult | undefined
      if (!result) throw new Error('Gemini configuration operation did not complete')
      this.geminiSetup = result.setup
      this.applyCredentialSetting(result.credentialSetting)
      return result.setup
    },
    applyCredentialSetting(setting: ProviderCredentialSetting): void {
      const index = this.providerCredentialSettings.findIndex(entry => entry.provider.id === setting.provider.id)
      if (index === -1) this.providerCredentialSettings.push(setting)
      else this.providerCredentialSettings[index] = setting
      this.providerCredentialSettings.sort((left, right) =>
        left.provider.name.localeCompare(right.provider.name) || left.provider.id.localeCompare(right.provider.id))
    },
  },
})
