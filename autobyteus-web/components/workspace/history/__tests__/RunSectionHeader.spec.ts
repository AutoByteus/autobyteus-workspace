import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
import RunSectionHeader from '../RunSectionHeader.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { RUN_SECTION_MODE_STORAGE_PREFIX, useRunSectionModeStore } from '~/stores/runSectionModeStore'

// workspace-tree-vs-chooser (REQ-006, AC-009, UXJ-001, VIS-002, VIS-011): the run section's header and its "View" menu.
let wrapper: VueWrapper | null = null
const mountHeader = () => {
  wrapper = mount(RunSectionHeader, { attachTo: document.body })
  return wrapper
}
const button = (w: VueWrapper) => w.get('[data-test="run-section-view-menu"]')
const menu = (w: VueWrapper) => w.find('[data-test="run-section-view-menu-list"]')
const items = (w: VueWrapper) => w.findAll('[role="menuitemradio"]')

beforeEach(async () => {
  await localizationRuntime.setPreference('en')
  window.localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('RunSectionHeader', () => {
  it('names the view in an h2 and offers exactly the three views behind one "View" button', async () => {
    const w = mountHeader()
    expect(w.get('h2#run-section-title').text()).toBe('Workspaces')
    expect(button(w).attributes()).toMatchObject({ 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: 'View', 'aria-label': 'View' })
    expect(button(w).get('[data-icon]').attributes('data-icon')).toBe('heroicons:ellipsis-horizontal-20-solid')

    await button(w).trigger('click')
    await flushPromises()
    expect(button(w).attributes('aria-expanded')).toBe('true')
    expect(menu(w).attributes('role')).toBe('menu')
    expect(menu(w).text()).toContain('View')
    expect(items(w).map((item) => item.text())).toEqual(['Runs', 'Workspaces', 'Projects'])
    expect(items(w).map((item) => item.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(items(w)[1]!.find('[data-icon="heroicons:check-20-solid"]').exists()).toBe(true)
    // The current view gets focus when the menu opens; no add actions are offered.
    expect(document.activeElement).toBe(items(w)[1]!.element)
    expect(menu(w).findAll('button')).toHaveLength(3)
  })

  it('chooses a view: the title follows, the choice is stored for the node, focus returns to the button', async () => {
    const w = mountHeader()
    await button(w).trigger('click')
    await items(w)[0]!.trigger('click')
    await flushPromises()
    expect(menu(w).exists()).toBe(false)
    expect(w.get('h2').text()).toBe('Runs')
    expect(useRunSectionModeStore().mode).toBe('runs')
    const stored = Object.keys(window.localStorage).filter((key) => key.startsWith(RUN_SECTION_MODE_STORAGE_PREFIX))
    expect(stored.map((key) => window.localStorage.getItem(key))).toEqual(['runs'])
    expect(document.activeElement).toBe(button(w).element)
  })

  it('choosing the current view only closes the menu', async () => {
    const w = mountHeader()
    await button(w).trigger('click')
    await items(w)[1]!.trigger('click')
    expect(menu(w).exists()).toBe(false)
    expect(window.localStorage.length).toBe(0)
    expect(useRunSectionModeStore().mode).toBe('workspaces')
  })

  it('keyboard: ArrowDown opens on the current view, arrows move, Escape closes and returns focus, Tab closes', async () => {
    const w = mountHeader()
    await button(w).trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(document.activeElement).toBe(items(w)[1]!.element)
    await menu(w).trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items(w)[2]!.element)
    await menu(w).trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items(w)[2]!.element)
    await menu(w).trigger('keydown', { key: 'ArrowUp' })
    await menu(w).trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items(w)[0]!.element)
    await menu(w).trigger('keydown', { key: 'Escape' })
    expect(menu(w).exists()).toBe(false)
    expect(document.activeElement).toBe(button(w).element)

    await button(w).trigger('click')
    await flushPromises()
    await menu(w).trigger('keydown', { key: 'Tab' })
    expect(menu(w).exists()).toBe(false)
  })

  it('a click outside closes the menu', async () => {
    const w = mountHeader()
    await button(w).trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushPromises()
    expect(menu(w).exists()).toBe(false)
  })
})
