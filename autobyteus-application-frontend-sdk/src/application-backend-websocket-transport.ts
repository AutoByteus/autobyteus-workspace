import type { ApplicationWebSocketFrame } from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationBackendWebSocketCloseEvent,
  ApplicationBackendWebSocketTransport,
} from "./application-backend-websocket-connection.js";

type BrowserWebSocketEventMap = {
  open: unknown;
  message: { data?: unknown };
  error: unknown;
  close: { code?: number; reason?: string; wasClean?: boolean };
};

export type ApplicationBackendBrowserWebSocket = {
  binaryType: string;
  send: (data: string | ArrayBuffer | Uint8Array) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: <T extends keyof BrowserWebSocketEventMap>(
    type: T,
    listener: (event: BrowserWebSocketEventMap[T]) => void,
  ) => void;
  removeEventListener: <T extends keyof BrowserWebSocketEventMap>(
    type: T,
    listener: (event: BrowserWebSocketEventMap[T]) => void,
  ) => void;
};

export type ApplicationBackendBrowserWebSocketFactory = (
  url: string,
) => ApplicationBackendBrowserWebSocket;

const toBinaryFrame = async (value: unknown): Promise<ApplicationWebSocketFrame | null> => {
  if (value instanceof ArrayBuffer) return { kind: "binary", data: new Uint8Array(value) };
  if (value instanceof Uint8Array) return { kind: "binary", data: value };
  if (value && typeof value === "object" && "arrayBuffer" in value) {
    const arrayBuffer = await (value as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return { kind: "binary", data: new Uint8Array(arrayBuffer) };
  }
  return null;
};

export const createApplicationBackendWebSocketTransport = (input: {
  url: string;
  webSocketFactory?: ApplicationBackendBrowserWebSocketFactory;
}): ApplicationBackendWebSocketTransport => {
  const factory = input.webSocketFactory ?? ((url: string) => {
    const Constructor = (globalThis as { WebSocket?: new (value: string) => ApplicationBackendBrowserWebSocket }).WebSocket;
    if (!Constructor) throw new Error("A WebSocket implementation is required.");
    return new Constructor(url);
  });
  const socket = factory(input.url);
  socket.binaryType = "arraybuffer";
  let messageTail = Promise.resolve();

  const bind = <T extends keyof BrowserWebSocketEventMap>(
    type: T,
    listener: (event: BrowserWebSocketEventMap[T]) => void,
  ): (() => void) => {
    socket.addEventListener(type, listener);
    return () => socket.removeEventListener(type, listener);
  };

  return {
    send: (frame) => socket.send(frame.kind === "text" ? frame.text : frame.data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (listener) => bind("message", (event) => {
      messageTail = messageTail.then(async () => {
        if (typeof event.data === "string") {
          listener({ kind: "text", text: event.data });
          return;
        }
        const frame = await toBinaryFrame(event.data);
        if (frame) listener(frame);
      }).catch(() => undefined);
    }),
    onError: (listener) => bind("error", () => listener()),
    onClose: (listener) => bind("close", (event) => listener({
      code: event.code ?? 1006,
      reason: event.reason ?? "",
      wasClean: event.wasClean === true,
    } satisfies ApplicationBackendWebSocketCloseEvent)),
  };
};
