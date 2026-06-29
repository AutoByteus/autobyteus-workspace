import { computed, ref } from 'vue'

// Global state for right panel visibility and width to allow sharing across components
const isRightPanelVisible = ref(true)
const DEFAULT_RIGHT_PANEL_WIDTH = 450
export const MIN_RIGHT_PANEL_WIDTH = 400
export const MIN_WORKSPACE_CENTER_WIDTH = 200
export const RIGHT_PANEL_RESIZE_HANDLE_WIDTH = 4

const preferredRightPanelWidth = ref(DEFAULT_RIGHT_PANEL_WIDTH)
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

  return Math.max(
    0,
    workspacePanelContainerWidth.value - MIN_WORKSPACE_CENTER_WIDTH - RIGHT_PANEL_RESIZE_HANDLE_WIDTH,
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

const rightPanelWidth = computed(() => {
  const maxWidth = maxRightPanelWidth.value

  if (!Number.isFinite(maxWidth)) {
    return Math.max(preferredRightPanelWidth.value, MIN_RIGHT_PANEL_WIDTH)
  }

  if (maxWidth < MIN_RIGHT_PANEL_WIDTH) {
    return Math.max(0, Math.min(preferredRightPanelWidth.value, maxWidth))
  }

  return Math.min(Math.max(preferredRightPanelWidth.value, MIN_RIGHT_PANEL_WIDTH), maxWidth)
})

export function useRightPanel() {
  /**
   * Toggles the visibility of the right panel.
   */
  const toggleRightPanel = () => {
    isRightPanelVisible.value = !isRightPanelVisible.value
  }

  /**
   * Registers the current center/right workspace container width.
   * The right panel keeps a preferred width, but the actual exposed width is
   * clamped against this container so the center pane and splitter remain visible.
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
    rightPanelWidth,
    toggleRightPanel,
    setRightPanelWorkspaceWidth,
    initDragRightPanel,
  }
}
