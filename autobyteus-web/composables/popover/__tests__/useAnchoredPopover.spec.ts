import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useAnchoredPopover, type AnchoredPopoverPlacementPolicy } from '../useAnchoredPopover'

// jsdom has no layout: geometry, the offset parent and the computed position are stubbed.
const rect = (top: number, height = 40) => ({ top, bottom: top + height, left: 0, right: 100, width: 100, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
const placeAt = (element: Element, top: number, height = 40) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(top, height))
}
const setViewport = (width: number, height: number) => {
  vi.stubGlobal('innerWidth', width)
  vi.stubGlobal('innerHeight', height)
}
const setPosition = (positions: Map<Element, string>) => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => ({ position: positions.get(element) ?? 'static' }) as CSSStyleDeclaration)
}

let wrapper: VueWrapper | null = null
const mountPopover = (preferredHeight: number, placement?: AnchoredPopoverPlacementPolicy) => {
  let popover!: ReturnType<typeof useAnchoredPopover>
  const Host = defineComponent({
    setup() {
      const rootRef = ref<HTMLElement | null>(null)
      const triggerRef = ref<HTMLElement | null>(null)
      popover = placement
        ? useAnchoredPopover(rootRef, triggerRef, preferredHeight, { placement })
        : useAnchoredPopover(rootRef, triggerRef, preferredHeight)
      return () => h('div', { 'data-test': 'card' }, [h('div', { ref: rootRef, 'data-test': 'root' }, [h('button', { ref: triggerRef, 'data-test': 'trigger' })])])
    },
  })
  wrapper = mount(Host, { attachTo: document.body })
  const card = wrapper.get('[data-test="card"]').element as HTMLElement
  const root = wrapper.get('[data-test="root"]').element as HTMLElement
  const trigger = wrapper.get('[data-test="trigger"]').element as HTMLElement
  Object.defineProperty(root, 'offsetParent', { configurable: true, get: () => card })
  return { popover, card, root, trigger }
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useAnchoredPopover placement: above', () => {
  it('opens above even when the preferred height fits below (REQ-001)', async () => {
    setViewport(1512, 952)
    const { popover, root, trigger } = mountPopover(300, 'above')
    setPosition(new Map([[root, 'relative']]))
    placeAt(root, 400)
    placeAt(trigger, 400)

    expect(popover.placement.value).toBe('above')
    await popover.show()
    expect(popover.open.value).toBe(true)
    expect(popover.placement.value).toBe('above')
    expect(popover.maxHeight.value).toBe(300)
  })

  it('limits the height to the space above minus the 6px gap and 16px margin, rounded down (REQ-003)', async () => {
    setViewport(1024, 520)
    const { popover, root } = mountPopover(420, 'above')
    setPosition(new Map([[root, 'relative']]))
    placeAt(root, 250.7)

    await popover.show()
    expect(popover.placement.value).toBe('above')
    expect(popover.maxHeight.value).toBe(228)
  })

  it('has no 220px floor and never goes below zero (REQ-003)', async () => {
    setViewport(1024, 300)
    const { popover, root } = mountPopover(300, 'above')
    setPosition(new Map([[root, 'relative']]))

    placeAt(root, 122)
    await popover.show()
    expect(popover.maxHeight.value).toBe(100)
    popover.close(false)

    placeAt(root, 10)
    await popover.show()
    expect(popover.placement.value).toBe('above')
    expect(popover.maxHeight.value).toBe(0)
  })

  it('measures from the offset parent when the root is not positioned (the composer card for @ and /)', async () => {
    setViewport(1024, 520)
    const { popover, card, root, trigger } = mountPopover(300, 'above')
    setPosition(new Map([[card, 'relative']]))
    placeAt(card, 234)
    placeAt(root, 280)
    placeAt(trigger, 280)

    await popover.show()
    expect(popover.maxHeight.value).toBe(212)
  })

  it('measures from the root when the root is positioned', async () => {
    setViewport(1024, 520)
    const { popover, card, root } = mountPopover(300, 'above')
    setPosition(new Map([[card, 'relative'], [root, 'relative']]))
    placeAt(card, 100)
    placeAt(root, 200)

    await popover.show()
    expect(popover.maxHeight.value).toBe(178)
  })

  it('keeps the narrow breakpoint below 640px', async () => {
    setViewport(390, 844)
    const { popover, root } = mountPopover(300, 'above')
    setPosition(new Map([[root, 'relative']]))
    placeAt(root, 500)
    await popover.show()
    expect(popover.narrow.value).toBe(true)
  })
})

describe('useAnchoredPopover placement: auto (default, unchanged)', () => {
  it('opens below when the preferred height fits below the trigger', async () => {
    setViewport(1512, 952)
    const { popover, trigger } = mountPopover(300)
    placeAt(trigger, 400)
    await popover.show()
    expect(popover.placement.value).toBe('below')
    expect(popover.maxHeight.value).toBe(300)
  })

  it('opens above when it fits only above', async () => {
    setViewport(1512, 952)
    const { popover, trigger } = mountPopover(300)
    placeAt(trigger, 880)
    await popover.show()
    expect(popover.placement.value).toBe('above')
    expect(popover.maxHeight.value).toBe(300)
  })

  it('picks the larger side when neither fits and keeps the 220px floor', async () => {
    setViewport(1024, 400)
    const { popover, trigger } = mountPopover(300)
    placeAt(trigger, 100)
    await popover.show()
    // below = 400 - 140 - 16 = 244, above = 100 - 16 = 84
    expect(popover.placement.value).toBe('below')
    expect(popover.maxHeight.value).toBe(244)
    popover.close(false)

    placeAt(trigger, 250)
    await popover.show()
    // below = 400 - 290 - 16 = 94, above = 250 - 16 = 234
    expect(popover.placement.value).toBe('above')
    expect(popover.maxHeight.value).toBe(234)
    popover.close(false)

    setViewport(1024, 300)
    placeAt(trigger, 130)
    await popover.show()
    // below = 300 - 170 - 16 = 114, above = 114: below wins the tie and the floor applies
    expect(popover.placement.value).toBe('below')
    expect(popover.maxHeight.value).toBe(220)
  })

  it('measures from the trigger, not from the containing block', async () => {
    setViewport(1512, 952)
    const { popover, card, trigger } = mountPopover(300)
    setPosition(new Map([[card, 'relative']]))
    placeAt(card, 10)
    placeAt(trigger, 880)
    await popover.show()
    expect(popover.placement.value).toBe('above')
  })
})
