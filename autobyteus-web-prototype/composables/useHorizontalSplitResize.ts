import { onBeforeUnmount, ref } from 'vue';

interface UseHorizontalSplitResizeOptions {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useHorizontalSplitResize(options: UseHorizontalSplitResizeOptions = {}) {
  const { initialWidth = 232, minWidth = 168, maxWidth = 360 } = options;
  const clampWidth = (width: number): number => Math.min(maxWidth, Math.max(minWidth, width));
  const paneWidth = ref(clampWidth(initialWidth));
  let removeResizeListeners: (() => void) | null = null;

  const stopResize = () => {
    removeResizeListeners?.();
    removeResizeListeners = null;
  };

  const startResize = (event: MouseEvent) => {
    if (typeof window === 'undefined') return;
    event.preventDefault();
    stopResize();

    const startX = event.clientX;
    const startWidth = paneWidth.value;
    const onMove = (moveEvent: MouseEvent) => {
      paneWidth.value = clampWidth(startWidth + moveEvent.clientX - startX);
    };
    const onUp = () => stopResize();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    removeResizeListeners = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  };

  onBeforeUnmount(() => stopResize());

  return {
    paneWidth,
    startResize,
  };
}
