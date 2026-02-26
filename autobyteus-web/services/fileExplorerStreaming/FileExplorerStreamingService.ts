/**
 * File Explorer Streaming Service - WebSocket client for file system change streaming.
 * 
 * Provides real-time file system change notifications using WebSocket,
 * replacing the GraphQL subscription for better performance and consistency
 * with other streaming services (terminal, agent).
 */

import type {
  ServerMessage,
  FileExplorerStreamingServiceOptions,
  ConnectionState,
} from './types';
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes';

export class FileExplorerStreamingService {
  private ws: WebSocket | null = null;
  private _state: ConnectionState = 'disconnected';
  private wsEndpoint: string;
  private workspaceId: string | null = null;
  private sessionId: string | null = null;
  private lastServerErrorCode: string | null = null;
  private options: FileExplorerStreamingServiceOptions;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private static readonly DEFAULT_RECONNECT_DELAY = 1000;
  private static readonly MAX_RECONNECT_DELAY = 30000;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly NON_RETRYABLE_CLOSE_CODES = new Set([4004, 4005]);
  private static readonly NON_RETRYABLE_SERVER_ERROR_CODES = new Set([
    'WORKSPACE_NOT_FOUND',
    'WATCHER_UNAVAILABLE',
  ]);

  /**
   * Create a FileExplorerStreamingService.
   * 
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/file-explorer')
   * @param options - Optional callbacks for connection events
   */
  constructor(wsEndpoint: string, options: FileExplorerStreamingServiceOptions = {}) {
    this.wsEndpoint = wsEndpoint;
    this.options = options;
  }

  /**
   * Get the current connection state.
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Get the current session ID (if connected).
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Connect to file system change stream for a workspace.
   * 
   * @param workspaceId - The workspace ID to connect to
   */
  connect(workspaceId: string): void {
    if (this._state === 'connected' || this._state === 'connecting') {
      if (this.workspaceId === workspaceId) {
        console.warn('[FileExplorerStreaming] Already connected to this workspace');
        return;
      }
      // Disconnect from current workspace before connecting to new one
      this.disconnect();
    }

    this.workspaceId = workspaceId;
    this.reconnectAttempts = 0;
    this.lastServerErrorCode = null;
    this.doConnect();
  }

  /**
   * Internal connection logic.
   */
  private doConnect(): void {
    if (!this.workspaceId) {
      console.error('[FileExplorerStreaming] No workspace ID set');
      return;
    }

    this._state = this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
    const url = `${this.wsEndpoint}/${this.workspaceId}`;

    console.log(`[FileExplorerStreaming] Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('[FileExplorerStreaming] Failed to create WebSocket:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Set up WebSocket event listeners.
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[FileExplorerStreaming] WebSocket connected');
    };

    this.ws.onclose = (event) => {
      console.log(`[FileExplorerStreaming] WebSocket disconnected: ${event.code} ${event.reason}`);
      this.handleClose(event);
    };

    this.ws.onerror = (event) => {
      console.error('[FileExplorerStreaming] WebSocket error:', event);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as ServerMessage;

      switch (message.type) {
        case 'CONNECTED':
          this._state = 'connected';
          this.sessionId = message.payload.session_id;
          this.reconnectAttempts = 0;
          this.lastServerErrorCode = null;
          console.log(`[FileExplorerStreaming] Session established: ${this.sessionId}`);
          this.options.onConnect?.(this.sessionId);
          break;

        case 'FILE_SYSTEM_CHANGE':
          const event = {
            changes: message.payload.changes
          } as FileSystemChangeEvent;
          this.options.onFileSystemChange?.(event);
          break;

        case 'ERROR':
          console.error('[FileExplorerStreaming] Server error:', message.payload);
          this.lastServerErrorCode = String(message.payload.code ?? '');
          this.options.onError?.(new Error(message.payload.message));
          break;

        case 'PONG':
          // Keep-alive response, no action needed
          break;

        default:
          console.warn('[FileExplorerStreaming] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[FileExplorerStreaming] Failed to parse message:', error);
    }
  }

  /**
   * Handle WebSocket close event.
   */
  private handleClose(event: CloseEvent): void {
    const previousState = this._state;
    this._state = 'disconnected';
    this.ws = null;
    const serverErrorCode = this.lastServerErrorCode;
    this.lastServerErrorCode = null;

    // Only notify disconnect if we were previously connected
    if (previousState === 'connected') {
      this.options.onDisconnect?.(event.reason || 'Connection closed');
    }

    // Attempt reconnection if not intentionally disconnected
    if (
      event.code !== 1000 &&
      this.workspaceId &&
      !this.isNonRetryableCloseCode(event.code) &&
      !this.isNonRetryableServerErrorCode(serverErrorCode)
    ) {
      this.scheduleReconnect();
    }
  }

  private isNonRetryableCloseCode(code: number): boolean {
    return FileExplorerStreamingService.NON_RETRYABLE_CLOSE_CODES.has(code);
  }

  private isNonRetryableServerErrorCode(code: string | null): boolean {
    return Boolean(
      code && FileExplorerStreamingService.NON_RETRYABLE_SERVER_ERROR_CODES.has(code),
    );
  }

  /**
   * Handle connection error.
   */
  private handleError(error: Error): void {
    this._state = 'error';
    this.options.onError?.(error);
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= FileExplorerStreamingService.MAX_RECONNECT_ATTEMPTS) {
      console.error('[FileExplorerStreaming] Max reconnect attempts reached');
      this.options.onError?.(new Error('Max reconnect attempts reached'));
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(
      FileExplorerStreamingService.DEFAULT_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      FileExplorerStreamingService.MAX_RECONNECT_DELAY
    );

    this.reconnectAttempts++;
    console.log(`[FileExplorerStreaming] Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  /**
   * Send a ping to keep the connection alive.
   */
  sendPing(): void {
    if (this.ws && this._state === 'connected') {
      this.ws.send(JSON.stringify({ type: 'PING' }));
    }
  }

  /**
   * Disconnect from the WebSocket.
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this._state = 'disconnected';
    this.workspaceId = null;
    this.sessionId = null;
    this.lastServerErrorCode = null;
    console.log('[FileExplorerStreaming] Disconnected');
  }
}
