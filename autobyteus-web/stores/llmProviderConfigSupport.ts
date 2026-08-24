import type { ModelMetadataProvenance } from '~/generated/graphql'
import type { LLMProvider } from '~/types/llm'

export type CatalogMode = 'STATIC' | 'DISCOVERED'
export type CatalogRequestState = 'idle' | 'loading' | 'ready' | 'error'
export type ModelGroupKind = 'audio' | 'image' | 'video'
export type ModelKind = 'LLM' | 'AUDIO' | 'IMAGE' | 'VIDEO'
export type ModelSourceState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PARTIAL'
  | 'REFRESHING'
  | 'STALE_ERROR'
  | 'ERROR'

export interface CatalogProviderRecord {
  id: string
  name: string
  providerType: LLMProvider
  isCustom: boolean
  baseUrl?: string | null
  catalogMode: CatalogMode
}

export interface ProviderCredentialSetting {
  provider: CatalogProviderRecord
  apiKeyConfigured: boolean
}

export interface ModelInfo {
  modelIdentifier: string
  name: string
  description?: string | null
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
  metadataProvenance?: ModelMetadataProvenance | null
}

export interface ProviderWithModels {
  provider: CatalogProviderRecord
  models: ModelInfo[]
}

export interface ModelSourceStatus {
  modelKind: ModelKind
  state: ModelSourceState
  modelCount: number
  successfulUnitCount: number
  failedUnitCount: number
  safeMessage?: string | null
}

export interface ProviderModelCatalogSnapshot {
  runtimeKind: string
  ownerProvider: CatalogProviderRecord
  sources: ModelSourceStatus[]
  llmModels: ModelInfo[]
  audioModels: ModelInfo[]
  imageModels: ModelInfo[]
  videoModels: ModelInfo[]
}

export interface DiscoverySettingCatalogTarget {
  ownerProviderId: string
  modelKinds: ModelKind[]
}

export interface RuntimeCatalogSnapshot {
  runtimeKind: string
  currentRequestId: number
  state: CatalogRequestState
  hasSuccessfulPayload: boolean
  providersById: Record<string, ProviderModelCatalogSnapshot>
  errorMessage: string | null
}

export interface CustomLlmProviderDraftInput { name: string; baseUrl: string; apiKey: string }
export interface CustomLlmProviderProbeModel { id: string; name: string }
export interface CustomLlmProviderProbeResult { discoveredModels: CustomLlmProviderProbeModel[] }
export type QwenEndpointSource = 'DEFAULT' | 'CONFIGURED'
export interface QwenSetupStatus { effectiveBaseUrl: string; endpointSource: QwenEndpointSource }
export interface QwenConfigurationInput { baseUrl: string; apiKey: string }
export interface QwenConfigurationCommandResult {
  setup: QwenSetupStatus
  credentialSetting: ProviderCredentialSetting
}
export const defaultQwenSetupStatus = (): QwenSetupStatus => ({
  effectiveBaseUrl: '', endpointSource: 'DEFAULT',
})
export type GeminiConfigurationOption = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT'
export interface GeminiSetupConfigState {
  activeMode: GeminiConfigurationOption | null
  aiStudioConfigured: boolean | null
  vertexExpressConfigured: boolean | null
  vertexProject: { project: string; location: string } | null
}
export interface GeminiConfigurationCommandResult {
  setup: GeminiSetupConfigState
  credentialSetting: ProviderCredentialSetting
}
export interface GeminiOptionSaveInput {
  option: GeminiConfigurationOption
  apiKey?: string | null
  project?: string | null
  location?: string | null
}
export const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  activeMode: null,
  aiStudioConfigured: null,
  vertexExpressConfigured: null,
  vertexProject: null,
})
export const isGeminiOptionConfigured = (
  setup: GeminiSetupConfigState,
  option: GeminiConfigurationOption,
): boolean => option === 'AI_STUDIO'
  ? setup.aiStudioConfigured === true
  : option === 'VERTEX_EXPRESS'
    ? setup.vertexExpressConfigured === true
    : setup.vertexProject !== null
export const isGeminiOptionAvailable = (
  setup: GeminiSetupConfigState,
  option: GeminiConfigurationOption,
): boolean => option === 'AI_STUDIO'
  ? setup.aiStudioConfigured !== null
  : option === 'VERTEX_EXPRESS'
    ? setup.vertexExpressConfigured !== null
    : true
export const normalizeCatalogRuntimeKind = (runtimeKind: string): string => {
  if (typeof runtimeKind !== 'string') throw new Error('runtimeKind is required')
  const normalized = runtimeKind.trim().toLowerCase()
  if (!normalized) throw new Error('runtimeKind is required')
  return normalized
}
export const emptyRuntimeCatalogSnapshot = (runtimeKind: string): RuntimeCatalogSnapshot => ({
  runtimeKind: normalizeCatalogRuntimeKind(runtimeKind),
  currentRequestId: 0,
  state: 'idle',
  hasSuccessfulPayload: false,
  providersById: {},
  errorMessage: null,
})
