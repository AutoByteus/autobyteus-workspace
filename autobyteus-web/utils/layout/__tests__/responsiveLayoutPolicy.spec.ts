import { describe, expect, it } from 'vitest'
import {
  resolveAppShellResponsiveState,
  resolveWorkspaceResponsiveState,
} from '../responsiveLayoutPolicy'

describe('responsiveLayoutPolicy', () => {
  it('keeps left navigation docked while it and the center can fit', () => {
    expect(resolveAppShellResponsiveState({
      viewportWidth: 1440,
      viewportHeight: 900,
      userLeftPanelVisible: true,
      userLeftPanelWidth: 320,
    }).leftPanelPresentation).toBe('docked')

    expect(resolveAppShellResponsiveState({
      viewportWidth: 1024,
      viewportHeight: 768,
      userLeftPanelVisible: true,
      userLeftPanelWidth: 320,
    }).leftPanelPresentation).toBe('docked')

    expect(resolveAppShellResponsiveState({
      viewportWidth: 768,
      viewportHeight: 700,
      userLeftPanelVisible: true,
      userLeftPanelWidth: 320,
    }).leftPanelPresentation).toBe('strip')

    expect(resolveAppShellResponsiveState({
      viewportWidth: 800,
      viewportHeight: 700,
      userLeftPanelVisible: true,
      userLeftPanelWidth: 320,
    }).leftPanelPresentation).toBe('docked')
  })

  it('represents explicit wide collapse as a user-hidden strip, not responsive collapse', () => {
    const state = resolveAppShellResponsiveState({
      viewportWidth: 1440,
      viewportHeight: 900,
      userLeftPanelVisible: false,
    })

    expect(state.leftPanelPresentation).toBe('hidden-by-user')
    expect(state.showLeftStrip).toBe(true)
    expect(state.canOpenLeftDrawer).toBe(false)
  })

  it('uses a drawer-capable shell below md without conflicting 640/768 breakpoints', () => {
    for (const width of [639, 640, 700, 767]) {
      const state = resolveAppShellResponsiveState({
        viewportWidth: width,
        viewportHeight: 700,
        userLeftPanelVisible: true,
      })

      expect(state.leftPanelPresentation).toBe('drawer')
      expect(state.showHeader).toBe(true)
      expect(state.canOpenLeftDrawer).toBe(true)
    }
  })

  it('keeps right tools docked on wide desktop while preserving a practical center width', () => {
    const state = resolveWorkspaceResponsiveState({
      containerWidth: 1120,
      containerHeight: 900,
      rightPanelPreferenceVisible: true,
      preferredRightPanelWidth: 450,
    })

    expect(state.rightPanelPresentation).toBe('docked')
    expect(state.rightPanelWidth).toBe(450)
    expect(state.centerMinWidth).toBe(480)
  })



  it('models the 1024 left-docked plus right-yielding priority explicitly', () => {
    const shell = resolveAppShellResponsiveState({
      viewportWidth: 1024,
      viewportHeight: 768,
      userLeftPanelVisible: true,
    })
    const workspace = resolveWorkspaceResponsiveState({
      containerWidth: 704,
      containerHeight: 768,
      rightPanelPreferenceVisible: true,
      preferredRightPanelWidth: 450,
    })

    expect(shell.leftPanelPresentation).toBe('docked')
    expect(shell.canOpenLeftDrawer).toBe(false)
    expect(workspace.rightPanelPresentation).toBe('drawer')
  })

  it('uses constrained presentation instead of squeezing center at 768-800 widths', () => {
    for (const width of [768, 800]) {
      const state = resolveWorkspaceResponsiveState({
        containerWidth: width,
        containerHeight: 700,
        rightPanelPreferenceVisible: true,
        preferredRightPanelWidth: 450,
      })

      expect(state.rightPanelPresentation).toBe('strip')
      expect(state.showRightStrip).toBe(true)
      expect(state.mode).toBe('constrained')
    }
  })

  it('uses drawer tools in the prior blank-band and phone-width standard workspace sizes', () => {
    for (const width of [390, 500, 639, 640, 700, 767]) {
      const state = resolveWorkspaceResponsiveState({
        containerWidth: width,
        containerHeight: 700,
        rightPanelPreferenceVisible: true,
        preferredRightPanelWidth: 450,
      })

      expect(state.mode).toBe('narrow')
      expect(state.rightPanelPresentation).toBe('drawer')
    }
  })

  it('collapses side tools in short-height windows', () => {
    const state = resolveWorkspaceResponsiveState({
      containerWidth: 1024,
      containerHeight: 480,
      rightPanelPreferenceVisible: true,
      preferredRightPanelWidth: 450,
    })

    expect(state.mode).toBe('short-height')
    expect(state.rightPanelPresentation).toBe('drawer')
  })
})
