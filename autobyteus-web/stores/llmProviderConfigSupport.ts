import type { LLMProvider } from '~/types/llm'
import type { ModelMetadataProvenance } from '~/generated/graphql'

export interface CredentialStatus {
  vaultHealth: 'READY' | 'LOCKED' | 'UNAVAILABLE' | 'CORRUPT' | 'INCOMPATIBLE'
  storageState: 'MISSING' | 'CONFIGURED' | null
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
export type GeminiConfigurationState = 'MISSING' | 'CONFIGURED' | 'UNAVAILABLE'

export interface GeminiSetupConfigState {
  activeMode: GeminiConfigurationOption | null
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

export const geminiOptionMutationVariables = (
  input: GeminiOptionSaveInput,
): Record<string, unknown> => ({
  option: input.option,
  geminiApiKey: input.geminiApiKey ?? null,
  vertexApiKey: input.vertexApiKey ?? null,
  vertexProject: input.vertexProject ?? null,
  vertexLocation: input.vertexLocation ?? null,
})

export interface GeminiConfigurationOperationResult {
  operation: 'SAVED' | 'ACTIVATED' | 'SAVED_AND_ACTIVATED' | 'REMOVED'
  outcome: 'SUCCEEDED' | 'PARTIAL'
  option: GeminiConfigurationOption
  optionStatus: GeminiConfigurationState
  activeMode: GeminiConfigurationOption | null
  configurationOutcome: 'NOT_REQUESTED' | 'SUCCEEDED' | 'FAILED'
  modeOutcome: 'NOT_REQUESTED' | 'SUCCEEDED' | 'FAILED'
  instructionCode: string | null
}

const unavailableCredentialStatus = (): CredentialStatus => ({
  vaultHealth: 'UNAVAILABLE', storageState: null,
  instructionCode: 'SECRET_VAULT_UNAVAILABLE',
})

export const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  activeMode: null,
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

export const resolveGeminiActiveCredentialStatus = (
  setup: GeminiSetupConfigState,
): CredentialStatus => {
  if (setup.activeMode === 'VERTEX_EXPRESS') return setup.vertexExpressCredentialStatus
  if (setup.activeMode === 'AI_STUDIO') return setup.aiStudioCredentialStatus
  if (setup.activeMode === 'VERTEX_PROJECT') {
    return {
      vaultHealth: 'READY',
      storageState: setup.vertexProjectStatus === 'CONFIGURED' ? 'CONFIGURED' : 'MISSING',
      instructionCode: null,
    }
  }
  return {
    vaultHealth: setup.aiStudioCredentialStatus.vaultHealth,
    storageState: 'MISSING',
    instructionCode: 'GEMINI_SETUP_MODE_NOT_SELECTED',
  }
}
