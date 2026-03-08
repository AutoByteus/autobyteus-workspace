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
    addToastMock.mockReset()
    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      transcribeVoiceInput: vi.fn().mockResolvedValue({
        ok: true,
        text: 'world',
        error: null,
      }),
    }
  })

  it('appends transcript text into the current draft without sending', async () => {
    const store = useVoiceInputStore()
    const audioBuffer = new Uint8Array([1, 2, 3]).buffer

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(audioBuffer)
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
  })

  it('surfaces transcription failure without mutating the draft', async () => {
    const store = useVoiceInputStore()
    const audioBuffer = new Uint8Array([1, 2, 3]).buffer

    ;(window as typeof window & { electronAPI?: any }).electronAPI.transcribeVoiceInput.mockResolvedValue({
      ok: false,
      text: '',
      error: 'runtime failed',
    })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(audioBuffer)
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
  })
})
