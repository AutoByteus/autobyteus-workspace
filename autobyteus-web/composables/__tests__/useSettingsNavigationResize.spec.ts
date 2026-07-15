import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SETTINGS_DESKTOP_MEDIA_QUERY,
  SETTINGS_NAVIGATION_DEFAULT_WIDTH,
  SETTINGS_NAVIGATION_KEYBOARD_STEP,
  SETTINGS_NAVIGATION_MAX_WIDTH,
  SETTINGS_NAVIGATION_MIN_WIDTH,
  useSettingsNavigationResize,
  type SettingsNavigationResize,
} from '../useSettingsNavigationResize';

interface MediaController {
  setMatches(matches: boolean): void;
}

const installMatchMedia = (initialMatches = true): MediaController => {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: SETTINGS_DESKTOP_MEDIA_QUERY,
    addEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList));
  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
};

const mountComposable = () => {
  const state: { resize?: SettingsNavigationResize } = {};
  const wrapper = mount(defineComponent({
    setup() {
      state.resize = useSettingsNavigationResize();
      return () => h('div');
    },
  }));

  const resize = state.resize;
  if (!resize) {
    throw new Error('Resize composable did not initialize');
  }
  return { resize, wrapper };
};

const pointerEvent = (
  type: string,
  values: Partial<PointerEvent> = {},
): PointerEvent => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries(values).forEach(([key, value]) => {
    Object.defineProperty(event, key, { configurable: true, value });
  });
  return event as PointerEvent;
};

const keyboardEvent = (key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  return event;
};

