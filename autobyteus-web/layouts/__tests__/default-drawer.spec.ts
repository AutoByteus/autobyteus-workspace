import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DefaultLayout from '../default.vue'

const routeMock = {
  fullPath: '/workspace',
}

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
}))

describe('default layout drawer lifecycle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 })
    document.body.innerHTML = ''
  })

  it('opens the labelled left drawer, focuses close, and returns focus to the menu button', async () => {
    const wrapper = mount(DefaultLayout, {
      attachTo: document.body,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
          }),
        ],
        stubs: {
          AppLeftPanel: { template: '<div data-test="left-panel-stub"></div>' },
          LeftSidebarStrip: { template: '<div data-test="left-strip-stub"></div>' },
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
      slots: {
        default: '<div data-test="workspace-slot"></div>',
      },
    })

    await nextTick()
    await nextTick()
    await nextTick()
    const opener = wrapper.get('[data-test="app-left-drawer-open"]').element as HTMLElement
    opener.focus()
    await wrapper.get('[data-test="app-left-drawer-open"]').trigger('click')
    await nextTick()
    await nextTick()
    await nextTick()

    const drawer = wrapper.get('[data-test="app-left-navigation-drawer"]')
    const closeButton = wrapper.get('[data-test="app-left-drawer-close"]').element as HTMLElement
    expect(drawer.attributes('role')).toBe('dialog')
    expect(drawer.attributes('aria-modal')).toBe('true')
    expect(drawer.attributes('aria-labelledby')).toBe('left-navigation-drawer-title')
    expect(document.activeElement).toBe(closeButton)

    await wrapper.get('[data-test="app-left-drawer-close"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })
})
