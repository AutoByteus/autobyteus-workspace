import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MobileLaunchRunOptionsCard from '../MobileLaunchRunOptionsCard.vue'

describe('MobileLaunchRunOptionsCard', () => {
  it('shows Antigravity auto-approve on and locked with an explanation', async () => {
    const wrapper = mount(MobileLaunchRunOptionsCard, { props: { autoExecuteTools: false, runtimeKind: 'antigravity_cli' } })
    const toggle = wrapper.get('[data-testid="mobile-run-auto-approve-tools-switch"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="mobile-run-auto-approve-tools-help"]').text())
      .toBe("Antigravity always runs with auto-approve, so it can't be turned off.")
    await toggle.trigger('click')
    expect(wrapper.emitted('update:autoExecuteTools')).toBeUndefined()
  })

  it('keeps the editable toggle for other runtimes', async () => {
    const wrapper = mount(MobileLaunchRunOptionsCard, { props: { autoExecuteTools: false, runtimeKind: 'codex_app_server' } })
    const toggle = wrapper.get('[data-testid="mobile-run-auto-approve-tools-switch"]')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.attributes('disabled')).toBeUndefined()
    await toggle.trigger('click')
    expect(wrapper.emitted('update:autoExecuteTools')).toEqual([[true]])
  })
})
