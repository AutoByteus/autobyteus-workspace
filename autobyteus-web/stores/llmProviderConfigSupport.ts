import type { LLMProvider } from '~/types/llm'
import type { ModelMetadataProvenance } from '~/generated/graphql'

export interface CredentialStatus {
  backendHealth: 'READY' | 'LOCKED' | 'UNAVAILABLE' | 'CORRUPT' | 'INCOMPATIBLE'
  storageState: 'MISSING' | 'CONFIGURED' | null
  lifecycle: 'WRITABLE' | 'EXTERNALLY_MANAGED' | null
  instructionCode: string | null
}

export interface LLMProviderConfig { credentialStatus?: CredentialStatus | null }

export type LlmProviderStatus = 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE'

export interface LlmProviderRecord {
  id: string
  name: string
  providerType: LLMProvider
  isCustom: boolean
  baseUrl?: string | null
  credentialStatus: CredentialStatus | null
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

export type GeminiConfigurationOption = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT'
export type GeminiEffectiveMode = GeminiConfigurationOption | 'UNCONFIGURED'
export type GeminiConfigurationState = 'MISSING' | 'CONFIGURED'

export interface GeminiSetupConfigState {
  effectiveMode: GeminiEffectiveMode
  aiStudioCredentialStatus: CredentialStatus
  vertexExpressCredentialStatus: CredentialStatus
  vertexProjectStatus: GeminiConfigurationState
  vertexProject: string | null
  vertexLocation: string | null
}

export interface GeminiOptionSaveInput {
  option: GeminiConfigurationOption
  geminiApiKey?: string | null
  vertexApiKey?: string | null
  vertexProject?: string | null
  vertexLocation?: string | null
}

export interface GeminiConfigurationOperationResult {
  operation: 'SAVED' | 'REMOVED'
  option: GeminiConfigurationOption
  effectiveMode: GeminiEffectiveMode
}

const unavailableCredentialStatus = (): CredentialStatus => ({
  backendHealth: 'UNAVAILABLE', storageState: null, lifecycle: null,
  instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
})

export const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  effectiveMode: 'UNCONFIGURED',
  aiStudioCredentialStatus: unavailableCredentialStatus(),
  vertexExpressCredentialStatus: unavailableCredentialStatus(),
  vertexProjectStatus: 'MISSING',
  vertexProject: null,
  vertexLocation: null,
})

export const syncProviderConfiguredState = (
  rows: ProviderWithModels[],
  providerConfigs: Record<string, LLMProviderConfig>,
): Record<string, LLMProviderConfig> => {
  const nextConfigs = { ...providerConfigs }
  for (const row of rows) {
    nextConfigs[row.provider.id] = {
      ...(nextConfigs[row.provider.id] ?? {}),
      credentialStatus: row.provider.credentialStatus,
    }
  }
  return nextConfigs
}

export const replaceProviderConfiguredState = (
  rows: ProviderWithModels[],
  providerId: string,
  credentialStatus: CredentialStatus,
): ProviderWithModels[] => rows.map((row) =>
  row.provider.id === providerId
    ? { ...row, provider: { ...row.provider, credentialStatus } }
    : row,
)

export const resolveGeminiProviderConfiguredState = (setup: GeminiSetupConfigState): boolean => {
  return setup.vertexExpressCredentialStatus.storageState === 'CONFIGURED'
    || setup.vertexProjectStatus === 'CONFIGURED'
    || setup.aiStudioCredentialStatus.storageState === 'CONFIGURED'
}

export const resolveGeminiEffectiveCredentialStatus = (
  setup: GeminiSetupConfigState,
): CredentialStatus => setup.effectiveMode === 'VERTEX_EXPRESS'
  ? setup.vertexExpressCredentialStatus
  : setup.aiStudioCredentialStatus
