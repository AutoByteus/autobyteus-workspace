import { afterEach, describe, expect, it, vi } from 'vitest'
import { getExtensionCatalog, getRuntimeCoordinates } from '../extensionCatalog'

describe('extensionCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the pinned default runtime coordinates', () => {
    const runtime = getRuntimeCoordinates()
    const [voiceInput] = getExtensionCatalog()

    expect(runtime.runtimeVersion).toBe('0.1.1')
    expect(runtime.runtimeReleaseTag).toBe('voice-runtime-v0.1.1')
    expect(runtime.runtimeManifestUrl).toBe(
      'https://github.com/AutoByteus/autobyteus-workspace/releases/download/voice-runtime-v0.1.1/voice-input-runtime-manifest.json',
    )
    expect(voiceInput.id).toBe('voice-input')
  })

  it('prefers an explicit manifest url override', () => {
    vi.stubEnv('AUTOBYTEUS_VOICE_INPUT_MANIFEST_URL', 'https://example.com/voice-input-runtime-manifest.json')

    expect(getRuntimeCoordinates().runtimeManifestUrl).toBe('https://example.com/voice-input-runtime-manifest.json')
  })
})
