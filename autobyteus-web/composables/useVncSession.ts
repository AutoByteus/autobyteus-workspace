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

/** The keys the phone's keyboard bridge sends besides text. */
export type NodeDesktopKey = 'Enter' | 'Backspace' | 'Tab';

const KEYSYM_BY_KEY: Readonly<Record<NodeDesktopKey, number>> = { Enter: 0xff0d, Backspace: 0xff08, Tab: 0xff09 };
/** noVNC gives up waiting for a closing socket after 3 s; a mode switch waits no longer than this. */
const MODE_SWITCH_CLOSE_WAIT_MS = 3500;

/**
 * The X11 keysym of a character: Latin-1 printable characters are their own keysym, every other
 * character is its Unicode keysym (`0x01000000 | codepoint`). Control characters have none.
 */
export function keysymForCodepoint(codepoint: number): number | null {
  if ((codepoint >= 0x20 && codepoint <= 0x7e) || (codepoint >= 0xa0 && codepoint <= 0xff)) return codepoint;
  if (codepoint < 0x20 || (codepoint >= 0x7f && codepoint < 0xa0)) return null;
  return 0x01000000 | codepoint;
}

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
  /** The current stream's socket, so a mode switch can wait for it to close. */
  let socketInUse: WebSocket | null = null;
  /** Cancels a mode switch that is still waiting for the old socket to close. */
  let cancelPendingSwitch: (() => void) | null = null;

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
      socketInUse = socket;
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
    cancelPendingSwitch?.();
    cancelPendingSwitch = null;
    dropSession();
    connectionStatus.value = 'disconnected';
    streamEnd.value = null;
  };

  /**
   * Reopens the stream in the other mode (the node fixes the mode per stream). The new stream opens
   * only once the old socket has closed, so a switch at the node's viewer limit is not refused.
   */
  const switchMode = (nextMode: NodeDesktopMode) => {
    if (nextMode === mode.value && connectionStatus.value !== 'disconnected') return;
    const closing = socketInUse;
    disconnect();
    if (!closing || closing.readyState === WebSocket.CLOSED) {
      connect(nextMode);
      return;
    }
    mode.value = nextMode;
    connectionStatus.value = 'connecting';
    let done = false;
    const open = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      closing.removeEventListener('close', open);
      cancelPendingSwitch = null;
      connectionStatus.value = 'disconnected';
      connect(nextMode);
    };
    const timer = setTimeout(open, MODE_SWITCH_CLOSE_WAIT_MS);
    closing.addEventListener('close', open);
    cancelPendingSwitch = () => {
      done = true;
      clearTimeout(timer);
      closing.removeEventListener('close', open);
    };
  };

  const sendKeysym = (keysym: number) => {
    const session = rfb.value;
    if (!session || mode.value !== 'control' || connectionStatus.value !== 'connected') return;
    session.sendKey(keysym, null, true);
    session.sendKey(keysym, null, false);
  };

  /** Types text on the node desktop in Control (no-op in View only); `\n` is Enter and `\t` is Tab. */
  const typeText = (text: string) => {
    for (const character of text) {
      if (character === '\n') pressKey('Enter');
      else if (character === '\t') pressKey('Tab');
      else {
        const keysym = keysymForCodepoint(character.codePointAt(0)!);
        if (keysym !== null) sendKeysym(keysym);
      }
    }
  };

  /** Presses one key on the node desktop in Control (no-op in View only). */
  const pressKey = (key: NodeDesktopKey) => sendKeysym(KEYSYM_BY_KEY[key]);

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
    typeText,
    pressKey,
  };
}
