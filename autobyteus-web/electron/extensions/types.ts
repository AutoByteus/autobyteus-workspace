export type ExtensionId = 'voice-input'

export type ManagedExtensionStatus =
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'error'

export type SupportedPlatform = 'darwin' | 'linux' | 'win32'
export type SupportedArch = 'arm64' | 'x64'
export type RuntimeDistributionType = 'file' | 'archive'
export type VoiceInputLanguageMode = 'auto' | 'en' | 'zh'
export type VoiceInputBackendKind = 'mlx' | 'faster-whisper'
export type ExtensionInstallPhase =
  | 'idle'
  | 'fetching-manifest'
  | 'downloading-runtime'
  | 'extracting-runtime'
  | 'bootstrapping-runtime'
  | 'bootstrapping-model'
  | 'ready'

export interface ExtensionInstallProgress {
  phase: ExtensionInstallPhase
  percent: number | null
  bytesReceived: number | null
  bytesTotal: number | null
}

export interface VoiceModelSource {
  id: string
  sourceRepo: string
  sourceRevision?: string
  version: string
}

export interface VoiceRuntimeAsset {
  platform: SupportedPlatform
  arch: SupportedArch
  fileName: string
  url: string
  sha256: string
  entrypoint: string
  distributionType: RuntimeDistributionType
  backendKind: VoiceInputBackendKind
  model: VoiceModelSource
}

export interface VoiceInputRuntimeManifest {
  schemaVersion: 2
  runtimeId: ExtensionId
  runtimeVersion: string
  generatedAt: string
  assets: VoiceRuntimeAsset[]
}

export interface ExtensionDescriptor {
  id: ExtensionId
  name: string
  description: string
  runtimeVersion: string
  runtimeReleaseTag: string
  runtimeManifestUrl: string
}

export interface VoiceInputSettings {
  languageMode: VoiceInputLanguageMode
}

export interface ManagedExtensionRecord {
  id: ExtensionId
  status: ManagedExtensionStatus
  enabled: boolean
  settings: VoiceInputSettings
  message: string
  installProgress: ExtensionInstallProgress | null
  installedAt: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  runtimeEntrypoint: string | null
  modelPath: string | null
  backendKind: VoiceInputBackendKind | null
  lastError: string | null
}

export interface ManagedExtensionState {
  id: ExtensionId
  name: string
  description: string
  status: ManagedExtensionStatus
  enabled: boolean
  settings: VoiceInputSettings
  message: string
  installProgress: ExtensionInstallProgress | null
  installedAt: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  backendKind: VoiceInputBackendKind | null
  lastError: string | null
}

export interface UpdateVoiceInputSettingsPayload {
  languageMode: VoiceInputLanguageMode
}

export interface VoiceInputTranscriptionRequest {
  audioData: ArrayBuffer
  languageMode?: VoiceInputLanguageMode
}

export interface VoiceInputTranscriptionResult {
  ok: boolean
  text: string
  detectedLanguage: string | null
  noSpeech: boolean
  error: string | null
}
