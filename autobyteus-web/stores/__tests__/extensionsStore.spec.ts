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
      openExtensionFolder: vi.fn().mockResolvedValue({
        success: true,
      }),
    }
  })

  it('initializes from the electron bridge', async () => {
    const store = useExtensionsStore()

    await store.initialize()

    expect(store.voiceInput?.status).toBe('not-installed')
    expect(window.electronAPI.getExtensionsState).toHaveBeenCalledOnce()
  })

  it('shows an immediate installing state before the install bridge resolves', async () => {
    const store = useExtensionsStore()
    await store.initialize()

    let resolveInstall: ((value: any) => void) | null = null
    window.electronAPI.installExtension = vi.fn().mockImplementation(
      () => new Promise((resolve) => {
        resolveInstall = resolve
      }),
    )

    const installPromise = store.installExtension('voice-input')

    expect(store.isBusy).toBe(true)
    expect(store.pendingAction).toBe('install')
    expect(store.voiceInput?.status).toBe('installing')
    expect(store.voiceInput?.message).toContain('Downloading runtime and model')

    resolveInstall?.([
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
    ])

    await installPromise

    expect(store.isBusy).toBe(false)
    expect(store.pendingAction).toBe(null)
    expect(store.voiceInput?.status).toBe('installed')
  })

  it('applies install and remove lifecycle updates', async () => {
    const store = useExtensionsStore()
    await store.initialize()

    await store.installExtension('voice-input')
    expect(store.voiceInput?.status).toBe('installed')

    await store.removeExtension('voice-input')
    expect(store.voiceInput?.status).toBe('not-installed')
  })

  it('opens the managed extension folder through the electron bridge', async () => {
    const store = useExtensionsStore()
    await store.initialize()

    await store.openExtensionFolder('voice-input')

    expect(window.electronAPI.openExtensionFolder).toHaveBeenCalledWith('voice-input')
  })
})
