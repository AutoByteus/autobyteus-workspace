import { describe, expect, it } from 'vitest'
import { resolveResponsiveWorkspaceShellState } from '../responsiveLayoutPolicy'

const resolve = (overrides: Partial<Parameters<typeof resolveResponsiveWorkspaceShellState>[0]> = {}) =>
  resolveResponsiveWorkspaceShellState({
    viewportWidth: 1440,
    viewportHeight: 900,
    leftPanelPreference: 'visible',
    leftPanelPreferredWidth: 320,
    rightPanelPreference: 'visible',
    rightPanelPreferredWidth: 450,
    ...overrides,
  })

describe('responsiveLayoutPolicy', () => {
  it('keeps the canonical split on wide desktop with no generic controls', () => {
    const state = resolve()

    expect(state.mode).toBe('wide')
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.leftPanel.presentationSource).toBe('user')
    expect(state.rightPanel.presentation).toBe('docked')
    expect(state.rightPanel.presentationSource).toBe('user')
    expect(state.showGenericSurfaceControls).toBe(false)
  })

  it('yields right tools before adapting the left selection surface', () => {
    const state = resolve({ viewportWidth: 1024, viewportHeight: 768 })

    expect(state.mode).toBe('large-constrained')
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.leftPanel.consumedWidth).toBe(320)
    expect(state.rightPanel.presentation).toBe('drawer')
    expect(state.rightPanel.consumedWidth).toBe(0)
    expect(state.rightPanel.presentationSource).toBe('responsive')
  })

  it('adapts the left surface only after right-tool alternatives fail', () => {
    const state = resolve({ viewportWidth: 800, viewportHeight: 700 })

    expect(state.mode).toBe('constrained')
    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('responsive')
    expect(state.rightPanel.presentation).toBe('drawer')
    expect(state.centerMinWidth).toBe(480)
    expect(state.canOpenLeftDrawer).toBe(true)
    expect(state.canOpenRightDrawer).toBe(true)
  })

  it('preserves manual left collapse as a user-owned strip', () => {
    const state = resolve({ leftPanelPreference: 'hidden-by-user' })

    expect(state.mode).toBe('wide')
    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('user')
    expect(state.leftPanel.preference).toBe('hidden-by-user')
    expect(state.rightPanel.presentation).toBe('docked')
    expect(state.canOpenLeftDrawer).toBe(false)
    expect(state.showGenericSurfaceControls).toBe(false)
  })

  it('uses drawers at the narrow standard-workspace boundary', () => {
    for (const width of [390, 639, 640, 700, 767]) {
      const state = resolve({ viewportWidth: width, viewportHeight: 700 })

      expect(state.mode).toBe('narrow')
      expect(state.isNarrow).toBe(true)
      expect(state.showHeader).toBe(true)
      expect(state.leftPanel.presentation).toBe('drawer')
      expect(state.rightPanel.presentation).toBe('drawer')
      expect(state.showLeftStrip).toBe(false)
      expect(state.showRightStrip).toBe(false)
    }
  })

  it('yields right tools first in short-height windows', () => {
    const state = resolve({ viewportWidth: 1440, viewportHeight: 480 })

    expect(state.mode).toBe('short-height')
    expect(state.isShortHeight).toBe(true)
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.rightPanel.presentation).toBe('drawer')
    expect(state.rightPanel.presentationSource).toBe('responsive')
  })

  it('keeps user preferences unchanged across pure responsive transitions', () => {
    const preferences = {
      leftPanelPreference: 'visible' as const,
      rightPanelPreference: 'hidden-by-user' as const,
    }
    const constrained = resolve({ viewportWidth: 800, ...preferences })
    const wide = resolve({ viewportWidth: 1440, ...preferences })

    expect(constrained.leftPanel.preference).toBe(preferences.leftPanelPreference)
    expect(constrained.rightPanel.preference).toBe(preferences.rightPanelPreference)
    expect(wide.leftPanel.preference).toBe(preferences.leftPanelPreference)
    expect(wide.rightPanel.preference).toBe(preferences.rightPanelPreference)
    expect(wide.rightPanel.presentationSource).toBe('user')
  })

  it('preserves the practical center minimum and sanitized preferred widths', () => {
    const state = resolve({
      viewportWidth: 1440,
      leftPanelPreferredWidth: 9999,
      rightPanelPreferredWidth: 1,
    })

    expect(state.leftPanel.preferredWidth).toBe(520)
    expect(state.rightPanel.preferredWidth).toBe(400)
    expect(state.centerMinWidth).toBe(480)
  })
})
