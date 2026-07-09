import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SkillImprovementFeatureToggleCard from '../SkillImprovementFeatureToggleCard.vue'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const {
  capabilityState,
  capabilityStoreMock,
  serverSettingsStoreMock,
} = vi.hoisted(() => {
  const capabilityState = {
    status: 'resolved' as 'unknown' | 'loading' | 'resolved' | 'error',
    isEnabled: false,
    capability: {
      enabled: false,
      settingKey: 'ENABLE_SKILL_IMPROVEMENT',
      source: 'INITIALIZED_DISABLED',
    } as any,
    error: null as Error | null,
  }

  const capabilityStoreMock = {
    get status() {
      return capabilityState.status
    },
    get isEnabled() {
      return capabilityState.isEnabled
    },
    get capability() {
      return capabilityState.capability
    },
    get error() {
      return capabilityState.error
    },
    ensureResolved: vi.fn(async () => undefined),
    setEnabled: vi.fn(async (enabled: boolean) => {
      capabilityState.isEnabled = enabled
      capabilityState.status = 'resolved'
      capabilityState.capability = {
        enabled,
        settingKey: 'ENABLE_SKILL_IMPROVEMENT',
        source: 'SERVER_SETTING',
      }
    }),
  }

  return {
    capabilityState,
    capabilityStoreMock,
    serverSettingsStoreMock: {
      reloadServerSettings: vi.fn(async () => undefined),
    },
  }
})

vi.mock('~/stores/skillImprovementCapabilityStore', () => ({
  useSkillImprovementCapabilityStore: () => capabilityStoreMock,
}))

vi.mock('~/stores/serverSettings', () => ({
  useServerSettingsStore: () => serverSettingsStoreMock,
}))

describe('SkillImprovementFeatureToggleCard', () => {
  beforeEach(() => {
    capabilityState.status = 'resolved'
    capabilityState.isEnabled = false
    capabilityState.capability = {
      enabled: false,
      settingKey: 'ENABLE_SKILL_IMPROVEMENT',
      source: 'INITIALIZED_DISABLED',
    }
    capabilityState.error = null
    capabilityStoreMock.ensureResolved.mockClear()
    capabilityStoreMock.setEnabled.mockClear()
    serverSettingsStoreMock.reloadServerSettings.mockClear()
  })

  it('loads the typed capability and shows the default-disabled safety state', async () => {
    const wrapper = mount(SkillImprovementFeatureToggleCard)
    await flushPromises()

    expect(capabilityStoreMock.ensureResolved).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="skill-improvement-feature-status"]').text()).toBe('Disabled')
    expect(wrapper.get('[data-testid="skill-improvement-feature-toggle"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.text()).toContain('Initialized disabled for safety')
  })

  it('toggles the typed backend capability and refreshes generic settings as a secondary sync', async () => {
    const wrapper = mount(SkillImprovementFeatureToggleCard)
    await flushPromises()

    await wrapper.get('[data-testid="skill-improvement-feature-toggle"]').trigger('click')
    await flushPromises()

    expect(capabilityStoreMock.setEnabled).toHaveBeenCalledWith(true)
    expect(serverSettingsStoreMock.reloadServerSettings).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    const nextWrapper = mount(SkillImprovementFeatureToggleCard)
    await flushPromises()
    expect(nextWrapper.get('[data-testid="skill-improvement-feature-status"]').text()).toBe('Enabled')
    expect(nextWrapper.get('[data-testid="skill-improvement-feature-toggle"]').attributes('aria-checked')).toBe('true')
    expect(nextWrapper.text()).toContain('Persisted as an explicit runtime setting')
  })

  it('keeps the switch disabled while capability resolution is still pending', async () => {
    capabilityState.status = 'loading'
    const wrapper = mount(SkillImprovementFeatureToggleCard)
    await flushPromises()

    const toggle = wrapper.get('[data-testid="skill-improvement-feature-toggle"]')
    expect(toggle.attributes('disabled')).toBeDefined()

    await toggle.trigger('click')
    await flushPromises()

    expect(capabilityStoreMock.setEnabled).not.toHaveBeenCalled()
    expect(serverSettingsStoreMock.reloadServerSettings).not.toHaveBeenCalled()
  })
})
