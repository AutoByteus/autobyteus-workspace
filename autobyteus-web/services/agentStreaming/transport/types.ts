/**
 * Transport layer type definitions for WebSocket client.
 */

/** WebSocket connection states */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
}

/** Events emitted by the WebSocket client */
export interface WebSocketClientEvents {
  onConnect: () => void;
  onDisconnect: (reason?: string) => void;
  onMessage: (data: string) => void;
  onError: (error: Error) => void;
  onStateChange: (state: ConnectionState) => void;
}

/** Configuration options for WebSocket client */
export interface WebSocketClientOptions {
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
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
