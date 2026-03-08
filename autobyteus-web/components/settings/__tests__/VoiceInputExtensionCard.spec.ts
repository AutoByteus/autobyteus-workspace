import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceInputExtensionCard from '../VoiceInputExtensionCard.vue'

describe('VoiceInputExtensionCard', () => {
  it('shows install controls for a not-installed extension', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        extension: {
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
      },
    })

    expect(wrapper.text()).toContain('Voice Input')
    expect(wrapper.text()).toContain('Not Installed')
    expect(wrapper.text()).toContain('Install')
  })

  it('shows remove and reinstall controls for an installed extension', () => {
    const wrapper = mount(VoiceInputExtensionCard, {
      props: {
        busy: false,
        extension: {
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
      },
    })

    expect(wrapper.text()).toContain('Installed')
    expect(wrapper.text()).toContain('Remove')
    expect(wrapper.text()).toContain('Reinstall')
    expect(wrapper.text()).toContain('Runtime: 0.1.0')
  })
})
