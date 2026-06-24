import { computed } from 'vue'
import { useLeftPanel } from '~/composables/useLeftPanel'
import { useResponsiveElementRect } from '~/composables/layout/useResponsiveElementRect'
import { resolveAppShellResponsiveState } from '~/utils/layout/responsiveLayoutPolicy'

export function useAppShellResponsiveLayout() {
  const { rect: viewportRect } = useResponsiveElementRect()
  const { isLeftPanelVisible, leftPanelWidth } = useLeftPanel()

  const shellResponsiveState = computed(() => resolveAppShellResponsiveState({
    viewportWidth: viewportRect.value.width,
    viewportHeight: viewportRect.value.height,
    userLeftPanelVisible: isLeftPanelVisible.value,
    userLeftPanelWidth: leftPanelWidth.value,
  }))

  return {
    viewportRect,
    shellResponsiveState,
  }
}
