import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import Modal from '../ConfirmationModal.vue'
describe('ConfirmationModal additive contract', () => {
  it('preserves existing message/confirm/cancel defaults', async () => {
    const w = mount(Modal, { props: { show: true, message: '<strong>Existing content</strong>' }, global: { stubs: { teleport: true } } })
    expect(w.get('strong').text()).toBe('Existing content'); await w.findAll('button')[0]!.trigger('click'); await w.findAll('button')[1]!.trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1); expect(w.emitted('confirm')).toHaveLength(1); w.unmount()
  })
  it('renders safe slot text and guards pending buttons including programmatic clicks', async () => {
    const w = mount(Modal, { props: { show: true, title: 'Delete Org', pending: true }, slots: { default: () => h('p', '<img src=x>') }, global: { stubs: { teleport: true } } })
    expect(w.find('img').exists()).toBe(false); expect(w.get('[role=dialog]').attributes('aria-label')).toBe('Delete Org')
    for (const button of w.findAll('button')) await button.trigger('click')
    expect(w.emitted('cancel')).toBeUndefined(); expect(w.emitted('confirm')).toBeUndefined(); w.unmount()
  })
})
