import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RFB from '@novnc/novnc';
import { useVncSession } from '../useVncSession';

const calls: string[] = [];
const credential = { value: null as string | null };

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  private closeListeners: Array<(event: { code: number; reason: string }) => void> = [];
  constructor(readonly url: string) {
    calls.push(`WebSocket ${url}`);
    FakeWebSocket.instances.push(this);
  }
  addEventListener(event: string, listener: (event: { code: number; reason: string }) => void) {
    calls.push(`socket.addEventListener ${event}`);
    if (event === 'close') this.closeListeners.push(listener);
  }
  fireClose(code: number, reason = '') {
    this.closeListeners.forEach((listener) => listener({ code, reason }));
  }
}

interface MockRfb {
  socket: FakeWebSocket;
  viewOnly: boolean;
  resizeSession: boolean;
  scaleViewport: boolean;
  clipViewport: boolean;
  resizeSessionWrites: boolean[];
  disconnect: ReturnType<typeof vi.fn>;
  emit: (event: string) => void;
}

vi.mock('@novnc/novnc', () => {
  class MockRFB {
    viewOnly = true;
    scaleViewport = false;
    clipViewport = true;
    resizeSessionWrites: boolean[] = [];
    private resize = false;
    disconnect = vi.fn();
    private listeners = new Map<string, Array<() => void>>();
    constructor(_target: HTMLElement, readonly socket: unknown, readonly options: unknown) {}
    get resizeSession() { return this.resize; }
    set resizeSession(value: boolean) {
      this.resizeSessionWrites.push(value);
      this.resize = value;
    }
    addEventListener(event: string, listener: () => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    }
    emit(event: string) {
      (this.listeners.get(event) ?? []).forEach((listener) => listener());
    }
  }
  const constructor = vi.fn((target: HTMLElement, socket: unknown, options: unknown) => {
    (globalThis as any).__calls.push('new RFB');
    const instance = new MockRFB(target, socket, options);
    (globalThis as any).__rfbs.push(instance);
    return instance;
  });
  return { default: constructor };
});

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({ nodeDesktopWs: 'ws://node-a.example:8001/ws/node-desktop' }),
  }),
}));

vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({
  getActiveRemoteAccessCredential: () => credential.value,
}));

const rfbs = () => (globalThis as any).__rfbs as MockRfb[];

const createContainer = () => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: 1200 });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: 800 });
  return element;
};

const connectedSession = (mode: 'view' | 'control' = 'view') => {
  const session = useVncSession();
  session.setContainer(createContainer());
  session.connect(mode);
  const rfb = rfbs().at(-1)!;
  rfb.emit('connect');
  return { session, rfb };
};

