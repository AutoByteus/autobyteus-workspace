import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, provide, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatModelMenu from '../ChatModelMenu.vue'
import { provideLockedModelOptionsRefresh } from '~/composables/useLockedModelOptionsRefresh'

const catalog = vi.hoisted(() => ({
  refreshCatalog: vi.fn(),
  refreshModelList: vi.fn(),
  ensureCatalog: vi.fn(),
  refreshing: false,
  failed: false,
}))
const model = (llmModelIdentifier: string) => ({
  runtimeKind: 'claude_agent_sdk', llmModelIdentifier, label: llmModelIdentifier, secondary: null, recommended: false,
  providerName: 'Anthropic', displayName: null, canonicalName: null,
})
vi.mock('~/composables/chat/useChatModelCatalog', () => ({
  matchesModelQuery: () => true,
  useChatModelCatalog: () => ({
    runtimes: ref([
      { runtimeKind: 'claude_agent_sdk', label: 'Claude Agent SDK', enabled: true, reason: null },
      { runtimeKind: 'codex_app_server', label: 'Codex App Server', enabled: true, reason: null },
    ]),
    enabledRuntimeKinds: ref(['claude_agent_sdk', 'codex_app_server']),
    ensureAvailability: vi.fn(async () => undefined),
    ensureCatalog: catalog.ensureCatalog,
    refreshCatalog: catalog.refreshCatalog,
    refreshModelList: catalog.refreshModelList,
    catalogRefreshing: () => catalog.refreshing,
    catalogRefreshFailed: () => catalog.failed,
    catalogState: () => 'ready',
    modelGroups: () => [{ providerName: 'Anthropic', models: [model('opus'), model('fable')] }],
    modelCount: () => 2,
    isSearching: () => false,
    search: () => [],
  }),
}))

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.clearAllMocks()
  catalog.refreshing = false
  catalog.failed = false
})

