/**
 * WebSocket client with automatic reconnection support.
 * 
 * Layer 1 of the agent streaming architecture - handles raw WebSocket
 * connection management without any message parsing or business logic.
 */

import {
  ConnectionState,
  type IWebSocketClient,
  type WebSocketClientEvents,
  type WebSocketClientOptions,
} from './types';

const DEFAULT_OPTIONS: Required<WebSocketClientOptions> = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
};

export class WebSocketClient implements IWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private options: Required<WebSocketClientOptions>;
  private shouldReconnect = false;

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

  constructor(options: WebSocketClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

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
    if (this._state === ConnectionState.CONNECTED || 
        this._state === ConnectionState.CONNECTING ||
        this._state === ConnectionState.RECONNECTING) {
      return;
    }

    this.url = url;
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this.clearReconnectTimeout();
    this.doConnect();
  }

  private doConnect(): void {
    this.setState(
      this.reconnectAttempts > 0 
        ? ConnectionState.RECONNECTING 
        : ConnectionState.CONNECTING
    );

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;
    const socket = this.ws;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.setState(ConnectionState.CONNECTED);
      this.emit('onConnect');
    };

    socket.onclose = (event) => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('onDisconnect', event.reason || undefined);

      if (this.shouldReconnect && this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      this.emit('onMessage', event.data);
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      this.handleError(new Error('WebSocket error'));
    };
  }

  private handleError(error: Error): void {
    this.emit('onError', error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.clearReconnectTimeout();
      this.emit('onError', new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts++;
    this.clearReconnectTimeout();
    this.setState(ConnectionState.RECONNECTING);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.doConnect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();

    if (this.ws) {
      // Disable auto-reconnect for intentional disconnect
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
