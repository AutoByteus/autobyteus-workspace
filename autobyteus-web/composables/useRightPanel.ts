import { computed, ref } from 'vue'
import {
  RIGHT_PANEL_DEFAULT_WIDTH_PX,
  RIGHT_PANEL_MIN_WIDTH_PX,
  RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX,
  WORKSPACE_CENTER_MIN_WIDTH_PX,
  clampRightPanelWidth,
  type PanelPresentation,
} from '~/utils/layout/responsiveLayoutPolicy'

// Global user preference for right panel visibility and width shared across workspace surfaces.
const isRightPanelVisible = ref(true)
const rightPanelPresentation = ref<PanelPresentation>('docked')

export const DEFAULT_RIGHT_PANEL_WIDTH = RIGHT_PANEL_DEFAULT_WIDTH_PX
export const MIN_RIGHT_PANEL_WIDTH = RIGHT_PANEL_MIN_WIDTH_PX
export const MIN_WORKSPACE_CENTER_WIDTH = WORKSPACE_CENTER_MIN_WIDTH_PX
export const RIGHT_PANEL_RESIZE_HANDLE_WIDTH = RIGHT_PANEL_RESIZE_HANDLE_WIDTH_PX

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
  if (workspacePanelContainerWidth.value === null) {
    return Math.max(Number.isFinite(width) ? width : DEFAULT_RIGHT_PANEL_WIDTH, MIN_RIGHT_PANEL_WIDTH)
  }

  return clampRightPanelWidth(width, workspacePanelContainerWidth.value)
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

const isRightPanelDocked = computed(
  () => isRightPanelVisible.value && rightPanelPresentation.value === 'docked',
)

const isRightPanelStripVisible = computed(
  () => rightPanelPresentation.value === 'strip' || !isRightPanelVisible.value,
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

  const setRightPanelVisible = (visible: boolean) => {
    isRightPanelVisible.value = visible
  }

  /**
   * Registers the current center/right workspace container width.
   * The right panel keeps a preferred width, but the actual exposed width is
   * clamped against this container so the center pane and splitter remain usable.
   */
  const setRightPanelWorkspaceWidth = (width: number | null | undefined) => {
    workspacePanelContainerWidth.value = sanitizeContainerWidth(width)
  }

  const setRightPanelResponsivePresentation = (presentation: PanelPresentation) => {
    rightPanelPresentation.value = presentation
  }

  /**
   * Initializes the drag event to resize the right panel.
   * This function allows the right panel to be resized freely to the left.
   *
   * @param {MouseEvent} event - The mousedown event triggering the drag.
   */
  const initDragRightPanel = (event: MouseEvent) => {
    if (!isRightPanelDocked.value) return

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
    preferredRightPanelWidth,
    rightPanelPresentation,
    rightPanelWidth,
    isRightPanelDocked,
    isRightPanelStripVisible,
    toggleRightPanel,
    setRightPanelVisible,
    setRightPanelWorkspaceWidth,
    setRightPanelResponsivePresentation,
    initDragRightPanel,
  }
}
