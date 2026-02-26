// composables/useTerminalSession.ts
/**
 * Terminal WebSocket session composable.
 * 
 * Manages WebSocket connection to the PTY backend, handling:
 * - Connection lifecycle
 * - Input/output streaming
 * - Terminal resize events
 * 
 * Follows the pattern established by useVncSession.ts
 */

import { ref, computed, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface TerminalSessionOptions {
  workspaceId: string | Ref<string>;
  sessionId?: string;
}

export interface TerminalSession {
  connectionStatus: Ref<ConnectionStatus>;
  sessionId: Ref<string>;
  errorMessage: Ref<string>;
  isConnected: Ref<boolean>;
  isConnecting: Ref<boolean>;
  connect: () => void;
  disconnect: () => void;
  sendInput: (data: string) => void;
  sendResize: (rows: number, cols: number) => void;
  onOutput: (callback: (data: string) => void) => void;
}

export function useTerminalSession(options: TerminalSessionOptions): TerminalSession {
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  const errorMessage = ref('');
  const sessionId = ref(options.sessionId || uuidv4());
  
  let ws: WebSocket | null = null;
  let outputCallback: ((data: string) => void) | null = null;

  const isConnected = computed(() => connectionStatus.value === 'connected');
  const isConnecting = computed(() => connectionStatus.value === 'connecting');

  const getWorkspaceId = (): string => {
    const wsId = options.workspaceId;
    return typeof wsId === 'string' ? wsId : wsId.value;
  };

  const connect = () => {
    if (connectionStatus.value !== 'disconnected') {
      console.warn('[useTerminalSession] Already connected or connecting');
      return;
    }

    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      errorMessage.value = 'No workspace ID provided';
      console.error('[useTerminalSession] No workspace ID');
      return;
    }

    const windowNodeContextStore = useWindowNodeContextStore();
    const wsBaseUrl = windowNodeContextStore.getBoundEndpoints().terminalWs;
    const wsUrl = `${wsBaseUrl}/${workspaceId}/${sessionId.value}`;

    console.log('[useTerminalSession] Connecting to:', wsUrl);
    connectionStatus.value = 'connecting';
    errorMessage.value = '';

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[useTerminalSession] Connected');
        connectionStatus.value = 'connected';
        errorMessage.value = '';
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'output' && message.data) {
            // Decode base64 output
            const decoded = atob(message.data);
            if (outputCallback) {
              outputCallback(decoded);
            }
          } else if (message.type === 'error') {
            console.error('[useTerminalSession] Server error:', message.message);
            errorMessage.value = message.message;
          } else if (message.type === 'closed') {
            console.log('[useTerminalSession] Server closed session');
            disconnect();
          }
        } catch (err) {
          console.error('[useTerminalSession] Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[useTerminalSession] Disconnected:', event.code, event.reason);
        connectionStatus.value = 'disconnected';
        if (!event.wasClean) {
          errorMessage.value = event.reason || 'Connection lost';
        }
        ws = null;
      };

      ws.onerror = (event) => {
        console.error('[useTerminalSession] WebSocket error:', event);
        errorMessage.value = 'WebSocket connection error';
      };

    } catch (err) {
      console.error('[useTerminalSession] Failed to connect:', err);
      connectionStatus.value = 'disconnected';
      errorMessage.value = `Connection failed: ${err}`;
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    connectionStatus.value = 'disconnected';
  };

  const sendInput = (data: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[useTerminalSession] Cannot send: not connected');
      return;
    }

    // Encode input as base64
    const encoded = btoa(data);
    ws.send(JSON.stringify({
      type: 'input',
      data: encoded
    }));
  };

  const sendResize = (rows: number, cols: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify({
      type: 'resize',
      rows,
      cols
    }));
  };

  const onOutput = (callback: (data: string) => void) => {
    outputCallback = callback;
  };

  return {
    connectionStatus,
    sessionId,
    errorMessage,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
    onOutput
  };
}
