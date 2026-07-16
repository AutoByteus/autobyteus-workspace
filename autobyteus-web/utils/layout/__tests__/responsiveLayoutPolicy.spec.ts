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
    rightPanelResizeIntent: 'automatic',
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
    expect(state.rightPanel.resizeIntent).toBe('automatic')
    expect(state.rightPanel.centerProtectionMode).toBe('automatic')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
    expect(state.showRightToolsTrigger).toBe(false)
    expect(state.showGenericSurfaceControls).toBe(false)
  })

  it('yields right tools to the visible strip before adapting the left selection surface', () => {
    const state = resolve({ viewportWidth: 1024, viewportHeight: 768 })

    expect(state.mode).toBe('large-constrained')
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.leftPanel.consumedWidth).toBe(320)
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.consumedWidth).toBe(50)
    expect(state.rightPanel.presentationSource).toBe('responsive')
    expect(state.showRightToolsTrigger).toBe(false)
  })

  it('adapts both side surfaces only after right-tool alternatives fail', () => {
    const state = resolve({ viewportWidth: 800, viewportHeight: 700 })

    expect(state.mode).toBe('constrained')
    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('responsive')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
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
      expect(state.showRightToolsTrigger).toBe(true)
      expect(state.showLeftStrip).toBe(false)
      expect(state.showRightStrip).toBe(false)
    }
  })

  it('yields right tools to the visible strip in short-height windows', () => {
    const state = resolve({ viewportWidth: 1440, viewportHeight: 480 })

    expect(state.mode).toBe('short-height')
    expect(state.isShortHeight).toBe(true)
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.presentationSource).toBe('responsive')
    expect(state.showRightToolsTrigger).toBe(false)
  })

  it('preserves the user right strip during short-height manual left collapse', () => {
    const state = resolve({
      viewportWidth: 1440,
      viewportHeight: 480,
      leftPanelPreference: 'hidden-by-user',
      rightPanelPreference: 'hidden-by-user',
    })

    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('user')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.presentationSource).toBe('user')
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

  it('preserves sanitized preferred widths and the automatic center floor', () => {
    const state = resolve({
      viewportWidth: 1440,
      leftPanelPreferredWidth: 9999,
      rightPanelPreferredWidth: 1,
    })

    expect(state.leftPanel.preferredWidth).toBe(520)
    expect(state.rightPanel.preferredWidth).toBe(400)
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
  })

  it('uses the explicit user-sized center floor while the dock still fits', () => {
    const state = resolve({
      viewportWidth: 1440,
      rightPanelResizeIntent: 'user-sized',
    })

    expect(state.rightPanel.presentation).toBe('docked')
    expect(state.rightPanel.resizeIntent).toBe('user-sized')
    expect(state.rightPanel.centerProtectionMode).toBe('user-override')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(200)
    expect(Object.prototype.hasOwnProperty.call(state, 'centerMinWidth')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(state, 'rightPanelResizeIntent')).toBe(false)
  })

  it('retains a user-sized intent while yielding responsively after shrink', () => {
    const state = resolve({
      viewportWidth: 800,
      rightPanelResizeIntent: 'user-sized',
    })

    expect(state.rightPanel.resizeIntent).toBe('user-sized')
    expect(state.rightPanel.centerProtectionMode).toBe('responsive-yield')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
    expect(state.rightPanel.presentation).toBe('strip')
  })

  it('re-evaluates retained user sizing when the viewport recovers', () => {
    const recovered = resolve({
      viewportWidth: 1440,
      rightPanelResizeIntent: 'user-sized',
    })

    expect(recovered.rightPanel.presentation).toBe('docked')
    expect(recovered.rightPanel.resizeIntent).toBe('user-sized')
    expect(recovered.rightPanel.centerProtectionMode).toBe('user-override')
    expect(recovered.rightPanel.effectiveCenterMinWidth).toBe(200)
  })
})
