export type PanelPreference = 'visible' | 'hidden-by-user'
export type ResponsivePresentation = 'docked' | 'strip' | 'drawer'
export type PresentationSource = 'user' | 'responsive'
export type RightPanelResizeIntent = 'automatic' | 'user-sized'
export type CenterProtectionMode = 'automatic' | 'user-override' | 'responsive-yield'
export type WorkspaceResponsiveMode = 'wide' | 'large-constrained' | 'constrained' | 'narrow' | 'short-height'

export const LEFT_PANEL_DEFAULT_WIDTH_PX = 320
export const LEFT_PANEL_MIN_WIDTH_PX = 260
export const LEFT_PANEL_MAX_WIDTH_PX = 520
export const RIGHT_PANEL_DEFAULT_WIDTH_PX = 450
export const RIGHT_PANEL_MIN_WIDTH_PX = 400
export const LEFT_PANEL_STRIP_WIDTH_PX = 50
export const RIGHT_PANEL_STRIP_WIDTH_PX = 50
export const LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX = 6
export const RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX = 4
export const WORKSPACE_CENTER_MIN_WIDTH_PX = 480
export const USER_RESIZE_CENTER_MIN_WIDTH_PX = 200
export const WORKSPACE_MD_BREAKPOINT_PX = 768
export const WORKSPACE_SHORT_HEIGHT_MAX_PX = 480

export interface ResponsiveWorkspaceShellInput {
  viewportWidth: number | null | undefined
  viewportHeight: number | null | undefined
  leftPanelPreference: PanelPreference
  leftPanelPreferredWidth: number | null | undefined
  rightPanelPreference: PanelPreference
  rightPanelPreferredWidth: number | null | undefined
  rightPanelResizeIntent: RightPanelResizeIntent
}

export interface ResponsiveSurfaceState {
  preference: PanelPreference
  presentation: ResponsivePresentation
  presentationSource: PresentationSource
  consumedWidth: number
  preferredWidth: number
}

export interface ResponsiveRightPanelState extends ResponsiveSurfaceState {
  resizeIntent: RightPanelResizeIntent
  centerProtectionMode: CenterProtectionMode
  effectiveCenterMinWidth: number
}

export interface ResponsiveWorkspaceShellState {
  viewportWidth: number
  viewportHeight: number
  mode: WorkspaceResponsiveMode
  isNarrow: boolean
  isShortHeight: boolean
  showHeader: boolean
  showGenericSurfaceControls: false
  showRightToolsTrigger: boolean
  leftPanel: ResponsiveSurfaceState
  rightPanel: ResponsiveRightPanelState
  canOpenLeftDrawer: boolean
  canOpenRightDrawer: boolean
  showLeftStrip: boolean
  showRightStrip: boolean
}

interface SurfaceCandidate {
  left: ResponsivePresentation
  right: ResponsivePresentation
}

const sanitizeDimension = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

const clampWidth = (
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
): number => {
  const safeValue = sanitizeDimension(value)
  return Math.min(Math.max(safeValue || fallback, min), max)
}

const sanitizePanelPreference = (value: PanelPreference): PanelPreference =>
  value === 'hidden-by-user' ? 'hidden-by-user' : 'visible'

const sanitizeResizeIntent = (value: RightPanelResizeIntent): RightPanelResizeIntent =>
  value === 'user-sized' ? 'user-sized' : 'automatic'

const sanitizePresentationWidth = (
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
): number => clampWidth(value, min, max, fallback)

const leftConsumedWidth = (presentation: ResponsivePresentation, preferredWidth: number): number => {
  if (presentation === 'docked') {
    return preferredWidth
  }

  return presentation === 'strip' ? LEFT_PANEL_STRIP_WIDTH_PX : 0
}

