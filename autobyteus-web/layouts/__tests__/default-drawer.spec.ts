import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DefaultLayout from '../default.vue'

const routeMock = {
  path: '/agents',
  fullPath: '/agents',
}
const routerMock = {
  push: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

describe('default layout drawer lifecycle', () => {
  beforeEach(() => {
    routeMock.path = '/agents'
    routeMock.fullPath = '/agents'
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
          Icon: true,
          LeftSidebarStrip: { template: '<div data-test="left-strip-stub"></div>' },
          WorkspaceAgentRunsTreePanel: { template: '<div data-test="runs-tree-stub"></div>' },
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
    const contentWrapper = drawer.get('div.min-h-0.flex-1.overflow-hidden')
    expect(drawer.attributes('role')).toBe('dialog')
    expect(drawer.attributes('aria-modal')).toBe('true')
    expect(drawer.attributes('aria-labelledby')).toBe('left-navigation-drawer-title')
    expect(drawer.classes()).toEqual(expect.arrayContaining(['flex', 'flex-col', 'h-full']))
    expect(contentWrapper.classes()).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-hidden']))
    expect(drawer.get('[data-test="app-left-panel-sections"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'flex', 'flex-1', 'flex-col']),
    )
    expect(drawer.get('[data-test="app-left-panel-run-history"] > div').classes()).toContain('h-full')
    expect(document.activeElement).toBe(closeButton)

    await wrapper.get('[data-test="app-left-drawer-close"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })

  it('keeps workspace-only strips out of the retained default renderer on narrow agent routes', async () => {
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
          Icon: true,
          WorkspaceAgentRunsTreePanel: { template: '<div data-test="runs-tree-stub"></div>' },
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

    expect(wrapper.get('[data-test="app-left-drawer-open"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="app-left-panel-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="workspace-left-navigation-strip"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
