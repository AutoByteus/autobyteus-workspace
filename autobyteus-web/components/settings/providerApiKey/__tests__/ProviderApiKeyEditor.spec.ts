import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProviderApiKeyEditor from '../ProviderApiKeyEditor.vue'

const mountComponent = (configured = false, resetVersion = 0) =>
  mount(ProviderApiKeyEditor, {
    props: {
      configured,
      saving: false,
      resetVersion,
    },
    global: {
      mocks: {
        $t: (key: string) => ({
          'settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update': 'Enter new key to update...',
          'settings.components.settings.ProviderAPIKeyManager.enter_api_key': 'Enter API key...',
          'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
          'settings.components.settings.ProviderAPIKeyManager.save_key': 'Save Key',
        }[key] ?? key),
      },
    },
  })

describe('ProviderApiKeyEditor', () => {
  it('emits the entered API key from local editor state', async () => {
    const wrapper = mountComponent(false)

    await wrapper.get('input[placeholder="Enter API key..."]').setValue('provider-key')
    await wrapper.findAll('button').find((button) => button.text().includes('Save Key'))!.trigger('click')

    expect(wrapper.emitted('save')).toEqual([['provider-key']])
  })

  it('uses the configured placeholder and resets local state when resetVersion changes', async () => {
    const wrapper = mountComponent(true, 0)

    const input = wrapper.get('input[placeholder="Enter new key to update..."]')
    await input.setValue('updated-key')
    expect((input.element as HTMLInputElement).value).toBe('updated-key')

    await wrapper.setProps({ resetVersion: 1 })
    expect((wrapper.get('input[placeholder="Enter new key to update..."]').element as HTMLInputElement).value).toBe('')
  })
})
