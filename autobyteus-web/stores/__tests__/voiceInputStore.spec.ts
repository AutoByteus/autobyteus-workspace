import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  activeContextStoreMock,
  extensionsStoreMock,
  addToastMock,
  enumerateDevicesMock,
  getUserMediaMock,
  permissionsQueryMock,
} = vi.hoisted(() => ({
  activeContextStoreMock: {
    currentRequirement: 'hello',
    updateRequirement: vi.fn(),
    send: vi.fn(),
  },
  extensionsStoreMock: {
    initialize: vi.fn().mockResolvedValue(undefined),
    voiceInput: {
      status: 'installed',
      enabled: true,
      settings: {
        languageMode: 'auto',
        audioInputDeviceId: null,
      },
    },
  },
  addToastMock: vi.fn(),
  enumerateDevicesMock: vi.fn(),
  getUserMediaMock: vi.fn(),
  permissionsQueryMock: vi.fn(),
}))

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}))

vi.mock('~/stores/extensionsStore', () => ({
  useExtensionsStore: () => extensionsStoreMock,
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}))

import { useVoiceInputStore } from '../voiceInputStore'

describe('voiceInputStore', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
    activeContextStoreMock.currentRequirement = 'hello'
    activeContextStoreMock.updateRequirement.mockReset()
    activeContextStoreMock.send.mockReset()
    extensionsStoreMock.initialize.mockClear()
    extensionsStoreMock.voiceInput.status = 'installed'
    extensionsStoreMock.voiceInput.enabled = true
    extensionsStoreMock.voiceInput.settings.languageMode = 'auto'
    extensionsStoreMock.voiceInput.settings.audioInputDeviceId = null
    addToastMock.mockReset()
    enumerateDevicesMock.mockReset()
    getUserMediaMock.mockReset()
    permissionsQueryMock.mockReset()
    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      transcribeVoiceInput: vi.fn().mockResolvedValue({
        ok: true,
        text: 'world',
        detectedLanguage: 'en',
        noSpeech: false,
        error: null,
      }),
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: enumerateDevicesMock.mockResolvedValue([
          { kind: 'audioinput', deviceId: 'mic-1', label: 'USB Microphone' },
        ]),
        getUserMedia: getUserMediaMock.mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
        addEventListener: vi.fn(),
      },
    })

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: permissionsQueryMock.mockResolvedValue({ state: 'granted' }),
      },
    })
  })

  it('appends transcript text into the current draft without sending', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1500,
        rms: 0.031,
        peak: 0.42,
        sampleCount: 72000,
      },
    }

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true

    await store.stopRecording()

    expect(window.electronAPI.transcribeVoiceInput).toHaveBeenCalledOnce()
    expect(activeContextStoreMock.updateRequirement).toHaveBeenCalledWith('hello world')
    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
    expect(store.latestResult?.outcome).toBe('transcript-ready')
    expect(store.latestResult?.diagnostics?.wavSampleRate).toBe(48000)
  })

  it('surfaces transcription failure without mutating the draft', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 900,
        rms: 0.021,
        peak: 0.18,
        sampleCount: 43200,
      },
    }

    ;(window as typeof window & { electronAPI?: any }).electronAPI.transcribeVoiceInput.mockResolvedValue({
      ok: false,
      text: '',
      detectedLanguage: null,
      noSpeech: false,
      error: 'runtime failed',
    })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true

    await store.stopRecording()

    expect(activeContextStoreMock.updateRequirement).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith('runtime failed', 'error')
    expect(store.latestResult?.outcome).toBe('error')
  })

  it('does not mutate the draft when no speech is detected', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 600,
        rms: 0.005,
        peak: 0.03,
        sampleCount: 28800,
      },
    }

    ;(window as typeof window & { electronAPI?: any }).electronAPI.transcribeVoiceInput.mockResolvedValue({
      ok: true,
      text: '',
      detectedLanguage: null,
      noSpeech: true,
      error: null,
    })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true

    await store.stopRecording()

    expect(activeContextStoreMock.updateRequirement).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith('No speech detected.', 'info')
    expect(store.latestResult?.outcome).toBe('no-speech')
  })

  it('distinguishes empty transcript from true no-speech', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1200,
        rms: 0.012,
        peak: 0.11,
        sampleCount: 57600,
      },
    }

    ;(window as typeof window & { electronAPI?: any }).electronAPI.transcribeVoiceInput.mockResolvedValue({
      ok: true,
      text: '',
      detectedLanguage: 'en',
      noSpeech: false,
      error: null,
    })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true

    await store.stopRecording()

    expect(store.latestResult?.outcome).toBe('empty-transcript')
    expect(addToastMock).toHaveBeenCalledWith('No transcript returned. Try speaking closer to the microphone.', 'info')
  })

  it('uses the selected audio input device when starting recording', async () => {
    extensionsStoreMock.voiceInput.settings.audioInputDeviceId = 'virtual-source'
    enumerateDevicesMock.mockResolvedValue([
      { kind: 'audioinput', deviceId: 'virtual-source', label: 'Virtual Source' },
      { kind: 'audioinput', deviceId: 'usb-mic', label: 'USB Microphone' },
    ])

    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording('settings-test')

    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: {
        channelCount: 1,
        deviceId: { exact: 'virtual-source' },
      },
    })
    expect(store.isRecording).toBe(true)
    expect(store.selectedAudioInputLabel).toBe('Virtual Source')

    vi.unstubAllGlobals()
  })

  it('resumes a suspended audio context before marking recording active', async () => {
    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()
    const resumeMock = vi.fn().mockImplementation(function(this: { state: string }) {
      this.state = 'running'
      return Promise.resolve()
    })

    vi.stubGlobal('AudioContext', class {
      state = 'suspended'
      audioWorklet = { addModule: addModuleMock }
      resume = resumeMock
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording('settings-test')

    expect(resumeMock).toHaveBeenCalledOnce()
    expect(store.isRecording).toBe(true)
    expect(store.latestResult?.outcome).toBe('recording')

    vi.unstubAllGlobals()
  })

  it('fails with an actionable error when the audio context never reaches running', async () => {
    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()
    const resumeMock = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('AudioContext', class {
      state = 'suspended'
      audioWorklet = { addModule: addModuleMock }
      resume = resumeMock
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording('settings-test')

    expect(resumeMock).toHaveBeenCalledOnce()
    expect(store.isRecording).toBe(false)
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('audio engine stayed in "suspended" state')
    expect(addToastMock).toHaveBeenCalledWith(
      'Voice Input recorder could not start because the audio engine stayed in "suspended" state.',
      'error',
    )
    expect(closeMock).toHaveBeenCalledOnce()
    expect(addModuleMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('fails fast when recording starts but no capture frames ever arrive', async () => {
    vi.useFakeTimers()

    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording('settings-test')
    expect(store.isRecording).toBe(true)

    await vi.advanceTimersByTimeAsync(2500)

    expect(store.isRecording).toBe(false)
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('did not receive any microphone frames')
    expect(addToastMock).toHaveBeenCalledWith(
      'Voice Input did not receive any microphone frames. Reset the test and try again, or switch back to System default.',
      'error',
    )
    expect(closeMock).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('resets the settings-level test state without requiring app restart', async () => {
    const stopMock = vi.fn()
    const closeMock = vi.fn().mockResolvedValue(undefined)

    const store = useVoiceInputStore()
    store.stream = {
      getTracks: () => [{ stop: stopMock }],
    } as any
    store.audioContext = {
      close: closeMock,
    } as any
    store.audioWorklet = {
      port: { onmessage: null },
    } as any
    store.isRecording = true
    store.recordingSource = 'settings-test'
    store.error = 'stuck'
    store.setLatestResult({
      source: 'settings-test',
      outcome: 'error',
      transcript: '',
      detectedLanguage: null,
      error: 'stuck',
      diagnostics: null,
    })

    await store.resetSettingsTestState()

    expect(store.isRecording).toBe(false)
    expect(store.isTranscribing).toBe(false)
    expect(store.error).toBe(null)
    expect(store.latestResult).toBe(null)
    expect(stopMock).toHaveBeenCalledOnce()
    expect(closeMock).toHaveBeenCalledOnce()
  })

  it('fails early when no audio input devices are available', async () => {
    enumerateDevicesMock.mockResolvedValue([])

    const store = useVoiceInputStore()

    await store.startRecording('settings-test')

    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('No audio input devices found')
    expect(addToastMock).toHaveBeenCalledWith(
      'No audio input devices found. Connect a microphone or enable a virtual audio source.',
      'error',
    )
  })
})
