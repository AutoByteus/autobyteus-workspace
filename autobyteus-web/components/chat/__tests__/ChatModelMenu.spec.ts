import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatModelMenu from '../ChatModelMenu.vue'

const model = (llmModelIdentifier: string) => ({
  runtimeKind: 'autobyteus', llmModelIdentifier, label: llmModelIdentifier, secondary: null, recommended: false,
  providerName: 'Provider', displayName: null, canonicalName: null,
})
vi.mock('~/composables/chat/useChatModelCatalog', () => ({
  useChatModelCatalog: () => ({
    runtimes: ref([
      { runtimeKind: 'autobyteus', label: 'AutoByteus', shortLabel: 'AutoByteus', enabled: true, reason: null },
      { runtimeKind: 'codex_app_server', label: 'Codex', shortLabel: 'Codex', enabled: false, reason: 'Not installed' },
    ]),
    enabledRuntimeKinds: ref(['autobyteus']),
    ensureAvailability: vi.fn(async () => undefined),
    ensureCatalog: vi.fn(),
    catalogState: () => 'ready',
    modelGroups: () => [{ providerName: 'Provider', models: [model('m-1'), model('m-2')] }],
    modelCount: () => 2,
    isSearching: () => false,
    search: () => [],
  }),
}))

const rect = (top: number, height: number, right = 900) => ({ top, bottom: top + height, left: right - 300, right, width: 300, height, x: right - 300, y: top, toJSON: () => ({}) }) as DOMRect

let wrapper: VueWrapper | null = null
const mountMenu = () => {
  wrapper = mount(ChatModelMenu, {
    props: { runtimeKind: 'autobyteus', llmModelIdentifier: 'm-1', modelLabel: 'm-1' },
    attachTo: document.body,
  })
  return wrapper
}
const open = async (menu: VueWrapper, rootTop: number) => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ position: 'relative' }) as CSSStyleDeclaration)
  vi.spyOn(menu.element, 'getBoundingClientRect').mockReturnValue(rect(rootTop, 28))
  await menu.get('[data-test="chat-model-trigger"]').trigger('click')
  await flushPromises()
}
const openFlyout = async (menu: VueWrapper, rowBottom: number) => {
  const row = menu.get('[data-test="chat-runtime-autobyteus"]')
  vi.spyOn(row.element, 'getBoundingClientRect').mockReturnValue(rect(rowBottom - 32, 32))
  await row.trigger('click')
  await flushPromises()
  return menu.get('[data-test="chat-model-submenu"]')
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChatModelMenu placement', () => {
  it('opens above its trigger with a height limit and without clipping the side submenu (AC-002)', async () => {
    vi.stubGlobal('innerWidth', 1512)
    vi.stubGlobal('innerHeight', 952)
    const menu = mountMenu()
    await open(menu, 604)

    const box = menu.get('[data-test="chat-model-menu"]')
    expect(box.classes()).toEqual(expect.arrayContaining(['absolute', 'right-0', 'bottom-full', 'mb-1.5']))
    expect(box.classes()).not.toContain('top-full')
    expect((box.element as HTMLElement).style.maxHeight).toBe('360px')
    expect(box.classes().some((name) => name.startsWith('overflow'))).toBe(false)
  })

  it('shrinks instead of flipping down in a short window (AC-004)', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 440)
    const menu = mountMenu()
    await open(menu, 300)

    const box = menu.get('[data-test="chat-model-menu"]')
    expect(box.classes()).toContain('bottom-full')
    expect((box.element as HTMLElement).style.maxHeight).toBe('278px')
  })

  it('bottom-aligns the runtime submenu so it grows upward, with a 320px list limit (AC-002)', async () => {
    vi.stubGlobal('innerWidth', 1512)
    vi.stubGlobal('innerHeight', 952)
    const menu = mountMenu()
    await open(menu, 604)
    const submenu = await openFlyout(menu, 593)

    const style = (submenu.element as HTMLElement).style
    expect(style.bottom).toBe('-5px')
    expect(style.top).toBe('')
    const list = submenu.element.firstElementChild as HTMLElement
    expect(list.classList.contains('overflow-y-auto')).toBe(true)
    expect(list.style.maxHeight).toBe('320px')
    expect(submenu.findAll('[role="menuitemradio"]')).toHaveLength(2)
  })

  it('limits the submenu list to the space above its runtime row (AC-004)', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 440)
    const menu = mountMenu()
    await open(menu, 300)
    const submenu = await openFlyout(menu, 289.6)

    // floor(289.6 + 5 − 12 − 10)
    expect((submenu.element.firstElementChild as HTMLElement).style.maxHeight).toBe('272px')
  })

  it('keeps the bottom sheet and drill-in below 640px wide (AC-005)', async () => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
    const menu = mountMenu()
    await open(menu, 700)

    const box = menu.get('[data-test="chat-model-menu"]')
    expect(box.classes()).toEqual(expect.arrayContaining(['fixed', 'inset-x-2', 'bottom-2', 'max-h-[80vh]']))
    expect(box.classes()).not.toContain('bottom-full')
    expect((box.element as HTMLElement).style.maxHeight).toBe('')

    await menu.get('[data-test="chat-runtime-autobyteus"]').trigger('click')
    await flushPromises()
    expect(menu.find('[data-test="chat-model-submenu"]').exists()).toBe(false)
    expect(menu.find('[data-test="chat-model-drill-back"]').exists()).toBe(true)
  })
})
