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
    routerMock.push.mockClear()
    document.body.innerHTML = ''
  })

  it('uses the shared narrow strip on non-workspace routes and returns focus to its opener', async () => {
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
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-left-drawer-open"]').exists()).toBe(false)
    const opener = wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agents"]').element as HTMLElement
    expect(opener.className).toContain('bg-gray-100')
    opener.focus()
    await wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agents"]').trigger('click')
    await nextTick()
    await nextTick()
    await nextTick()

    const drawer = wrapper.get('[data-test="app-left-navigation-drawer"]')
    const contentWrapper = drawer.get('div.min-h-0.flex-1.overflow-hidden')
    expect(drawer.attributes('role')).toBe('dialog')
    expect(drawer.attributes('aria-modal')).toBe('true')
    expect(drawer.attributes('aria-label')).toBe('shell.workspaceSurfaces.navigationDrawerTitle')
    expect(drawer.attributes('aria-labelledby')).toBeUndefined()
    expect((drawer.element as HTMLElement).style.zIndex).toBe('50')
    expect((wrapper.get('[data-test="app-left-drawer-backdrop"]').element as HTMLElement).style.zIndex).toBe('40')
    expect(wrapper.find('[data-test="app-left-drawer-close"]').exists()).toBe(false)
    expect(wrapper.find('#left-navigation-drawer-title').exists()).toBe(false)
    expect(drawer.classes()).toEqual(expect.arrayContaining(['flex', 'flex-col', 'h-full']))
    expect(contentWrapper.classes()).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-hidden']))
    expect(drawer.get('[data-test="app-left-panel-sections"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'flex', 'flex-1', 'flex-col']),
    )
    expect(drawer.get('[data-test="app-left-panel-run-history"] > div').classes()).toContain('h-full')
    expect(drawer.element.contains(document.activeElement)).toBe(true)

    await wrapper.get('[data-test="app-left-drawer-backdrop"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agents"]').element)
    wrapper.unmount()
  })

  it('keeps route-aware left navigation while excluding workspace-only right tools on /tools', async () => {
    routeMock.path = '/tools'
    routeMock.fullPath = '/tools'

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

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-left-drawer-open"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="workspace-left-navigation-strip"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="workspace-right-tool-strip"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('marks the active agent-team route in the shared narrow strip', async () => {
    routeMock.path = '/agent-teams'
    routeMock.fullPath = '/agent-teams'

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

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agent Teams"]').classes()).toContain('bg-gray-100')
    wrapper.unmount()
  })

  it('keeps the standard workspace drawer open when an existing strip control activates open-drawer', async () => {
    routeMock.path = '/workspace'
    routeMock.fullPath = '/workspace'

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

    const strip = wrapper.get('[data-test="workspace-left-navigation-strip"]')
    const agentButton = strip.get('button[title="Agent Teams"]')
    agentButton.element.focus()
    await agentButton.trigger('click')
    await nextTick()
    await nextTick()

    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="app-left-navigation-drawer"]').attributes('role')).toBe('dialog')
    expect(wrapper.find('[data-test="workspace-left-navigation-strip"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="app-left-navigation-drawer"]').element.contains(document.activeElement)).toBe(true)

    await wrapper.get('[data-test="app-left-drawer-backdrop"]').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    const remountedStripAgentButton = wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agent Teams"]').element
    expect(document.activeElement).toBe(remountedStripAgentButton)

    await wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agent Teams"]').trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.get('[data-test="app-left-navigation-drawer"]').element.contains(document.activeElement)).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    await nextTick()
    expect(wrapper.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-test="workspace-left-navigation-strip"] button[title="Agent Teams"]').element)
    expect(routeMock.fullPath).toBe('/workspace')
    wrapper.unmount()
  })
})
