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
    expect(state.rightPanel.stripBehavior).toBeNull()
    expect(state.leftPanel.stripActivation).toBeNull()
    expect(state.rightPanel.stripActivation).toBeNull()
    expect(state.rightPanel.resizeIntent).toBe('automatic')
    expect(state.rightPanel.centerProtectionMode).toBe('automatic')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
    expect(state.showGenericSurfaceControls).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(state, 'showRightToolsTrigger')).toBe(false)
  })

  it('uses a consuming right strip before adapting the left selection surface', () => {
    const state = resolve({ viewportWidth: 1024, viewportHeight: 768 })

    expect(state.mode).toBe('large-constrained')
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.leftPanel.consumedWidth).toBe(320)
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.stripBehavior).toBe('consuming')
    expect(state.rightPanel.consumedWidth).toBe(50)
    expect(state.rightPanel.presentationSource).toBe('responsive')
  })

  it('uses an overlay right strip when the consuming strip cannot fit', () => {
    const state = resolve({ viewportWidth: 820, viewportHeight: 700 })

    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.stripBehavior).toBe('overlay')
    expect(state.rightPanel.consumedWidth).toBe(0)
    expect(state.rightPanel.stripActivation).toBe('open-drawer')
  })

  it('adapts the left surface only after consuming and overlay right alternatives fail', () => {
    const state = resolve({ viewportWidth: 800, viewportHeight: 700 })

    expect(state.mode).toBe('constrained')
    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('responsive')
    expect(state.leftPanel.stripBehavior).toBe('consuming')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.stripBehavior).toBe('consuming')
    expect(state.rightPanel.effectiveCenterMinWidth).toBe(480)
    expect(state.leftPanel.stripActivation).toBe('open-drawer')
    expect(state.rightPanel.stripActivation).toBe('open-drawer')
  })

  it('preserves manual left collapse as a user-owned strip', () => {
    const state = resolve({ leftPanelPreference: 'hidden-by-user' })

    expect(state.mode).toBe('wide')
    expect(state.leftPanel.presentation).toBe('strip')
    expect(state.leftPanel.presentationSource).toBe('user')
    expect(state.leftPanel.preference).toBe('hidden-by-user')
    expect(state.leftPanel.stripBehavior).toBe('consuming')
    expect(state.rightPanel.presentation).toBe('docked')
    expect(state.leftPanel.stripActivation).toBe('redock-panel')
    expect(state.showGenericSurfaceControls).toBe(false)
  })

  it('emits symmetric redock activation for fitting wide user strips', () => {
    const leftCollapsed = resolve({ leftPanelPreference: 'hidden-by-user' })
    const rightCollapsed = resolve({ rightPanelPreference: 'hidden-by-user' })

    expect(leftCollapsed.leftPanel.stripActivation).toBe('redock-panel')
    expect(rightCollapsed.rightPanel.stripActivation).toBe('redock-panel')
  })

  it('changes user strip activation to open-drawer while constrained and restores redock on recovery', () => {
    const leftShrunk = resolve({
      viewportWidth: 800,
      leftPanelPreference: 'hidden-by-user',
    })
    const rightShrunk = resolve({
      viewportWidth: 800,
      rightPanelPreference: 'hidden-by-user',
    })
    const leftRecovered = resolve({ leftPanelPreference: 'hidden-by-user' })
    const rightRecovered = resolve({ rightPanelPreference: 'hidden-by-user' })

    expect(leftShrunk.leftPanel.stripActivation).toBe('open-drawer')
    expect(rightShrunk.rightPanel.stripActivation).toBe('open-drawer')
    expect(leftRecovered.leftPanel.stripActivation).toBe('redock-panel')
    expect(rightRecovered.rightPanel.stripActivation).toBe('redock-panel')
  })

  it('uses a left drawer and overlay right strip at the narrow standard-workspace boundary', () => {
    for (const width of [390, 639, 640, 700, 767]) {
      const state = resolve({ viewportWidth: width, viewportHeight: 700 })

      expect(state.mode).toBe('narrow')
      expect(state.isNarrow).toBe(true)
      expect(state.showHeader).toBe(true)
      expect(state.leftPanel.presentation).toBe('strip')
      expect(state.leftPanel.stripBehavior).toBe('overlay')
      expect(state.rightPanel.presentation).toBe('strip')
      expect(state.rightPanel.stripBehavior).toBe('overlay')
      expect(state.rightPanel.consumedWidth).toBe(0)
      expect(state.leftPanel.stripActivation).toBe('open-drawer')
      expect(state.rightPanel.stripActivation).toBe('open-drawer')
      expect(state.showLeftStrip).toBe(true)
      expect(state.showRightStrip).toBe(true)
    }
  })

  it('yields right tools to a consuming strip in short-height windows', () => {
    const state = resolve({ viewportWidth: 1440, viewportHeight: 480 })

    expect(state.mode).toBe('short-height')
    expect(state.isShortHeight).toBe(true)
    expect(state.leftPanel.presentation).toBe('docked')
    expect(state.rightPanel.presentation).toBe('strip')
    expect(state.rightPanel.stripBehavior).toBe('consuming')
    expect(state.rightPanel.presentationSource).toBe('responsive')
    expect(state.rightPanel.stripActivation).toBe('open-drawer')
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
    expect(state.rightPanel.stripBehavior).toBe('consuming')
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
    expect(constrained.rightPanel.presentation).toBe('strip')
    expect(constrained.rightPanel.stripBehavior).toBe('consuming')
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
    expect(state.rightPanel.stripBehavior).toBeNull()
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
    expect(state.rightPanel.stripBehavior).toBe('consuming')
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
