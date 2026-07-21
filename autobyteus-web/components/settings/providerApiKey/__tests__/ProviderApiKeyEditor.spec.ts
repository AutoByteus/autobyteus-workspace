import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProviderApiKeyEditor from '../ProviderApiKeyEditor.vue'

const mountComponent = (configured = false, resetVersion = 0) =>
  mount(ProviderApiKeyEditor, {
    props: {
      configured,
      saving: false,
      removing: false,
      resetVersion,
    },
    global: {
      mocks: {
        $t: (key: string) => ({
          'settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update': 'Enter new key to update...',
          'settings.components.settings.ProviderAPIKeyManager.enter_api_key': 'Enter API key...',
          'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
          'settings.components.settings.ProviderAPIKeyManager.save_key': 'Save Key',
          'settings.components.settings.ProviderAPIKeyManager.remove_key': 'Remove Key',
          'settings.components.settings.ProviderAPIKeyManager.removing': 'Removing...',
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

  it('offers configured providers an idempotent remove action', async () => {
    const wrapper = mountComponent(true)

    await wrapper.findAll('button').find((button) => button.text().includes('Remove Key'))!.trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[]])
  })

  it('blocks input, reveal, save, and duplicate remove actions while removal is pending', async () => {
    const wrapper = mountComponent(true)
    await wrapper.get('input').setValue('replacement-key')
    await wrapper.setProps({ removing: true })

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    for (const button of buttons) expect(button.attributes('disabled')).toBeDefined()
    expect(buttons.at(2)?.text()).toContain('Removing...')

    await buttons.at(1)!.trigger('click')
    await buttons.at(2)!.trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('remove')).toBeUndefined()
  })
})