const rightConsumedWidth = (presentation: ResponsivePresentation, preferredWidth: number): number => {
  if (presentation === 'docked') {
    return preferredWidth
  }

  return presentation === 'strip' ? RIGHT_PANEL_STRIP_WIDTH_PX : 0
}

const requiredWidth = (
  candidate: SurfaceCandidate,
  leftPreferredWidth: number,
  rightPreferredWidth: number,
  centerMinWidth: number,
): number => (
  leftConsumedWidth(candidate.left, leftPreferredWidth) +
  rightConsumedWidth(candidate.right, rightPreferredWidth) +
  centerMinWidth +
  (candidate.left === 'docked' ? LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX : 0) +
  (candidate.right === 'docked' ? RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX : 0)
)

const candidateFits = (
  viewportWidth: number,
  candidate: SurfaceCandidate,
  leftPreferredWidth: number,
  rightPreferredWidth: number,
  centerMinWidth: number,
): boolean => viewportWidth >= requiredWidth(
  candidate,
  leftPreferredWidth,
  rightPreferredWidth,
  centerMinWidth,
)

const sourceFor = (
  preference: PanelPreference,
  presentation: ResponsivePresentation,
): PresentationSource => {
  if (
    (preference === 'hidden-by-user' && presentation === 'strip') ||
    (preference === 'visible' && presentation === 'docked')
  ) {
    return 'user'
  }

  return 'responsive'
}

const makeSurfaceState = (
  preference: PanelPreference,
  presentation: ResponsivePresentation,
  preferredWidth: number,
  side: 'left' | 'right',
): ResponsiveSurfaceState => ({
  preference,
  presentation,
  presentationSource: sourceFor(preference, presentation),
  consumedWidth: side === 'left'
    ? leftConsumedWidth(presentation, preferredWidth)
    : rightConsumedWidth(presentation, preferredWidth),
  preferredWidth,
})

const resolveMode = (
  candidate: SurfaceCandidate,
  leftPreference: PanelPreference,
  rightPreference: PanelPreference,
  isNarrow: boolean,
  isShortHeight: boolean,
): WorkspaceResponsiveMode => {
  if (isNarrow) {
    return 'narrow'
  }

  if (isShortHeight) {
    return 'short-height'
  }

  if (candidate.left === 'docked' && candidate.right === 'docked') {
    return 'wide'
  }

  if (
    sourceFor(leftPreference, candidate.left) === 'user' &&
    sourceFor(rightPreference, candidate.right) === 'user'
  ) {
    return 'wide'
  }

  if (candidate.left === 'docked') {
    return 'large-constrained'
  }

  return 'constrained'
}

const createState = (
  viewportWidth: number,
  viewportHeight: number,
  leftPreference: PanelPreference,
  rightPreference: PanelPreference,
  leftPreferredWidth: number,
  rightPreferredWidth: number,
  resizeIntent: RightPanelResizeIntent,
  centerProtectionMode: CenterProtectionMode,
  effectiveCenterMinWidth: number,
  candidate: SurfaceCandidate,
  isNarrow: boolean,
  isShortHeight: boolean,
): ResponsiveWorkspaceShellState => {
  const leftPanel = makeSurfaceState(
    leftPreference,
    candidate.left,
    leftPreferredWidth,
    'left',
  )
  const rightPanel = {
    ...makeSurfaceState(
      rightPreference,
      candidate.right,
      rightPreferredWidth,
      'right',
    ),
    resizeIntent,
    centerProtectionMode,
    effectiveCenterMinWidth,
  }

  return {
    viewportWidth,
    viewportHeight,
    mode: resolveMode(candidate, leftPreference, rightPreference, isNarrow, isShortHeight),
    isNarrow,
    isShortHeight,
    showHeader: isNarrow,
    showGenericSurfaceControls: false,
    showRightToolsTrigger: candidate.right === 'drawer',
    leftPanel,
    rightPanel,
    canOpenLeftDrawer: candidate.left === 'drawer' || (
      candidate.left === 'strip' && leftPanel.presentationSource === 'responsive'
    ),
    canOpenRightDrawer: candidate.right !== 'docked',
    showLeftStrip: candidate.left === 'strip',
    showRightStrip: candidate.right === 'strip',
  }
}

