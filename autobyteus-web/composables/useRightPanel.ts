import { computed, ref } from 'vue'
import {
  RIGHT_PANEL_DEFAULT_WIDTH_PX,
  RIGHT_PANEL_MIN_WIDTH_PX,
} from '~/utils/layout/responsiveLayoutPolicy'

// Global user preference for right panel visibility and width shared across workspace surfaces.
const isRightPanelVisible = ref(true)

export const DEFAULT_RIGHT_PANEL_WIDTH = RIGHT_PANEL_DEFAULT_WIDTH_PX
export const MIN_RIGHT_PANEL_WIDTH = RIGHT_PANEL_MIN_WIDTH_PX

const preferredRightPanelWidth = ref(DEFAULT_RIGHT_PANEL_WIDTH)

const rightPanelWidth = computed(() =>
  Math.max(preferredRightPanelWidth.value, MIN_RIGHT_PANEL_WIDTH),
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
        preferredRightPanelWidth.value = Math.max(startWidth + deltaX, MIN_RIGHT_PANEL_WIDTH)
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
    toggleRightPanel,
    setRightPanelVisible,
    initDragRightPanel,
  }
}
