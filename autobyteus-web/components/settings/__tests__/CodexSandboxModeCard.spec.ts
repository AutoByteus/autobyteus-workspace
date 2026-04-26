import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import CodexSandboxModeCard from '../CodexSandboxModeCard.vue'
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

  const wrapper = mount(CodexSandboxModeCard, {
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

const checkedMode = (wrapper: ReturnType<typeof mount>): string | null => {
  const checkedInput = wrapper.find('input[name="codex-sandbox-mode"]:checked')
  return checkedInput.exists() ? (checkedInput.element as HTMLInputElement).value : null
}

describe('CodexSandboxModeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to workspace-write when the setting is absent', async () => {
    const { wrapper } = await mountComponent()

    expect(checkedMode(wrapper)).toBe('workspace-write')
    expect(wrapper.find('[data-testid="codex-sandbox-mode-dirty"]').exists()).toBe(false)
  })

  it('renders the Codex sandbox options and falls back to workspace-write for invalid settings', async () => {
    const { wrapper } = await mountComponent([
      {
        key: CODEX_SANDBOX_SETTING_KEY,
        value: 'invalid-mode',
        description: 'sandbox',
        isEditable: true,
        isDeletable: false,
      },
    ])

    expect(wrapper.text()).toContain('Codex sandbox mode')
    expect(wrapper.text()).toContain('Read only')
    expect(wrapper.text()).toContain('Workspace write')
    expect(wrapper.text()).toContain('No filesystem sandboxing')
    expect(wrapper.text()).toContain('Applies to new Codex sessions.')
    expect(checkedMode(wrapper)).toBe('workspace-write')
  })

  it('normalizes a persisted valid value with surrounding whitespace', async () => {
    const { wrapper } = await mountComponent([
      {
        key: CODEX_SANDBOX_SETTING_KEY,
        value: ' danger-full-access ',
        description: 'sandbox',
        isEditable: true,
        isDeletable: false,
      },
    ])

    expect(checkedMode(wrapper)).toBe('danger-full-access')
  })

  it('preserves unsaved local edits when settings refresh from the store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([
      {
        key: CODEX_SANDBOX_SETTING_KEY,
        value: 'read-only',
        description: 'sandbox',
        isEditable: true,
        isDeletable: false,
      },
    ])

    await wrapper.get('[data-testid="codex-sandbox-mode-radio-danger-full-access"]').setValue()
    await wrapper.vm.$nextTick()

    serverSettingsStore.$patch({
      settings: [
        {
          key: CODEX_SANDBOX_SETTING_KEY,
          value: 'workspace-write',
          description: 'sandbox',
          isEditable: true,
          isDeletable: false,
        },
      ],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(checkedMode(wrapper)).toBe('danger-full-access')
    expect(wrapper.find('[data-testid="codex-sandbox-mode-dirty"]').exists()).toBe(true)
  })

  it.each([
    ['Read only', 'read-only'],
    ['Workspace write', 'workspace-write'],
    ['Full access', 'danger-full-access'],
  ])('saves the %s canonical value through the server settings store', async (_label, mode) => {
    const { wrapper, serverSettingsStore } = await mountComponent([
      {
        key: CODEX_SANDBOX_SETTING_KEY,
        value: mode === 'workspace-write' ? 'read-only' : 'workspace-write',
        description: 'sandbox',
        isEditable: true,
        isDeletable: false,
      },
    ])

    await wrapper.get(`[data-testid="codex-sandbox-mode-radio-${mode}"]`).setValue()
    await wrapper.get('[data-testid="codex-sandbox-mode-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      CODEX_SANDBOX_SETTING_KEY,
      mode,
    )
  })
})
