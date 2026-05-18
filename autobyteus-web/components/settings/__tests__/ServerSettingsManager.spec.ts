import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ServerSettingsManager from '../ServerSettingsManager.vue'
import { useServerSettingsStore } from '~/stores/serverSettings'

const { windowNodeContextStoreMock } = vi.hoisted(() => ({
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const setMaybeRef = (target: any, key: string, value: any) => {
  if (!target) return
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    current.value = value
    return
  }
  target[key] = value
}

const getMaybeRefValue = (target: any, key: string) => {
  if (!target) return undefined
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    return current.value
  }
  return current
}

type TestServerSetting = {
  key: string
  value: string
  description: string
  isEditable?: boolean
  isDeletable?: boolean
}

const mountComponent = async (
  initialSettings: TestServerSetting[] = [],
  options: {
    sectionMode?: 'quick' | 'advanced' | 'migrations'
    isLoading?: boolean
    error?: string | null
  } = {},
) => {
  const normalizedSettings = initialSettings.map((setting) => ({
    isEditable: setting.isEditable ?? true,
    isDeletable: setting.isDeletable ?? false,
    ...setting,
  }))

  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings: normalizedSettings,
        isLoading: options.isLoading ?? false,
        error: options.error ?? null,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const store = useServerSettingsStore()
  store.fetchServerSettings = vi.fn().mockResolvedValue(normalizedSettings)
  store.fetchSearchConfig = vi.fn().mockResolvedValue(undefined)
  store.setSearchConfig = vi.fn().mockResolvedValue(true)
  store.updateServerSetting = vi.fn().mockResolvedValue(true)
  store.deleteServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ServerSettingsManager, {
    props: {
      sectionMode: options.sectionMode ?? 'quick',
    },
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
        ServerMonitor: {
          template: '<div data-testid="server-monitor-stub">Server Monitor Stub</div>',
        },
        ServerSettingsBasicsPanel: {
          template: '<div data-testid="server-settings-basics-panel-stub">Basics Panel Stub</div>',
        },
        ServerMigrationsManager: {
          template: '<div data-testid="server-migrations-manager-stub">Migrations Panel Stub</div>',
        },
      },
    },
  })

  await flushPromises()
  return { wrapper, store }
}

describe('ServerSettingsManager', () => {
  beforeEach(() => {
    windowNodeContextStoreMock.isEmbeddedWindow = true
    vi.clearAllMocks()
  })

  it('routes Basics mode to the Basics panel shell and loads server settings only', async () => {
    const { wrapper, store } = await mountComponent([
      { key: 'LMSTUDIO_HOSTS', value: 'http://localhost:1234', description: 'desc' },
    ])

    expect(wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="server-monitor-stub"]').exists()).toBe(false)
    expect(store.fetchServerSettings).toHaveBeenCalledTimes(1)
    expect(store.fetchSearchConfig).not.toHaveBeenCalled()
  })

  it('shows shared loading and error states before routing panels', async () => {
    const loading = await mountComponent([], { isLoading: true })
    expect(loading.wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(false)
    expect(loading.wrapper.find('.animate-spin').exists()).toBe(true)

    const errored = await mountComponent([], { error: 'Unable to load settings' })
    expect(errored.wrapper.text()).toContain('Unable to load settings')
    expect(errored.wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(false)
  })

  it('reacts to section mode changes without owning Basics card details', async () => {
    const { wrapper } = await mountComponent([], { sectionMode: 'quick' })

    expect(wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(true)

    await wrapper.setProps({ sectionMode: 'advanced' })
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Setting')
    expect(wrapper.text()).toContain('Value')
  })


  it('routes Migrations mode to the migrations panel shell', async () => {
    const { wrapper } = await mountComponent([], { sectionMode: 'migrations' })

    expect(wrapper.find('[data-testid="server-migrations-manager-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="server-settings-basics-panel-stub"]').exists()).toBe(false)
  })

  it('shows server monitor panel in Advanced / Developer tab for embedded windows', async () => {
    const { wrapper } = await mountComponent([], { sectionMode: 'advanced' })
    const setupState = (wrapper.vm as any).$?.setupState

    expect(getMaybeRefValue(setupState, 'activeTab')).toBe('advanced')
    expect(wrapper.text()).not.toContain('Developer Tools')

    setMaybeRef(setupState, 'advancedPanel', 'server-status')
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(getMaybeRefValue(setupState, 'advancedPanel')).toBe('server-status')
    expect(wrapper.find('[data-testid="server-monitor-stub"]').exists()).toBe(true)
  })

  it('loads settings in remote windows and hides embedded-only diagnostics toggle', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false
    const { wrapper, store } = await mountComponent([
      { key: 'LMSTUDIO_HOSTS', value: 'http://remote-host:1234', description: 'desc' },
    ], { sectionMode: 'advanced' })

    expect(store.fetchServerSettings).toHaveBeenCalledTimes(1)
    expect(store.fetchSearchConfig).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Embedded server settings are unavailable for remote node windows.')
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Server status and logs')).toBe(false)
  })

  it('removes custom server settings from advanced table', async () => {
    const { wrapper, store } = await mountComponent([
      {
        key: 'AUTOBYTEUS_LLM_SERVER_URL',
        value: 'https://legacy-host',
        description: 'Custom user-defined setting',
        isEditable: true,
        isDeletable: true,
      },
      {
        key: 'AUTOBYTEUS_SERVER_HOST',
        value: 'http://localhost:8000',
        description: 'Public URL of this server. Managed at startup by the launch environment and not editable here.',
        isEditable: false,
        isDeletable: false,
      },
    ], { sectionMode: 'advanced' })
    const setupState = (wrapper.vm as any).$?.setupState

    setMaybeRef(setupState, 'advancedPanel', 'raw-settings')
    await wrapper.vm.$nextTick()
    await flushPromises()

    const removeButton = wrapper.get('[data-testid="server-setting-remove-AUTOBYTEUS_LLM_SERVER_URL"]')
    await removeButton.trigger('click')
    await flushPromises()

    expect(store.deleteServerSetting).toHaveBeenCalledWith('AUTOBYTEUS_LLM_SERVER_URL')
    expect(wrapper.find('[data-testid="server-setting-remove-AUTOBYTEUS_SERVER_HOST"]').exists()).toBe(false)
  })

  it('renders system-managed settings as read-only without save/remove actions', async () => {
    const { wrapper } = await mountComponent([
      {
        key: 'AUTOBYTEUS_SERVER_HOST',
        value: 'http://127.0.0.1:29695',
        description: 'Public URL of this server. Managed at startup by the launch environment and not editable here.',
        isEditable: false,
        isDeletable: false,
      },
    ], { sectionMode: 'advanced' })

    const valueInput = wrapper.get('[data-testid="server-setting-value-AUTOBYTEUS_SERVER_HOST"]')
    expect(valueInput.attributes('readonly')).toBeDefined()
    expect(wrapper.find('[data-testid="server-setting-save-AUTOBYTEUS_SERVER_HOST"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="server-setting-remove-AUTOBYTEUS_SERVER_HOST"]').exists()).toBe(false)
  })
})
