import { describe, expect, it } from 'vitest'
import { buildVoiceInputRuntimeEnv } from '../voice-input/voiceInputRuntimeSupport'

describe('buildVoiceInputRuntimeEnv', () => {
  it('uses the login-shell PATH on macOS', () => {
    const env = buildVoiceInputRuntimeEnv(
      { PATH: '/usr/bin:/bin', HOME: '/Users/tester' },
      'darwin',
      '/opt/homebrew/bin:/usr/bin:/bin',
    )

    expect(env.PATH).toBe('/opt/homebrew/bin:/usr/bin:/bin')
    expect(env.HOME).toBe('/Users/tester')
  })

  it('uses the login-shell PATH on Linux', () => {
    const env = buildVoiceInputRuntimeEnv(
      { PATH: '/usr/bin:/bin' },
      'linux',
      '/usr/local/bin:/usr/bin:/bin',
    )

    expect(env.PATH).toBe('/usr/local/bin:/usr/bin:/bin')
  })

  it('keeps the existing PATH when no login-shell override applies', () => {
    const env = buildVoiceInputRuntimeEnv(
      { PATH: 'C:\\Windows\\System32' },
      'win32',
      '/opt/homebrew/bin:/usr/bin:/bin',
    )

    expect(env.PATH).toBe('C:\\Windows\\System32')
  })
})
