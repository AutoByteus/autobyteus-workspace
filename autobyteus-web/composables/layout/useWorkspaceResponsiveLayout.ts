import { computed, watch, type Ref } from 'vue'
import { useResponsiveElementRect } from '~/composables/layout/useResponsiveElementRect'
import { useRightPanel } from '~/composables/useRightPanel'
import { resolveWorkspaceResponsiveState } from '~/utils/layout/responsiveLayoutPolicy'

export function useWorkspaceResponsiveLayout(containerRef: Ref<HTMLElement | null>) {
  const { rect: containerRect, refreshRect } = useResponsiveElementRect(containerRef)
  const {
    isRightPanelVisible,
    preferredRightPanelWidth,
    setRightPanelWorkspaceWidth,
    setRightPanelResponsivePresentation,
  } = useRightPanel()

  const workspaceResponsiveState = computed(() => resolveWorkspaceResponsiveState({
    containerWidth: containerRect.value.width,
    containerHeight: containerRect.value.height,
    rightPanelPreferenceVisible: isRightPanelVisible.value,
    preferredRightPanelWidth: preferredRightPanelWidth.value,
  }))

  watch(
    workspaceResponsiveState,
    (state) => {
      setRightPanelWorkspaceWidth(state.containerWidth)
      setRightPanelResponsivePresentation(state.rightPanelPresentation)
    },
    { immediate: true },
  )

  return {
    containerRect,
    refreshRect,
    workspaceResponsiveState,
  }
}
