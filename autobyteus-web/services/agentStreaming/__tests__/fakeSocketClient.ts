import { vi } from 'vitest';
import { ConnectionState, type IWebSocketClient, type WebSocketClientEvents } from '../transport';

/** A socket double that behaves as the plain `WebSocketClient`: no retry of its own. */
export class FakeSocketClient implements IWebSocketClient {
  state = ConnectionState.DISCONNECTED;
  connects = 0;
  private readonly handlers = new Map<keyof WebSocketClientEvents, Set<(...args: any[]) => void>>();
  connect(): void {
    if (this.state !== ConnectionState.DISCONNECTED) return;
    this.connects += 1;
    this.state = ConnectionState.CONNECTING;
  }
  disconnect(): void { this.state = ConnectionState.DISCONNECTED; }
  send = vi.fn();
  on<K extends keyof WebSocketClientEvents>(event: K, handler: WebSocketClientEvents[K]): void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (...args: any[]) => void);
    this.handlers.set(event, set);
  }
  off<K extends keyof WebSocketClientEvents>(event: K, handler: WebSocketClientEvents[K]): void {
    this.handlers.get(event)?.delete(handler as (...args: any[]) => void);
  }
  private emit(event: keyof WebSocketClientEvents, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }
  open(): void { this.state = ConnectionState.CONNECTED; this.emit('onConnect'); }
  lose(retryable = true): void { this.state = ConnectionState.DISCONNECTED; this.emit('onDisconnect', 'lost', retryable); }
  message(type: string, payload: Record<string, unknown>): void { this.emit('onMessage', JSON.stringify({ type, payload })); }
}
