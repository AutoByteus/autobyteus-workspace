import { computed, ref, shallowRef } from 'vue';
import RFB from '@novnc/novnc';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { redactRemoteAccessWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import {
  nodeDesktopStreamUrl,
  viewerStateForClose,
  type NodeDesktopMode,
  type NodeDesktopStreamEnd,
} from '~/utils/nodeDesktopClient';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * One viewer of the bound node's node desktop: the noVNC session and the WebSocket it runs on.
 * The composable creates the socket and listens for its close itself (noVNC's own disconnect event
 * carries no close code), then hands the socket to noVNC as its channel. One socket and one RFB
 * per connection; a mode switch reconnects. The node enforces the mode; noVNC's `viewOnly` only
 * keeps the client from sending input. The agent's desktop is never resized: the picture scales.
 */
export function useVncSession() {
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  /** How the last stream ended when the viewer did not end it; null otherwise. */
  const streamEnd = ref<NodeDesktopStreamEnd | null>(null);
  const mode = ref<NodeDesktopMode>('view');
  const rfb = shallowRef<RFB | null>(null);
  const container = shallowRef<HTMLElement | null>(null);

  const isConnected = computed(() => connectionStatus.value === 'connected');
  const isConnecting = computed(() => connectionStatus.value === 'connecting');

  const setContainer = (element: HTMLElement | null) => {
    container.value = element;
  };

  const applyViewportStrategy = (session: RFB) => {
    session.scaleViewport = true;
    session.clipViewport = false;
    session.resizeSession = false;
    session.viewOnly = mode.value === 'view';
  };

  /** Ends the current stream as the viewer's own action: no error state follows. */
  const dropSession = () => {
    const session = rfb.value;
    rfb.value = null;
    if (!session) return;
    try {
      session.disconnect();
    } catch (error) {
      console.warn('[vncSession] error during RFB disconnect:', error);
    }
  };

  const connect = (nextMode: NodeDesktopMode = 'view') => {
    const target = container.value;
    if (!target || connectionStatus.value !== 'disconnected') return;

    mode.value = nextMode;
    streamEnd.value = null;
    connectionStatus.value = 'connecting';

    const endpoints = useWindowNodeContextStore().getBoundEndpoints();
    const url = nodeDesktopStreamUrl(endpoints, nextMode, getActiveRemoteAccessCredential());
    console.info('[vncSession] connecting', { url: redactRemoteAccessWebSocketUrl(url), mode: nextMode });

    let lastClose: { code: number; reason: string } | null = null;
    let session: RFB;
    try {
      const socket = new WebSocket(url);
      // Registered before noVNC sets its own `onclose`, so this runs first on every close.
      socket.addEventListener('close', (event) => {
        lastClose = { code: event.code, reason: event.reason };
      });
      session = new RFB(target, socket, { shared: true });
    } catch (error) {
      console.error('[vncSession] connection setup failed:', error);
      connectionStatus.value = 'disconnected';
      streamEnd.value = viewerStateForClose({ code: 1006, reason: '' });
      return;
    }
    rfb.value = session;
    applyViewportStrategy(session);

    session.addEventListener('connect', () => {
      if (rfb.value !== session) return;
      applyViewportStrategy(session);
      connectionStatus.value = 'connected';
    });

    session.addEventListener('disconnect', () => {
      if (rfb.value !== session) return;
      rfb.value = null;
      connectionStatus.value = 'disconnected';
      streamEnd.value = viewerStateForClose(lastClose ?? { code: 0, reason: '' });
      console.info('[vncSession] stream ended', { code: lastClose?.code ?? null, state: streamEnd.value.state });
    });
  };

  const disconnect = () => {
    dropSession();
    connectionStatus.value = 'disconnected';
    streamEnd.value = null;
  };

  /** Reopens the stream in the other mode (the node fixes the mode per stream). */
  const switchMode = (nextMode: NodeDesktopMode) => {
    if (nextMode === mode.value && connectionStatus.value !== 'disconnected') return;
    disconnect();
    connect(nextMode);
  };

  /** Re-applies the scale-to-fit strategy after the tile changes size (for example Maximize). */
  const refreshViewport = () => {
    const session = rfb.value;
    if (!session) return;
    applyViewportStrategy(session);
    window.dispatchEvent(new Event('resize'));
  };

  return {
    connectionStatus,
    streamEnd,
    mode,
    isConnected,
    isConnecting,
    setContainer,
    connect,
    disconnect,
    switchMode,
    refreshViewport,
  };
}
