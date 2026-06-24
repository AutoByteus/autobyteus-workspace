export type PanelPresentation = 'docked' | 'strip' | 'drawer' | 'hidden-by-user'
export type WorkspaceResponsiveMode = 'wide' | 'constrained' | 'narrow' | 'short-height'

export const WORKSPACE_MD_BREAKPOINT_PX = 768
export const APP_SHELL_DOCKED_MIN_WIDTH_PX = 1280
export const WORKSPACE_WIDE_DOCKED_MIN_WIDTH_PX = 1100
export const WORKSPACE_SHORT_HEIGHT_MAX_PX = 480
export const LEFT_PANEL_DEFAULT_WIDTH_PX = 320
export const LEFT_PANEL_STRIP_WIDTH_PX = 50
export const RIGHT_PANEL_DEFAULT_WIDTH_PX = 450
export const RIGHT_PANEL_MIN_WIDTH_PX = 400
export const RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX = 4
export const WORKSPACE_CENTER_MIN_WIDTH_PX = 480

export interface AppShellResponsiveInput {
  viewportWidth: number | null | undefined
  viewportHeight: number | null | undefined
  userLeftPanelVisible: boolean
  userLeftPanelWidth?: number | null
}

export interface AppShellResponsiveState {
  viewportWidth: number
  viewportHeight: number
  leftPanelPresentation: PanelPresentation
  leftPanelWidth: number
  showHeader: boolean
  showLeftStrip: boolean
  canOpenLeftDrawer: boolean
  isShortHeight: boolean
}

export interface WorkspaceResponsiveInput {
  containerWidth: number | null | undefined
  containerHeight: number | null | undefined
  rightPanelPreferenceVisible: boolean
  preferredRightPanelWidth?: number | null
}

export interface WorkspaceResponsiveState {
  containerWidth: number
  containerHeight: number
  mode: WorkspaceResponsiveMode
  rightPanelPresentation: PanelPresentation
  rightPanelWidth: number
  showRightStrip: boolean
  showPrimarySurfaceControls: boolean
  centerMinWidth: number
  isShortHeight: boolean
}

const sanitizeDimension = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

const clampWidth = (value: number | null | undefined, min: number, max: number): number => {
  const safeValue = sanitizeDimension(value)
  return Math.min(Math.max(safeValue || min, min), max)
}

const sanitizePreferredWidth = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, value)
}

export const clampRightPanelWidth = (
  preferredWidth: number | null | undefined,
  containerWidth: number | null | undefined,
): number => {
  const width = sanitizeDimension(containerWidth)
  const preferred = sanitizePreferredWidth(preferredWidth, RIGHT_PANEL_DEFAULT_WIDTH_PX)
  const maxWidth = Math.max(
    RIGHT_PANEL_MIN_WIDTH_PX,
    width - WORKSPACE_CENTER_MIN_WIDTH_PX - RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX,
  )

  if (width <= 0) {
    return Math.max(preferred, RIGHT_PANEL_MIN_WIDTH_PX)
  }

  return clampWidth(preferred, RIGHT_PANEL_MIN_WIDTH_PX, Math.max(RIGHT_PANEL_MIN_WIDTH_PX, maxWidth))
}

export const resolveAppShellResponsiveState = (
  input: AppShellResponsiveInput,
): AppShellResponsiveState => {
  const viewportWidth = sanitizeDimension(input.viewportWidth)
  const viewportHeight = sanitizeDimension(input.viewportHeight)
  const leftPanelWidth = clampWidth(input.userLeftPanelWidth, 260, 520)
  const isNarrow = viewportWidth > 0 && viewportWidth < WORKSPACE_MD_BREAKPOINT_PX
  const isShortHeight = viewportHeight > 0 && viewportHeight <= WORKSPACE_SHORT_HEIGHT_MAX_PX

  if (isNarrow) {
    return {
      viewportWidth,
      viewportHeight,
      leftPanelPresentation: 'drawer',
      leftPanelWidth,
      showHeader: true,
      showLeftStrip: false,
      canOpenLeftDrawer: true,
      isShortHeight,
    }
  }

  if (!input.userLeftPanelVisible || isShortHeight || (viewportWidth > 0 && viewportWidth < APP_SHELL_DOCKED_MIN_WIDTH_PX)) {
    return {
      viewportWidth,
      viewportHeight,
      leftPanelPresentation: 'strip',
      leftPanelWidth,
      showHeader: false,
      showLeftStrip: true,
      canOpenLeftDrawer: true,
      isShortHeight,
    }
  }

  return {
    viewportWidth,
    viewportHeight,
    leftPanelPresentation: 'docked',
    leftPanelWidth,
    showHeader: false,
    showLeftStrip: false,
    canOpenLeftDrawer: false,
    isShortHeight,
  }
}

export const resolveWorkspaceResponsiveState = (
  input: WorkspaceResponsiveInput,
): WorkspaceResponsiveState => {
  const containerWidth = sanitizeDimension(input.containerWidth)
  const containerHeight = sanitizeDimension(input.containerHeight)
  const isNarrow = containerWidth > 0 && containerWidth < WORKSPACE_MD_BREAKPOINT_PX
  const isShortHeight = containerHeight > 0 && containerHeight <= WORKSPACE_SHORT_HEIGHT_MAX_PX
  const rightPanelWidth = clampRightPanelWidth(input.preferredRightPanelWidth, containerWidth)
  const canDockRightPanel =
    input.rightPanelPreferenceVisible &&
    !isNarrow &&
    !isShortHeight &&
    containerWidth >= WORKSPACE_CENTER_MIN_WIDTH_PX + rightPanelWidth + RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX

  if (canDockRightPanel) {
    return {
      containerWidth,
      containerHeight,
      mode: containerWidth >= WORKSPACE_WIDE_DOCKED_MIN_WIDTH_PX ? 'wide' : 'constrained',
      rightPanelPresentation: 'docked',
      rightPanelWidth,
      showRightStrip: false,
      showPrimarySurfaceControls: false,
      centerMinWidth: WORKSPACE_CENTER_MIN_WIDTH_PX,
      isShortHeight,
    }
  }

  if (!input.rightPanelPreferenceVisible) {
    return {
      containerWidth,
      containerHeight,
      mode: isNarrow ? 'narrow' : isShortHeight ? 'short-height' : 'constrained',
      rightPanelPresentation: 'strip',
      rightPanelWidth,
      showRightStrip: !isNarrow,
      showPrimarySurfaceControls: true,
      centerMinWidth: WORKSPACE_CENTER_MIN_WIDTH_PX,
      isShortHeight,
    }
  }

  const useStrip = !isNarrow && !isShortHeight

  return {
    containerWidth,
    containerHeight,
    mode: isNarrow ? 'narrow' : isShortHeight ? 'short-height' : 'constrained',
    rightPanelPresentation: useStrip ? 'strip' : 'drawer',
    rightPanelWidth,
    showRightStrip: useStrip,
    showPrimarySurfaceControls: true,
    centerMinWidth: WORKSPACE_CENTER_MIN_WIDTH_PX,
    isShortHeight,
  }
}