const findCandidate = (
  viewportWidth: number,
  leftPreferredWidth: number,
  rightPreferredWidth: number,
  centerMinWidth: number,
  candidates: SurfaceCandidate[],
): SurfaceCandidate | null => candidates.find((candidate) => candidateFits(
  viewportWidth,
  candidate,
  leftPreferredWidth,
  rightPreferredWidth,
  centerMinWidth,
)) ?? null

export const resolveResponsiveWorkspaceShellState = (
  input: ResponsiveWorkspaceShellInput,
): ResponsiveWorkspaceShellState => {
  const viewportWidth = sanitizeDimension(input.viewportWidth)
  const viewportHeight = sanitizeDimension(input.viewportHeight)
  const leftPreference = sanitizePanelPreference(input.leftPanelPreference)
  const rightPreference = sanitizePanelPreference(input.rightPanelPreference)
  const resizeIntent = sanitizeResizeIntent(input.rightPanelResizeIntent)
  const leftPreferredWidth = sanitizePresentationWidth(
    input.leftPanelPreferredWidth,
    LEFT_PANEL_MIN_WIDTH_PX,
    LEFT_PANEL_MAX_WIDTH_PX,
    LEFT_PANEL_DEFAULT_WIDTH_PX,
  )
  const rightPreferredWidth = sanitizePresentationWidth(
    input.rightPanelPreferredWidth,
    RIGHT_PANEL_MIN_WIDTH_PX,
    Number.POSITIVE_INFINITY,
    RIGHT_PANEL_DEFAULT_WIDTH_PX,
  )
  const isNarrow = viewportWidth > 0 && viewportWidth < WORKSPACE_MD_BREAKPOINT_PX
  const isShortHeight = !isNarrow && viewportHeight > 0 && viewportHeight <= WORKSPACE_SHORT_HEIGHT_MAX_PX
  const responsiveMode: CenterProtectionMode = resizeIntent === 'user-sized'
    ? 'responsive-yield'
    : 'automatic'

  if (isNarrow) {
    return createState(
      viewportWidth,
      viewportHeight,
      leftPreference,
      rightPreference,
      leftPreferredWidth,
      rightPreferredWidth,
      resizeIntent,
      responsiveMode,
      WORKSPACE_CENTER_MIN_WIDTH_PX,
      { left: 'drawer', right: 'drawer' },
      true,
      false,
    )
  }

  const leftIsUserHidden = leftPreference === 'hidden-by-user'
  const leftDocked: ResponsivePresentation = 'docked'
  const leftStrip: ResponsivePresentation = 'strip'

  // Manual left collapse is resolved before automatic capacity phases. It
  // remains a user-owned strip and never enables the generic surface row.
  if (leftIsUserHidden) {
    const manualCandidates: SurfaceCandidate[] = rightPreference === 'hidden-by-user'
      ? [
          { left: leftStrip, right: 'strip' },
          { left: leftStrip, right: 'drawer' },
          { left: leftStrip, right: 'docked' },
        ]
      : isShortHeight
        ? [
            { left: leftStrip, right: 'strip' },
            { left: leftStrip, right: 'drawer' },
            { left: leftStrip, right: 'docked' },
          ]
        : [
            { left: leftStrip, right: 'docked' },
            { left: leftStrip, right: 'strip' },
            { left: leftStrip, right: 'drawer' },
          ]
    const candidate = findCandidate(
      viewportWidth,
      leftPreferredWidth,
      rightPreferredWidth,
      WORKSPACE_CENTER_MIN_WIDTH_PX,
      manualCandidates,
    )

    if (candidate) {
      return createState(
        viewportWidth,
        viewportHeight,
        leftPreference,
        rightPreference,
        leftPreferredWidth,
        rightPreferredWidth,
        resizeIntent,
        responsiveMode,
        WORKSPACE_CENTER_MIN_WIDTH_PX,
        candidate,
        false,
        isShortHeight,
      )
    }
  }

  // A deliberate user-sized dock is the only state allowed to use the
  // compact 200px center floor. Responsive presentation never erases the
  // retained intent, but it does return to the 480px protection floor.
  if (!isShortHeight && resizeIntent === 'user-sized' && rightPreference === 'visible') {
    const userSizedCandidate = findCandidate(
      viewportWidth,
      leftPreferredWidth,
      rightPreferredWidth,
      USER_RESIZE_CENTER_MIN_WIDTH_PX,
      [{ left: leftDocked, right: 'docked' }],
    )

    if (userSizedCandidate) {
      return createState(
        viewportWidth,
        viewportHeight,
        leftPreference,
        rightPreference,
        leftPreferredWidth,
        rightPreferredWidth,
        resizeIntent,
        'user-override',
        USER_RESIZE_CENTER_MIN_WIDTH_PX,
        userSizedCandidate,
        false,
        false,
      )
    }
  }

  // Responsive phases protect the practical center floor and yield the
  // right tools before changing the left selection surface. On desktop the
  // visible strip is preferred to a top-level drawer trigger.
  const rightFirstCandidates: SurfaceCandidate[] = rightPreference === 'hidden-by-user'
    ? [{ left: leftDocked, right: 'strip' }]
    : isShortHeight
      ? [
          { left: leftDocked, right: 'strip' },
          { left: leftDocked, right: 'drawer' },
        ]
      : [
          { left: leftDocked, right: 'docked' },
          { left: leftDocked, right: 'strip' },
          { left: leftDocked, right: 'drawer' },
        ]
  const leftDockedCandidate = findCandidate(
    viewportWidth,
    leftPreferredWidth,
    rightPreferredWidth,
    WORKSPACE_CENTER_MIN_WIDTH_PX,
    rightFirstCandidates,
  )

  if (leftDockedCandidate) {
    return createState(
      viewportWidth,
      viewportHeight,
      leftPreference,
      rightPreference,
      leftPreferredWidth,
      rightPreferredWidth,
      resizeIntent,
      responsiveMode,
      WORKSPACE_CENTER_MIN_WIDTH_PX,
      leftDockedCandidate,
      false,
      isShortHeight,
    )
  }

  // Only after every left-docked candidate fails may responsive adaptation
  // remove the full left selection panel from horizontal flow.
  const leftAdaptiveCandidates: SurfaceCandidate[] = rightPreference === 'hidden-by-user'
    ? [
        { left: leftStrip, right: 'strip' },
        { left: 'drawer', right: 'strip' },
        { left: 'drawer', right: 'drawer' },
      ]
    : [
        { left: leftStrip, right: 'docked' },
        { left: leftStrip, right: 'strip' },
        { left: leftStrip, right: 'drawer' },
        { left: 'drawer', right: 'docked' },
        { left: 'drawer', right: 'strip' },
        { left: 'drawer', right: 'drawer' },
      ]
  const leftAdaptiveCandidate = findCandidate(
    viewportWidth,
    leftPreferredWidth,
    rightPreferredWidth,
    WORKSPACE_CENTER_MIN_WIDTH_PX,
    leftAdaptiveCandidates,
  ) ?? { left: 'drawer', right: 'drawer' }

  return createState(
    viewportWidth,
    viewportHeight,
    leftPreference,
    rightPreference,
    leftPreferredWidth,
    rightPreferredWidth,
    resizeIntent,
    responsiveMode,
    WORKSPACE_CENTER_MIN_WIDTH_PX,
    leftAdaptiveCandidate,
    false,
    isShortHeight,
  )
}
