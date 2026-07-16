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
})
