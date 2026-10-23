import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import UpdateChecksCard from '../UpdateChecksCard.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { UpdateAutomationSettings } from '~/types/updateNotifications'

/** The Update checks card (UIS-004): the switch and contacts, banners, intervals and automatic updates. */
const holder = vi.hoisted(() => ({ capability: null as any, automation: null as any, node: { isEmbeddedWindow: true } }))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({ useUpdateChecksCapabilityStore: () => holder.capability }))
vi.mock('~/stores/updateAutomationStore', () => ({ useUpdateAutomationStore: () => holder.automation }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => holder.node }))
vi.mock('~/stores/notificationCenterStore', () => ({ useNotificationCenterStore: () => reactive({ modalOpen: false }) }))

const settings = (overrides: Partial<UpdateAutomationSettings> = {}): UpdateAutomationSettings => ({
  intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
  automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false },
  githubWaitUntil: null, desktopEmbeddedNode: true, ...overrides,
})

let capability: Record<string, any>
let automation: Record<string, any>
let wrapper: VueWrapper | null = null
const mountCard = async () => {
  wrapper = mount(UpdateChecksCard, {
    attachTo: document.body,
    global: { mocks: { $t: (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key, params) } },
  })
  await flushPromises()
  return wrapper
}
const find = (testId: string) => wrapper!.find(`[data-testid="${testId}"]`)

beforeEach(() => {
  capability = reactive({
    status: 'resolved', isEnabled: true, error: null,
    ensureResolved: vi.fn().mockResolvedValue(null),
    setEnabled: vi.fn(async (enabled: boolean) => { capability.isEnabled = enabled }),
  })
  automation = reactive({
    status: 'resolved', resolved: settings(),
    ensureResolved: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    setInterval: vi.fn().mockResolvedValue(undefined),
    setAutomatic: vi.fn().mockResolvedValue(undefined),
  })
  holder.capability = capability
  holder.automation = automation
  holder.node.isEmbeddedWindow = true
})
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = '' })

describe('UpdateChecksCard', () => {
  it('shows the switch with what is contacted, no account or token, nothing sent to AutoByteus (REQ-016)', async () => {
    await mountCard()
    expect(capability.ensureResolved).toHaveBeenCalled()
    expect(automation.ensureResolved).toHaveBeenCalled()
    expect(find('update-checks-description').text()).toBe('No account or token is used. Nothing is sent to AutoByteus.')
    const network = find('update-checks-network').text()
    expect(network).toContain('Packages and skill sources: github.com')
    expect(network).toContain('Agent runtimes: GitHub (Codex), downloads.claude.ai, Antigravity\'s updater, xAI (Grok)')
    expect(network).toContain('Automatic updates: GitHub downloads and each runtime\'s own update command')
    expect(wrapper!.text()).toContain('Applies to this node.')
    const toggle = find('update-checks-toggle')
    expect(toggle.attributes('role')).toBe('switch')
    expect(toggle.attributes('aria-checked')).toBe('true')
  })

  it('shows the defaults 30 / 30 / 60 minutes (60 as 1 hour) and saves an interval in minutes (REQ-001)', async () => {
    await mountCard()
    expect((find('update-interval-packages-value').element as HTMLInputElement).value).toBe('30')
    expect((find('update-interval-packages-unit').element as HTMLSelectElement).value).toBe('minutes')
    expect((find('update-interval-runtimes-value').element as HTMLInputElement).value).toBe('1')
    expect((find('update-interval-runtimes-unit').element as HTMLSelectElement).value).toBe('hours')
    await find('update-interval-skills-value').setValue('2')
    await find('update-interval-skills-unit').setValue('hours')
    await flushPromises()
    expect(automation.setInterval).toHaveBeenCalledWith('skill_source', 120)
    expect(find('update-interval-skills-saved').text()).toBe('Saved')
  })

  it('refuses an interval out of range with the message and keeps the old value (REQ-011, TR-116)', async () => {
    await mountCard()
    await find('update-interval-packages-value').setValue('5')
    await find('update-interval-packages-value').trigger('blur')
    expect(automation.setInterval).not.toHaveBeenCalled()
    expect(find('update-interval-packages-hint').text()).toBe('Enter a whole number from 15 minutes to 24 hours.')
    expect(find('update-interval-packages-value').attributes('aria-invalid')).toBe('true')
    await find('update-interval-packages-value').setValue('25')
    await find('update-interval-packages-unit').setValue('hours')
    expect(automation.setInterval).not.toHaveBeenCalled()
  })

  it('turning skill sources on asks first; runtimes turn on without asking (UXJ-004, TR-106)', async () => {
    await mountCard()
    await find('auto-update-skill_source-toggle').trigger('click')
    expect(document.body.textContent).toContain('Turn on automatic updates for skill sources?')
    expect(automation.setAutomatic).not.toHaveBeenCalled()
    await find('auto-update-agent_runtime-toggle').trigger('click')
    expect(automation.setAutomatic).toHaveBeenCalledWith('agent_runtime', true)
  })

  it('says until when GitHub asked the node to wait, and drops the banner when the wait ends (REQ-004)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    automation.resolved = settings({ githubWaitUntil: new Date(Date.now() + 60_000).toISOString() })
    await mountCard()
    expect(find('update-checks-backoff').text()).toMatch(/^GitHub asked this node to wait until .+\.$/)
    await vi.advanceTimersByTimeAsync(90_000)
    expect(find('update-checks-backoff').exists()).toBe(false)
    vi.useRealTimers()
  })

  it('with checks off: the banner, dimmed blocks, still editable (REQ-017, VIS-020)', async () => {
    capability.isEnabled = false
    await mountCard()
    expect(find('update-checks-off-note').text()).toBe('Update checks are off. Intervals and automatic updates do nothing.')
    expect(find('update-checks-intervals').find('div').classes()).toContain('bg-slate-50/40')
    expect(find('update-interval-packages-value').attributes('disabled')).toBeUndefined()
  })

  it('has no runtime interval, switch or contact line in a window of another node or on a non-desktop node (AC-022)', async () => {
    holder.node.isEmbeddedWindow = false
    await mountCard()
    expect(find('update-interval-runtimes').exists()).toBe(false)
    expect(find('auto-update-agent_runtime').exists()).toBe(false)
    expect(find('update-checks-network-runtimes').exists()).toBe(false)
    wrapper!.unmount()
    holder.node.isEmbeddedWindow = true
    automation.resolved = settings({ desktopEmbeddedNode: false })
    await mountCard()
    expect(find('update-interval-runtimes').exists()).toBe(false)
    expect(find('auto-update-agent_runtime').exists()).toBe(false)
  })

  it('turns background checks off through the capability store', async () => {
    await mountCard()
    await find('update-checks-toggle').trigger('click')
    await flushPromises()
    expect(capability.setEnabled).toHaveBeenCalledWith(false)
    expect(find('update-checks-toggle').attributes('aria-checked')).toBe('false')
  })
})
