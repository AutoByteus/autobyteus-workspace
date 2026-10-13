import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DefaultLayout from '../default.vue'
import WorkspaceToolShell from '~/components/layout/WorkspaceToolShell.vue'
import { useLeftPanel } from '~/composables/useLeftPanel'
import { useRightPanel } from '~/composables/useRightPanel'
import { useAppLayoutStore } from '~/stores/appLayoutStore'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/workspace', fullPath: '/workspace', query: {} }),
  useRouter: () => router,
}))

const left = useLeftPanel()
const right = useRightPanel()
const flush = async () => { await nextTick(); await nextTick(); await nextTick() }
const viewport = async (width: number, height = 800) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  window.dispatchEvent(new Event('resize'))
  await flush()
}
let wrapper: ReturnType<typeof mount> | undefined
const reset = () => {
  left.setLeftPanelVisible(true); left.leftPanelWidth.value = 320
  right.setRightPanelVisible(true); right.setRightPanelWorkspaceWidth(null)
  right.preferredRightPanelWidth.value = 450; right.rightPanelResizeIntent.value = 'automatic'
}
beforeEach(() => { reset(); router.push.mockClear() })
afterEach(() => { wrapper?.unmount(); reset(); document.body.innerHTML = '' })

const mountShell = async () => {
  wrapper = mount(DefaultLayout, {
    attachTo: document.body,
    slots: { default: defineComponent({ setup: () => () => h(WorkspaceToolShell, {}, {
      default: () => h('button', { 'data-test': 'conversation-control' }, 'Conversation'),
    }) }) },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      mocks: { $t: (key: string) => key },
      stubs: {
        Icon: true,
        // I/O-heavy content is stubbed; all geometry, strips, provider, drag and
        // modal lifecycle are production components/composables.
        AppLeftPanel: defineComponent({ setup: () => () => h('button', {
          'data-test': 'collapse', onClick: () => left.setLeftPanelVisible(false),
        }, 'Collapse') }),
        RightSideTabs: { template: '<button data-test="tool-control">Tool</button>' },
      },
    },
  })
  await flush()
  return wrapper
}

const dragRight = async (view: ReturnType<typeof mount>, start: number, end: number) => {
  await view.get('[data-test="workspace-right-resize-handle"]').trigger('mousedown', { clientX: start })
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: end }))
  document.dispatchEvent(new MouseEvent('mouseup'))
  await flush()
}

describe('default shell candidate-relative Workspaces docking', () => {
  it.each([1000, 1280, 1440])('redocks after real drag at %ipx with no dialog/backdrop or navigation (AC-001/003)', async width => {
    await viewport(width)
    const view = await mountShell()
    await view.get('[data-test="collapse"]').trigger('click')
    right.setRightPanelWorkspaceWidth(width - 50)
    await dragRight(view, 900, 0)
    const preference = right.preferredRightPanelWidth.value
    expect(preference).toBeGreaterThan(width - 530)
    for (let cycle = 0; cycle < 3; cycle++) {
      await view.get('[data-test="workspace-left-strip-workspaces"]').trigger('click')
      await flush()
      expect(view.get('[data-test="app-left-panel-shell"]').attributes('role')).toBe('navigation')
      expect(view.find('[data-test="app-left-drawer-backdrop"]').exists()).toBe(false)
      expect(view.find('[role="dialog"]').exists()).toBe(false)
      expect(view.get('[data-test="workspace-right-panel"]').attributes('style')).toContain(`width: ${width - 530}px`)
      expect(useAppLayoutStore().isMobileMenuOpen).toBe(false)
      expect(router.push).not.toHaveBeenCalled()
      expect(right.preferredRightPanelWidth.value).toBe(preference)
      await view.get('[data-test="collapse"]').trigger('click')
      await flush()
      expect(view.get('[data-test="workspace-right-panel"]').attributes('style')).toContain(`width: ${preference}px`)
    }
    // Drag with the left docked still belongs to the existing drag owner.
    await view.get('[data-test="workspace-left-strip-workspaces"]').trigger('click')
    right.setRightPanelWorkspaceWidth(width - 326)
    await dragRight(view, 300, 600)
    expect(right.preferredRightPanelWidth.value).toBeGreaterThanOrEqual(400)
    expect(right.rightPanelResizeIntent.value).toBe('user-sized')
  })

  it('keeps constrained modality, focus trap/return and cleans it on wide recovery (AC-004/005)', async () => {
    await viewport(1440)
    const view = await mountShell()
    await view.get('[data-test="collapse"]').trigger('click')
    right.preferredRightPanelWidth.value = 1186
    right.rightPanelResizeIntent.value = 'user-sized'
    await viewport(700)
    const opener = view.get('[data-test="workspace-left-strip-workspaces"]')
    ;(opener.element as HTMLElement).focus()
    await opener.trigger('click'); await flush()
    const drawer = view.get('[data-test="app-left-navigation-drawer"]')
    expect(drawer.attributes('aria-modal')).toBe('true')
    expect(drawer.element.contains(document.activeElement)).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    await flush()
    expect(drawer.element.contains(document.activeElement)).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await flush()
    expect(view.find('[data-test="app-left-drawer-backdrop"]').exists()).toBe(false)
    expect(document.activeElement).toBe(view.get('[data-test="workspace-left-strip-workspaces"]').element)
    await view.get('[data-test="workspace-left-strip-workspaces"]').trigger('click'); await flush()
    await viewport(1440)
    expect(view.find('[data-test="app-left-navigation-drawer"]').exists()).toBe(false)
    expect(view.find('[data-test="app-left-drawer-backdrop"]').exists()).toBe(false)
    expect(useAppLayoutStore().isMobileMenuOpen).toBe(false)
    await view.get('[data-test="workspace-left-strip-workspaces"]').trigger('click'); await flush()
    ;(view.get('[data-test="conversation-control"]').element as HTMLElement).focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(view.get('[data-test="conversation-control"]').element)
    expect(router.push).not.toHaveBeenCalled()
    expect(right.preferredRightPanelWidth.value).toBe(1186)
  })
})
