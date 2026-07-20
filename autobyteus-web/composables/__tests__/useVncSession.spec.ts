import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useVncSession } from '../useVncSession';
import RFB from '@novnc/novnc';

interface MockRfbInstance {
  viewOnly: boolean;
  resizeSession: boolean;
  scaleViewport: boolean;
  clipViewport: boolean;
  disconnect: ReturnType<typeof vi.fn>;
  sendCredentials: ReturnType<typeof vi.fn>;
  addEventListener: (event: string, listener: (payload?: any) => void) => void;
  emit: (event: string, detail?: any) => void;
}

vi.mock('@novnc/novnc', () => {
  class MockRFB {
    viewOnly = true;
    resizeSession = false;
    scaleViewport = true;
    clipViewport = false;
    disconnect = vi.fn();
    sendCredentials = vi.fn();
    private listeners = new Map<string, Array<(payload?: any) => void>>();

    constructor(
      _target: HTMLElement,
      _url: string,
      options: {
        credentials?: { password?: string };
        shared?: boolean;
      }
    ) {
      void options;
    }

    addEventListener(event: string, listener: (payload?: any) => void) {
      const existing = this.listeners.get(event) ?? [];
      existing.push(listener);
      this.listeners.set(event, existing);
    }

    emit(event: string, detail: any = {}) {
      const handlers = this.listeners.get(event) ?? [];
      handlers.forEach((handler) => handler({ detail }));
    }
  }

  const constructor = vi.fn((target: HTMLElement, url: string, options: any) => {
    const instance = new MockRFB(target, url, options);
    (globalThis as any).__mockRfbInstances.push(instance);
    return instance;
  });

  (globalThis as any).__mockRfbInstances = [];
  return { default: constructor };
});

const getMockRfbInstances = () => (globalThis as any).__mockRfbInstances as MockRfbInstance[];

const createContainer = (width = 1200, height = 800) => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height });
  return element;
};

describe('useVncSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getMockRfbInstances().length = 0;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('temporarily enables control mode to request initial remote resize', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const session = useVncSession({
      url: 'ws://localhost:6080/websockify',
      password: 'secret',
      viewOnly: true,
    });

    session.setContainer(createContainer());
    session.connect();

    const [rfb] = getMockRfbInstances();
    expect(rfb).toBeTruthy();

    rfb.emit('connect');
    expect(session.connectionStatus.value).toBe('connected');
    expect(rfb.viewOnly).toBe(false);
    expect(rfb.resizeSession).toBe(true);

    vi.advanceTimersByTime(350);

    expect(rfb.viewOnly).toBe(true);
    expect(rfb.resizeSession).toBe(false);
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('restores fullscreen-fit strategy after the initial resize handshake', () => {
    const session = useVncSession({
      url: 'ws://localhost:6080/websockify',
      password: 'secret',
      viewOnly: true,
    });

    session.enterFullscreenFitMode();
    session.setContainer(createContainer(1400, 900));
    session.connect();

    const [rfb] = getMockRfbInstances();
    rfb.emit('connect');
    vi.advanceTimersByTime(350);

    expect(session.viewOnly.value).toBe(false);
    expect(rfb.viewOnly).toBe(false);
    expect(rfb.resizeSession).toBe(true);
  });

  it('constructs the public RFB boundary with configured credentials and shared-session behavior', () => {
    const container = createContainer();
    const session = useVncSession({
      url: 'ws://localhost:6080',
      password: 'configured-secret',
    });

    session.setContainer(container);
    session.connect();

    expect(RFB).toHaveBeenCalledTimes(1);
    expect(RFB).toHaveBeenCalledWith(container, 'ws://localhost:6080', {
      credentials: { password: 'configured-secret' },
      shared: true,
    });
    expect(session.connectionStatus.value).toBe('connecting');
  });

  it('handles credentials and current-session lifecycle events without accepting stale events', () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const session = useVncSession({
      url: 'ws://localhost:6080',
      password: 'configured-secret',
      label: 'fixture',
    });

    session.setContainer(createContainer());
    session.connect();

    const [rfb] = getMockRfbInstances();
    rfb.emit('credentialsrequired');
    expect(rfb.sendCredentials).toHaveBeenCalledWith({ password: 'configured-secret' });

    rfb.emit('securityfailure', { reason: 'Rejected for probe' });
    expect(errorSpy).toHaveBeenCalledWith(
      '[vncSession fixture] security failure:',
      'Rejected for probe',
      { reason: 'Rejected for probe' },
    );

    rfb.emit('desktopname', { name: 'Owned fixture desktop' });
    expect(infoSpy).toHaveBeenCalledWith(
      '[vncSession fixture] desktop name',
      { name: 'Owned fixture desktop' },
    );

    rfb.emit('connect');
    expect(session.connectionStatus.value).toBe('connected');
    expect(session.statusMessage.value).toBe('Connected to VNC server');

    rfb.emit('disconnect', { clean: true });
    expect(session.connectionStatus.value).toBe('disconnected');
    expect(session.statusMessage.value).toBe('Disconnected.');

    rfb.emit('connect');
    expect(session.connectionStatus.value).toBe('disconnected');
  });
});
