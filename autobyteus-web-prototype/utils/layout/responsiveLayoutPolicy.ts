import {
  resolveStripActivation,
  type SurfaceCandidate,
} from './responsiveStripActivation'

export type PanelPreference = 'visible' | 'hidden-by-user'
// Effective shell presentations expose only docked surfaces or their visible
// strip affordance. Drawers are transient interaction surfaces owned by the
// layout, never an effective resolver output.
export type ResponsivePresentation = 'docked' | 'strip'
export type RightPanelPresentation = 'docked' | 'strip'
export type StripBehavior = 'consuming'
export type StripActivation = 'redock-panel' | 'open-drawer'
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

export interface ResponsiveLeftPanelState extends Omit<ResponsiveSurfaceState, 'presentation'> {
  presentation: 'docked' | 'strip'
  stripBehavior: StripBehavior | null
  stripActivation: StripActivation | null
}

export interface ResponsiveRightPanelState extends Omit<ResponsiveSurfaceState, 'presentation'> {
  presentation: RightPanelPresentation
  stripBehavior: StripBehavior | null
  stripActivation: StripActivation | null
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
  showGenericSurfaceControls: false
  leftPanel: ResponsiveLeftPanelState
  rightPanel: ResponsiveRightPanelState
  showLeftStrip: boolean
  showRightStrip: boolean
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

const leftConsumedWidth = (
  presentation: 'docked' | 'strip',
  preferredWidth: number,
  _stripBehavior: StripBehavior | undefined,
): number => {
  if (presentation === 'docked') {
    return preferredWidth
  }

  return LEFT_PANEL_STRIP_WIDTH_PX
}

const rightConsumedWidth = (
  presentation: RightPanelPresentation,
  preferredWidth: number,
  _stripBehavior: StripBehavior | undefined,
): number => {
  if (presentation === 'docked') {
    return preferredWidth
  }

  return RIGHT_PANEL_STRIP_WIDTH_PX
}

const requiredWidth = (
  candidate: SurfaceCandidate,
  leftPreferredWidth: number,
  rightPreferredWidth: number,
  centerMinWidth: number,
): number => (
  leftConsumedWidth(candidate.left, leftPreferredWidth, candidate.leftStripBehavior) +
  rightConsumedWidth(candidate.right, rightPreferredWidth, candidate.rightStripBehavior) +
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

const makeLeftPanelState = (
  preference: PanelPreference,
  presentation: 'docked' | 'strip',
  preferredWidth: number,
  stripBehavior: StripBehavior | undefined,
  stripActivation: StripActivation | null,
): ResponsiveLeftPanelState => ({
  preference,
  presentation,
  presentationSource: sourceFor(preference, presentation),
  consumedWidth: leftConsumedWidth(presentation, preferredWidth, stripBehavior),
  preferredWidth,
  stripBehavior: presentation === 'strip' ? stripBehavior ?? 'consuming' : null,
  stripActivation,
})

const makeRightPanelState = (
  preference: PanelPreference,
  candidate: SurfaceCandidate,
  preferredWidth: number,
  resizeIntent: RightPanelResizeIntent,
  centerProtectionMode: CenterProtectionMode,
  effectiveCenterMinWidth: number,
  stripActivation: StripActivation | null,
): ResponsiveRightPanelState => ({
  preference,
  presentation: candidate.right,
  presentationSource: sourceFor(preference, candidate.right),
  consumedWidth: rightConsumedWidth(
    candidate.right,
    preferredWidth,
    candidate.rightStripBehavior,
  ),
  preferredWidth,
  stripBehavior: candidate.right === 'strip' ? candidate.rightStripBehavior ?? 'consuming' : null,
  stripActivation,
  resizeIntent,
  centerProtectionMode,
  effectiveCenterMinWidth,
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
  const mode = resolveMode(candidate, leftPreference, rightPreference, isNarrow, isShortHeight)
  const fits = (redockCandidate: SurfaceCandidate): boolean => candidateFits(
    viewportWidth,
    redockCandidate,
    leftPreferredWidth,
    rightPreferredWidth,
    effectiveCenterMinWidth,
  )
  const leftStripActivation = resolveStripActivation({
    side: 'left', preference: leftPreference, candidate, isNarrow, isShortHeight, fits,
  })
  const rightStripActivation = resolveStripActivation({
    side: 'right', preference: rightPreference, candidate, isNarrow, isShortHeight, fits,
  })

  return {
    viewportWidth,
    viewportHeight,
    mode,
    isNarrow,
    isShortHeight,
    showGenericSurfaceControls: false,
    leftPanel: makeLeftPanelState(
      leftPreference,
      candidate.left,
      leftPreferredWidth,
      candidate.leftStripBehavior,
      leftStripActivation,
    ),
    rightPanel: makeRightPanelState(
      rightPreference,
      candidate,
      rightPreferredWidth,
      resizeIntent,
      centerProtectionMode,
      effectiveCenterMinWidth,
      rightStripActivation,
    ),
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

const rightStripCandidates = (left: 'docked' | 'strip', leftStripBehavior?: StripBehavior): SurfaceCandidate[] => [
  { left, leftStripBehavior, right: 'strip', rightStripBehavior: 'consuming' },
]

const leftStripCandidates = (
  right: RightPanelPresentation,
  rightStripBehavior?: StripBehavior,
): SurfaceCandidate[] => [
  { left: 'strip', leftStripBehavior: 'consuming', right, rightStripBehavior },
]

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
  if (isNarrow) {
    const narrowCenterMinWidth = viewportWidth < LEFT_PANEL_STRIP_WIDTH_PX + RIGHT_PANEL_STRIP_WIDTH_PX + USER_RESIZE_CENTER_MIN_WIDTH_PX
      ? 0
      : USER_RESIZE_CENTER_MIN_WIDTH_PX

    return createState(
      viewportWidth,
      viewportHeight,
      leftPreference,
      rightPreference,
      leftPreferredWidth,
      rightPreferredWidth,
      resizeIntent,
      'responsive-yield',
      narrowCenterMinWidth,
      {
        left: 'strip',
        leftStripBehavior: 'consuming',
        right: 'strip',
        rightStripBehavior: 'consuming',
      },
      true,
      false,
    )
  }

  const leftIsUserHidden = leftPreference === 'hidden-by-user'
  const leftDocked = 'docked' as const

  // Manual left collapse remains a user-owned strip. A user-sized right dock
  // gets the compact center floor before the automatic 480px fallback.
  if (leftIsUserHidden) {
    const userSizedDockedRightCandidate = rightPreference === 'visible' && !isShortHeight && resizeIntent === 'user-sized'
      ? findCandidate(
          viewportWidth,
          leftPreferredWidth,
          rightPreferredWidth,
          USER_RESIZE_CENTER_MIN_WIDTH_PX,
          leftStripCandidates('docked'),
        )
      : null
    const manualDockedRightCandidate = rightPreference === 'visible' && !isShortHeight
      ? findCandidate(
          viewportWidth,
          leftPreferredWidth,
          rightPreferredWidth,
          WORKSPACE_CENTER_MIN_WIDTH_PX,
          leftStripCandidates('docked'),
        )
      : null
    const candidate = userSizedDockedRightCandidate ?? manualDockedRightCandidate ?? findCandidate(
      viewportWidth,
      leftPreferredWidth,
      rightPreferredWidth,
      USER_RESIZE_CENTER_MIN_WIDTH_PX,
      leftStripCandidates('strip', 'consuming'),
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
        userSizedDockedRightCandidate
          ? 'user-override'
          : manualDockedRightCandidate
            ? 'automatic'
            : 'responsive-yield',
        userSizedDockedRightCandidate
          ? USER_RESIZE_CENTER_MIN_WIDTH_PX
          : manualDockedRightCandidate
          ? WORKSPACE_CENTER_MIN_WIDTH_PX
          : USER_RESIZE_CENTER_MIN_WIDTH_PX,
        candidate,
        false,
        isShortHeight,
      )
    }
  }

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

  const leftDockedCandidate = !isShortHeight && rightPreference === 'visible'
    ? findCandidate(
        viewportWidth,
        leftPreferredWidth,
        rightPreferredWidth,
        WORKSPACE_CENTER_MIN_WIDTH_PX,
        [{ left: leftDocked, right: 'docked' }],
      )
    : null

  if (leftDockedCandidate) {
    return createState(
      viewportWidth,
      viewportHeight,
      leftPreference,
      rightPreference,
      leftPreferredWidth,
      rightPreferredWidth,
      resizeIntent,
      'automatic',
      WORKSPACE_CENTER_MIN_WIDTH_PX,
      leftDockedCandidate,
      false,
      isShortHeight,
    )
  }

  const rightStripCandidate = findCandidate(
    viewportWidth,
    leftPreferredWidth,
    rightPreferredWidth,
    USER_RESIZE_CENTER_MIN_WIDTH_PX,
    rightStripCandidates(leftDocked),
  )

  if (rightStripCandidate) {
    return createState(
      viewportWidth,
      viewportHeight,
      leftPreference,
      rightPreference,
      leftPreferredWidth,
      rightPreferredWidth,
      resizeIntent,
      'responsive-yield',
      USER_RESIZE_CENTER_MIN_WIDTH_PX,
      rightStripCandidate,
      false,
      isShortHeight,
    )
  }

  const leftAdaptiveCandidates: SurfaceCandidate[] = leftStripCandidates('strip', 'consuming')
  const adaptiveCenterMinWidth = viewportWidth < LEFT_PANEL_STRIP_WIDTH_PX + RIGHT_PANEL_STRIP_WIDTH_PX + USER_RESIZE_CENTER_MIN_WIDTH_PX
    ? 0
    : USER_RESIZE_CENTER_MIN_WIDTH_PX
  const leftAdaptiveCandidate = findCandidate(
    viewportWidth,
    leftPreferredWidth,
    rightPreferredWidth,
    adaptiveCenterMinWidth,
    leftAdaptiveCandidates,
  ) ?? {
    left: 'strip',
    leftStripBehavior: 'consuming' as const,
    right: 'strip',
    rightStripBehavior: 'consuming' as const,
  }

  return createState(
    viewportWidth,
    viewportHeight,
    leftPreference,
    rightPreference,
    leftPreferredWidth,
    rightPreferredWidth,
    resizeIntent,
    'responsive-yield',
    adaptiveCenterMinWidth,
    leftAdaptiveCandidate,
    false,
    isShortHeight,
  )
}
