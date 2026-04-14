import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationsFeatureToggleCard from '../ApplicationsFeatureToggleCard.vue'

const {
  applicationsCapabilityStoreMock,
  serverSettingsStoreMock,
} = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    capability: {
      enabled: false,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'INITIALIZED_EMPTY_CATALOG',
    },
    status: 'resolved',
    error: null as Error | null,
    get isEnabled() {
      return this.capability?.enabled === true && this.status === 'resolved'
    },
    ensureResolved: vi.fn().mockResolvedValue(null),
    setEnabled: vi.fn().mockImplementation(async (enabled: boolean) => {
      applicationsCapabilityStoreMock.capability = {
        enabled,
        scope: 'BOUND_NODE',
        settingKey: 'ENABLE_APPLICATIONS',
        source: 'SERVER_SETTING',
      }
      applicationsCapabilityStoreMock.status = 'resolved'
      return applicationsCapabilityStoreMock.capability
    }),
  },
  serverSettingsStoreMock: {
    reloadServerSettings: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/stores/serverSettings', () => ({
  useServerSettingsStore: () => serverSettingsStoreMock,
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountCard = () =>
  mount(ApplicationsFeatureToggleCard, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

describe('ApplicationsFeatureToggleCard', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.capability = {
      enabled: false,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'INITIALIZED_EMPTY_CATALOG',
    }
    applicationsCapabilityStoreMock.status = 'resolved'
    applicationsCapabilityStoreMock.error = null
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    serverSettingsStoreMock.reloadServerSettings.mockResolvedValue([])
    vi.clearAllMocks()
  })

  it('resolves the capability and syncs server settings on mount', async () => {
    mountCard()
    await flushPromises()

    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
    expect(serverSettingsStoreMock.reloadServerSettings).toHaveBeenCalledOnce()
  })

  it('enables applications and refreshes raw server settings after success', async () => {
    const wrapper = mountCard()
    await flushPromises()

    await wrapper.get('[data-testid="applications-feature-enable"]').trigger('click')

    expect(applicationsCapabilityStoreMock.setEnabled).toHaveBeenCalledWith(true)
    expect(serverSettingsStoreMock.reloadServerSettings).toHaveBeenCalledTimes(2)
  })

  it('disables applications and refreshes raw server settings after success', async () => {
    applicationsCapabilityStoreMock.capability = {
      enabled: true,
      scope: 'BOUND_NODE',
      settingKey: 'ENABLE_APPLICATIONS',
      source: 'SERVER_SETTING',
    }

    const wrapper = mountCard()
    await flushPromises()

    await wrapper.get('[data-testid="applications-feature-disable"]').trigger('click')

    expect(applicationsCapabilityStoreMock.setEnabled).toHaveBeenCalledWith(false)
    expect(serverSettingsStoreMock.reloadServerSettings).toHaveBeenCalledTimes(2)
  })
})
