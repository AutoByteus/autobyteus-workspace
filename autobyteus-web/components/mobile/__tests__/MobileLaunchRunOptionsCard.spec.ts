import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MobileLaunchRunOptionsCard from '../MobileLaunchRunOptionsCard.vue'
import { buildAgentRunTemplate, buildTeamRunTemplate } from '~/composables/useDefinitionLaunchDefaults'

describe('MobileLaunchRunOptionsCard', () => {
  it.each([
    ['Agent', () => buildAgentRunTemplate({ id: 'agent', name: 'Agent' }).autoExecuteTools],
    ['Team', () => buildTeamRunTemplate({ id: 'team', name: 'Team' }).rootConfig.autoExecuteTools],
  ] as const)('describes fresh %s approval without an obsolete default claim and keeps opt-out', async (_, approval) => {
    const wrapper = mount(MobileLaunchRunOptionsCard, { props: { autoExecuteTools: approval() } })
    const toggle = wrapper.get('[data-testid="mobile-run-auto-approve-tools-switch"]')
    const help = wrapper.get('[data-testid="mobile-run-auto-approve-tools-help"]')
    const explanation = 'High-trust mode: automatically allows tool calls and Codex access/permission requests for this run.'
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.attributes('disabled')).toBeUndefined()
    expect(help.text()).toBe(explanation)
    expect(help.text()).not.toMatch(/off by default/i)
    await toggle.trigger('click')
    expect(wrapper.emitted('update:autoExecuteTools')).toEqual([[false]])
    await wrapper.setProps({ autoExecuteTools: false })
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(help.text()).toBe(explanation)
    wrapper.unmount()
  })

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
