import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import MessageNotDeliveredNotice from '../MessageNotDeliveredNotice.vue'

const mocks = vi.hoisted(() => ({ target: null as any }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return mocks.target } }) }))

const mountNotice = () => mount(MessageNotDeliveredNotice, { global: { mocks: { $t: (key: string) => key } } })

describe('MessageNotDeliveredNotice (autobyteus-540 D-6)', () => {
  it.each([
    ['not_sent', 'agents.send.notDelivered.notSent'],
    ['unknown', 'agents.send.notDelivered.unknown'],
  ])('shows text %s of the focused conversation as an alert above the box, and dismisses it', async (certainty, key) => {
    const context = reactive({ messageNotDelivered: certainty })
    mocks.target = { context }
    const wrapper = mountNotice()
    const alert = wrapper.get('[data-test="message-not-delivered"] [role="alert"]')
    expect(wrapper.get('[data-test="message-not-delivered-text"]').text()).toBe(key)
    expect(alert.attributes('data-certainty')).toBe(certainty)
    expect(wrapper.get('[data-test="message-not-delivered-dismiss"]').attributes('aria-label')).toBe('agents.send.notDelivered.dismiss')
    await wrapper.get('[data-test="message-not-delivered-dismiss"]').trigger('click')
    expect(context.messageNotDelivered).toBeNull()
    expect(wrapper.find('[data-test="message-not-delivered"]').exists()).toBe(false)
  })

  it('shows nothing when the last send was delivered', () => {
    mocks.target = { context: reactive({ messageNotDelivered: null }) }
    expect(mountNotice().find('[data-test="message-not-delivered"]').exists()).toBe(false)
  })
})
