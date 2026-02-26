/**
 * AgentStreamingService - Facade for single agent WebSocket streaming.
 * 
 * Layer 4 of the architecture - wires all layers together and provides
 * a simple API for the store layer to use.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import { parseServerMessage, serializeClientMessage, type ServerMessage, type ClientMessage } from './protocol';
import {
  handleSegmentStart,
  handleSegmentContent,
  handleSegmentEnd,
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolDenied,
  handleToolExecutionStarted,
  handleToolExecutionSucceeded,
  handleToolExecutionFailed,
  handleToolLog,
  handleAgentStatus,
  handleAssistantComplete,
  handleTodoListUpdate,
  handleError,
  handleArtifactPersisted,
  handleArtifactUpdated,
} from './handlers';

const shouldLogStreaming = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  if (w.__AUTOBYTEUS_DEBUG_STREAMING__ === true) return true;
  try {
    return w.localStorage?.getItem('autobyteus.debug.streaming') === 'true';
  } catch {
    return false;
  }
};

const summarizeDelta = (delta: string, maxLen = 120): string => {
  if (!delta) return '';
  const clean = delta.replace(/\n/g, '\\n');
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
};

export interface AgentStreamingServiceOptions {
  /** Custom WebSocket client for testing */
  wsClient?: IWebSocketClient;
}

export class AgentStreamingService {
  private wsClient: IWebSocketClient;
  private context: AgentContext | null = null;
  private wsEndpoint: string;

  /**
   * Create an AgentStreamingService.
   * 
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/agent')
   * @param options - Optional configuration for testing
   */
  constructor(wsEndpoint: string, options: AgentStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
  }

  get connectionState(): ConnectionState {
    return this.wsClient.state;
  }

  /**
   * Connect to an agent's WebSocket stream.
   */
  connect(agentId: string, context: AgentContext): void {
    this.context = context;
    
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);

    const url = `${this.wsEndpoint}/${agentId}`;
    this.wsClient.connect(url);
  }

  /**
   * Disconnect from the WebSocket stream.
   */
  disconnect(): void {
    this.wsClient.off('onMessage', this.handleMessage);
    this.wsClient.off('onConnect', this.handleConnect);
    this.wsClient.off('onDisconnect', this.handleDisconnect);
    this.wsClient.off('onError', this.handleError);

    this.wsClient.disconnect();
    this.context = null;
  }

  /**
   * Send a user message to the agent.
   */
  sendMessage(content: string, contextFilePaths?: string[], imageUrls?: string[]): void {
    const message: ClientMessage = {
      type: 'SEND_MESSAGE',
      payload: {
        content,
        context_file_paths: contextFilePaths,
        image_urls: imageUrls,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /**
   * Approve a tool invocation.
   */
  approveTool(invocationId: string, reason?: string): void {
    const message: ClientMessage = {
      type: 'APPROVE_TOOL',
      payload: { invocation_id: invocationId, reason },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /**
   * Deny a tool invocation.
   */
  denyTool(invocationId: string, reason?: string): void {
    const message: ClientMessage = {
      type: 'DENY_TOOL',
      payload: { invocation_id: invocationId, reason },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /**
   * Stop the current generation.
   */
  stopGeneration(): void {
    const message: ClientMessage = {
      type: 'STOP_GENERATION',
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  // ============================================================================
  // Private Event Handlers
  // ============================================================================

  private handleMessage = (raw: string): void => {
    if (!this.context) return;

    try {
      const message = parseServerMessage(raw);
      this.logMessage(message);
      this.dispatchMessage(message, this.context);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e, { raw });
    }
  };

  private handleConnect = (): void => {
    console.log('Agent WebSocket connected');
  };

  private handleDisconnect = (reason?: string): void => {
    console.log('Agent WebSocket disconnected:', reason);
  };

  private handleError = (error: Error): void => {
    console.error('Agent WebSocket error:', error);
  };

  private logMessage(message: ServerMessage): void {
    if (!shouldLogStreaming()) return;

    switch (message.type) {
      case 'SEGMENT_START': {
        const { id, segment_type, metadata } = message.payload;
        console.log('[stream][segment:start]', { id, segment_type, metadata });
        break;
      }
      case 'SEGMENT_CONTENT': {
        const { id, delta } = message.payload;
        console.log('[stream][segment:content]', {
          id,
          deltaLen: delta?.length ?? 0,
          deltaSample: summarizeDelta(delta || ''),
        });
        break;
      }
      case 'SEGMENT_END': {
        const { id, metadata } = message.payload;
        console.log('[stream][segment:end]', { id, metadata });
        break;
      }
      default:
        console.log('[stream][message]', { type: message.type, payload: message.payload });
        break;
    }
  }

  /**
   * Dispatch a parsed message to the appropriate handler.
   */
  private dispatchMessage(message: ServerMessage, context: AgentContext): void {
    // Update timestamp
    context.conversation.updatedAt = new Date().toISOString();

    switch (message.type) {
      case 'SEGMENT_START':
        handleSegmentStart(message.payload, context);
        break;

      case 'SEGMENT_CONTENT':
        handleSegmentContent(message.payload, context);
        break;

      case 'SEGMENT_END':
        handleSegmentEnd(message.payload, context);
        break;

      case 'TOOL_APPROVAL_REQUESTED':
        handleToolApprovalRequested(message.payload, context);
        break;

      case 'TOOL_APPROVED':
        handleToolApproved(message.payload, context);
        break;

      case 'TOOL_DENIED':
        handleToolDenied(message.payload, context);
        break;

      case 'TOOL_EXECUTION_STARTED':
        handleToolExecutionStarted(message.payload, context);
        break;

      case 'TOOL_EXECUTION_SUCCEEDED':
        handleToolExecutionSucceeded(message.payload, context);
        break;

      case 'TOOL_EXECUTION_FAILED':
        handleToolExecutionFailed(message.payload, context);
        break;

      case 'TOOL_LOG':
        handleToolLog(message.payload, context);
        break;

      case 'AGENT_STATUS':
        handleAgentStatus(message.payload, context);
        break;

      case 'ASSISTANT_COMPLETE':
        handleAssistantComplete(message.payload, context);
        break;

      case 'TODO_LIST_UPDATE':
        handleTodoListUpdate(message.payload, context);
        break;

      case 'ERROR':
        handleError(message.payload, context);
        break;

      case 'ARTIFACT_PERSISTED':
        handleArtifactPersisted(message.payload, context);
        break;
        
      case 'ARTIFACT_UPDATED':
        handleArtifactUpdated(message.payload, context);
        break;

      case 'CONNECTED':
        // Connection confirmed - nothing to do
        break;

      default:
        console.warn('Unhandled message type:', (message as any).type);
    }
  }
}
