import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import UpdateChecksCard from '../UpdateChecksCard.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const holder = vi.hoisted(() => ({ store: null as any }))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({ useUpdateChecksCapabilityStore: () => holder.store }))
let capability: Record<string, any>

const mountCard = () => mount(UpdateChecksCard, {
  global: { mocks: { $t: (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key, params) } },
})

beforeEach(() => {
  capability = reactive({
    status: 'resolved', isEnabled: true, error: null,
    ensureResolved: vi.fn().mockResolvedValue(null),
    setEnabled: vi.fn(async (enabled: boolean) => { capability.isEnabled = enabled }),
  })
  holder.store = capability
})

describe('UpdateChecksCard (REQ-013, REQ-014)', () => {
  it('shows the honest network description and the node scope, with an accessible switch', async () => {
    const wrapper = mountCard()
    expect(capability.ensureResolved).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Update checks')
    expect(wrapper.get('[data-testid="update-checks-description"]').text()).toContain('asks api.github.com for the latest commit')
    expect(wrapper.get('[data-testid="update-checks-description"]').text()).toContain('nothing is sent to AutoByteus')
    expect(wrapper.text()).toContain('Applies to this node.')
    const toggle = wrapper.get('[data-testid="update-checks-toggle"]')
    expect(toggle.attributes('role')).toBe('switch')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.attributes('aria-describedby')).toBe(wrapper.get('[data-testid="update-checks-description"]').attributes('id'))
  })

  it('turns background checks off through the capability store', async () => {
    const wrapper = mountCard()
    await wrapper.get('[data-testid="update-checks-toggle"]').trigger('click')
    await nextTick()
    expect(capability.setEnabled).toHaveBeenCalledWith(false)
    expect(wrapper.get('[data-testid="update-checks-toggle"]').attributes('aria-checked')).toBe('false')
  })

  it('keeps the switch disabled until the setting is known', () => {
    capability.status = 'loading'
    const wrapper = mountCard()
    expect(wrapper.get('[data-testid="update-checks-toggle"]').attributes('disabled')).toBeDefined()
  })
})
