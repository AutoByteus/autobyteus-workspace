import {
  computed,
  inject,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue'
import { useLeftPanel } from '~/composables/useLeftPanel'
import { useRightPanel } from '~/composables/useRightPanel'
import { useResponsiveElementRect } from '~/composables/layout/useResponsiveElementRect'
import {
  resolveResponsiveWorkspaceShellState,
  type ResponsiveWorkspaceShellState,
} from '~/utils/layout/responsiveLayoutPolicy'

export type ResponsiveWorkspaceShellStateRef = Readonly<Ref<ResponsiveWorkspaceShellState>>

export const RESPONSIVE_WORKSPACE_SHELL_KEY: InjectionKey<ResponsiveWorkspaceShellStateRef> =
  Symbol('responsiveWorkspaceShell')

export function useResponsiveWorkspaceShell(): {
  responsiveWorkspaceShellState: ComputedRef<ResponsiveWorkspaceShellState>
} {
  const { rect: viewportRect } = useResponsiveElementRect()
  const { isLeftPanelVisible, leftPanelWidth } = useLeftPanel()
  const { isRightPanelVisible, rightPanelWidth, rightPanelResizeIntent } = useRightPanel()

  const responsiveWorkspaceShellState = computed(() => resolveResponsiveWorkspaceShellState({
    viewportWidth: viewportRect.value.width,
    viewportHeight: viewportRect.value.height,
    leftPanelPreference: isLeftPanelVisible.value ? 'visible' : 'hidden-by-user',
    leftPanelPreferredWidth: leftPanelWidth.value,
    rightPanelPreference: isRightPanelVisible.value ? 'visible' : 'hidden-by-user',
    rightPanelPreferredWidth: rightPanelWidth.value,
    rightPanelResizeIntent: rightPanelResizeIntent.value,
  }))

  return {
    responsiveWorkspaceShellState,
  }
}

export function useResponsiveWorkspaceShellState(): ResponsiveWorkspaceShellStateRef {
  const responsiveWorkspaceShellState = inject(RESPONSIVE_WORKSPACE_SHELL_KEY)

  if (!responsiveWorkspaceShellState) {
    throw new Error('useResponsiveWorkspaceShellState must be used below the default layout provider')
  }

  return responsiveWorkspaceShellState
}
