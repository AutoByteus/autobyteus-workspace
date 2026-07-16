import { ref } from 'vue';
import {
  LEFT_PANEL_DEFAULT_WIDTH_PX,
  LEFT_PANEL_MAX_WIDTH_PX,
  LEFT_PANEL_MIN_WIDTH_PX,
} from '~/utils/layout/responsiveLayoutPolicy';

const isLeftPanelVisible = ref(true);
const leftPanelWidth = ref(LEFT_PANEL_DEFAULT_WIDTH_PX);

export function useLeftPanel() {
  const toggleLeftPanel = (): void => {
    isLeftPanelVisible.value = !isLeftPanelVisible.value;
  };

  const setLeftPanelVisible = (visible: boolean): void => {
    isLeftPanelVisible.value = visible;
  };

  const initDragLeftPanel = (event: MouseEvent): void => {
    if (!isLeftPanelVisible.value) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = leftPanelWidth.value;

    const doDrag = (e: MouseEvent): void => {
      try {
        const deltaX = e.clientX - startX;
        const nextWidth = startWidth + deltaX;
        leftPanelWidth.value = Math.min(Math.max(nextWidth, LEFT_PANEL_MIN_WIDTH_PX), LEFT_PANEL_MAX_WIDTH_PX);
      } catch (error) {
        console.error('Error during left panel drag:', error);
      }
    };

    const stopDrag = (): void => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return {
    isLeftPanelVisible,
    leftPanelWidth,
    toggleLeftPanel,
    setLeftPanelVisible,
    initDragLeftPanel,
  };
}
