import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

/** Settings → Extensions for each kind of window (VIS-V1-01…V1-04, V13-01, V13-03; REQ-001, REQ-005, REQ-011). */
const { open, windowNode, access, entry } = vi.hoisted(() => ({
  open: vi.fn(),
  windowNode: { isEmbeddedWindow: true, entryId: 'embedded-local' },
  access: { state: 'connected' as string | null },
  entry: { name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695' },
}))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowNode }))
vi.mock('~/stores/nodeStore', () => ({ useNodeStore: () => ({ getEntryById: () => entry }) }))
vi.mock('~/stores/nodeAccessStore', () => ({ useNodeAccessStore: () => ({ initialize: vi.fn(async () => undefined), stateOf: () => access.state }) }))

import ExtensionsManager from '../ExtensionsManager.vue'
import { useExtensionsStore } from '~/stores/extensionsStore'

const render = () => mount(ExtensionsManager, { global: { stubs: { ExtensionCard: { props: ['item'], template: '<div class="card">{{ item.id }}</div>' }, ExtensionDialogs: { template: '<div />' }, NuxtLink: { template: '<a><slot /></a>' } } } })
const list = (catalog: string, ids: string[]) => ({ catalog, platform: 'darwin-arm64', extensions: ids.map((id) => ({ id })) })

describe('ExtensionsManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.assign(windowNode, { isEmbeddedWindow: true, entryId: 'embedded-local' })
    Object.assign(entry, { name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695' })
    access.state = 'connected'
    ;(window as any).electronAPI = {}
    open.mockReset()
    vi.spyOn(useExtensionsStore(), 'open').mockImplementation(open)
  })
  afterEach(() => { delete (window as any).electronAPI })

  it('this computer\'s window: the node line, the cards of its node, no voice note (V1-01)', async () => {
    const store = useExtensionsStore()
    store.list = list('verified', ['voice-input']) as any
    const wrapper = render()
    await flushPromises()
    expect(open).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="extensions-node-line"]').findAll('span').map((span) => span.text())).toEqual(['Extensions of', 'Embedded Node', '· this computer'])
    expect(wrapper.findAll('.card').map((card) => card.text())).toEqual(['voice-input'])
    expect(wrapper.find('[data-testid="extensions-voice-note"]').exists()).toBe(false)
  })

  it('a Docker node\'s window: its address, its own list, and the note that Voice Input belongs to this computer (V1-02)', async () => {
    Object.assign(windowNode, { isEmbeddedWindow: false, entryId: 'docker-1' })
    Object.assign(entry, { name: 'docker-node', baseUrl: 'http://127.0.0.1:8001' })
    useExtensionsStore().list = list('verified', []) as any
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[data-testid="extensions-node-line"]').findAll('span').map((span) => span.text())).toEqual(['Extensions of', 'docker-node', '· 127.0.0.1:8001'])
    expect(wrapper.find('[data-testid="extensions-voice-note"]').exists()).toBe(true)
  })

  it('a node this desktop does not control: only the note with the link, and no request (V1-03)', async () => {
    Object.assign(windowNode, { isEmbeddedWindow: false, entryId: 'docker-1' })
    access.state = 'needs_connecting'
    const wrapper = render()
    await flushPromises()
    expect(open).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="extensions-owner-note"]').text()).toContain('This AutoByteus does not control Embedded Node yet.')
    expect(wrapper.findAll('.card')).toHaveLength(0)
  })

  it('a browser window: the desktop-app note and no list (V1-04)', async () => {
    delete (window as any).electronAPI
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid="extensions-browser-note"]').exists()).toBe(true)
    expect(open).not.toHaveBeenCalled()
  })

  it('says when the catalog could not be verified or reached; installed extensions are still listed (V13-01, V13-03)', async () => {
    const store = useExtensionsStore()
    store.list = list('unverified', ['voice-input']) as any
    const unverified = render()
    await flushPromises()
    expect(unverified.find('[data-testid="extensions-catalog-unverified"]').exists()).toBe(true)
    store.list = list('unreachable', ['voice-input']) as any
    const offline = render()
    await flushPromises()
    expect(offline.find('[data-testid="extensions-catalog-offline"]').exists()).toBe(true)
    expect(offline.findAll('.card')).toHaveLength(1)
  })
})
