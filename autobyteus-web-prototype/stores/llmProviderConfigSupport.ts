import type {
  GetProviderSettingsQuery,
  ModelMetadataProvenance,
} from '~/generated/graphql'
import type { LLMProvider } from '~/types/llm'

export type LlmProviderStatus = 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE'

export interface CatalogProviderRecord {
  id: string
  name: string
  providerType: LLMProvider
  isCustom: boolean
  baseUrl?: string | null
  status: LlmProviderStatus
  statusMessage?: string | null
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

export type ProviderSettingsGroup = GetProviderSettingsQuery['providerSettings'][number]

export interface CustomLlmProviderDraftInput {
  name: string
  baseUrl: string
  apiKey: string
}

export interface CustomLlmProviderProbeModel {
  id: string
  name: string
}

export interface CustomLlmProviderProbeResult {
  discoveredModels: CustomLlmProviderProbeModel[]
}

export type QwenEndpointSource = 'DEFAULT' | 'CONFIGURED'

export interface QwenSetupStatus {
  effectiveBaseUrl: string
  endpointSource: QwenEndpointSource
  apiKeyConfigured: boolean
}

export interface QwenConfigurationInput {
  baseUrl: string
  apiKey: string
}

export const defaultQwenSetupStatus = (): QwenSetupStatus => ({
  effectiveBaseUrl: '',
  endpointSource: 'DEFAULT',
  apiKeyConfigured: false,
})

export type GeminiConfigurationOption = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT'

export interface GeminiSetupConfigState {
  activeMode: GeminiConfigurationOption | null
  aiStudioConfigured: boolean | null
  vertexExpressConfigured: boolean | null
  vertexProject: {
    project: string
    location: string
  } | null
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
): boolean => {
  if (option === 'AI_STUDIO') return setup.aiStudioConfigured === true
  if (option === 'VERTEX_EXPRESS') return setup.vertexExpressConfigured === true
  return setup.vertexProject !== null
}

export const isGeminiOptionAvailable = (
  setup: GeminiSetupConfigState,
  option: GeminiConfigurationOption,
): boolean => {
  if (option === 'AI_STUDIO') return setup.aiStudioConfigured !== null
  if (option === 'VERTEX_EXPRESS') return setup.vertexExpressConfigured !== null
  return true
}
