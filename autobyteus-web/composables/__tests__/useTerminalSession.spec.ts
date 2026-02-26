import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTerminalSession } from '../useTerminalSession';
import { ref } from 'vue';

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      terminalWs: 'ws://test-host:8000/ws/terminal'
    })
  })
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }
}

describe('useTerminalSession', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // @ts-ignore
    global.WebSocket = vi.fn((url) => {
      mockWs = new MockWebSocket(url);
      return mockWs;
    });
    // @ts-ignore
    global.WebSocket.OPEN = 1;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects to the correct WebSocket URL', () => {
    const workspaceId = ref('ws-123');
    const session = useTerminalSession({ workspaceId });

    session.connect();

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
    // Correct URL format: wsBaseUrl/ws/terminal/{workspaceId}/{sessionId}
    expect(mockWs.url).toContain('ws://test-host:8000/ws/terminal/ws-123/');
    expect(session.connectionStatus.value).toBe('connecting');
  });

  it('updates status to connected on open', () => {
    const session = useTerminalSession({ workspaceId: 'ws-1' });
    session.connect();

    // Simulate open
    mockWs.onopen?.();

    expect(session.connectionStatus.value).toBe('connected');
    expect(session.isConnected.value).toBe(true);
  });

  it('sends encoded input when connected', () => {
    const session = useTerminalSession({ workspaceId: 'ws-1' });
    session.connect();
    mockWs.onopen?.();

    session.sendInput('ls');

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'input',
      data: btoa('ls') // base64 encoded
    }));
  });

  it('sends resize events', () => {
    const session = useTerminalSession({ workspaceId: 'ws-1' });
    session.connect();
    mockWs.onopen?.();

    session.sendResize(24, 80);

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'resize',
      rows: 24,
      cols: 80
    }));
  });

  it('handles output messages', () => {
    const session = useTerminalSession({ workspaceId: 'ws-1' });
    const outputSpy = vi.fn();
    session.onOutput(outputSpy);

    session.connect();
    
    // Simulate incoming message
    const message = {
      type: 'output',
      data: btoa('hello world')
    };

    mockWs.onmessage?.({ data: JSON.stringify(message) });

    expect(outputSpy).toHaveBeenCalledWith('hello world');
  });

  it('handles disconnection', () => {
    const session = useTerminalSession({ workspaceId: 'ws-1' });
    session.connect();
    
    session.disconnect();

    expect(mockWs.close).toHaveBeenCalled();
    expect(session.connectionStatus.value).toBe('disconnected');
  });
  
  it('does not crash on garbage JSON', () => {
     const session = useTerminalSession({ workspaceId: 'ws-1' });
     session.connect();
     
     // Should catch JSON.parse error and log it, but not crash
     expect(() => {
       mockWs.onmessage?.({ data: 'invalid json' });
     }).not.toThrow();
  });
});
