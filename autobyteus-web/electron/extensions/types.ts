export type ExtensionId = 'voice-input'

export type ManagedExtensionStatus =
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'error'

export type SupportedPlatform = 'darwin' | 'linux' | 'win32'
export type SupportedArch = 'arm64' | 'x64'

export type RuntimeDistributionType = 'file' | 'archive'

export interface VoiceRuntimeAsset {
  platform: SupportedPlatform
  arch: SupportedArch
  fileName: string
  url: string
  sha256: string
  entrypoint: string
  distributionType: RuntimeDistributionType
}

export interface VoiceModelAsset {
  fileName: string
  url: string
  sha256: string
  sizeBytes: number
  version: string
}

export interface VoiceInputRuntimeManifest {
  schemaVersion: 1
  runtimeId: ExtensionId
  runtimeVersion: string
  generatedAt: string
  assets: VoiceRuntimeAsset[]
  model: VoiceModelAsset
}

export interface ExtensionDescriptor {
  id: ExtensionId
  name: string
  description: string
  runtimeVersion: string
  runtimeReleaseTag: string
  runtimeManifestUrl: string
}

export interface ManagedExtensionRecord {
  id: ExtensionId
  status: ManagedExtensionStatus
  message: string
  installedAt: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  runtimeEntrypoint: string | null
  modelPath: string | null
  lastError: string | null
}

export interface ManagedExtensionState {
  id: ExtensionId
  name: string
  description: string
  status: ManagedExtensionStatus
  message: string
  installedAt: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  lastError: string | null
}

export interface VoiceInputTranscriptionRequest {
  audioData: ArrayBuffer
  language?: string
}

export interface VoiceInputTranscriptionResult {
  ok: boolean
  text: string
  error: string | null
}
