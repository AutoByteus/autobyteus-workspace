/**
 * File Explorer Streaming Service - WebSocket-based file system change streaming.
 * 
 * Provides real-time file system change notifications using WebSocket,
 * replacing the GraphQL subscription for better performance and consistency.
 */

export { FileExplorerStreamingService } from './FileExplorerStreamingService';
export type { FileExplorerStreamingServiceOptions, ConnectionState } from './types';

// Re-export types from existing types file for convenience
export type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes';
