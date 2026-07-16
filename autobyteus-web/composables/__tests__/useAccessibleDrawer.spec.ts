import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccessibleDrawer } from '../useAccessibleDrawer'

describe('useAccessibleDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses the drawer, traps Tab, closes on Escape, and restores the opener', async () => {
    const isOpen = ref(false)
    const close = vi.fn()
    const Host = defineComponent({
      setup() {
        const drawerRef = ref<HTMLElement | null>(null)
        useAccessibleDrawer({
          isOpen,
          drawerRef,
          onRequestClose: () => {
            close()
            isOpen.value = false
          },
        })

        return () => h('div', [
          h('button', {
            'data-test': 'opener',
            onClick: () => { isOpen.value = true },
          }, 'Open'),
          isOpen.value
            ? h('aside', {
                ref: drawerRef,
                role: 'dialog',
                tabindex: -1,
              }, [
                h('button', { 'data-drawer-initial-focus': true, 'data-test': 'close' }, 'Close'),
                h('button', { 'data-test': 'second' }, 'Second'),
              ])
            : null,
        ])
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    const opener = wrapper.get('[data-test="opener"]').element as HTMLElement

    opener.focus()
    await wrapper.get('[data-test="opener"]').trigger('click')
    await nextTick()
    await nextTick()
    await nextTick()

    const closeButton = wrapper.get('[data-test="close"]').element as HTMLElement
    const secondButton = wrapper.get('[data-test="second"]').element as HTMLElement
    expect(document.activeElement).toBe(closeButton)

    opener.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(closeButton)

    closeButton.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(secondButton)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(closeButton)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()

    expect(close).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })

  it('restores focus to a remounted strip target after dismissal', async () => {
    const isOpen = ref(false)
    const showOrigin = ref(true)
    const Host = defineComponent({
      setup() {
        const drawerRef = ref<HTMLElement | null>(null)
        useAccessibleDrawer({
          isOpen,
          drawerRef,
          onRequestClose: () => {
            isOpen.value = false
          },
          returnFocusTarget: () => document.querySelector<HTMLElement>('[data-test="remounted-strip"]'),
        })

        return () => h('div', [
          showOrigin.value && !isOpen.value
            ? h('button', {
                'data-test': 'origin-strip',
                onClick: () => {
                  showOrigin.value = false
                  isOpen.value = true
                },
              }, 'Open')
            : null,
          !showOrigin.value && !isOpen.value
            ? h('button', { 'data-test': 'remounted-strip' }, 'Remounted strip')
            : null,
          isOpen.value
            ? h('aside', { ref: drawerRef, role: 'dialog', tabindex: -1 }, [
                h('button', { 'data-drawer-initial-focus': true }, 'Drawer action'),
              ])
            : null,
        ])
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })

    const origin = wrapper.get('[data-test="origin-strip"]')
    origin.element.focus()
    await origin.trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.get('[role="dialog"]').element.contains(document.activeElement)).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('[data-test="remounted-strip"]').element)
    wrapper.unmount()
  })

  it('gives Escape ownership to the most recently opened independent drawer', async () => {
    const leftOpen = ref(false)
    const rightOpen = ref(false)
    const Host = defineComponent({
      setup() {
        const leftDrawerRef = ref<HTMLElement | null>(null)
        const rightDrawerRef = ref<HTMLElement | null>(null)
        const leftLayer = useAccessibleDrawer({
          isOpen: leftOpen,
          drawerRef: leftDrawerRef,
          onRequestClose: () => { leftOpen.value = false },
        })
        const rightLayer = useAccessibleDrawer({
          isOpen: rightOpen,
          drawerRef: rightDrawerRef,
          onRequestClose: () => { rightOpen.value = false },
        })

        return () => h('div', [
          h('button', { 'data-test': 'open-left', onClick: () => { leftOpen.value = true } }, 'Left'),
          h('button', { 'data-test': 'open-right', onClick: () => { rightOpen.value = true } }, 'Right'),
          leftOpen.value
            ? h('div', { 'data-test': 'left-layer', style: { zIndex: leftLayer.drawerLayer.drawerZIndex.value } }, [
              h('div', { 'data-test': 'left-backdrop', style: { zIndex: leftLayer.drawerLayer.backdropZIndex.value } }),
              h('aside', { ref: leftDrawerRef, role: 'dialog', tabindex: -1 }, [
              h('button', { 'data-drawer-initial-focus': true }, 'Left action'),
              ]),
            ])
            : null,
          rightOpen.value
            ? h('div', { 'data-test': 'right-layer', style: { zIndex: rightLayer.drawerLayer.drawerZIndex.value } }, [
              h('div', { 'data-test': 'right-backdrop', style: { zIndex: rightLayer.drawerLayer.backdropZIndex.value } }),
              h('aside', { ref: rightDrawerRef, role: 'dialog', tabindex: -1 }, [
                  h('button', { 'data-drawer-initial-focus': true }, 'Right action'),
                  h('button', { 'data-test': 'right-second' }, 'Right second'),
                ]),
            ])
            : null,
        ])
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })

    await wrapper.get('[data-test="open-left"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-test="open-right"]').trigger('click')
    await nextTick()

    expect(Number(wrapper.get('[data-test="right-layer"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
      .toBeGreaterThan(Number(wrapper.get('[data-test="left-layer"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
    expect(Number(wrapper.get('[data-test="right-backdrop"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
      .toBeGreaterThan(Number(wrapper.get('[data-test="left-backdrop"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(wrapper.get('[data-test="right-second"]').element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()
    expect(rightOpen.value).toBe(false)
    expect(leftOpen.value).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement?.textContent).toBe('Left action')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()
    expect(leftOpen.value).toBe(false)

    await wrapper.get('[data-test="open-right"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-test="open-left"]').trigger('click')
    await nextTick()
    expect(Number(wrapper.get('[data-test="left-layer"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
      .toBeGreaterThan(Number(wrapper.get('[data-test="right-layer"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
    expect(Number(wrapper.get('[data-test="left-backdrop"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))
      .toBeGreaterThan(Number(wrapper.get('[data-test="right-backdrop"]').attributes('style').match(/z-index:\s*(\d+)/)?.[1]))

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()
    wrapper.unmount()
  })
})
