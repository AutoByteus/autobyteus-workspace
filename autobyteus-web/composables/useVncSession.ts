import { computed, ref, shallowRef, unref, watch } from 'vue';
import RFB from '~/lib/novnc/core/rfb';

interface VncSessionOptions {
  url: string | { value: string };
  password: string | { value: string };
  viewOnly?: boolean;
  label?: string;
}

export function useVncSession(options: VncSessionOptions) {
  const INITIAL_RESIZE_RETRY_DELAY_MS = 120;
  const INITIAL_RESIZE_RESTORE_DELAY_MS = 320;
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const errorMessage = ref('');
  const rfb = shallowRef<RFB | null>(null);
  const container = shallowRef<HTMLElement | null>(null);
  const viewOnly = ref(options.viewOnly ?? true);
  const fullscreenFitEnabled = ref(false);
  let restoreViewOnlyAfterFullscreen: boolean | null = null;
  let initialResizeRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let initialResizeRestoreTimer: ReturnType<typeof setTimeout> | null = null;

  const url = computed(() => String(unref(options.url) ?? '').trim());
  const password = computed(() => String(unref(options.password) ?? ''));
  const label = options.label ? ` ${options.label}` : '';

  watch(connectionStatus, (status) => {
    console.log(`[vncSession${label}] status -> ${status}`);
  });

  const isConnected = computed(() => connectionStatus.value === 'connected');
  const isConnecting = computed(() => connectionStatus.value === 'connecting');
  const statusMessage = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return 'Connected to VNC server';
      case 'connecting':
        return 'Connecting to VNC server...';
      case 'disconnected':
        return errorMessage.value || 'Disconnected';
      default:
        return 'Unknown status';
    }
  });

  const setContainer = (element: HTMLElement | null) => {
    container.value = element;
    if (element) {
      console.log(`[vncSession${label}] container set`, {
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
    } else {
      console.log(`[vncSession${label}] container set: null`);
    }
  };

  const applyViewportStrategy = (session: RFB | null = rfb.value) => {
    if (!session) return;
    // Keep client-side fit as universal fallback; enable remote resize when fullscreen-fit mode is active.
    session.scaleViewport = true;
    session.clipViewport = false;
    session.resizeSession = fullscreenFitEnabled.value;
    session.viewOnly = viewOnly.value;
  };

  const clearInitialResizeTimers = () => {
    if (initialResizeRetryTimer !== null) {
      clearTimeout(initialResizeRetryTimer);
      initialResizeRetryTimer = null;
    }
    if (initialResizeRestoreTimer !== null) {
      clearTimeout(initialResizeRestoreTimer);
      initialResizeRestoreTimer = null;
    }
  };

  const triggerInitialRemoteResize = (session: RFB) => {
    clearInitialResizeTimers();

    // noVNC skips remote resize requests while viewOnly=true, so briefly enable control mode.
    session.viewOnly = false;
    session.resizeSession = true;
    window.dispatchEvent(new Event('resize'));

    // Retry once shortly after first layout pass in case container dimensions were late to settle.
    initialResizeRetryTimer = setTimeout(() => {
      if (rfb.value !== session) return;
      window.dispatchEvent(new Event('resize'));
      initialResizeRetryTimer = null;
    }, INITIAL_RESIZE_RETRY_DELAY_MS);

    // Restore the intended user mode and fullscreen policy.
    initialResizeRestoreTimer = setTimeout(() => {
      if (rfb.value !== session) return;
      applyViewportStrategy(session);
      initialResizeRestoreTimer = null;
    }, INITIAL_RESIZE_RESTORE_DELAY_MS);
  };

  const connect = () => {
    if (connectionStatus.value !== 'disconnected' || !container.value) {
      if (!container.value) {
        errorMessage.value = 'VNC container not set.';
        console.warn(`[vncSession${label}] connect skipped: container not set.`);
      } else {
        console.warn(`[vncSession${label}] connect skipped: status`, connectionStatus.value);
      }
      return;
    }

    if (!url.value) {
      errorMessage.value = 'VNC host not configured.';
      console.warn(`[vncSession${label}] connect skipped: url not configured.`);
      return;
    }

    console.log(`[vncSession${label}] connecting`, {
      url: url.value,
      container: {
        width: container.value.offsetWidth,
        height: container.value.offsetHeight,
      },
    });

    if (rfb.value) {
      try {
        rfb.value.disconnect();
      } catch (e) {
        console.warn('[vncSession] Error disconnecting existing RFB instance:', e);
      }
      cleanupConnection();
    }

    connectionStatus.value = 'connecting';
    errorMessage.value = '';

    try {
      const sessionRfb = new RFB(container.value, url.value, {
        credentials: { password: password.value },
        shared: true,
        scaleViewport: true,
        resizeSession: fullscreenFitEnabled.value,
        viewOnly: viewOnly.value,
        qualityLevel: 6,
        compressionLevel: 0,
        clipViewport: false,
        showDotCursor: true,
        background: '#1e1e1e',
      });

      rfb.value = sessionRfb;
      applyViewportStrategy(sessionRfb);

      sessionRfb.addEventListener('connect', () => {
        if (rfb.value !== sessionRfb) return;
        connectionStatus.value = 'connected';
        errorMessage.value = '';
        console.log(`[vncSession${label}] connected`);
        if (rfb.value) {
          applyViewportStrategy(rfb.value);
          triggerInitialRemoteResize(rfb.value);
        }
      });

      sessionRfb.addEventListener('disconnect', (e: any) => {
        if (rfb.value !== sessionRfb) return;
        const reason = e.detail?.reason || 'Disconnected unexpectedly';
        if (!e.detail?.clean) {
          errorMessage.value = reason;
          console.error(`[vncSession${label}] disconnected with error:`, reason, e.detail);
        } else {
          errorMessage.value = 'Disconnected.';
          console.log(`[vncSession${label}] disconnected cleanly.`);
        }
        connectionStatus.value = 'disconnected';
        cleanupConnection();
      });

      sessionRfb.addEventListener('credentialsrequired', () => {
        if (rfb.value !== sessionRfb) return;
        console.log(`[vncSession${label}] credentials required`);
        if (rfb.value) rfb.value.sendCredentials({ password: password.value });
      });

      sessionRfb.addEventListener('securityfailure', (e: any) => {
        if (rfb.value !== sessionRfb) return;
        const reason = e.detail?.reason || 'Security failure';
        console.error(`[vncSession${label}] security failure:`, reason, e.detail);
      });

      sessionRfb.addEventListener('desktopname', (e: any) => {
        if (rfb.value !== sessionRfb) return;
        console.log(`[vncSession${label}] desktop name`, { name: e.detail?.name });
      });
    } catch (err: any) {
      console.error(`[vncSession${label}] connection failed during setup:`, err);
      connectionStatus.value = 'disconnected';
      errorMessage.value = `Connection setup failed: ${err.message || String(err)}`;
      cleanupConnection();
    }
  };

  const disconnect = () => {
    if (rfb.value) {
      try {
        rfb.value.disconnect();
      } catch (e) {
        console.warn(`[vncSession${label}] error during RFB disconnect:`, e);
      }
    }
    cleanupConnection();
    connectionStatus.value = 'disconnected';
    if (!errorMessage.value || errorMessage.value === 'Connected to VNC server' || errorMessage.value === 'Connecting to VNC server...') {
      errorMessage.value = 'Disconnected';
    }
  };

  const cleanupConnection = () => {
    clearInitialResizeTimers();
    if (rfb.value) {
      rfb.value = null;
    }
  };

  const toggleViewOnly = () => {
    viewOnly.value = !viewOnly.value;
    if (fullscreenFitEnabled.value && restoreViewOnlyAfterFullscreen !== null) {
      // User explicitly changed mode while maximized; do not restore stale value on exit.
      restoreViewOnlyAfterFullscreen = null;
    }
    applyViewportStrategy();
  };

  const enterFullscreenFitMode = () => {
    fullscreenFitEnabled.value = true;
    if (viewOnly.value) {
      restoreViewOnlyAfterFullscreen = true;
      viewOnly.value = false;
    } else {
      restoreViewOnlyAfterFullscreen = null;
    }
    refreshViewport();
  };

  const exitFullscreenFitMode = () => {
    fullscreenFitEnabled.value = false;
    if (restoreViewOnlyAfterFullscreen !== null) {
      viewOnly.value = restoreViewOnlyAfterFullscreen;
      restoreViewOnlyAfterFullscreen = null;
    }
    refreshViewport();
  };

  const refreshViewport = () => {
    if (!rfb.value) return;
    applyViewportStrategy();
    window.dispatchEvent(new Event('resize'));
  };

  return {
    connectionStatus,
    errorMessage,
    viewOnly,
    isConnected,
    isConnecting,
    statusMessage,
    setContainer,
    connect,
    disconnect,
    toggleViewOnly,
    enterFullscreenFitMode,
    exitFullscreenFitMode,
    refreshViewport,
  };
}