describe('useSettingsNavigationResize', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('starts at the original width and derives exact overlay geometry', async () => {
    installMatchMedia(true);
    const { resize, wrapper } = mountComposable();
    await nextTick();

    expect(SETTINGS_NAVIGATION_DEFAULT_WIDTH).toBe(256);
    expect(SETTINGS_NAVIGATION_MIN_WIDTH).toBe(0);
    expect(SETTINGS_NAVIGATION_MAX_WIDTH).toBe(256);
    expect(SETTINGS_NAVIGATION_KEYBOARD_STEP).toBe(16);
    expect(resize.navigationWidth.value).toBe(256);
    expect(resize.navigationWidthStyle.value).toEqual({ '--settings-navigation-width': '256px' });
    expect(resize.separatorLineStyle.value).toEqual({ left: '-1px' });
    expect(resize.separatorFeedbackStyle.value).toEqual({ left: '-2px' });
    expect(resize.separatorTargetStyle.value).toEqual({ left: '-4px' });
    expect(resize.isDesktop.value).toBe(true);
    expect(resize.isNavigationInteractionHidden.value).toBe(false);
    wrapper.unmount();
  });

  it('handles keyboard bounds, steps, and unhandled keys through one width authority', () => {
    installMatchMedia(true);
    const { resize, wrapper } = mountComposable();

    const home = keyboardEvent('Home');
    resize.handleSeparatorKeydown(home);
    expect(home.defaultPrevented).toBe(true);
    expect(resize.navigationWidth.value).toBe(0);
    expect(resize.separatorLineStyle.value).toEqual({ left: '0px' });
    expect(resize.separatorFeedbackStyle.value).toEqual({ left: '0px' });
    expect(resize.separatorTargetStyle.value).toEqual({ left: '0px' });
    expect(resize.isNavigationInteractionHidden.value).toBe(true);

    resize.handleSeparatorKeydown(keyboardEvent('ArrowRight'));
    expect(resize.navigationWidth.value).toBe(16);
    expect(resize.separatorFeedbackStyle.value).toEqual({ left: '-2px' });
    expect(resize.separatorTargetStyle.value).toEqual({ left: '-4px' });
    resize.handleSeparatorKeydown(keyboardEvent('ArrowLeft'));
    resize.handleSeparatorKeydown(keyboardEvent('ArrowLeft'));
    expect(resize.navigationWidth.value).toBe(0);

    resize.handleSeparatorKeydown(keyboardEvent('End'));
    resize.handleSeparatorKeydown(keyboardEvent('ArrowRight'));
    expect(resize.navigationWidth.value).toBe(256);

    const unhandled = keyboardEvent('Enter');
    resize.handleSeparatorKeydown(unhandled);
    expect(unhandled.defaultPrevented).toBe(false);
    expect(resize.navigationWidth.value).toBe(256);
    wrapper.unmount();
  });

  it('clamps feedback and target overlays independently near the viewport edge', () => {
    installMatchMedia(true);
    const { resize, wrapper } = mountComposable();

    resize.handleSeparatorKeydown(keyboardEvent('Home'));
    resize.handleSeparatorKeydown(keyboardEvent('ArrowRight'));
    const separator = document.createElement('div');
    resize.separatorRef.value = separator;
    resize.startResize(pointerEvent('pointerdown', {
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      pointerId: 9,
      clientX: 16,
    }));
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 9, clientX: 1 }));

    expect(resize.navigationWidth.value).toBe(1);
    expect(resize.separatorLineStyle.value).toEqual({ left: '-1px' });
    expect(resize.separatorFeedbackStyle.value).toEqual({ left: '-1px' });
    expect(resize.separatorTargetStyle.value).toEqual({ left: '-1px' });

    window.dispatchEvent(pointerEvent('pointerup', { pointerId: 9 }));
    wrapper.unmount();
  });

  it('clamps pointer resizing, focuses the separator, and restores exact body styles on pointer-up', () => {
    installMatchMedia(true);
    const { resize, wrapper } = mountComposable();
    const separator = document.createElement('div');
    separator.tabIndex = 0;
    document.body.append(separator);
    resize.separatorRef.value = separator;
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'text';

    const start = pointerEvent('pointerdown', {
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      pointerId: 7,
      clientX: 300,
    });
    resize.startResize(start);

    expect(start.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(separator);
    expect(resize.isResizing.value).toBe(true);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 8, clientX: 0 }));
    expect(resize.navigationWidth.value).toBe(256);
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: -100 }));
    expect(resize.navigationWidth.value).toBe(0);
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: 700 }));
    expect(resize.navigationWidth.value).toBe(256);
    window.dispatchEvent(pointerEvent('pointerup', { pointerId: 7 }));

    expect(resize.isResizing.value).toBe(false);
    expect(document.body.style.cursor).toBe('crosshair');
    expect(document.body.style.userSelect).toBe('text');
    wrapper.unmount();
  });

  it('ignores non-primary input and cleans pointer-cancel and unmount sessions', () => {
    installMatchMedia(true);
    const { resize, wrapper } = mountComposable();

    resize.startResize(pointerEvent('pointerdown', {
      isPrimary: false,
      pointerType: 'mouse',
      button: 0,
      pointerId: 1,
      clientX: 200,
    }));
    resize.startResize(pointerEvent('pointerdown', {
      isPrimary: true,
      pointerType: 'mouse',
      button: 2,
      pointerId: 1,
      clientX: 200,
    }));
    expect(resize.isResizing.value).toBe(false);

    resize.startResize(pointerEvent('pointerdown', {
      isPrimary: true,
      pointerType: 'touch',
      button: 0,
      pointerId: 2,
      clientX: 200,
    }));
    expect(resize.isResizing.value).toBe(true);
    window.dispatchEvent(pointerEvent('pointercancel', { pointerId: 2 }));
    expect(resize.isResizing.value).toBe(false);

    resize.startResize(pointerEvent('pointerdown', {
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      pointerId: 3,
      clientX: 200,
    }));
    expect(resize.isResizing.value).toBe(true);
    wrapper.unmount();
    expect(resize.isResizing.value).toBe(false);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('restores navigation interaction and moves separator focus to Back when crossing narrow', async () => {
    const media = installMatchMedia(true);
    const { resize, wrapper } = mountComposable();
    const navigation = document.createElement('div');
    const back = document.createElement('button');
    navigation.append(back);
    const separator = document.createElement('div');
    separator.tabIndex = 0;
    document.body.append(navigation, separator);
    resize.navigationRef.value = navigation;
    resize.narrowFocusFallbackRef.value = back;
    resize.separatorRef.value = separator;
    resize.handleSeparatorKeydown(keyboardEvent('Home'));

    separator.focus();
    expect(document.activeElement).toBe(separator);
    media.setMatches(false);
    await flushPromises();

    expect(resize.isDesktop.value).toBe(false);
    expect(resize.isNavigationInteractionHidden.value).toBe(false);
    expect(document.activeElement).toBe(back);
    wrapper.unmount();
  });

  it('moves navigation focus to the separator when returning desktop at retained zero', async () => {
    const media = installMatchMedia(false);
    const { resize, wrapper } = mountComposable();
    const navigation = document.createElement('div');
    const destination = document.createElement('button');
    navigation.append(destination);
    const separator = document.createElement('div');
    separator.tabIndex = 0;
    document.body.append(navigation, separator);
    resize.navigationRef.value = navigation;
    resize.separatorRef.value = separator;
    resize.handleSeparatorKeydown(keyboardEvent('Home'));

    destination.focus();
    expect(document.activeElement).toBe(destination);
    media.setMatches(true);
    await flushPromises();

    expect(resize.isDesktop.value).toBe(true);
    expect(resize.isNavigationInteractionHidden.value).toBe(true);
    expect(document.activeElement).toBe(separator);
    wrapper.unmount();
  });

  it('does not steal unrelated focus across breakpoint changes', async () => {
    const media = installMatchMedia(true);
    const { resize, wrapper } = mountComposable();
    const outside = document.createElement('button');
    const separator = document.createElement('div');
    document.body.append(outside, separator);
    resize.separatorRef.value = separator;
    outside.focus();

    media.setMatches(false);
    await flushPromises();
    media.setMatches(true);
    await flushPromises();

    expect(document.activeElement).toBe(outside);
    wrapper.unmount();
  });
});
