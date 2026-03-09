import { afterEach, describe, expect, it, vi } from 'vitest'
import { getExtensionCatalog, getRuntimeCoordinates } from '../extensionCatalog'

describe('extensionCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the pinned default runtime coordinates', () => {
    const runtime = getRuntimeCoordinates()
    const [voiceInput] = getExtensionCatalog()

    expect(runtime.runtimeVersion).toBe('0.3.0')
    expect(runtime.runtimeReleaseTag).toBe('v0.3.0')
    expect(runtime.runtimeManifestUrl).toBe(
      'https://github.com/AutoByteus/autobyteus-voice-runtime/releases/download/v0.3.0/voice-input-runtime-manifest.json',
    )
    expect(voiceInput.id).toBe('voice-input')
  })

  it('prefers an explicit manifest url override', () => {
    vi.stubEnv('AUTOBYTEUS_VOICE_INPUT_MANIFEST_URL', 'https://example.com/voice-input-runtime-manifest.json')

    expect(getRuntimeCoordinates().runtimeManifestUrl).toBe('https://example.com/voice-input-runtime-manifest.json')
  })
})
