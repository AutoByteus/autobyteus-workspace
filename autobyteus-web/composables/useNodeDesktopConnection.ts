import { computed, nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import type { NodeDesktopMode } from '~/utils/nodeDesktopClient';
import type { useVncSession } from '~/composables/useVncSession';

type VncSession = ReturnType<typeof useVncSession>;

/** What a viewer offers when no stream is open: Connect, Reconnect, Retry (too many viewers), or nothing. */
export type NodeDesktopOffer = 'connect' | 'reconnect' | 'retry' | null;

/**
 * When a viewer of the node desktop connects and disconnects (one owner for the desktop app's tile
 * and the phone view): it opens a View only stream once the screen element has a size and the page
 * is visible, ends the stream when the page is hidden and reconnects in View only when it is visible
 * again (REQ-008, REQ-016), and ends it when the viewer unmounts. Every stream it opens on its own,
 * and every Connect/Reconnect/Retry, starts in View only (REQ-005); only `switchMode` opens Control.
 */
export function useNodeDesktopConnection(session: VncSession, screen: Ref<HTMLElement | null>) {
  const { isConnected, isConnecting, streamEnd } = session;
  /** Open a stream as soon as the screen has a size. */
  let pendingConnect = false;
  /** The page was hidden while a stream was open or opening; reconnect when it is visible. */
  let reconnectWhenVisible = false;
  let resizeObserver: ResizeObserver | null = null;

  const offer = computed<NodeDesktopOffer>(() => {
    if (isConnected.value || isConnecting.value) return null;
    const state = streamEnd.value?.state;
    if (!state || state === 'closed') return 'connect';
    if (state === 'disconnected' || state === 'unreachable') return 'reconnect';
    if (state === 'too-many') return 'retry';
    return null;
  });

  /** Opens a View only stream now, or as soon as the page is visible and the screen has a size. */
  const openViewOnly = () => {
    if (document.visibilityState === 'hidden') {
      reconnectWhenVisible = true;
      pendingConnect = false;
      return;
    }
    const element = screen.value;
    if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
      pendingConnect = true;
      return;
    }
    pendingConnect = false;
    session.connect('view');
  };

  /** Ends the stream as the user's choice: it does not come back when the page is visible again. */
  const stop = () => {
    pendingConnect = false;
    reconnectWhenVisible = false;
    session.disconnect();
  };

  const switchMode = (mode: NodeDesktopMode) => session.switchMode(mode);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (isConnected.value || isConnecting.value || pendingConnect) {
        reconnectWhenVisible = true;
        pendingConnect = false;
        session.disconnect();
      }
      return;
    }
    if (reconnectWhenVisible) {
      reconnectWhenVisible = false;
      openViewOnly();
    }
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void nextTick(() => {
      if (!screen.value) return;
      session.setContainer(screen.value);
      openViewOnly();
      if (typeof ResizeObserver === 'undefined') return;
      resizeObserver = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect || rect.width === 0 || rect.height === 0) return;
        if (pendingConnect && !isConnecting.value && !isConnected.value) openViewOnly();
        if (isConnected.value) session.refreshViewport();
      });
      resizeObserver.observe(screen.value);
    });
  });

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    resizeObserver?.disconnect();
    resizeObserver = null;
    stop();
  });

  watch(isConnected, (connected) => {
    if (connected) session.refreshViewport();
  });

  return { offer, openViewOnly, stop, switchMode };
}
