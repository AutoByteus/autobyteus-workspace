import type {
  PanelPreference,
  RightPanelPresentation,
  StripBehavior,
  StripActivation,
} from './responsiveLayoutPolicy'

export interface SurfaceCandidate {
  left: 'docked' | 'strip'
  right: RightPanelPresentation
  leftStripBehavior?: StripBehavior
  rightStripBehavior?: StripBehavior
}

export interface StripActivationInput {
  side: 'left' | 'right'
  preference: PanelPreference
  candidate: SurfaceCandidate
  isNarrow: boolean
  isShortHeight: boolean
  fits: (candidate: SurfaceCandidate) => boolean
}

export const resolveStripActivation = ({
  side,
  preference,
  candidate,
  isNarrow,
  isShortHeight,
  fits,
}: StripActivationInput): StripActivation | null => {
  const presentation = side === 'left' ? candidate.left : candidate.right
  if (presentation !== 'strip') {
    return null
  }

  const isUserOrigin = (preference === 'hidden-by-user')
  if (isNarrow || isShortHeight || !isUserOrigin) {
    return 'open-drawer'
  }

  const redockCandidate: SurfaceCandidate = side === 'left'
    ? { left: 'docked', right: candidate.right, rightStripBehavior: candidate.rightStripBehavior }
    : { left: candidate.left, leftStripBehavior: candidate.leftStripBehavior, right: 'docked' }

  return fits(redockCandidate) ? 'redock-panel' : 'open-drawer'
}
