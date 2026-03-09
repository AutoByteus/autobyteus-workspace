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

function makeVoiceInputState(overrides: Record<string, unknown> = {}) {
  return {
    id: 'voice-input',
    name: 'Voice Input',
    description: 'Optional local dictation.',
    status: 'not-installed',
    enabled: false,
    settings: {
      languageMode: 'auto',
    },
    message: '',
    installedAt: null,
    runtimeVersion: null,
    modelVersion: null,
    backendKind: null,
    lastError: null,
    ...overrides,
  }
}

describe('extensionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    addToastMock.mockReset()
    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      getExtensionsState: vi.fn().mockResolvedValue([
        makeVoiceInputState(),
      ]),
      installExtension: vi.fn().mockResolvedValue([
        makeVoiceInputState({
          status: 'installed',
          enabled: false,
          message: 'Voice Input is installed and disabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
      ]),
      enableExtension: vi.fn().mockResolvedValue([
        makeVoiceInputState({
          status: 'installed',
          enabled: true,
          message: 'Voice Input is installed and enabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
      ]),
      disableExtension: vi.fn().mockResolvedValue([
        makeVoiceInputState({
          status: 'installed',
          enabled: false,
          message: 'Voice Input is installed and disabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
      ]),
      updateVoiceInputSettings: vi.fn().mockResolvedValue([
        makeVoiceInputState({
          status: 'installed',
          enabled: true,
          settings: {
            languageMode: 'zh',
          },
          message: 'Voice Input is installed and enabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
      ]),
      removeExtension: vi.fn().mockResolvedValue([
        makeVoiceInputState(),
      ]),
      reinstallExtension: vi.fn().mockResolvedValue([
        makeVoiceInputState({
          status: 'installed',
          enabled: true,
          settings: {
            languageMode: 'zh',
          },
          message: 'Voice Input is installed and enabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
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
    expect(store.voiceInput?.enabled).toBe(false)
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
    expect(store.voiceInput?.enabled).toBe(false)
    expect(store.voiceInput?.message).toContain('Downloading runtime and model')

    resolveInstall?.([
      makeVoiceInputState({
        status: 'installed',
        enabled: false,
        message: 'Voice Input is installed and disabled.',
        installedAt: '2026-03-08T10:00:00.000Z',
        runtimeVersion: '0.2.0',
        modelVersion: 'fixture-model-v1',
        backendKind: 'faster-whisper',
      }),
    ])

    await installPromise

    expect(store.isBusy).toBe(false)
    expect(store.pendingAction).toBe(null)
    expect(store.voiceInput?.status).toBe('installed')
    expect(store.voiceInput?.enabled).toBe(false)
  })

  it('applies enable, settings, disable, and remove lifecycle updates', async () => {
    const store = useExtensionsStore()
    await store.initialize()

    await store.installExtension('voice-input')
    expect(store.voiceInput?.enabled).toBe(false)

    await store.enableExtension('voice-input')
    expect(store.voiceInput?.enabled).toBe(true)

    await store.updateVoiceInputLanguageMode('zh')
    expect(store.voiceInput?.settings.languageMode).toBe('zh')

    await store.disableExtension('voice-input')
    expect(store.voiceInput?.enabled).toBe(false)

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