describe('useVncSession', () => {
  beforeEach(() => {
    (globalThis as any).__calls = calls;
    (globalThis as any).__rfbs = [];
    calls.length = 0;
    credential.value = null;
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(RFB).mockClear();
  });

  it('creates the stream socket, registers its close listener, then hands the socket to noVNC', () => {
    const container = createContainer();
    const session = useVncSession();
    session.setContainer(container);
    session.connect();

    expect(calls).toEqual([
      'WebSocket ws://node-a.example:8001/ws/node-desktop?mode=view',
      'socket.addEventListener close',
      'new RFB',
    ]);
    expect(RFB).toHaveBeenCalledWith(container, FakeWebSocket.instances[0], { shared: true });
    expect(session.connectionStatus.value).toBe('connecting');
  });

  it('adds the phone credential to the stream URL when one is active', () => {
    credential.value = 'mra_phone';
    const session = useVncSession();
    session.setContainer(createContainer());
    session.connect('control');
    expect(FakeWebSocket.instances[0]!.url)
      .toBe('ws://node-a.example:8001/ws/node-desktop?mode=control&access_token=mra_phone');
  });

  it('starts in View only, scales to fit and never resizes the agent desktop', () => {
    const { session, rfb } = connectedSession();
    session.refreshViewport();

    expect(session.connectionStatus.value).toBe('connected');
    expect(session.mode.value).toBe('view');
    expect(rfb.viewOnly).toBe(true);
    expect(rfb.scaleViewport).toBe(true);
    expect(rfb.clipViewport).toBe(false);
    expect(rfb.resizeSessionWrites.length).toBeGreaterThan(0);
    expect(rfb.resizeSessionWrites.every((value) => value === false)).toBe(true);
  });

  it('switches mode by reconnecting: a new socket and RFB in the other mode', () => {
    const { session, rfb: viewRfb } = connectedSession();

    session.switchMode('control');
    const controlRfb = rfbs().at(-1)!;
    expect(viewRfb.disconnect).toHaveBeenCalledTimes(1);
    expect(controlRfb).not.toBe(viewRfb);
    expect(FakeWebSocket.instances.map((socket) => socket.url)).toEqual([
      'ws://node-a.example:8001/ws/node-desktop?mode=view',
      'ws://node-a.example:8001/ws/node-desktop?mode=control',
    ]);
    expect(controlRfb.viewOnly).toBe(false);
    controlRfb.emit('connect');
    expect(session.mode.value).toBe('control');
    expect(controlRfb.resizeSessionWrites.every((value) => value === false)).toBe(true);

    session.switchMode('view');
    expect(rfbs().at(-1)!.viewOnly).toBe(true);
    // The ended streams' late disconnect events change nothing.
    viewRfb.emit('disconnect');
    controlRfb.emit('disconnect');
    expect(session.connectionStatus.value).toBe('connecting');
    expect(session.streamEnd.value).toBeNull();
  });

  it('shows no error when the viewer ends the stream itself', () => {
    const { session, rfb } = connectedSession();
    session.disconnect();
    rfb.socket.fireClose(1005);
    rfb.emit('disconnect');

    expect(rfb.disconnect).toHaveBeenCalledTimes(1);
    expect(session.connectionStatus.value).toBe('disconnected');
    expect(session.streamEnd.value).toBeNull();
  });

  describe('maps how the node closed the stream (D-7)', () => {
    const tile = 'workspace.components.workspace.tools.NodeDesktopTile';
    it.each([
      [4401, 'REMOTE_ACCESS_AUTH_INVALID', 'not-allowed', `${tile}.not_allowed`],
      [4403, 'REMOTE_ACCESS_DEVICE_REVOKED', 'not-allowed', `${tile}.not_allowed`],
      [4404, 'NODE_DESKTOP_UNAVAILABLE', 'unavailable', `${tile}.no_shared_desktop`],
      [4404, 'REMOTE_ACCESS_ROUTE_UNSUPPORTED', 'not-allowed', `${tile}.not_allowed`],
      [4502, 'NODE_DESKTOP_DISCONNECTED', 'disconnected', `${tile}.desktop_disconnected`],
      [4400, 'NODE_DESKTOP_VIEWER_PROTOCOL', 'disconnected', `${tile}.connection_refused`],
      [1006, '', 'unreachable', `${tile}.cannot_reach_node`],
      [1000, '', 'closed', `${tile}.disconnected`],
      [1001, '', 'closed', `${tile}.disconnected`],
      // A server shutdown closes viewers without a status code (AC-011).
      [1005, '', 'disconnected', `${tile}.desktop_disconnected`],
      // A code the table does not list still offers Reconnect.
      [1011, 'internal', 'disconnected', `${tile}.desktop_disconnected`],
    ])('%i %s → %s', (code, reason, state, messageKey) => {
      const { session, rfb } = connectedSession();
      rfb.socket.fireClose(code, reason);
      rfb.emit('disconnect');

      expect(session.connectionStatus.value).toBe('disconnected');
      expect(session.streamEnd.value).toEqual({ state, messageKey });
    });

    it('maps a refusal while connecting the same way', () => {
      const session = useVncSession();
      session.setContainer(createContainer());
      session.connect();
      const rfb = rfbs()[0]!;
      rfb.socket.fireClose(4404, 'NODE_DESKTOP_UNAVAILABLE');
      rfb.emit('disconnect');
      expect(session.streamEnd.value?.state).toBe('unavailable');
    });
  });

  it('reconnects with a fresh socket in View only by default', () => {
    const { session, rfb } = connectedSession('control');
    rfb.socket.fireClose(4502, 'NODE_DESKTOP_DISCONNECTED');
    rfb.emit('disconnect');

    session.connect();
    expect(FakeWebSocket.instances.at(-1)!.url).toBe('ws://node-a.example:8001/ws/node-desktop?mode=view');
    expect(session.streamEnd.value).toBeNull();
    expect(rfbs().at(-1)!.viewOnly).toBe(true);
  });
});
