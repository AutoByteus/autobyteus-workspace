import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ServerSettingsEndpointCards from '../ServerSettingsEndpointCards.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const endpointSetting = (key: string, value: string): ServerSetting => ({
  key,
  value,
  description: 'endpoint setting',
  isEditable: true,
  isDeletable: false,
})

const mountComponent = async (settings: ServerSetting[] = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const store = useServerSettingsStore()
  store.updateServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ServerSettingsEndpointCards, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, store }
}

describe('ServerSettingsEndpointCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quick setup fields with user-friendly endpoint inputs', async () => {
    const { wrapper } = await mountComponent([
      endpointSetting('LMSTUDIO_HOSTS', 'http://localhost:1234'),
      endpointSetting('OLLAMA_HOSTS', 'http://localhost:11434'),
      endpointSetting('AUTOBYTEUS_LLM_SERVER_HOSTS', 'https://llm.example.com:443'),
      endpointSetting('AUTOBYTEUS_VNC_SERVER_HOSTS', 'localhost:5900'),
      endpointSetting('LOG_LEVEL', 'INFO'),
    ])

    expect(wrapper.text()).not.toContain('Add one or more endpoints per provider. No commas needed.')
    expect(wrapper.text()).toContain('LM Studio')
    expect(wrapper.text()).toContain('Ollama')
    expect(wrapper.find('[data-testid="quick-setting-card-LMSTUDIO_HOSTS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="quick-setting-card-OLLAMA_HOSTS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="quick-setting-add-row-LMSTUDIO_HOSTS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="quick-row-host-LMSTUDIO_HOSTS-"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="quick-row-port-LMSTUDIO_HOSTS-"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="quick-row-protocol-LMSTUDIO_HOSTS-"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="quick-row-protocol-AUTOBYTEUS_VNC_SERVER_HOSTS-"]').exists()).toBe(false)
  })

  it('only shows quick card status messaging after a field changes', async () => {
    const { wrapper } = await mountComponent([
      endpointSetting('LMSTUDIO_HOSTS', 'http://localhost:1234'),
    ])

    expect(wrapper.find('[data-testid="quick-setting-status-LMSTUDIO_HOSTS"]').exists()).toBe(false)

    const setupState = (wrapper.vm as any).$?.setupState
    const firstRow = setupState.quickEndpointRows.LMSTUDIO_HOSTS[0]
    firstRow.host = '127.0.0.1'
    setupState.onQuickEndpointRowChange('LMSTUDIO_HOSTS')

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.get('[data-testid="quick-setting-status-LMSTUDIO_HOSTS"]').text()).toContain('Unsaved changes')
  })

  it('preserves quick setup user edits when server settings refresh', async () => {
    const { wrapper, store } = await mountComponent([
      endpointSetting('LMSTUDIO_HOSTS', 'http://initial-host:1234'),
    ])

    const setupState = (wrapper.vm as any).$?.setupState
    const firstRow = setupState.quickEndpointRows.LMSTUDIO_HOSTS[0]
    firstRow.host = 'custom-host'
    firstRow.port = '1234'
    setupState.onQuickEndpointRowChange('LMSTUDIO_HOSTS')
    await wrapper.vm.$nextTick()

    store.$patch({
      settings: [endpointSetting('LMSTUDIO_HOSTS', 'http://updated-from-server:1234')],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(setupState.quickEditedSettings.LMSTUDIO_HOSTS).toContain('custom-host:1234')
  })

  it('serializes and saves changed endpoint rows through the server settings store', async () => {
    const { wrapper, store } = await mountComponent([
      endpointSetting('LMSTUDIO_HOSTS', 'http://localhost:1234'),
    ])
    const setupState = (wrapper.vm as any).$?.setupState
    const firstRow = setupState.quickEndpointRows.LMSTUDIO_HOSTS[0]
    firstRow.protocol = 'https'
    firstRow.host = 'models.example.com'
    firstRow.port = '443'
    setupState.onQuickEndpointRowChange('LMSTUDIO_HOSTS')

    await setupState.saveQuickSetting('LMSTUDIO_HOSTS')
    await flushPromises()

    expect(store.updateServerSetting).toHaveBeenCalledWith('LMSTUDIO_HOSTS', 'https://models.example.com:443')
    expect(wrapper.emitted('notify')?.[0]?.[0]).toEqual({
      type: 'success',
      message: 'Setting "LMSTUDIO_HOSTS" saved successfully',
    })
  })

  it('blocks saves while an edited row has invalid endpoint data', async () => {
    const { wrapper, store } = await mountComponent([
      endpointSetting('LMSTUDIO_HOSTS', 'http://localhost:1234'),
    ])
    const setupState = (wrapper.vm as any).$?.setupState
    const firstRow = setupState.quickEndpointRows.LMSTUDIO_HOSTS[0]
    firstRow.host = 'models.example.com'
    firstRow.port = '99999'
    setupState.onQuickEndpointRowChange('LMSTUDIO_HOSTS')

    await setupState.saveQuickSetting('LMSTUDIO_HOSTS')
    await flushPromises()

    expect(store.updateServerSetting).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="quick-setting-status-LMSTUDIO_HOSTS"]').text()).toContain('Complete host and use a valid')
  })
})
