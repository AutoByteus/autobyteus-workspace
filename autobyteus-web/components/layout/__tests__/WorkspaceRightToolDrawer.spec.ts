import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WorkspaceRightToolDrawer from '../WorkspaceRightToolDrawer.vue'

vi.mock('../RightSideTabs.vue', () => ({
  default: { template: '<button data-test="right-tab-stub">Files</button>' },
}))

describe('WorkspaceRightToolDrawer', () => {
  it('provides labelled dialog semantics and returns focus after closing', async () => {
    const isOpen = ref(false)
    const Host = defineComponent({
      setup() {
        const opener = ref<HTMLElement | null>(null)
        return () => h('div', [
          h('button', { ref: opener, 'data-test': 'opener' }, 'Open tools'),
          isOpen.value
            ? h(WorkspaceRightToolDrawer, {
                title: 'Tools',
                width: 450,
                onClose: () => { isOpen.value = false },
              })
            : null,
        ])
      },
    })
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })
    const opener = wrapper.get('[data-test="opener"]').element as HTMLElement
    opener.focus()
    isOpen.value = true
    await nextTick()
    await nextTick()
    await nextTick()

    const drawer = wrapper.get('[data-test="workspace-right-tool-drawer"]')
    expect(drawer.attributes('role')).toBe('dialog')
    expect(drawer.attributes('aria-modal')).toBe('true')
    expect(drawer.attributes('aria-label')).toBe('Tools')
    expect(drawer.classes()).toEqual(expect.arrayContaining(['fixed', 'inset-y-0', 'right-0']))
    expect(drawer.classes()).not.toContain('inset-0')
    expect(drawer.attributes('aria-labelledby')).toBeUndefined()
    expect(wrapper.find('#workspace-right-tool-drawer-title').exists()).toBe(false)
    expect(wrapper.find('[data-drawer-initial-focus]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-test="right-tab-stub"]').element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="workspace-right-tool-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })

  it('returns focus to a remounted right strip after backdrop dismissal', async () => {
    const isOpen = ref(false)
    const showOrigin = ref(true)
    const Host = defineComponent({
      setup() {
        return () => h('div', [
          showOrigin.value && !isOpen.value
            ? h('button', {
                'data-test': 'right-strip-origin',
                'data-tab-name': 'terminal',
                onClick: () => {
                  showOrigin.value = false
                  isOpen.value = true
                },
              }, 'Open tools')
            : null,
          !showOrigin.value && !isOpen.value
            ? h('button', { 'data-test': 'right-strip-remounted', 'data-tab-name': 'terminal' }, 'Tools strip')
            : null,
          isOpen.value
            ? h(WorkspaceRightToolDrawer, {
                title: 'Tools',
                width: 450,
                returnFocusTarget: (origin?: HTMLElement | null) => {
                  const tabName = origin?.dataset.tabName
                  return Array.from(document.querySelectorAll<HTMLElement>('[data-test="right-strip-remounted"]'))
                    .find((button) => !tabName || button.dataset.tabName === tabName) ?? null
                },
                onClose: () => {
                  isOpen.value = false
                },
              })
            : null,
        ])
      },
    })
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { mocks: { $t: (key: string) => key } },
    })

    const origin = wrapper.get('[data-test="right-strip-origin"]')
    origin.element.focus()
    await origin.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.get('[data-test="workspace-right-tool-drawer"]').element.contains(document.activeElement)).toBe(true)

    await wrapper.get('[data-test="workspace-right-tool-drawer-backdrop"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('[data-test="right-strip-remounted"]').element)
    wrapper.unmount()
  })
})
