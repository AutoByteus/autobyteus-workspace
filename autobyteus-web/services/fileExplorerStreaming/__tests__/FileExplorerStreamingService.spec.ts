/**
 * Unit tests for FileExplorerStreamingService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileExplorerStreamingService } from '../FileExplorerStreamingService';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure' });
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen();
    }
  }

  simulateMessage(data: object): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code: number, reason: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
  }
}

const WS_ENDPOINT = 'ws://localhost:8000/ws/file-explorer';

describe('FileExplorerStreamingService', () => {
  let originalWebSocket: typeof WebSocket;
  let mockWs: MockWebSocket;
  let sockets: MockWebSocket[];

  beforeEach(() => {
    sockets = [];
    // Store original WebSocket
    originalWebSocket = global.WebSocket;
    
    // Replace with mock
    (global as any).WebSocket = vi.fn((url: string) => {
      mockWs = new MockWebSocket(url);
      sockets.push(mockWs);
      return mockWs;
    });
  });

  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('creates service with endpoint and default options', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      expect(service.state).toBe('disconnected');
      expect(service.currentSessionId).toBeNull();
    });

    it('uses provided wsEndpoint', () => {
      const service = new FileExplorerStreamingService('ws://custom:9000/ws/file-explorer');
      
      service.connect('workspace-1');
      
      expect(mockWs.url).toBe('ws://custom:9000/ws/file-explorer/workspace-1');
    });
  });

  describe('connect', () => {
    it('creates WebSocket connection with correct URL', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('workspace-123');
      
      expect(mockWs.url).toBe('ws://localhost:8000/ws/file-explorer/workspace-123');
    });

    it('sets state to connecting', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('workspace-1');
      
      expect(service.state).toBe('connecting');
    });

    it('does not reconnect if already connected to same workspace', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'workspace-1', session_id: 'sess-1' } 
      });
      
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.connect('workspace-1');
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already connected')
      );
      warnSpy.mockRestore();
    });
  });

  describe('message handling', () => {
    it('calls onConnect with session ID on CONNECTED message', () => {
      const onConnect = vi.fn();
      const service = new FileExplorerStreamingService(WS_ENDPOINT, { onConnect });
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'workspace-1', session_id: 'sess-123' } 
      });
      
      expect(onConnect).toHaveBeenCalledWith('sess-123');
      expect(service.currentSessionId).toBe('sess-123');
      expect(service.state).toBe('connected');
    });

    it('calls onFileSystemChange on FILE_SYSTEM_CHANGE message', () => {
      const onFileSystemChange = vi.fn();
      const service = new FileExplorerStreamingService(WS_ENDPOINT, { onFileSystemChange });
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'workspace-1', session_id: 'sess-1' } 
      });
      
      const changes = [
        { type: 'add', parent_id: 'p1', node: { id: 'n1', name: 'test.ts' } }
      ];
      mockWs.simulateMessage({ 
        type: 'FILE_SYSTEM_CHANGE', 
        payload: { changes } 
      });
      
      expect(onFileSystemChange).toHaveBeenCalled();
    });

    it('calls onError on ERROR message', () => {
      const onError = vi.fn();
      const service = new FileExplorerStreamingService(WS_ENDPOINT, { onError });
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'ERROR', 
        payload: { code: 'WORKSPACE_NOT_FOUND', message: 'Not found' } 
      });
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('closes WebSocket connection', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      
      const closeSpy = vi.spyOn(mockWs, 'close');
      service.disconnect();
      
      expect(closeSpy).toHaveBeenCalled();
    });

    it('resets state to disconnected', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'workspace-1', session_id: 'sess-1' } 
      });
      
      service.disconnect();
      
      expect(service.state).toBe('disconnected');
    });

    it('calls onDisconnect callback when connection closes', () => {
      const onDisconnect = vi.fn();
      const service = new FileExplorerStreamingService(WS_ENDPOINT, { onDisconnect });
      
      service.connect('workspace-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'workspace-1', session_id: 'sess-1' } 
      });
      
      // Simulate the WebSocket close event (which triggers onDisconnect)
      mockWs.close();
      
      expect(onDisconnect).toHaveBeenCalled();
    });
  });

  describe('state property', () => {
    it('returns disconnected initially', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      expect(service.state).toBe('disconnected');
    });

    it('returns connecting after connect called', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('ws-1');
      
      expect(service.state).toBe('connecting');
    });

    it('returns connected after CONNECTED message', () => {
      const service = new FileExplorerStreamingService(WS_ENDPOINT);
      
      service.connect('ws-1');
      mockWs.simulateOpen();
      mockWs.simulateMessage({ 
        type: 'CONNECTED', 
        payload: { workspace_id: 'ws-1', session_id: 's1' } 
      });
      
      expect(service.state).toBe('connected');
    });
  });

  describe('retry policy', () => {
    it('does not retry when closed with non-retryable close code', () => {
      vi.useFakeTimers();
      const service = new FileExplorerStreamingService(WS_ENDPOINT);

      service.connect('ws-1');
      expect((global as any).WebSocket).toHaveBeenCalledTimes(1);

      sockets[0].simulateOpen();
      sockets[0].simulateClose(4004, 'Workspace not found');

      vi.advanceTimersByTime(60000);
      expect((global as any).WebSocket).toHaveBeenCalledTimes(1);
    });

    it('does not retry when server sends non-retryable error code before close', () => {
      vi.useFakeTimers();
      const onError = vi.fn();
      const service = new FileExplorerStreamingService(WS_ENDPOINT, { onError });

      service.connect('ws-1');
      expect((global as any).WebSocket).toHaveBeenCalledTimes(1);

      sockets[0].simulateOpen();
      sockets[0].simulateMessage({
        type: 'ERROR',
        payload: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace ws-1 not found' },
      });
      sockets[0].simulateClose(1011, 'Rejected');

      vi.advanceTimersByTime(60000);
      expect(onError).toHaveBeenCalledTimes(1);
      expect((global as any).WebSocket).toHaveBeenCalledTimes(1);
    });

    it('keeps backoff progression when transport opens but protocol never connects', () => {
      vi.useFakeTimers();
      const service = new FileExplorerStreamingService(WS_ENDPOINT);

      service.connect('ws-1');
      expect((global as any).WebSocket).toHaveBeenCalledTimes(1);

      sockets[0].simulateOpen();
      sockets[0].simulateClose(1011, 'Transient');

      vi.advanceTimersByTime(1000);
      expect((global as any).WebSocket).toHaveBeenCalledTimes(2);

      sockets[1].simulateOpen();
      sockets[1].simulateClose(1011, 'Transient again');

      // If attempts reset on transport open, this would already reconnect.
      vi.advanceTimersByTime(1000);
      expect((global as any).WebSocket).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(1000);
      expect((global as any).WebSocket).toHaveBeenCalledTimes(3);
    });
  });
});
