import { onBeforeUnmount } from 'vue';
import { getShellBridge } from '~/utils/remoteAccess/shellBridge';

type OrientationWithLock = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

/**
 * How much of the phone the VNC Viewer's full screen (route `full=1`) takes (autobyteus-432). The route state is
 * the in-page full screen; this adds what the platform allows, chosen explicitly:
 * - in the Android app (the shell bridge is there): the app turns to landscape and hides Android's bars;
 * - in a browser with the Fullscreen API: the browser's full screen, then a landscape lock where the browser allows
 *   it (Chrome on Android); a refusal (no user gesture, as after a reload) leaves the in-page full screen;
 * - otherwise nothing more.
 * When the browser leaves its full screen by itself (Esc, the system Back), `onBrowserExit` lets the route follow.
 * The only sender of the bridge's `desktopFullScreen` message.
 */
export function useDesktopFullScreenDisplay(options: { onBrowserExit: () => void }) {
  /** The browser's full screen was entered for the viewer and has not been left. */
  let inBrowserFullScreen = false;
  /** The last request: a full screen granted after the viewer already left it is left at once. */
  let wanted = false;

  const enterBrowserFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      inBrowserFullScreen = true;
    } catch {
      return;
    }
    if (!wanted) {
      leaveBrowserFullScreen();
      return;
    }
    try {
      await (screen.orientation as OrientationWithLock | undefined)?.lock?.('landscape');
    } catch {
      // Desktop browsers and some phones do not lock; the full screen stays.
    }
  };

  const leaveBrowserFullScreen = () => {
    if (!inBrowserFullScreen) return;
    inBrowserFullScreen = false;
    screen.orientation?.unlock?.();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  const apply = (on: boolean) => {
    wanted = on;
    const shell = getShellBridge();
    if (shell) {
      shell.desktopFullScreen(on);
      return;
    }
    if (!document.fullscreenEnabled) return;
    if (on) void enterBrowserFullScreen();
    else leaveBrowserFullScreen();
  };

  const onFullScreenChange = () => {
    if (document.fullscreenElement || !inBrowserFullScreen) return;
    inBrowserFullScreen = false;
    options.onBrowserExit();
  };

  document.addEventListener('fullscreenchange', onFullScreenChange);
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullScreenChange));

  return { apply };
}
