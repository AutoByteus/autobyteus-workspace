import { ref, onUnmounted } from 'vue';

interface UseVerticalResizeOptions {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useVerticalResize(options: UseVerticalResizeOptions = {}) {
  const { initialHeight = 300, minHeight = 100, maxHeight = 800 } = options;

  const panelHeight = ref(initialHeight);
  const isDragging = ref(false);
  const isMaximized = ref(false);
  const lastHeightBeforeMaximize = ref(initialHeight);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;
    
    e.preventDefault();
    const newHeight = panelHeight.value + e.movementY;

    if (newHeight >= minHeight && newHeight <= maxHeight) {
      panelHeight.value = newHeight;
      isMaximized.value = false; // Any drag interaction un-maximizes
    }
  };

  const handleMouseUp = () => {
    isDragging.value = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  const initDrag = (e: MouseEvent) => {
    isDragging.value = true;
    e.preventDefault();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const toggleMaximize = () => {
    if (isMaximized.value) {
      // Restore to previous height
      panelHeight.value = lastHeightBeforeMaximize.value;
    } else {
      // Maximize (minimize the top panel)
      lastHeightBeforeMaximize.value = panelHeight.value;
      panelHeight.value = minHeight;
    }
    isMaximized.value = !isMaximized.value;
  };

  onUnmounted(() => {
    if (isDragging.value) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    }
  });

  return {
    panelHeight,
    initDrag,
    isDragging,
    isMaximized,
    toggleMaximize,
  };
}
