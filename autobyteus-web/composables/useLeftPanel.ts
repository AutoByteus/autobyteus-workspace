import { ref } from 'vue';

const isLeftPanelVisible = ref(true);
const leftPanelWidth = ref(320);

const MIN_LEFT_PANEL_WIDTH = 260;
const MAX_LEFT_PANEL_WIDTH = 520;

export function useLeftPanel() {
  const toggleLeftPanel = (): void => {
    isLeftPanelVisible.value = !isLeftPanelVisible.value;
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
        leftPanelWidth.value = Math.min(Math.max(nextWidth, MIN_LEFT_PANEL_WIDTH), MAX_LEFT_PANEL_WIDTH);
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
    initDragLeftPanel,
  };
}
