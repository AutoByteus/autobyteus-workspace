import { describe, expect, it } from 'vitest'
import {
  resolveAppShellResponsiveState,
  resolveWorkspaceResponsiveState,
} from '../responsiveLayoutPolicy'

describe('responsiveLayoutPolicy', () => {
  it('keeps the app shell docked only when wide desktop space is available', () => {
    expect(resolveAppShellResponsiveState({
      viewportWidth: 1440,
      viewportHeight: 900,
      userLeftPanelVisible: true,
    }).leftPanelPresentation).toBe('docked')

    expect(resolveAppShellResponsiveState({
      viewportWidth: 1024,
      viewportHeight: 768,
      userLeftPanelVisible: true,
    }).leftPanelPresentation).toBe('strip')
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
    expect(state.showPrimarySurfaceControls).toBe(false)
  })



  it('models the 1024 left-strip plus right-docked band explicitly', () => {
    const shell = resolveAppShellResponsiveState({
      viewportWidth: 1024,
      viewportHeight: 768,
      userLeftPanelVisible: true,
    })
    const workspace = resolveWorkspaceResponsiveState({
      containerWidth: 974,
      containerHeight: 768,
      rightPanelPreferenceVisible: true,
      preferredRightPanelWidth: 450,
    })

    expect(shell.leftPanelPresentation).toBe('strip')
    expect(shell.canOpenLeftDrawer).toBe(true)
    expect(workspace.rightPanelPresentation).toBe('docked')
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
      expect(state.showPrimarySurfaceControls).toBe(true)
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
      expect(state.showPrimarySurfaceControls).toBe(true)
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
    expect(state.showPrimarySurfaceControls).toBe(true)
  })
})
