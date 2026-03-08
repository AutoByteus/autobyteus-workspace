import type { ExtensionDescriptor, ExtensionId, SupportedArch, SupportedPlatform } from './types'

const DEFAULT_RUNTIME_VERSION = '0.1.1'
const DEFAULT_RUNTIME_RELEASE_TAG = `v${DEFAULT_RUNTIME_VERSION}`
const DEFAULT_REPOSITORY = 'AutoByteus/autobyteus-voice-runtime'
const DEFAULT_MANIFEST_ASSET_NAME = 'voice-input-runtime-manifest.json'

function normalizeRepository(repository: string): string {
  return repository.trim().replace(/\.git$/, '').replace(/^https:\/\/github\.com\//, '')
}

function buildGitHubReleaseAssetUrl(repository: string, tag: string, fileName: string): string {
  const normalizedRepository = normalizeRepository(repository)
  return `https://github.com/${normalizedRepository}/releases/download/${tag}/${fileName}`
}

function resolveVoiceInputManifestUrl(): string {
  const explicitManifestUrl = process.env.AUTOBYTEUS_VOICE_INPUT_MANIFEST_URL?.trim()
  if (explicitManifestUrl) {
    return explicitManifestUrl
  }

  const repository = process.env.AUTOBYTEUS_VOICE_RUNTIME_REPOSITORY?.trim() || DEFAULT_REPOSITORY
  const tag = process.env.AUTOBYTEUS_VOICE_RUNTIME_TAG?.trim() || DEFAULT_RUNTIME_RELEASE_TAG
  return buildGitHubReleaseAssetUrl(repository, tag, DEFAULT_MANIFEST_ASSET_NAME)
}

export function getRuntimeCoordinates(): {
  runtimeVersion: string
  runtimeReleaseTag: string
  runtimeManifestUrl: string
} {
  return {
    runtimeVersion: process.env.AUTOBYTEUS_VOICE_RUNTIME_VERSION?.trim() || DEFAULT_RUNTIME_VERSION,
    runtimeReleaseTag: process.env.AUTOBYTEUS_VOICE_RUNTIME_TAG?.trim() || DEFAULT_RUNTIME_RELEASE_TAG,
    runtimeManifestUrl: resolveVoiceInputManifestUrl(),
  }
}

export function getExtensionCatalog(): ExtensionDescriptor[] {
  const runtime = getRuntimeCoordinates()

  return [
    {
      id: 'voice-input',
      name: 'Voice Input',
      description: 'Optional local dictation powered by a downloadable Whisper runtime.',
      runtimeVersion: runtime.runtimeVersion,
      runtimeReleaseTag: runtime.runtimeReleaseTag,
      runtimeManifestUrl: runtime.runtimeManifestUrl,
    },
  ]
}

export function getExtensionDescriptor(id: ExtensionId): ExtensionDescriptor {
  const descriptor = getExtensionCatalog().find((entry) => entry.id === id)
  if (!descriptor) {
    throw new Error(`Unsupported extension: ${id}`)
  }
  return descriptor
}

export function getCurrentPlatform(): SupportedPlatform {
  if (process.platform !== 'darwin' && process.platform !== 'linux' && process.platform !== 'win32') {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }
  return process.platform
}

export function getCurrentArch(): SupportedArch {
  if (process.arch !== 'arm64' && process.arch !== 'x64') {
    throw new Error(`Unsupported architecture: ${process.arch}`)
  }
  return process.arch
}
