/**
 * Transport layer type definitions for WebSocket client.
 */

/** WebSocket connection states */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

/** Events emitted by the WebSocket client */
export interface WebSocketClientEvents {
  onConnect: () => void;
  /**
   * An unintended close (an intentional `disconnect()` emits none). `retryable` is false when the node
   * closed the stream for good (4004, 4005).
   */
  onDisconnect: (reason: string | undefined, retryable: boolean) => void;
  onMessage: (data: string) => void;
  onError: (error: Error) => void;
  onStateChange: (state: ConnectionState) => void;
}

/** Interface for WebSocket client - allows mocking in tests */
export interface IWebSocketClient {
  readonly state: ConnectionState;
  connect(url: string): void;
  disconnect(): void;
  send(message: string): void;
  on<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void;
  off<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void;
}
