import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ApplicationImmersiveControlPanel from '../ApplicationImmersiveControlPanel.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationImmersiveControlPanel.openPanel': 'Open host controls',
        'applications.components.applications.ApplicationImmersiveControlPanel.closePanel': 'Close controls panel',
        'applications.components.applications.ApplicationImmersiveControlPanel.panelTitle': 'Host controls',
        'applications.components.applications.ApplicationImmersiveControlPanel.panelSubtitle': 'Inspect details, adjust setup, reload, or exit.',
        'applications.components.applications.ApplicationImmersiveControlPanel.details': 'Details',
        'applications.components.applications.ApplicationImmersiveControlPanel.configureSetup': 'Configure',
        'applications.components.applications.ApplicationImmersiveControlPanel.reloadApplication': 'Reload application',
        'applications.components.applications.ApplicationImmersiveControlPanel.exitApplication': 'Exit application',
      }
      return translations[key] ?? key
    },
  }),
}))

const originalInnerWidth = window.innerWidth

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1000,
  })
})

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  })
  vi.restoreAllMocks()
})

describe('ApplicationImmersiveControlPanel', () => {
  it('renders the closed trigger as a visible top-right floating control', () => {
    const wrapper = mount(ApplicationImmersiveControlPanel, {
      props: {
        applicationName: 'Brief Studio',
      },
    })

    const root = wrapper.get('[data-testid="application-immersive-control-panel-root"]')
    const trigger = wrapper.get('[data-testid="application-immersive-trigger"]')

    expect(root.classes()).toContain('right-5')
    expect(root.classes()).toContain('top-5')
    expect(root.classes()).toContain('md:right-6')
    expect(root.classes()).toContain('md:top-6')

    expect(trigger.classes()).toContain('bg-white')
    expect(trigger.classes()).toContain('rounded-2xl')
    expect(trigger.classes()).toContain('border-slate-200')
    expect(trigger.classes()).toContain('text-slate-700')
    expect(trigger.find('svg').exists()).toBe(true)
    expect(trigger.findAll('path')).toHaveLength(6)
    expect(trigger.findAll('circle')).toHaveLength(3)
  })

  it('opens from the tiny trigger and expands inline details and configure sections', async () => {
    const wrapper = mount(ApplicationImmersiveControlPanel, {
      props: {
        applicationName: 'Brief Studio',
      },
      slots: {
        details: '<div data-testid="details-slot">Details content</div>',
        configure: '<div data-testid="configure-slot">Configure content</div>',
      },
    })

    await wrapper.get('[data-testid="application-immersive-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="application-immersive-control-panel"]').isVisible()).toBe(true)
    expect(wrapper.text()).toContain('Brief Studio')

    await wrapper.get('[data-testid="application-immersive-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="application-immersive-details-section"]').text()).toContain('Details content')
    expect(wrapper.find('[data-testid="configure-slot"]').exists()).toBe(false)

    await wrapper.get('[data-testid="application-immersive-configure-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="application-immersive-details-section"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="application-immersive-configure-section"]').text()).toContain('Configure content')

    await wrapper.get('[data-testid="application-immersive-close"]').trigger('click')
    expect(wrapper.get('[data-testid="application-immersive-panel-frame"]').attributes('style')).toContain('display: none;')
    expect(wrapper.get('[data-testid="application-immersive-trigger"]').exists()).toBe(true)
  })

  it('emits reload and exit intents and clamps resize width within the allowed range', async () => {
    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 560,
      right: 1000,
      bottom: 0,
      width: 440,
      height: 0,
      toJSON: () => ({}),
    }))

    const wrapper = mount(ApplicationImmersiveControlPanel, {
      props: {
        applicationName: 'Brief Studio',
        reloadStatusMessage: 'Save setup before reloading.',
      },
      slots: {
        details: '<div>Details</div>',
      },
    })

    await wrapper.get('[data-testid="application-immersive-trigger"]').trigger('click')

    const panel = wrapper.get('[data-testid="application-immersive-control-panel"]')
    expect((panel.element as HTMLElement).style.width).toBe('512px')

    await wrapper.get('[data-testid="application-immersive-reload"]').trigger('click')
    await wrapper.get('[data-testid="application-immersive-exit"]').trigger('click')

    expect(wrapper.emitted('reload-application')).toHaveLength(1)
    expect(wrapper.emitted('exit-application')).toHaveLength(1)
    expect(wrapper.get('[data-testid="application-immersive-reload-status"]').text()).toContain('Save setup before reloading.')

    await wrapper.get('[data-testid="application-immersive-resize-handle"]').trigger('mousedown', { clientX: 552 })
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 312 }))
    await nextTick()

    expect((panel.element as HTMLElement).style.width).toBe('512px')

    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 632 }))
    await nextTick()

    expect((panel.element as HTMLElement).style.width).toBe('420px')

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(document.body.style.cursor).toBe('')

    getBoundingClientRectSpy.mockRestore()
  })

  it('keeps the action footer visible and reclamps a widened panel when the viewport shrinks', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1600,
    })

    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 1040,
      right: 1600,
      bottom: 0,
      width: 560,
      height: 0,
      toJSON: () => ({}),
    }))

    const wrapper = mount(ApplicationImmersiveControlPanel, {
      props: {
        applicationName: 'Brief Studio',
      },
      slots: {
        configure: '<div style="height: 1200px">Long configure content</div>',
      },
    })

    await wrapper.get('[data-testid="application-immersive-trigger"]').trigger('click')
    await wrapper.get('[data-testid="application-immersive-configure-toggle"]').trigger('click')

    const panel = wrapper.get('[data-testid="application-immersive-control-panel"]')
    expect((panel.element as HTMLElement).style.width).toBe('560px')
    expect(wrapper.get('[data-testid="application-immersive-actions"]').isVisible()).toBe(true)

    await wrapper.get('[data-testid="application-immersive-resize-handle"]').trigger('mousedown', { clientX: 1032 })
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 120 }))
    await nextTick()

    expect((panel.element as HTMLElement).style.width).toBe('960px')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    })
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect((panel.element as HTMLElement).style.width).toBe('712px')

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    getBoundingClientRectSpy.mockRestore()
  })

  it('disables reload when requested by the shell owner', async () => {
    const wrapper = mount(ApplicationImmersiveControlPanel, {
      props: {
        applicationName: 'Brief Studio',
        reloadDisabled: true,
        reloadStatusMessage: 'Save setup before reloading.',
      },
    })

    await wrapper.get('[data-testid="application-immersive-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="application-immersive-reload"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="application-immersive-reload-status"]').text()).toContain('Save setup before reloading.')
  })
})
