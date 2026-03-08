import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExtensionsStore } from '../extensionsStore'

const { addToastMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}))

describe('extensionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    addToastMock.mockReset()
    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      getExtensionsState: vi.fn().mockResolvedValue([
        {
          id: 'voice-input',
          name: 'Voice Input',
          description: 'Optional local dictation.',
          status: 'not-installed',
          message: '',
          installedAt: null,
          runtimeVersion: null,
          modelVersion: null,
          lastError: null,
        },
      ]),
      installExtension: vi.fn().mockResolvedValue([
        {
          id: 'voice-input',
          name: 'Voice Input',
          description: 'Optional local dictation.',
          status: 'installed',
          message: 'Voice Input is ready.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.1.0',
          modelVersion: 'tiny.en-q5_1',
          lastError: null,
        },
      ]),
      removeExtension: vi.fn().mockResolvedValue([
        {
          id: 'voice-input',
          name: 'Voice Input',
          description: 'Optional local dictation.',
          status: 'not-installed',
          message: '',
          installedAt: null,
          runtimeVersion: null,
          modelVersion: null,
          lastError: null,
        },
      ]),
      reinstallExtension: vi.fn().mockResolvedValue([
        {
          id: 'voice-input',
          name: 'Voice Input',
          description: 'Optional local dictation.',
          status: 'installed',
          message: 'Voice Input is ready.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.1.0',
          modelVersion: 'tiny.en-q5_1',
          lastError: null,
        },
      ]),
    }
  })

  it('initializes from the electron bridge', async () => {
    const store = useExtensionsStore()

    await store.initialize()

    expect(store.voiceInput?.status).toBe('not-installed')
    expect(window.electronAPI.getExtensionsState).toHaveBeenCalledOnce()
  })

  it('applies install and remove lifecycle updates', async () => {
    const store = useExtensionsStore()
    await store.initialize()

    await store.installExtension('voice-input')
    expect(store.voiceInput?.status).toBe('installed')

    await store.removeExtension('voice-input')
    expect(store.voiceInput?.status).toBe('not-installed')
  })
})
