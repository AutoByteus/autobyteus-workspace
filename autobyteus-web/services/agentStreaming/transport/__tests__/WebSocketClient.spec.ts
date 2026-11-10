import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketClient } from '../WebSocketClient';
import { ConnectionState } from '../types';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

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

  it('is a plain socket: an unexpected close reports a retryable disconnect and opens nothing by itself', () => {
    const client = new WebSocketClient();
    const disconnects: Array<[string | undefined, boolean]> = [];
    client.on('onDisconnect', (reason, retryable) => disconnects.push([reason, retryable]));

    client.connect('ws://localhost:8000/ws/agent/team-1');
    expect(client.state).toBe(ConnectionState.CONNECTING);
    sockets[0].simulateOpen();
    expect(client.state).toBe(ConnectionState.CONNECTED);

    sockets[0].simulateClose(1006, 'server restart');
    expect(client.state).toBe(ConnectionState.DISCONNECTED);
    expect(disconnects).toEqual([['server restart', true]]);
    vi.advanceTimersByTime(120_000);
    expect(sockets).toHaveLength(1);
  });

  it('connects again at once when its owner asks after a close', () => {
    const client = new WebSocketClient();
    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    sockets[0].simulateClose(1006, 'server restart');

    client.connect('ws://localhost:8000/ws/agent/team-1');
    expect(sockets).toHaveLength(2);
    expect(client.state).toBe(ConnectionState.CONNECTING);
  });

  it('ignores connect calls while connecting or connected, so no second socket opens', () => {
    const client = new WebSocketClient();
    client.connect('ws://localhost:8000/ws/agent/team-1');
    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    client.connect('ws://localhost:8000/ws/agent/team-1');
    expect(sockets).toHaveLength(1);
  });

  it('reports a not-found (4004) or not-allowed (4005) close as not retryable', () => {
    const client = new WebSocketClient();
    const retryable: boolean[] = [];
    client.on('onDisconnect', (_reason, value) => retryable.push(value));

    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    sockets[0].simulateClose(4004, 'team not found');
    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[1].simulateOpen();
    sockets[1].simulateClose(4005, 'not allowed');

    expect(client.state).toBe(ConnectionState.DISCONNECTED);
    expect(retryable).toEqual([false, false]);
  });

  it('reports a credential-refusal close as not retryable, and Phone Access off or a network refusal as retryable (autobyteus-435 AC-010-1)', () => {
    const client = new WebSocketClient();
    const retryable: boolean[] = [];
    client.on('onDisconnect', (_reason, value) => retryable.push(value));
    const closes: Array<[number, string]> = [
      [4401, 'NODE_CREDENTIAL_REQUIRED'], [4403, 'REMOTE_ACCESS_DEVICE_REVOKED'], [4403, 'NODE_CREDENTIAL_REVOKED'],
      [4403, 'PHONE_ACCESS_DISABLED'], [4403, 'NODE_NETWORK_REFUSED'], [1001, 'going away'],
    ];
    closes.forEach(([code, reason], index) => {
      client.connect('ws://localhost:8000/ws/agent/run-1');
      sockets[index].simulateOpen();
      sockets[index].simulateClose(code, reason);
    });

    expect(retryable).toEqual([false, false, false, true, true, true]);
  });

  it('an intentional disconnect reports no disconnect event', () => {
    const client = new WebSocketClient();
    const onDisconnect = vi.fn();
    client.on('onDisconnect', onDisconnect);
    client.connect('ws://localhost:8000/ws/agent/team-1');
    sockets[0].simulateOpen();
    client.disconnect();
    expect(client.state).toBe(ConnectionState.DISCONNECTED);
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});
