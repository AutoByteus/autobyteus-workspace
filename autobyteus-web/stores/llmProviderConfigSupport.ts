import type { LLMProvider } from '~/types/llm'

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
  geminiCredentialStatus: CredentialStatus
  vertexCredentialStatus: CredentialStatus
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

export const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  mode: 'AI_STUDIO',
  geminiCredentialStatus: {
    backendHealth: 'UNAVAILABLE', storageState: null, lifecycle: null,
    instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
  },
  vertexCredentialStatus: {
    backendHealth: 'UNAVAILABLE', storageState: null, lifecycle: null,
    instructionCode: 'SECRET_BACKEND_UNAVAILABLE',
  },
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
  if (setup.mode === 'VERTEX_EXPRESS') {
    return setup.vertexCredentialStatus.storageState === 'CONFIGURED'
  }
  if (setup.mode === 'VERTEX_PROJECT') {
    return Boolean((setup.vertexProject ?? '').trim() && (setup.vertexLocation ?? '').trim())
  }
  return setup.geminiCredentialStatus.storageState === 'CONFIGURED'
}
