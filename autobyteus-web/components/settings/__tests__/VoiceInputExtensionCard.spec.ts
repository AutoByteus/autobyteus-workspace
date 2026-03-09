import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceInputExtensionCard from '../VoiceInputExtensionCard.vue'
import { vi } from 'vitest'

const { voiceInputStoreMock } = vi.hoisted(() => ({
  voiceInputStoreMock: {
    initialize: vi.fn().mockResolvedValue(undefined),
    toggleRecording: vi.fn().mockResolvedValue(undefined),
    isRecording: false,
    isTranscribing: false,
    recordingSource: null,
    liveInputLevel: 0,
    latestResult: null,
  },
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const { toRef } = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    storeToRefs: (store: any) => ({
      latestResult: toRef(store, 'latestResult'),
    }),
  }
})

vi.mock('~/stores/voiceInputStore', () => ({
  useVoiceInputStore: () => voiceInputStoreMock,
}))

function makeExtension(overrides: Record<string, unknown> = {}) {
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
    installProgress: null,
    installedAt: null,
    runtimeVersion: null,
    modelVersion: null,
    backendKind: null,
    lastError: null,
    ...overrides,
  }
}

describe('VoiceInputExtensionCard', () => {
  beforeEach(() => {
    voiceInputStoreMock.initialize.mockClear()
    voiceInputStoreMock.toggleRecording.mockClear()
    voiceInputStoreMock.isRecording = false
    voiceInputStoreMock.isTranscribing = false
    voiceInputStoreMock.recordingSource = null
    voiceInputStoreMock.liveInputLevel = 0
    voiceInputStoreMock.latestResult = null
  })

  it('shows install controls for a not-installed extension', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        pendingAction: null,
        extension: makeExtension(),
      },
    })

    expect(wrapper.text()).toContain('Voice Input')
    expect(wrapper.text()).toContain('Not Installed')
    expect(wrapper.text()).toContain('Install')
  })

  it('shows enable and language controls for an installed disabled extension', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        pendingAction: null,
        extension: makeExtension({
          status: 'installed',
          enabled: false,
          message: 'Voice Input is installed and disabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'faster-whisper',
        }),
      },
    })

    expect(wrapper.text()).toContain('Installed')
    expect(wrapper.text()).toContain('Disabled')
    expect(wrapper.text()).toContain('Enable')
    expect(wrapper.text()).toContain('Open Folder')
    expect(wrapper.text()).toContain('Remove')
    expect(wrapper.text()).toContain('Reinstall')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Backend: faster-whisper')
  })

  it('shows disable control for an installed enabled extension', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        pendingAction: null,
        extension: makeExtension({
          status: 'installed',
          enabled: true,
          message: 'Voice Input is installed and enabled.',
          installedAt: '2026-03-08T10:00:00.000Z',
          runtimeVersion: '0.2.0',
          modelVersion: 'fixture-model-v1',
          backendKind: 'mlx',
        }),
      },
    })

    expect(wrapper.text()).toContain('Enabled')
    expect(wrapper.text()).toContain('Disable')
    expect(wrapper.text()).toContain('Backend: MLX')
  })

  it('shows an in-progress state while installation is running', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: true,
        pendingAction: 'install',
        extension: makeExtension({
          status: 'installing',
          message: 'Downloading runtime bundle... 42%',
          installProgress: {
            phase: 'downloading-runtime',
            percent: 42,
            bytesReceived: 42,
            bytesTotal: 100,
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('Installing')
    expect(wrapper.text()).toContain('Downloading runtime bundle')
    expect(wrapper.text()).toContain('Installing...')
    expect(wrapper.text()).toContain('42%')
  })

  it('renders settings-level test diagnostics for the last test result', () => {
    voiceInputStoreMock.latestResult = {
      source: 'settings-test',
      outcome: 'empty-transcript',
      transcript: '',
      detectedLanguage: 'en',
      error: null,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1820,
        rms: 0.031,
        peak: 0.42,
        sampleCount: 87360,
      },
      completedAt: '2026-03-09T08:00:00.000Z',
    }

    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        pendingAction: null,
        extension: makeExtension({
          status: 'installed',
          enabled: true,
          message: 'Voice Input is installed and enabled.',
          runtimeVersion: '0.3.0',
          modelVersion: 'mlx-community/whisper-small-mlx',
          backendKind: 'mlx',
        }),
      },
    })

    expect(wrapper.text()).toContain('Test Voice Input')
    expect(wrapper.text()).toContain('Empty Transcript')
    expect(wrapper.text()).toContain('48000 Hz')
    expect(wrapper.text()).toContain('Language: en')
  })
})
