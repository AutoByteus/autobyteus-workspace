import { computed, ref } from 'vue'
import {
  RIGHT_PANEL_DEFAULT_WIDTH_PX,
  RIGHT_PANEL_MIN_WIDTH_PX,
  RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX,
  USER_RESIZE_CENTER_MIN_WIDTH_PX,
  WORKSPACE_CENTER_MIN_WIDTH_PX,
  type RightPanelResizeIntent,
} from '~/utils/layout/responsiveLayoutPolicy'

// Global user preference for right panel visibility and width shared across workspace surfaces.
const isRightPanelVisible = ref(true)

export const DEFAULT_RIGHT_PANEL_WIDTH = RIGHT_PANEL_DEFAULT_WIDTH_PX
export const MIN_RIGHT_PANEL_WIDTH = RIGHT_PANEL_MIN_WIDTH_PX

const preferredRightPanelWidth = ref(DEFAULT_RIGHT_PANEL_WIDTH)
const rightPanelResizeIntent = ref<RightPanelResizeIntent>('automatic')
const workspacePanelContainerWidth = ref<number | null>(null)

const sanitizeContainerWidth = (width: number | null | undefined): number | null => {
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return null
  }

  return Math.max(0, width)
}

const maxRightPanelWidth = computed(() => {
  if (workspacePanelContainerWidth.value === null) {
    return Number.POSITIVE_INFINITY
  }

  const centerMinWidth = rightPanelResizeIntent.value === 'user-sized'
    ? USER_RESIZE_CENTER_MIN_WIDTH_PX
    : WORKSPACE_CENTER_MIN_WIDTH_PX

  return Math.max(
    0,
    workspacePanelContainerWidth.value - centerMinWidth - RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX,
  )
})

const clampPreferredWidthForCurrentSpace = (width: number): number => {
  const safeWidth = Number.isFinite(width) ? width : DEFAULT_RIGHT_PANEL_WIDTH
  const maxWidth = maxRightPanelWidth.value

  if (!Number.isFinite(maxWidth)) {
    return Math.max(safeWidth, MIN_RIGHT_PANEL_WIDTH)
  }

  if (maxWidth < MIN_RIGHT_PANEL_WIDTH) {
    return Math.max(0, Math.min(safeWidth, maxWidth))
  }

  return Math.min(Math.max(safeWidth, MIN_RIGHT_PANEL_WIDTH), maxWidth)
}

const rightPanelWidth = computed(() =>
  clampPreferredWidthForCurrentSpace(preferredRightPanelWidth.value),
)

export function useRightPanel() {
  /**
   * Toggles the user preference for right panel visibility.
   * Responsive policy may still expose a strip/drawer affordance without
   * overwriting this preference.
   */
  const toggleRightPanel = () => {
    isRightPanelVisible.value = !isRightPanelVisible.value
  }

  /** Opens the panel without toggling a currently visible panel closed. */
  const openRightPanel = () => {
    isRightPanelVisible.value = true
  }

  const setRightPanelVisible = (visible: boolean) => {
    isRightPanelVisible.value = visible
  }

  /**
   * Registers the center-plus-right flow width so the actual docked panel
   * width protects the practical center minimum and resize handle.
   */
  const setRightPanelWorkspaceWidth = (width: number | null | undefined) => {
    workspacePanelContainerWidth.value = sanitizeContainerWidth(width)
  }

  /**
   * Initializes the drag event to resize the right panel.
   * This function allows the right panel to be resized freely to the left.
   *
   * @param {MouseEvent} event - The mousedown event triggering the drag.
   */
  const initDragRightPanel = (event: MouseEvent) => {
    event.preventDefault()

    const startX = event.clientX
    const startWidth = rightPanelWidth.value
    rightPanelResizeIntent.value = 'user-sized'

    /**
     * Handles the mousemove event during dragging.
     *
     * @param {MouseEvent} e - The mousemove event.
     */
    const doDrag = (e: MouseEvent) => {
      try {
        // Calculate delta: dragging left (decreasing clientX) increases panel width
        const deltaX = startX - e.clientX
        preferredRightPanelWidth.value = clampPreferredWidthForCurrentSpace(startWidth + deltaX)
      } catch (error) {
        console.error('Error during right panel drag:', error)
      }
    }

    /**
     * Stops the dragging by removing event listeners.
     */
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    // Attach event listeners for dragging and stopping the drag
    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  return {
    isRightPanelVisible,
    preferredRightPanelWidth,
    rightPanelWidth,
    rightPanelResizeIntent,
    toggleRightPanel,
    openRightPanel,
    setRightPanelVisible,
    setRightPanelWorkspaceWidth,
    initDragRightPanel,
  }
}
