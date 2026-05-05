import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import CodexFullAccessCard from '../CodexFullAccessCard.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const CODEX_SANDBOX_SETTING_KEY = 'CODEX_APP_SERVER_SANDBOX'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

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

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(CodexFullAccessCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, serverSettingsStore }
}

const isFullAccessChecked = (wrapper: ReturnType<typeof mount>): boolean =>
  wrapper.get('[data-testid="codex-full-access-toggle"]').attributes('aria-checked') === 'true'

const sandboxSetting = (value: string): ServerSetting => ({
  key: CODEX_SANDBOX_SETTING_KEY,
  value,
  description: 'sandbox',
  isEditable: true,
  isDeletable: false,
})

describe('CodexFullAccessCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one full-access toggle without exposing the three runtime modes as Basic choices', async () => {
    const { wrapper } = await mountComponent([sandboxSetting('workspace-write')])

    expect(wrapper.text()).toContain('Codex full access')
    expect(wrapper.text()).toContain('Allow Codex to run with full filesystem access')
    expect(wrapper.text()).toContain('no filesystem sandboxing')
    expect(wrapper.text()).toContain('Applies to new Codex sessions.')
    expect(wrapper.find('[data-testid="codex-full-access-toggle"]').attributes('role')).toBe('switch')
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Read only')
    expect(wrapper.text()).not.toContain('Workspace write')
  })

  it.each([
    ['absent setting', [], false],
    ['invalid setting', [sandboxSetting('invalid-mode')], false],
    ['workspace-write setting', [sandboxSetting('workspace-write')], false],
    ['read-only setting', [sandboxSetting('read-only')], false],
    ['danger-full-access setting', [sandboxSetting('danger-full-access')], true],
    ['trimmed danger-full-access setting', [sandboxSetting(' danger-full-access ')], true],
  ])('initializes checked state for %s', async (_name, settings, expectedChecked) => {
    const { wrapper } = await mountComponent(settings as ServerSetting[])

    expect(isFullAccessChecked(wrapper)).toBe(expectedChecked)
    expect(wrapper.find('[data-testid="codex-full-access-dirty"]').exists()).toBe(false)
  })

  it('preserves unsaved local edits when settings refresh from the store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([sandboxSetting('workspace-write')])

    await wrapper.get('[data-testid="codex-full-access-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    serverSettingsStore.$patch({
      settings: [sandboxSetting('workspace-write')],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(isFullAccessChecked(wrapper)).toBe(true)
    expect(wrapper.find('[data-testid="codex-full-access-dirty"]').exists()).toBe(true)
  })

  it('saves danger-full-access when the toggle is turned on', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([sandboxSetting('workspace-write')])

    await wrapper.get('[data-testid="codex-full-access-toggle"]').trigger('click')
    await wrapper.get('[data-testid="codex-full-access-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      CODEX_SANDBOX_SETTING_KEY,
      'danger-full-access',
    )
  })

  it('saves workspace-write when the toggle is turned off', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([sandboxSetting('danger-full-access')])

    await wrapper.get('[data-testid="codex-full-access-toggle"]').trigger('click')
    await wrapper.get('[data-testid="codex-full-access-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      CODEX_SANDBOX_SETTING_KEY,
      'workspace-write',
    )
  })
})
