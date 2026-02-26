import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useVncSession } from '../useVncSession';

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

vi.mock('~/lib/novnc/core/rfb', () => {
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
        viewOnly?: boolean;
        resizeSession?: boolean;
        scaleViewport?: boolean;
        clipViewport?: boolean;
      }
    ) {
      this.viewOnly = options.viewOnly ?? true;
      this.resizeSession = options.resizeSession ?? false;
      this.scaleViewport = options.scaleViewport ?? true;
      this.clipViewport = options.clipViewport ?? false;
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
    const rfbClient = new MockRFB(target, url, options);
    (globalThis as any).__mockRfbInstances.push(rfbClient);
    return rfbClient;
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

  it('does not request remote resize on connect', () => {
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
    expect(rfb.viewOnly).toBe(true);
    expect(rfb.resizeSession).toBe(false);

    vi.advanceTimersByTime(350);

    expect(rfb.viewOnly).toBe(true);
    expect(rfb.resizeSession).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('keeps remote resize disabled in fullscreen-fit mode', () => {
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
    expect(rfb.resizeSession).toBe(false);
  });
});
