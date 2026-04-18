import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'applications.shared.sessionActive': 'Session active',
      'applications.components.applications.ApplicationImmersiveControls.exitImmersive': 'Show host controls',
      'applications.components.applications.ApplicationImmersiveControls.openPanel': 'Open controls panel',
      'applications.components.applications.ApplicationImmersiveControls.closePanel': 'Close controls panel',
      'applications.components.applications.ApplicationImmersiveControls.panelTitle': 'Controls',
      'applications.components.applications.ApplicationShell.tabExecution': 'Execution',
      'applications.components.applications.ApplicationShell.showDetails': 'Details',
      'applications.components.applications.ApplicationShell.hideDetails': 'Hide details',
      'applications.components.applications.ApplicationShell.launchAgain': 'Relaunch',
      'applications.components.applications.ApplicationShell.stopSession': 'Stop current session',
    } as Record<string, string>)[key] ?? key,
  }),
}))

import ApplicationImmersiveControls from '../ApplicationImmersiveControls.vue'

describe('ApplicationImmersiveControls', () => {
  it('renders as a compact trigger and opens a right-side controls sheet on demand', async () => {
    const wrapper = mount(ApplicationImmersiveControls, {
      props: {
        applicationName: 'Brief Studio',
        detailsOpen: false,
      },
    })

    expect(wrapper.get('[data-testid="application-immersive-menu-toggle"]').attributes('aria-label')).toContain('panel')
    expect(wrapper.find('[data-testid="application-immersive-controls-sheet"]').exists()).toBe(false)
    expect(wrapper.emitted('sheet-open-change')).toEqual([[false]])

    await wrapper.get('[data-testid="application-immersive-menu-toggle"]').trigger('click')

    const sheet = wrapper.get('[data-testid="application-immersive-controls-sheet"]')
    expect(sheet.attributes('aria-hidden')).toBe('false')
    expect(sheet.classes()).toContain('w-80')
    expect(sheet.classes()).toContain('bg-white/95')
    expect(sheet.text()).toContain('Session active')
    expect(sheet.text()).toContain('Brief Studio')
    expect(sheet.find('[data-testid="application-immersive-exit"]').exists()).toBe(true)
    expect(sheet.find('[data-testid="application-immersive-execution"]').exists()).toBe(true)
    expect(sheet.find('[data-testid="application-immersive-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="application-immersive-menu-toggle"]').exists()).toBe(false)
    expect(wrapper.emitted('sheet-open-change')).toEqual([[false], [true]])
  })

  it('emits actions from the sheet and closes from the close button or outside click', async () => {
    const wrapper = mount(ApplicationImmersiveControls, {
      props: {
        applicationName: 'Brief Studio',
        detailsOpen: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('[data-testid="application-immersive-menu-toggle"]').trigger('click')
    await wrapper.get('[data-testid="application-immersive-details"]').trigger('click')

    expect(wrapper.emitted('toggle-details')).toHaveLength(1)
    expect(wrapper.find('[data-testid="application-immersive-controls-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="application-immersive-menu-toggle"]').trigger('click')
    await wrapper.get('[data-testid="application-immersive-execution"]').trigger('click')

    expect(wrapper.emitted('switch-execution')).toHaveLength(1)
    expect(wrapper.find('[data-testid="application-immersive-controls-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="application-immersive-menu-toggle"]').trigger('click')
    await wrapper.get('[data-testid="application-immersive-controls-close"]').trigger('click')
    expect(wrapper.find('[data-testid="application-immersive-controls-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="application-immersive-menu-toggle"]').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="application-immersive-controls-sheet"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="application-immersive-menu-toggle"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
