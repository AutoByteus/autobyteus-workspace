import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  activeContextStoreMock,
  extensionsStoreMock,
  addToastMock,
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
    },
  },
  addToastMock: vi.fn(),
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
    setActivePinia(createPinia())
    activeContextStoreMock.currentRequirement = 'hello'
    activeContextStoreMock.updateRequirement.mockReset()
    activeContextStoreMock.send.mockReset()
    extensionsStoreMock.initialize.mockClear()
    extensionsStoreMock.voiceInput.status = 'installed'
    extensionsStoreMock.voiceInput.enabled = true
    addToastMock.mockReset()
    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      transcribeVoiceInput: vi.fn().mockResolvedValue({
        ok: true,
        text: 'world',
        detectedLanguage: 'en',
        noSpeech: false,
        error: null,
      }),
    }
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
})
