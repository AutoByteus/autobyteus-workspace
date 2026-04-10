import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import GeminiSetupForm from '../GeminiSetupForm.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'settings.components.settings.ProviderAPIKeyManager.ai_studio': 'AI Studio',
      'settings.components.settings.ProviderAPIKeyManager.vertex_express': 'Vertex Express',
      'settings.components.settings.ProviderAPIKeyManager.vertex_project': 'Vertex Project',
    }[key] ?? key),
  }),
}))

const mountComponent = () =>
  mount(GeminiSetupForm, {
    props: {
      geminiSetup: {
        mode: 'AI_STUDIO',
        geminiApiKeyConfigured: false,
        vertexApiKeyConfigured: false,
        vertexProject: null,
        vertexLocation: null,
      },
      saving: false,
    },
    global: {
      mocks: {
        $t: (key: string) => ({
          'settings.components.settings.ProviderAPIKeyManager.gemini_setup_choose_a_mode_and': 'Gemini setup: choose a mode and fill only required fields.',
          'settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key': 'Enter Gemini API key...',
          'settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key': 'Enter Vertex API key...',
          'settings.components.settings.ProviderAPIKeyManager.vertex_project_id': 'Vertex project id',
          'settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1': 'Vertex location (e.g. us-central1)',
          'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
          'settings.components.settings.ProviderAPIKeyManager.save_gemini_setup': 'Save Gemini Setup',
        }[key] ?? key),
      },
    },
  })

describe('GeminiSetupForm', () => {
  it('emits an AI Studio payload from local form state', async () => {
    const wrapper = mountComponent()

    await wrapper.get('input[placeholder="Enter Gemini API key..."]').setValue('gemini-key')
    await wrapper.findAll('button').find((button) => button.text().includes('Save Gemini Setup'))!.trigger('click')

    expect(wrapper.emitted('save')).toEqual([[
      {
        mode: 'AI_STUDIO',
        geminiApiKey: 'gemini-key',
        vertexApiKey: null,
        vertexProject: null,
        vertexLocation: null,
      },
    ]])
  })

  it('switches to Vertex Project and emits the normalized payload', async () => {
    const wrapper = mountComponent()

    await wrapper.findAll('button').find((button) => button.text().includes('Vertex Project'))!.trigger('click')
    await wrapper.get('input[placeholder="Vertex project id"]').setValue('project-1')
    await wrapper.get('input[placeholder="Vertex location (e.g. us-central1)"]').setValue('us-central1')
    await wrapper.findAll('button').find((button) => button.text().includes('Save Gemini Setup'))!.trigger('click')

    expect(wrapper.emitted('save')).toEqual([[
      {
        mode: 'VERTEX_PROJECT',
        geminiApiKey: null,
        vertexApiKey: null,
        vertexProject: 'project-1',
        vertexLocation: 'us-central1',
      },
    ]])
  })
})
