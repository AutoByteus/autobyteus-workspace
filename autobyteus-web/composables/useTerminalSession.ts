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

import { ref, computed, unref, type MaybeRef, type Ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { useWindowNodeContextStore } from "~/stores/windowNodeContextStore";
import { getActiveRemoteAccessCredential } from "~/utils/remoteAccess/authorizedTransport";
import {
  buildAuthenticatedWebSocketUrl,
  redactRemoteAccessWebSocketUrl,
} from "~/utils/remoteAccess/websocketAuth";
import {
  createTerminalOutputDecoder,
  decodeTerminalOutputChunk,
  encodeTerminalInput,
  flushTerminalOutputDecoder,
  type TerminalOutputDecoder,
} from "~/utils/terminalTransportCodec";
import type { TerminalTarget } from "~/types/terminal/TerminalTarget";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";
export type TerminalDefaultCwd = "server-home";

export interface TerminalSessionOptions {
  target: MaybeRef<TerminalTarget | null | undefined>;
  defaultCwd?: TerminalDefaultCwd;
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

export function useTerminalSession(
  options: TerminalSessionOptions,
): TerminalSession {
  const connectionStatus = ref<ConnectionStatus>("disconnected");
  const errorMessage = ref("");
  const sessionId = ref(options.sessionId || uuidv4());

  let ws: WebSocket | null = null;
  let outputCallback: ((data: string) => void) | null = null;
  let outputDecoder: TerminalOutputDecoder = createTerminalOutputDecoder();

  const isConnected = computed(() => connectionStatus.value === "connected");
  const isConnecting = computed(() => connectionStatus.value === "connecting");

  const resetOutputDecoder = () => {
    outputDecoder = createTerminalOutputDecoder();
  };

  const flushAndResetOutputDecoder = () => {
    try {
      const remainingOutput = flushTerminalOutputDecoder(outputDecoder);
      if (remainingOutput && outputCallback) {
        outputCallback(remainingOutput);
      }
    } catch (err) {
      console.error("[useTerminalSession] Error flushing output decoder:", err);
    } finally {
      resetOutputDecoder();
    }
  };

  type TerminalConnectionTarget =
    | {
        mode: "explicit";
        target: TerminalTarget;
      }
    | {
        mode: "server-home";
      };

  const getConnectionTarget = (): TerminalConnectionTarget | null => {
    const target = unref(options.target);
    if (target) {
      return {
        mode: "explicit",
        target,
      };
    }
    if (options.defaultCwd === "server-home") {
      return {
        mode: "server-home",
      };
    }
    return null;
  };

  const buildTerminalWebSocketUrl = (
    connectionTarget: TerminalConnectionTarget,
  ): string => {
    const windowNodeContextStore = useWindowNodeContextStore();
    const wsBaseUrl = windowNodeContextStore.getBoundEndpoints().terminalWs;
    const endpoint = new URL(
      `${wsBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(sessionId.value)}`,
      typeof window !== "undefined" ? window.location.href : "http://localhost",
    );
    if (connectionTarget.mode === "explicit") {
      endpoint.searchParams.set("cwd", connectionTarget.target.rootPath);
    }
    return endpoint.toString();
  };

  const connect = () => {
    if (connectionStatus.value !== "disconnected") {
      console.warn("[useTerminalSession] Already connected or connecting");
      return;
    }

    const connectionTarget = getConnectionTarget();
    if (!connectionTarget) {
      errorMessage.value = "No terminal root path provided";
      console.error("[useTerminalSession] No terminal root path");
      return;
    }

    const baseWsUrl = buildTerminalWebSocketUrl(connectionTarget);
    const credential = getActiveRemoteAccessCredential();
    const wsUrl = credential
      ? buildAuthenticatedWebSocketUrl(baseWsUrl, credential)
      : baseWsUrl;

    console.log(
      "[useTerminalSession] Connecting to:",
      redactRemoteAccessWebSocketUrl(wsUrl),
    );
    resetOutputDecoder();
    connectionStatus.value = "connecting";
    errorMessage.value = "";

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[useTerminalSession] Connected");
        connectionStatus.value = "connected";
        errorMessage.value = "";
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "output" && message.data) {
            const decoded = decodeTerminalOutputChunk(
              outputDecoder,
              message.data,
            );
            if (decoded && outputCallback) {
              outputCallback(decoded);
            }
          } else if (message.type === "error") {
            console.error(
              "[useTerminalSession] Server error:",
              message.message,
            );
            errorMessage.value = message.message;
          } else if (message.type === "closed") {
            console.log("[useTerminalSession] Server closed session");
            disconnect();
          }
        } catch (err) {
          console.error("[useTerminalSession] Error parsing message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log(
          "[useTerminalSession] Disconnected:",
          event.code,
          event.reason,
        );
        flushAndResetOutputDecoder();
        connectionStatus.value = "disconnected";
        if (!event.wasClean && !errorMessage.value) {
          errorMessage.value = event.reason || "Connection lost";
        }
        ws = null;
      };

      ws.onerror = (event) => {
        console.error("[useTerminalSession] WebSocket error:", event);
        if (!errorMessage.value) {
          errorMessage.value = "WebSocket connection error";
        }
      };
    } catch (err) {
      console.error("[useTerminalSession] Failed to connect:", err);
      connectionStatus.value = "disconnected";
      errorMessage.value = `Connection failed: ${err}`;
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    flushAndResetOutputDecoder();
    connectionStatus.value = "disconnected";
  };

  const sendInput = (data: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[useTerminalSession] Cannot send: not connected");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "input",
        data: encodeTerminalInput(data),
      }),
    );
  };

  const sendResize = (rows: number, cols: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(
      JSON.stringify({
        type: "resize",
        rows,
        cols,
      }),
    );
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
    onOutput,
  };
}
