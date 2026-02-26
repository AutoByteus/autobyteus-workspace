/**
 * Type definitions for File Explorer WebSocket streaming protocol.
 * 
 * Re-exports existing types and adds WebSocket-specific types.
 */

// Re-export existing file system change types for compatibility
export type {
  FileSystemChangeEvent,
  AddChange,
  DeleteChange,
  RenameChange,
  MoveChange,
  ModifyChange,
} from '~/types/fileSystemChangeTypes';

// ============================================================================
// Server Message Types
// ============================================================================

export type ServerMessageType = 
  | 'CONNECTED'
  | 'FILE_SYSTEM_CHANGE'
  | 'ERROR'
  | 'PONG';

export interface ConnectedPayload {
  workspace_id: string;
  session_id: string;
}

export interface FileSystemChangePayload {
  changes: Array<{
    type: 'add' | 'delete' | 'rename' | 'move' | 'modify';
    parent_id?: string;
    old_parent_id?: string;
    new_parent_id?: string;
    node_id?: string;
    node?: {
      id: string;
      name: string;
      path: string;
      is_file?: boolean;
    };
  }>;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type ServerMessage = 
  | { type: 'CONNECTED'; payload: ConnectedPayload }
  | { type: 'FILE_SYSTEM_CHANGE'; payload: FileSystemChangePayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'PONG'; payload: Record<string, never> };

// ============================================================================
// Client Message Types
// ============================================================================

export type ClientMessageType = 'PING';

export interface ClientMessage {
  type: ClientMessageType;
}

// ============================================================================
// Service Options
// ============================================================================

export interface FileExplorerStreamingServiceOptions {
  /** Callback when file system changes are received */
  onFileSystemChange?: (event: import('~/types/fileSystemChangeTypes').FileSystemChangeEvent) => void;
  /** Callback when connected */
  onConnect?: (sessionId: string) => void;
  /** Callback when disconnected */
  onDisconnect?: (reason?: string) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

// ============================================================================
// Connection State
// ============================================================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
