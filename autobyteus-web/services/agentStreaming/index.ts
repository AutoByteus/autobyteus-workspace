/**
 * Agent Streaming Module
 * 
 * WebSocket-based streaming for agent and agent team responses.
 * Replaces GraphQL subscriptions for real-time content delivery.
 */

// Service facades
export { AgentStreamingService } from './AgentStreamingService';
export type { AgentStreamingServiceOptions } from './AgentStreamingService';
export { TeamStreamingService } from './TeamStreamingService';
export type { TeamStreamingServiceOptions } from './TeamStreamingService';

// Transport layer
export { WebSocketClient, ConnectionState } from './transport';
export type { IWebSocketClient, WebSocketClientOptions, WebSocketClientEvents } from './transport';

// Protocol layer
export type {
  ServerMessage,
  ClientMessage,
  SegmentType,
  SegmentStartPayload,
  SegmentContentPayload,
  SegmentEndPayload,
} from './protocol';

// Re-export for advanced usage
export * from './handlers';
