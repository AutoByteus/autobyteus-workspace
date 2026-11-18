import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const SECTION_HEIGHT_STORAGE_KEY = 'autobyteus.app-left-panel.primary-nav-height';
const USER_SIZED_STORAGE_KEY = 'autobyteus.app-left-panel.primary-nav-user-sized';
const FALLBACK_PRIMARY_SECTION_HEIGHT = 240;
const MIN_PRIMARY_SECTION_HEIGHT = 56;
const MIN_WORKSPACE_SECTION_HEIGHT = 220;

const clampPrimarySectionHeight = (requestedHeight: number, containerHeight: number | null): number => {
  const minimumHeight = MIN_PRIMARY_SECTION_HEIGHT;

  if (!containerHeight || containerHeight <= 0) {
    return Math.max(requestedHeight, minimumHeight);
  }

  const maxPrimaryHeight = Math.max(minimumHeight, containerHeight - MIN_WORKSPACE_SECTION_HEIGHT);
  return Math.min(Math.max(requestedHeight, minimumHeight), maxPrimaryHeight);
};

const readStoredPrimarySectionHeight = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SECTION_HEIGHT_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  } catch (error) {
    console.error('Failed to read app left panel section height:', error);
    return null;
  }
};

const persistPrimarySectionHeight = (height: number): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SECTION_HEIGHT_STORAGE_KEY, String(height));
  } catch (error) {
    console.error('Failed to persist app left panel section height:', error);
  }
};

export function useAppLeftPanelSectionResize() {
  const panelSectionsContainerRef = ref<HTMLElement | null>(null);
  const primaryNavSectionRef = ref<HTMLElement | null>(null);
  const primarySectionHeight = ref(FALLBACK_PRIMARY_SECTION_HEIGHT);
  let removeActiveDragListeners: (() => void) | null = null;
  // Until the user drags the divider, the section follows the menu's own height,
  // so an item that appears after mount (Applications, Nodes, Integrations) is never cut off.
  let navHeightObserver: ResizeObserver | null = null;

  const applyPrimarySectionHeight = (requestedHeight: number): void => {
    const clampedHeight = clampPrimarySectionHeight(
      requestedHeight,
      panelSectionsContainerRef.value?.clientHeight ?? null,
    );

    primarySectionHeight.value = clampedHeight;
    persistPrimarySectionHeight(clampedHeight);
  };

  const syncPrimarySectionHeightToContainer = (): void => {
    applyPrimarySectionHeight(primarySectionHeight.value);
  };

  const stopActiveDrag = (): void => {
    removeActiveDragListeners?.();
    removeActiveDragListeners = null;
    document.body.style.cursor = '';
  };

  const initPrimarySectionResize = (event: MouseEvent): void => {
    if (!panelSectionsContainerRef.value) {
      return;
    }

    stopActiveDrag();
    navHeightObserver?.disconnect();
    navHeightObserver = null;
    try { window.localStorage.setItem(USER_SIZED_STORAGE_KEY, '1'); } catch { /* the section then keeps following the menu */ }
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = primarySectionHeight.value;

    const doDrag = (moveEvent: MouseEvent): void => {
      moveEvent.preventDefault();
      applyPrimarySectionHeight(startHeight + (moveEvent.clientY - startY));
    };

    const stopDrag = (): void => {
      stopActiveDrag();
    };

    removeActiveDragListeners = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'row-resize';
  };

  onMounted(async () => {
    const storedHeight = readStoredPrimarySectionHeight();
    const measuredDefaultHeight = primaryNavSectionRef.value?.scrollHeight ?? FALLBACK_PRIMARY_SECTION_HEIGHT;

    primarySectionHeight.value = storedHeight ?? measuredDefaultHeight;

    await nextTick();
    syncPrimarySectionHeightToContainer();
    window.addEventListener('resize', syncPrimarySectionHeightToContainer);

    const navList = primaryNavSectionRef.value?.firstElementChild;
    const userSized = (() => { try { return window.localStorage.getItem(USER_SIZED_STORAGE_KEY) === '1'; } catch { return false; } })();
    if (!userSized && navList && typeof ResizeObserver !== 'undefined') {
      navHeightObserver = new ResizeObserver(() => {
        const contentHeight = primaryNavSectionRef.value?.scrollHeight;
        if (contentHeight && contentHeight > primarySectionHeight.value) applyPrimarySectionHeight(contentHeight);
      });
      navHeightObserver.observe(navList);
    }
  });

  onBeforeUnmount(() => {
    stopActiveDrag();
    navHeightObserver?.disconnect();
    window.removeEventListener('resize', syncPrimarySectionHeightToContainer);
  });

  const primaryNavSectionStyle = computed(() => ({
    height: `${primarySectionHeight.value}px`,
  }));

  return {
    panelSectionsContainerRef,
    primaryNavSectionRef,
    primaryNavSectionStyle,
    initPrimarySectionResize,
  };
}
