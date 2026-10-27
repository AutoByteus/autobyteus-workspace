import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ShowInternalAgentsCard from '../ShowInternalAgentsCard.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

/** Settings → Server Settings → Basics: "Show internal agents" (autobyteus-308). */
const SETTING_KEY = 'AUTOBYTEUS_SHOW_INTERNAL_AGENTS'
const TOGGLE = '[data-testid="show-internal-agents-toggle"]'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const setting = (value: string): ServerSetting => ({
  key: SETTING_KEY, value, description: 'Show internal agents', isEditable: true, isDeletable: false,
})

const mountComponent = async (settings: ServerSetting[] = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: { serverSettings: { settings, isUpdating: false } },
  })
  setActivePinia(pinia)
  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)
  const agentDefinitionStore = useAgentDefinitionStore()
  agentDefinitionStore.reloadAllAgentDefinitions = vi.fn().mockResolvedValue(undefined)
  const runHistoryStore = useRunHistoryStore()
  runHistoryStore.refreshTreeQuietly = vi.fn().mockResolvedValue(undefined)
  const wrapper = mount(ShowInternalAgentsCard, { global: { plugins: [pinia], stubs: { Icon: true } } })
  await flushPromises()
  return { wrapper, serverSettingsStore, agentDefinitionStore, runHistoryStore }
}

const isChecked = (wrapper: ReturnType<typeof mount>): boolean => wrapper.get(TOGGLE).attributes('aria-checked') === 'true'

describe('ShowInternalAgentsCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is off when the setting was never saved (the server default), with its one-sentence explanation', async () => {
    const { wrapper } = await mountComponent()
    expect(wrapper.text()).toContain('Show internal agents')
    expect(wrapper.text()).toContain('the system\'s own helpers, such as the Model Router')
    expect(wrapper.get(TOGGLE).attributes('role')).toBe('switch')
    expect(isChecked(wrapper)).toBe(false)
  })

  it('reflects a saved true', async () => {
    const { wrapper } = await mountComponent([setting('true')])
    expect(isChecked(wrapper)).toBe(true)
  })

  it('saves the setting and then refreshes the agent list and run history', async () => {
    const { wrapper, serverSettingsStore, agentDefinitionStore, runHistoryStore } = await mountComponent([setting('false')])
    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()
    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(SETTING_KEY, 'true')
    expect(isChecked(wrapper)).toBe(true)
    expect(agentDefinitionStore.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(runHistoryStore.refreshTreeQuietly).toHaveBeenCalledOnce()

    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()
    expect(serverSettingsStore.updateServerSetting).toHaveBeenLastCalledWith(SETTING_KEY, 'false')
    expect(isChecked(wrapper)).toBe(false)
  })

  it('keeps the previous value and shows the error when saving fails; nothing is refreshed', async () => {
    const { wrapper, serverSettingsStore, agentDefinitionStore } = await mountComponent([setting('false')])
    serverSettingsStore.updateServerSetting = vi.fn().mockRejectedValue(new Error('save failed'))
    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()
    expect(isChecked(wrapper)).toBe(false)
    expect(wrapper.get('[data-testid="show-internal-agents-error"]').text()).toBe('save failed')
    expect(agentDefinitionStore.reloadAllAgentDefinitions).not.toHaveBeenCalled()
  })
})
