import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue';

export const SETTINGS_NAVIGATION_DEFAULT_WIDTH = 256;
export const SETTINGS_NAVIGATION_MIN_WIDTH = 0;
export const SETTINGS_NAVIGATION_MAX_WIDTH = 256;
export const SETTINGS_NAVIGATION_KEYBOARD_STEP = 16;
export const SETTINGS_DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

type FocusOwner = 'separator' | 'navigation' | 'other';

export interface SettingsNavigationResize {
  navigationWidth: Readonly<Ref<number>>;
  isResizing: Readonly<Ref<boolean>>;
  isDesktop: Readonly<Ref<boolean>>;
  isNavigationInteractionHidden: ComputedRef<boolean>;
  navigationRef: Ref<HTMLElement | null>;
  separatorRef: Ref<HTMLElement | null>;
  narrowFocusFallbackRef: Ref<HTMLButtonElement | null>;
  navigationWidthStyle: ComputedRef<Record<'--settings-navigation-width', string>>;
  separatorLineStyle: ComputedRef<{ left: string }>;
  separatorFeedbackStyle: ComputedRef<{ left: string }>;
  separatorTargetStyle: ComputedRef<{ left: string }>;
  startResize: (event: PointerEvent) => void;
  handleSeparatorKeydown: (event: KeyboardEvent) => void;
}

const clampWidth = (requestedWidth: number): number => Math.min(
  SETTINGS_NAVIGATION_MAX_WIDTH,
  Math.max(SETTINGS_NAVIGATION_MIN_WIDTH, requestedWidth),
);

export function useSettingsNavigationResize(): SettingsNavigationResize {
  const navigationWidth = ref(SETTINGS_NAVIGATION_DEFAULT_WIDTH);
  const isResizing = ref(false);
  const isDesktop = ref(false);
  const navigationRef = ref<HTMLElement | null>(null);
  const separatorRef = ref<HTMLElement | null>(null);
  const narrowFocusFallbackRef = ref<HTMLButtonElement | null>(null);
  let removeActiveResizeListeners: (() => void) | null = null;
  let removeMediaListener: (() => void) | null = null;
  let lastMeaningfulFocus: FocusOwner = 'other';

  const applyWidth = (requestedWidth: number): void => {
    navigationWidth.value = clampWidth(requestedWidth);
  };

  const isNavigationInteractionHidden = computed(
    () => isDesktop.value && navigationWidth.value === SETTINGS_NAVIGATION_MIN_WIDTH,
  );
  const navigationWidthStyle = computed(() => ({
    '--settings-navigation-width': `${navigationWidth.value}px`,
  }));
  const separatorLineStyle = computed(() => ({
    left: navigationWidth.value === SETTINGS_NAVIGATION_MIN_WIDTH ? '0px' : '-1px',
  }));
  const separatorFeedbackStyle = computed(() => ({
    left: `${Math.max(-navigationWidth.value, -2)}px`,
  }));
  const separatorTargetStyle = computed(() => ({
    left: `${Math.max(-navigationWidth.value, -4)}px`,
  }));

  const stopResize = (): void => {
    removeActiveResizeListeners?.();
    removeActiveResizeListeners = null;
  };

  const startResize = (event: PointerEvent): void => {
    if (
      typeof window === 'undefined'
      || !event.isPrimary
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    stopResize();
    event.preventDefault();
    separatorRef.value?.focus();

    const activePointerId = event.pointerId;
    const startX = event.clientX;
    const startWidth = navigationWidth.value;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      if (moveEvent.pointerId !== activePointerId) {
        return;
      }

      moveEvent.preventDefault();
      applyWidth(startWidth + moveEvent.clientX - startX);
    };

    const finishPointerSession = (finishEvent?: PointerEvent): void => {
      if (finishEvent && finishEvent.pointerId !== activePointerId) {
        return;
      }
      stopResize();
    };

    removeActiveResizeListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerSession);
      window.removeEventListener('pointercancel', finishPointerSession);
      window.removeEventListener('blur', stopResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      isResizing.value = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishPointerSession);
    window.addEventListener('pointercancel', finishPointerSession);
    window.addEventListener('blur', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    isResizing.value = true;
  };

  const handleSeparatorKeydown = (event: KeyboardEvent): void => {
    let requestedWidth: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        requestedWidth = navigationWidth.value - SETTINGS_NAVIGATION_KEYBOARD_STEP;
        break;
      case 'ArrowRight':
        requestedWidth = navigationWidth.value + SETTINGS_NAVIGATION_KEYBOARD_STEP;
        break;
      case 'Home':
        requestedWidth = SETTINGS_NAVIGATION_MIN_WIDTH;
        break;
      case 'End':
        requestedWidth = SETTINGS_NAVIGATION_MAX_WIDTH;
        break;
      default:
        return;
    }

    event.preventDefault();
    applyWidth(requestedWidth);
  };

  const isBodyFocus = (element: Element | null): boolean => (
    !element || element === document.body || element === document.documentElement
  );

  const handleFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || isBodyFocus(target)) {
      return;
    }

    if (target === separatorRef.value) {
      lastMeaningfulFocus = 'separator';
    } else if (navigationRef.value?.contains(target)) {
      lastMeaningfulFocus = 'navigation';
    } else {
      lastMeaningfulFocus = 'other';
    }
  };

  const syncDesktopInteractionState = async (matchesDesktop: boolean): Promise<void> => {
    const previousFocusOwner = lastMeaningfulFocus;
    isDesktop.value = matchesDesktop;
    await nextTick();

    const activeElement = document.activeElement;
    if (!matchesDesktop) {
      if (
        previousFocusOwner === 'separator'
        && (activeElement === separatorRef.value || isBodyFocus(activeElement))
      ) {
        narrowFocusFallbackRef.value?.focus();
      }
      return;
    }

    if (
      navigationWidth.value === SETTINGS_NAVIGATION_MIN_WIDTH
      && previousFocusOwner === 'navigation'
      && (navigationRef.value?.contains(activeElement) || isBodyFocus(activeElement))
    ) {
      separatorRef.value?.focus();
    }
  };

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const desktopMedia = window.matchMedia(SETTINGS_DESKTOP_MEDIA_QUERY);
    isDesktop.value = desktopMedia.matches;
    const handleMediaChange = (event: MediaQueryListEvent): void => {
      void syncDesktopInteractionState(event.matches);
    };

    desktopMedia.addEventListener('change', handleMediaChange);
    removeMediaListener = () => desktopMedia.removeEventListener('change', handleMediaChange);
    document.addEventListener('focusin', handleFocusIn);
  });

  onBeforeUnmount(() => {
    stopResize();
    removeMediaListener?.();
    removeMediaListener = null;
    document.removeEventListener('focusin', handleFocusIn);
  });

  return {
    navigationWidth: readonly(navigationWidth),
    isResizing: readonly(isResizing),
    isDesktop: readonly(isDesktop),
    isNavigationInteractionHidden,
    navigationRef,
    separatorRef,
    narrowFocusFallbackRef,
    navigationWidthStyle,
    separatorLineStyle,
    separatorFeedbackStyle,
    separatorTargetStyle,
    startResize,
    handleSeparatorKeydown,
  };
}
