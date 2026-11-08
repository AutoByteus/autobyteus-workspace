/**
 * A plain WebSocket for the agent and Team run streams.
 *
 * Layer 1 of the agent streaming architecture - handles the raw WebSocket
 * connection without any message parsing, business logic or retry: the stream
 * owner's reconnect scheduler decides when to connect again (autobyteus-434).
 */

import {
  ConnectionState,
  type IWebSocketClient,
  type WebSocketClientEvents,
} from './types';

/** The node closed the stream for good (run not found, not allowed): connecting again cannot help. */
const NON_RETRYABLE_CLOSE_CODES = new Set([4004, 4005]);

export class WebSocketClient implements IWebSocketClient {
  private ws: WebSocket | null = null;
  private _state: ConnectionState = ConnectionState.DISCONNECTED;

  // Event handlers
  private handlers: {
    [K in keyof WebSocketClientEvents]: Set<WebSocketClientEvents[K]>;
  } = {
    onConnect: new Set(),
    onDisconnect: new Set(),
    onMessage: new Set(),
    onError: new Set(),
    onStateChange: new Set(),
  };

  get state(): ConnectionState {
    return this._state;
  }

  private setState(newState: ConnectionState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.emit('onStateChange', newState);
    }
  }

  connect(url: string): void {
    if (this._state === ConnectionState.CONNECTED || this._state === ConnectionState.CONNECTING) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);
    try {
      this.ws = new WebSocket(url);
      this.setupEventListeners(this.ws);
    } catch (error) {
      this.ws = null;
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('onError', error as Error);
      this.emit('onDisconnect', (error as Error).message, true);
    }
  }

  private setupEventListeners(socket: WebSocket): void {
    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.setState(ConnectionState.CONNECTED);
      this.emit('onConnect');
    };

    socket.onclose = (event) => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('onDisconnect', event.reason || undefined, !NON_RETRYABLE_CLOSE_CODES.has(event.code));
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      this.emit('onMessage', event.data);
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      this.emit('onError', new Error('WebSocket error'));
    };
  }

  /** An intentional close: no `onDisconnect` follows. */
  disconnect(): void {
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.close();
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  send(message: string): void {
    if (this._state !== ConnectionState.CONNECTED || !this.ws) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(message);
  }

  on<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    this.handlers[event].add(handler as any);
  }

  off<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    this.handlers[event].delete(handler as any);
  }

  private emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): void {
    for (const handler of this.handlers[event]) {
      try {
        (handler as (...args: any[]) => void)(...args);
      } catch (e) {
        console.error(`Error in ${event} handler:`, e);
      }
    }
  }
}
