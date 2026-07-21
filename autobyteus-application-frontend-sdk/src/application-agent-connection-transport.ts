export type ApplicationAgentBrowserWebSocket = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  removeEventListener: (type: string, listener: (event: any) => void) => void;
};

export type ApplicationAgentBrowserWebSocketFactory = (url: string) => ApplicationAgentBrowserWebSocket;

export type ApplicationAgentConnectionTransportClose = {
  code: number;
  reason: string;
  wasClean: boolean;
};

export type ApplicationAgentConnectionTransport = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  onMessage: (listener: (data: unknown) => void) => () => void;
  onError: (listener: () => void) => () => void;
  onClose: (listener: (event: ApplicationAgentConnectionTransportClose) => void) => () => void;
};

export const createApplicationAgentConnectionTransport = (input: {
  url: string;
  webSocketFactory?: ApplicationAgentBrowserWebSocketFactory;
}): ApplicationAgentConnectionTransport => {
  const factory = input.webSocketFactory ?? ((url: string) => {
    const WebSocketConstructor = (globalThis as any).WebSocket as (new (value: string) => ApplicationAgentBrowserWebSocket) | undefined;
    if (!WebSocketConstructor) throw new Error("A WebSocket implementation is required.");
    return new WebSocketConstructor(url);
  });
  const socket = factory(input.url);
  const bind = (type: string, listener: (event: any) => void): (() => void) => {
    socket.addEventListener(type, listener);
    return () => socket.removeEventListener(type, listener);
  };
  return {
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (listener) => bind("message", (event) => listener(event?.data)),
    onError: (listener) => bind("error", listener),
    onClose: (listener) => bind("close", (event) => listener({
      code: typeof event?.code === "number" ? event.code : 1006,
      reason: typeof event?.reason === "string" ? event.reason : "",
      wasClean: event?.wasClean === true,
    })),
  };
};
