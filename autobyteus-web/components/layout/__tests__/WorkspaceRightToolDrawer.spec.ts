import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WorkspaceRightToolDrawer from '../WorkspaceRightToolDrawer.vue'

vi.mock('../RightSideTabs.vue', () => ({
  default: { template: '<div data-test="right-tabs-stub"></div>' },
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
    expect(drawer.attributes('aria-labelledby')).toBe('workspace-right-tool-drawer-title')
    expect(wrapper.get('#workspace-right-tool-drawer-title').text()).toBe('Tools')
    expect(document.activeElement).toBe(wrapper.get('[data-drawer-initial-focus]').element)

    await wrapper.get('[data-drawer-initial-focus]').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="workspace-right-tool-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })
})
