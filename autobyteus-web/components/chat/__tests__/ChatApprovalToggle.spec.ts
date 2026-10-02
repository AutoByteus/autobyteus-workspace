import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatApprovalToggle from '../ChatApprovalToggle.vue'

const labels: Record<string, string> = {
  'chat.approval.autoApprove': 'Auto-approve',
  'chat.approval.askFirst': 'Ask first',
  'chat.approval.autoApproveTooltip': 'Tools run without asking. Click to ask before running tools.',
  'chat.approval.agyLockedTooltip': 'Antigravity always runs with auto-approve.',
  'chat.approval.agyLockedAria': 'Auto-approve tools is always on for Antigravity.',
}
const mountToggle = (props: { modelValue: boolean; locked?: boolean }) =>
  mount(ChatApprovalToggle, { props, global: { mocks: { $t: (key: string) => labels[key] ?? key } } })

describe('ChatApprovalToggle', () => {
  it('shows Antigravity locked on with its explanation and ignores clicks', async () => {
    const wrapper = mountToggle({ modelValue: true, locked: true })
    const toggle = wrapper.get('[data-test="chat-approval-toggle"]')
    expect(toggle.text()).toContain('Auto-approve')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.attributes('aria-disabled')).toBe('true')
    expect(toggle.attributes('title')).toBe('Antigravity always runs with auto-approve.')
    expect(toggle.attributes('aria-label')).toBe('Auto-approve tools is always on for Antigravity.')
    expect(wrapper.find('[data-test="chat-approval-lock"]').exists()).toBe(true)
    await toggle.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps the editable toggle for other runtimes', async () => {
    const wrapper = mountToggle({ modelValue: false })
    const toggle = wrapper.get('[data-test="chat-approval-toggle"]')
    expect(toggle.text()).toContain('Ask first')
    expect(wrapper.find('[data-test="chat-approval-lock"]').exists()).toBe(false)
    await toggle.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})
