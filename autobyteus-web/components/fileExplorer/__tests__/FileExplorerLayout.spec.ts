import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount, type VueWrapper } from '@vue/test-utils'
import FileExplorerLayout from '../FileExplorerLayout.vue'

/** The panel's width: what the layout measures on mount, and what its observer reports when `resizeTo` changes it. */
let mountedWidth = 1000
const observers: Array<{ callback: ResizeObserverCallback; disconnected: boolean }> = []
const resizeTo = async (wrapper: VueWrapper, width: number) => {
  for (const observer of observers.filter((o) => !o.disconnected)) {
    observer.callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)
  }
  await wrapper.vm.$nextTick()
}
beforeEach(() => {
  mountedWidth = 1000
  observers.length = 0
  vi.stubGlobal('ResizeObserver', class {
    private readonly entry: { callback: ResizeObserverCallback; disconnected: boolean }
    constructor(callback: ResizeObserverCallback) { this.entry = { callback, disconnected: false }; observers.push(this.entry) }
    observe() {}
    disconnect() { this.entry.disconnected = true }
  })
  vi.spyOn(window.Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: mountedWidth } as DOMRect))
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

for (const layout of ['split', 'stacked'] as const) {
  describe(`FileExplorerLayout ${layout} target availability`, () => {
    it('gates both children at null, restores explicit B, and preserves omitted defaults', async () => {
      const wrapper = shallowMount(FileExplorerLayout, { props: { layout, workspaceId: 'C' } })
      const children = () => [wrapper.findComponent({ name: 'FileExplorer' }), wrapper.findComponent({ name: 'FileExplorerTabs' })]
      expect(children().every(child => child.props('workspaceId') === 'C')).toBe(true)
      await wrapper.setProps({ workspaceId: null })
      expect(children().every(child => !child.exists())).toBe(true)
      expect(wrapper.find('[data-test="workspace-unavailable"]').exists()).toBe(true)
      await wrapper.setProps({ active: false }); await wrapper.setProps({ active: true })
      expect(children().every(child => !child.exists())).toBe(true)
      await wrapper.setProps({ workspaceId: 'B' })
      expect(children().every(child => child.props('workspaceId') === 'B')).toBe(true)
      await wrapper.setProps({ workspaceId: undefined })
      expect(children().every(child => child.exists() && child.props('workspaceId') === undefined)).toBe(true)
      wrapper.unmount()
      const omitted = shallowMount(FileExplorerLayout, { props: { layout } })
      expect(omitted.findComponent({ name: 'FileExplorer' }).exists()).toBe(true)
      expect(omitted.findComponent({ name: 'FileExplorerTabs' }).exists()).toBe(true)
      omitted.unmount()
    })
  })
}


it('releases an in-progress layout resize when its target becomes unavailable or the layout unmounts', async () => {
  const remove = vi.spyOn(document, 'removeEventListener')
  const wrapper = shallowMount(FileExplorerLayout, { props: { workspaceId: 'C' } })
  await wrapper.vm.$nextTick()
  await wrapper.get('.cursor-col-resize').trigger('mousedown', { clientX: 100 })
  expect(document.body.style.cursor).toBe('col-resize')
  await wrapper.setProps({ workspaceId: null })
  expect(document.body.style.cursor).toBe('')
  expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function))
  await wrapper.setProps({ workspaceId: 'B' })
  await wrapper.get('.cursor-col-resize').trigger('mousedown', { clientX: 100 })
  wrapper.unmount()
  expect(document.body.style.cursor).toBe('')
  expect(document.body.style.userSelect).toBe('')
  remove.mockRestore()
})

// autobyteus-642 D-3 (REQ-003, AC-003): the tree sits beside the viewer only when a 150 px tree, the divider and a 400 px
// viewer fit; the tree is shown no wider than leaves the viewer 400 px, and the divider stops there.
describe('FileExplorerLayout by its own width', () => {
  // The measured width renders on the next tick.
  const mountAt = async (width: number, layout: 'split' | 'stacked' = 'split') => {
    mountedWidth = width
    const wrapper = shallowMount(FileExplorerLayout, { props: { layout, workspaceId: 'C' } })
    await wrapper.vm.$nextTick()
    return wrapper
  }
  const shape = (wrapper: VueWrapper) => ({
    layout: wrapper.attributes('data-layout'),
    divider: wrapper.find('.cursor-col-resize').exists(),
    tree: (wrapper.element.firstElementChild as HTMLElement).style.width,
  })
  const drag = async (wrapper: VueWrapper, by: number) => {
    await wrapper.get('.cursor-col-resize').trigger('mousedown', { clientX: 300 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 + by }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    await wrapper.vm.$nextTick()
  }

  it.each([400, 450, 550])('stacks at a %i px panel (the default panel is 400–450 px)', async (width) => {
    expect(shape(await mountAt(width))).toEqual({ layout: 'stacked', divider: false, tree: '100%' })
  })

  it('splits from 551 px, the tree at what leaves the viewer 400 px', async () => {
    expect(shape(await mountAt(551))).toEqual({ layout: 'split', divider: true, tree: '150px' })
    expect(shape(await mountAt(700))).toEqual({ layout: 'split', divider: true, tree: '250px' })
  })

  it('narrows the tree when the panel narrows, and gives it back when there is room again', async () => {
    const wrapper = await mountAt(700)
    await resizeTo(wrapper, 600)
    expect(shape(wrapper)).toEqual({ layout: 'split', divider: true, tree: '199px' })
    await resizeTo(wrapper, 500)
    expect(shape(wrapper).layout).toBe('stacked')
    await resizeTo(wrapper, 1000)
    expect(shape(wrapper)).toEqual({ layout: 'split', divider: true, tree: '250px' })
  })

  it('stops the divider where the viewer reaches 400 px or the tree 150 px', async () => {
    const wrapper = await mountAt(700)
    await drag(wrapper, 500)
    expect(shape(wrapper).tree).toBe('299px')
    await drag(wrapper, -500)
    expect(shape(wrapper).tree).toBe('150px')
    await resizeTo(wrapper, 1200)
    await drag(wrapper, 1000)
    expect(shape(wrapper).tree).toBe('600px')
  })

  it('stays stacked when the parent asks for it (the phone), whatever its width', async () => {
    expect(shape(await mountAt(1200, 'stacked')).layout).toBe('stacked')
  })

  it('stops observing its width when it unmounts', async () => {
    const wrapper = await mountAt(700)
    wrapper.unmount()
    expect(observers.every((observer) => observer.disconnected)).toBe(true)
  })
})