const mountMenu = (props: Record<string, unknown> = {}, host?: ReturnType<typeof defineComponent>) => {
  const menu = defineComponent({
    setup: () => () => h(ChatModelMenu, { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', modelLabel: 'opus', ...props }),
  })
  wrapper = mount(host ?? menu, {
    attachTo: document.body,
    global: { mocks: { $t: (key: string) => key }, stubs: { Icon: true } },
  })
  return wrapper
}
const openMenu = async (menu: VueWrapper) => {
  await menu.get('[data-test="chat-model-trigger"]').trigger('click')
  await flushPromises()
}

describe('ChatModelMenu re-reads the runtime list when it opens (REQ-010, AC-010)', () => {
  it('asks for a background refresh of the chosen runtime on open, not a plain load', async () => {
    const menu = mountMenu()
    expect(catalog.refreshCatalog).not.toHaveBeenCalled()

    await openMenu(menu)

    expect(catalog.refreshCatalog).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
    expect(catalog.ensureCatalog).not.toHaveBeenCalled()
  })

  it('asks for a background refresh of a runtime when its models open', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    catalog.refreshCatalog.mockClear()

    await menu.get('[data-test="chat-runtime-codex_app_server"]').trigger('click')
    await flushPromises()

    expect(catalog.refreshCatalog).toHaveBeenCalledWith('codex_app_server')
    expect(menu.find('[data-test="chat-model-submenu"]').exists()).toBe(true)
  })

  it('reads a runtime once per opening: its models opening after the menu opened on it do not read it again', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    expect(catalog.refreshCatalog).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')

    await menu.get('[data-test="chat-runtime-claude_agent_sdk"]').trigger('click')
    await flushPromises()
    await menu.get('[data-test="chat-runtime-codex_app_server"]').trigger('click')
    await flushPromises()
    await menu.get('[data-test="chat-runtime-claude_agent_sdk"]').trigger('click')
    await flushPromises()

    expect(catalog.refreshCatalog.mock.calls.map(([runtime]) => runtime)).toEqual(['claude_agent_sdk', 'codex_app_server'])

    // A new opening reads again.
    await menu.get('[data-test="chat-model-trigger"]').trigger('click')
    await openMenu(menu)
    expect(catalog.refreshCatalog.mock.calls.map(([runtime]) => runtime)).toEqual(['claude_agent_sdk', 'codex_app_server', 'claude_agent_sdk'])
  })

  it('"Refresh models" in the runtime list re-reads that runtime (and its discovered providers)', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    await menu.get('[data-test="chat-runtime-codex_app_server"]').trigger('click')
    await flushPromises()

    await menu.get('[data-test="chat-model-submenu"] [data-test="model-list-refresh-button"]').trigger('click')

    expect(catalog.refreshModelList).toHaveBeenCalledExactlyOnceWith('codex_app_server')
  })

  it('shows the list while it is refreshing and the error with Retry when the refresh failed', async () => {
    catalog.refreshing = true
    const menu = mountMenu()
    await openMenu(menu)
    await menu.get('[data-test="chat-runtime-codex_app_server"]').trigger('click')
    await flushPromises()
    const submenu = menu.get('[data-test="chat-model-submenu"]')

    expect(submenu.findAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(submenu.find('[data-test="model-list-refreshing"]').exists()).toBe(true)
    expect((submenu.get('[data-test="model-list-refresh-button"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the last list when the refresh failed and offers Retry', async () => {
    catalog.failed = true
    const menu = mountMenu()
    await openMenu(menu)
    await menu.get('[data-test="chat-runtime-codex_app_server"]').trigger('click')
    await flushPromises()
    const submenu = menu.get('[data-test="chat-model-submenu"]')

    expect(submenu.findAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(submenu.get('[data-test="model-list-refresh-error"]').text()).toBe('chat.model.refreshError')
    await submenu.get('[data-test="model-list-refresh-button"]').trigger('click')
    expect(catalog.refreshModelList).toHaveBeenCalledWith('codex_app_server')
  })
})

describe('ChatModelMenu of a saved run asks its editor to re-read the options (REQ-010, AC-012)', () => {
  const lockedOptions = [model('opus'), model('fable')]
  const hostWith = (reload: () => Promise<boolean>) => defineComponent({
    setup() {
      const provided = provideLockedModelOptionsRefresh(reload)
      return () => h('div', [h(ChatModelMenu, {
        runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', modelLabel: 'opus',
        runtimeLocked: true, lockedModels: lockedOptions,
      }), h('span', { 'data-test': 'host-refreshing' }, String(provided.refreshing.value))])
    },
  })

  it('re-reads the saved-run options on open instead of the runtime catalog', async () => {
    const reload = vi.fn(async () => true)
    const menu = mountMenu({}, hostWith(reload))

    await openMenu(menu)

    expect(reload).toHaveBeenCalledOnce()
    expect(catalog.refreshCatalog).not.toHaveBeenCalled()
    expect(menu.findAll('[role="menuitemradio"]')).toHaveLength(2)
  })

  it('keeps the options shown while the editor re-reads them, and "Refresh models" asks again', async () => {
    let finish!: (ok: boolean) => void
    const reload = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const menu = mountMenu({}, hostWith(reload))

    await openMenu(menu)
    expect(menu.findAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(menu.find('[data-test="model-list-refreshing"]').exists()).toBe(true)

    finish(true)
    await flushPromises()
    expect(menu.find('[data-test="model-list-refreshing"]').exists()).toBe(false)

    await menu.get('[data-test="model-list-refresh-button"]').trigger('click')
    expect(reload).toHaveBeenCalledTimes(2)
    expect(catalog.refreshModelList).not.toHaveBeenCalled()
  })

  it('shows the failure with Retry and keeps the last options when the editor could not re-read them', async () => {
    const reload = vi.fn(async () => false)
    const menu = mountMenu({}, hostWith(reload))

    await openMenu(menu)

    expect(menu.findAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(menu.get('[data-test="model-list-refresh-error"]').exists()).toBe(true)
  })

  it('falls back to the runtime catalog when no editor provides the options', async () => {
    const menu = mountMenu({ runtimeLocked: true, lockedModels: lockedOptions })

    await openMenu(menu)

    expect(catalog.refreshCatalog).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
  })
})
