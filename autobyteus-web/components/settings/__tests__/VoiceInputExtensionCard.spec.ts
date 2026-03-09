import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceInputExtensionCard from '../VoiceInputExtensionCard.vue'

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
    installedAt: null,
    runtimeVersion: null,
    modelVersion: null,
    backendKind: null,
    lastError: null,
    ...overrides,
  }
}

describe('VoiceInputExtensionCard', () => {
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
          message: 'Downloading runtime and model. This can take a minute on first install.',
        }),
      },
    })

    expect(wrapper.text()).toContain('Installing')
    expect(wrapper.text()).toContain('Downloading runtime and model')
    expect(wrapper.text()).toContain('Installing...')
  })
})
