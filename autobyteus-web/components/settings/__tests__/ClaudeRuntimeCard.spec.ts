import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ClaudeRuntimeCard from '../ClaudeRuntimeCard.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const SETTING_KEY = 'CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE'
const TOGGLE = '[data-testid="claude-runtime-one-hour-cache-toggle"]'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async (settings: ServerSetting[] = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: { serverSettings: { settings, isUpdating: false } },
  })
  setActivePinia(pinia)

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ClaudeRuntimeCard, { global: { plugins: [pinia], stubs: { Icon: true } } })
  await flushPromises()
  return { wrapper, serverSettingsStore }
}

const isChecked = (wrapper: ReturnType<typeof mount>): boolean =>
  wrapper.get(TOGGLE).attributes('aria-checked') === 'true'

const cacheSetting = (value: string): ServerSetting => ({
  key: SETTING_KEY,
  value,
  description: 'one-hour prompt cache',
  isEditable: true,
  isDeletable: false,
})

describe('ClaudeRuntimeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Claude runtime card with one switch and its plain-language notes', async () => {
    const { wrapper } = await mountComponent()

    expect(wrapper.text()).toContain('Claude runtime')
    expect(wrapper.text()).toContain('One-hour prompt cache')
    expect(wrapper.text()).toContain('instead of 5 minutes')
    expect(wrapper.get('[data-testid="claude-runtime-precedence-note"]').text()).toContain('promptCacheTtl')
    expect(wrapper.get('[data-testid="claude-runtime-future-session-note"]').text())
      .toContain('Applies to Claude agent sessions started after the change.')
    expect(wrapper.get(TOGGLE).attributes('role')).toBe('switch')
    expect(wrapper.find('[data-testid="claude-runtime-error"]').exists()).toBe(false)
  })

  it.each([
    ['absent setting', [], true],
    ['true setting', [cacheSetting('true')], true],
    ['false setting', [cacheSetting('false')], false],
    ['trimmed upper-case false setting', [cacheSetting(' FALSE ')], false],
  ])('initializes checked state for %s', async (_name, settings, expectedChecked) => {
    const { wrapper } = await mountComponent(settings as ServerSetting[])
    expect(isChecked(wrapper)).toBe(expectedChecked)
  })

  it('saves false when turned off from the absent default', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()

    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(SETTING_KEY, 'false')
    expect(isChecked(wrapper)).toBe(false)
  })

  it('saves true when turned back on', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([cacheSetting('false')])

    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(SETTING_KEY, 'true')
    expect(isChecked(wrapper)).toBe(true)
  })

  it('reverts the switch and shows the error when saving fails', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()
    serverSettingsStore.updateServerSetting = vi.fn().mockRejectedValue(new Error('synthetic save failure'))

    await wrapper.get(TOGGLE).trigger('click')
    await flushPromises()

    expect(isChecked(wrapper)).toBe(true)
    expect(wrapper.get('[data-testid="claude-runtime-error"]').text()).toBe('synthetic save failure')
    expect(wrapper.get(TOGGLE).attributes('disabled')).toBeUndefined()
  })

  it('disables the switch while a save is in flight', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()
    let resolveUpdate: (value: boolean) => void = () => undefined
    serverSettingsStore.updateServerSetting = vi.fn().mockReturnValue(new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    await wrapper.get(TOGGLE).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get(TOGGLE).attributes('disabled')).toBeDefined()

    resolveUpdate(true)
    await flushPromises()
    expect(wrapper.get(TOGGLE).attributes('disabled')).toBeUndefined()
  })
})
