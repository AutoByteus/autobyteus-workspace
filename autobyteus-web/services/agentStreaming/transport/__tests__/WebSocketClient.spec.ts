import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketClient } from '../WebSocketClient';
import { ConnectionState } from '../types';

class MockWebSocket {
  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
  }

  send(): void {}

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: 'Normal closure' });
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateClose(code = 1006, reason = 'restart'): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

describe('WebSocketClient', () => {
  let originalWebSocket: typeof WebSocket;
  let sockets: MockWebSocket[];

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = vi.fn((url: string) => {
      const socket = new MockWebSocket(url);
      sockets.push(socket);
      return socket;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  it('marks the client as reconnecting immediately after an unexpected close', () => {
    const client = new WebSocketClient({
      reconnectDelay: 10,
      maxReconnectDelay: 10,
      maxReconnectAttempts: 3,
    });

    client.connect('ws://localhost:8000/ws/agent/team-1');
    expect(client.state).toBe(ConnectionState.CONNECTING);

    sockets[0].simulateOpen();
    expect(client.state).toBe(ConnectionState.CONNECTED);

    sockets[0].simulateClose(1006, 'server restart');
    expect(client.state).toBe(ConnectionState.RECONNECTING);

    vi.advanceTimersByTime(10);
    expect(sockets).toHaveLength(2);
    expect(client.state).toBe(ConnectionState.RECONNECTING);

    sockets[1].simulateClose(1006, 'still restarting');
    expect(client.state).toBe(ConnectionState.RECONNECTING);

    vi.advanceTimersByTime(10);
    expect(sockets).toHaveLength(3);
    expect(client.state).toBe(ConnectionState.RECONNECTING);
  });

  it('ignores manual connect calls while a reconnect timer is already pending', () => {
    const client = new WebSocketClient({
      reconnectDelay: 10,
      maxReconnectDelay: 10,
      maxReconnectAttempts: 3,
    });

    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    expect(client.state).toBe(ConnectionState.CONNECTED);

    sockets[0].simulateClose(1006, 'server restart');
    expect(client.state).toBe(ConnectionState.RECONNECTING);

    client.connect('ws://localhost:8000/ws/agent/team-1');
    client.connect('ws://localhost:8000/ws/agent/team-1');

    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(10);
    expect(sockets).toHaveLength(2);
    expect(client.state).toBe(ConnectionState.RECONNECTING);
  });

  it('does not retry non-retryable not-found closes', () => {
    const client = new WebSocketClient({
      reconnectDelay: 10,
      maxReconnectDelay: 10,
      maxReconnectAttempts: 3,
    });

    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    expect(client.state).toBe(ConnectionState.CONNECTED);

    sockets[0].simulateClose(4004, 'team not found');
    expect(client.state).toBe(ConnectionState.DISCONNECTED);

    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(1);
  });
});
