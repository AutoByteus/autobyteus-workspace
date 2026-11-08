import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useDesktopFullScreenDisplay } from '../useDesktopFullScreenDisplay';

// autobyteus-432 REQ-001, REQ-006: the app's desktop full screen, else the browser's, else the in-page one only.
const mountDisplay = () => {
  const onBrowserExit = vi.fn();
  let display!: ReturnType<typeof useDesktopFullScreenDisplay>;
  const wrapper = mount(defineComponent({
    setup() {
      display = useDesktopFullScreenDisplay({ onBrowserExit });
      return () => h('div');
    },
  }));
  return { display, onBrowserExit, wrapper };
};

// happy-dom has no Fullscreen API or screen orientation: the cases define what a browser would give.
const define = (target: object, name: string, get: () => unknown) =>
  Object.defineProperty(target, name, { configurable: true, get });
const remove = (target: object, name: string) => { delete (target as Record<string, unknown>)[name]; };

describe('useDesktopFullScreenDisplay', () => {
  let fullscreenElement: Element | null;
  let requestFullscreen: ReturnType<typeof vi.fn>;
  let exitFullscreen: ReturnType<typeof vi.fn>;
  let lock: ReturnType<typeof vi.fn>;
  let unlock: ReturnType<typeof vi.fn>;

  const setBrowserFullScreen = (enabled: boolean) => define(document, 'fullscreenEnabled', () => enabled);
  const leaveByBrowser = () => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  };

  beforeEach(() => {
    fullscreenElement = null;
    define(document, 'fullscreenElement', () => fullscreenElement);
    requestFullscreen = vi.fn(async () => { fullscreenElement = document.documentElement; });
    exitFullscreen = vi.fn(async () => { fullscreenElement = null; });
    define(document.documentElement, 'requestFullscreen', () => requestFullscreen);
    define(document, 'exitFullscreen', () => exitFullscreen);
    lock = vi.fn(async () => undefined);
    unlock = vi.fn();
    define(screen, 'orientation', () => ({ lock, unlock }));
  });

  afterEach(() => {
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
    for (const name of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) remove(document, name);
    remove(document.documentElement, 'requestFullscreen');
    remove(screen, 'orientation');
    vi.restoreAllMocks();
  });

  it('in the Android app sends the request over the shell bridge only', async () => {
    const posted: unknown[] = [];
    (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell = {
      postMessage: (message: string) => posted.push(JSON.parse(message)),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    setBrowserFullScreen(true);
    const { display } = mountDisplay();
    display.apply(true);
    display.apply(false);
    await flushPromises();
    expect(posted).toEqual([{ type: 'desktopFullScreen', on: true }, { type: 'desktopFullScreen', on: false }]);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it('in a browser enters its full screen, asks for landscape, and leaves both', async () => {
    setBrowserFullScreen(true);
    const { display, onBrowserExit } = mountDisplay();
    display.apply(true);
    await flushPromises();
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith('landscape');
    display.apply(false);
    await flushPromises();
    expect(unlock).toHaveBeenCalled();
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(onBrowserExit).not.toHaveBeenCalled();
  });

  it('lets the route follow when the browser leaves its full screen by itself (Esc)', async () => {
    setBrowserFullScreen(true);
    const { display, onBrowserExit } = mountDisplay();
    display.apply(true);
    await flushPromises();
    leaveByBrowser();
    expect(onBrowserExit).toHaveBeenCalledTimes(1);
    display.apply(false);
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('stays in the in-page full screen when the browser refuses (no user gesture) or cannot lock', async () => {
    setBrowserFullScreen(true);
    requestFullscreen.mockRejectedValueOnce(new TypeError('Permissions check failed'));
    const { display, onBrowserExit } = mountDisplay();
    display.apply(true);
    await flushPromises();
    expect(lock).not.toHaveBeenCalled();
    display.apply(false);
    expect(exitFullscreen).not.toHaveBeenCalled();

    lock.mockRejectedValueOnce(new Error('NotSupportedError'));
    display.apply(true);
    await flushPromises();
    expect(fullscreenElement).toBe(document.documentElement);
    expect(onBrowserExit).not.toHaveBeenCalled();
  });

  it('leaves a full screen the browser grants after the viewer already left it', async () => {
    setBrowserFullScreen(true);
    let grant!: () => void;
    requestFullscreen.mockImplementationOnce(() => new Promise<void>((resolve) => {
      grant = () => { fullscreenElement = document.documentElement; resolve(); };
    }));
    const { display } = mountDisplay();
    display.apply(true);
    display.apply(false);
    grant();
    await flushPromises();
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(lock).not.toHaveBeenCalled();
  });

  it('without the app or the Fullscreen API does nothing more than the in-page full screen', async () => {
    setBrowserFullScreen(false);
    const { display } = mountDisplay();
    display.apply(true);
    display.apply(false);
    await flushPromises();
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('stops listening when the viewer goes', async () => {
    setBrowserFullScreen(true);
    const { display, onBrowserExit, wrapper } = mountDisplay();
    display.apply(true);
    await flushPromises();
    wrapper.unmount();
    leaveByBrowser();
    expect(onBrowserExit).not.toHaveBeenCalled();
  });
});
